import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Error parsing user in Navbar:", e);
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
            <Link to="/inbox">📬 הודעות</Link>
            <Link to="/connections">💞 שידוכים פעילים</Link>
            <Link to="/photo-requests">📷 בקשות תמונות</Link>
          </>
        )}

        {/* קישורים למנהל בלבד */}
        {user && user.is_admin && (
          <>
            <Link to="/admin" className="navbar-admin-link">📊 לוח בקרה</Link>
            <Link to="/admin/users" className="navbar-admin-link">👥 משתמשים</Link>
            <Link to="/admin/matches" className="navbar-admin-link">💍 ניהול שידוכים</Link>
            <Link to="/admin/pending-profiles" className="navbar-admin-link">📝 אישורים</Link>
          </>
        )}
      </div>

      <div className="navbar-user-section">
        {user ? (
          <>
            <span className="navbar-welcome">שלום, {user.full_name}</span>
            {/* כפתור פרופיל רק למשתמש רגיל */}
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