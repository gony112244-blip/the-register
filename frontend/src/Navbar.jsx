import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();

  // שליפת המשתמש מהזיכרון המקומי (localStorage)
  const user = useMemo(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">Shiduch.App 💍</Link>
      </div>

      <div className="navbar-links">
        <Link to="/matches">שידוכים</Link>
        <Link to="/inbox">הודעות נכנסות</Link>
        <Link to="/connections">שידוכים פעילים</Link>
        <Link to="/photo-requests">📷 בקשות תמונות</Link>

        {/* לינק למנהל - מופיע רק אם המשתמש הוא אדמין */}
        {user && user.is_admin && (
          <>
            <Link to="/admin" className="navbar-admin-link">📊 לוח בקרה</Link>
            <Link to="/admin/users" className="navbar-admin-link">👥 משתמשים</Link>
            <Link to="/admin/matches" className="navbar-admin-link">💍 שידוכים</Link>
            <Link to="/admin/pending-profiles" className="navbar-admin-link">📝 אישורים</Link>
          </>
        )}
      </div>

      <div className="navbar-user-section">
        {user ? (
          <>
            <span className="navbar-welcome">שלום, {user.full_name}</span>
            <Link to="/my-profile" className="navbar-profile-btn">📋 הכרטיסייה שלי</Link>
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