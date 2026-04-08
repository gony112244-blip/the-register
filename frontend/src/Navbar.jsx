import API_BASE from './config';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import NotificationsPanel from './components/NotificationsPanel';
import './Navbar.css';

// ── כפתור בקשות עם badge ──
function RequestsLink({ token, userId }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    if (!token || !userId) return;
    const h = { 'Authorization': `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/my-requests?userId=${userId}`, { headers: h }).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/pending-photo-requests`, { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([conn, photo]) => {
      setCount((Array.isArray(conn) ? conn.length : 0) + (Array.isArray(photo) ? photo.length : 0));
    });
  }, [token, userId]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    window.addEventListener('requestsUpdated', fetchCount);
    return () => window.removeEventListener('requestsUpdated', fetchCount);
  }, [fetchCount]);

  return (
    <Link to="/requests" style={{ position: 'relative' }}>
      📋 בקשות
      {count > 0 && (
        <span className="admin-badge" style={{ top: -6, right: -10 }}>{count}</span>
      )}
    </Link>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminStats, setAdminStats] = useState({ pending: 0, matches: 0, open_tickets: 0 });
  const [activeConnCount, setActiveConnCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const readUser = useCallback(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Error parsing user in Navbar:", e);
      return null;
    }
  }, []);

  const [user, setUser] = useState(readUser);

  // מאזין לעדכוני משתמש (מ-NotificationsPanel ומ-App.jsx)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setUser(e.detail);
      else setUser(readUser());
    };
    window.addEventListener('userUpdated', handler);
    return () => window.removeEventListener('userUpdated', handler);
  }, [readUser]);

  const handleUserUpdate = useCallback((updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
  }, []);

  const fetchAdminStats = useCallback(() => {
    if (!user?.is_admin) return;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (data) setAdminStats({ pending: data.pending || 0, matches: data.matches || 0, open_tickets: data.open_tickets || 0 }); })
      .catch(() => {});
  }, [user]);

  useEffect(() => { fetchAdminStats(); }, [fetchAdminStats]);

  // רענון badges אחרי פעולות אדמין
  useEffect(() => {
    window.addEventListener('adminStatsUpdated', fetchAdminStats);
    return () => window.removeEventListener('adminStatsUpdated', fetchAdminStats);
  }, [fetchAdminStats]);

  // badge אדום לשידוכים פעילים
  useEffect(() => {
    if (!user || user.is_admin) return;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/my-connections?userId=${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActiveConnCount(data.length); })
      .catch(() => {});
  }, [user]);

  // מנקה badge כשנכנסים לדף שידוכים פעילים
  useEffect(() => {
    if (location.pathname === '/connections') setActiveConnCount(0);
  }, [location.pathname]);

  // בדיקת הודעות שלא נקראו — כל 10 דקות
  useEffect(() => {
    if (!user || user.is_admin) return;
    const checkUnread = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      fetch(`${API_BASE}/my-messages`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setUnreadMsgCount(data.filter(m => !m.is_read).length);
        })
        .catch(() => {});
    };
    checkUnread();
    const id = setInterval(checkUnread, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [user]);

  // מנקה badge הודעות כשנכנסים לדף הודעות
  useEffect(() => {
    if (location.pathname === '/inbox') setUnreadMsgCount(0);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('email_reminder_shown');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* לוגו - קישור לדף הבית */}
      <div className="navbar-logo">
        <Link to="/">📋 הפנקס</Link>
      </div>

      <div className="navbar-links">
        {/* קישורים למשתמש רגיל בלבד */}
        {user && !user.is_admin && (
          <>
            <Link to="/matches">💍 שידוכים</Link>
            <RequestsLink token={localStorage.getItem('token')} userId={user?.id} />
            <Link to="/inbox" style={{ position: 'relative' }}>
              📬 הודעות
              {unreadMsgCount > 0 && location.pathname !== '/inbox' && (
                <span className="admin-badge" style={{ top: -6, right: -10, background: '#ef4444' }}>{unreadMsgCount}</span>
              )}
            </Link>
            <Link to="/connections" style={{ position: 'relative' }}>
              💎 שידוכים פעילים
              {activeConnCount > 0 && location.pathname !== '/connections' && (
                <span className="admin-badge" style={{ top: -6, right: -10, background: '#ef4444' }}>{activeConnCount}</span>
              )}
            </Link>
          </>
        )}

        {/* קישורים למנהל בלבד */}
        {user && user.is_admin && (
          <>
            <Link to="/admin" className="navbar-admin-link">📊 לוח בקרה</Link>
            <Link to="/admin/users" className="navbar-admin-link">👥 משתמשים</Link>
            <Link to="/admin/matches" className="navbar-admin-link" style={{position: 'relative'}}>
              💍 ניהול שידוכים
              {adminStats.matches > 0 && <span className="admin-badge">{adminStats.matches}</span>}
            </Link>
            <Link to="/admin/pending-profiles" className="navbar-admin-link" style={{position: 'relative'}}>
              📝 אישורים
              {adminStats.pending > 0 && <span className="admin-badge">{adminStats.pending}</span>}
            </Link>
            <Link to="/admin/support" className="navbar-admin-link" style={{position: 'relative'}}>
              📩 פניות
              {adminStats.open_tickets > 0 && <span className="admin-badge" style={{ background: '#f59e0b' }}>{adminStats.open_tickets}</span>}
            </Link>
          </>
        )}
      </div>

      <div className="navbar-user-section">
        {user ? (
          <>
            <span className="navbar-welcome">שלום, {user.full_name}</span>
            <NotificationsPanel user={user} onUserUpdate={handleUserUpdate} />
            {!user.is_admin && (
              <Link to="/my-profile" className="navbar-profile-btn">📋 הכרטיסייה שלי</Link>
            )}
            <button onClick={handleLogout} className="navbar-logout-btn">יציאה</button>
          </>
        ) : (
          <Link to="/login" className="navbar-login-btn">כניסה</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;