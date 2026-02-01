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

        {/* לינק למנהל - מופיע רק אם המשתמש הוא אדמין */}
        {user && user.is_admin && (
          <>
            <Link to="/admin" className="navbar-admin-link">🛡️ ניהול משתמשים</Link>
            <Link to="/admin/matches" className="navbar-admin-link">🛡️ ניהול שידוכים</Link>
          </>
        )}
      </div>

      <div className="navbar-user-section">
        {user ? (
          <>
            <span className="navbar-welcome">שלום, {user.full_name}</span>
            <Link to="/profile" className="navbar-profile-btn">👤 פרופיל</Link>
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