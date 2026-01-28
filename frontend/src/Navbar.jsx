import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  
  // שליפת המשתמש מהזיכרון המקומי (localStorage)
  // המושג: Data Persistence - שמירת נתונים כך שלא יימחקו ברענון הדף
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <Link to="/" style={styles.logoLink}>Shiduch.App 💍</Link>
      </div>
      
      <div style={styles.links}>
        <Link to="/matches" style={styles.link}>שידוכים</Link>
        <Link to="/inbox" style={styles.link}>הודעות נכנסות</Link>
        <Link to="/connections" style={styles.link}>שידוכים פעילים</Link>
        
        {/* --- המושג: Conditional Rendering (רינדור מותנה) --- */}
        {/* שימוש באופרטור &&: אם הצד השמאלי אמת, הצד הימני יוצג */}
        {user && user.is_admin && (
          <Link to="/admin/matches" style={styles.adminLink}>🛡️ ניהול שידוכים</Link>
        )}
      </div>

      <div style={styles.userSection}>
        {user ? (
          <>
            <span style={styles.welcomeText}>שלום, **{user.full_name}**</span>
            <Link to="/profile" style={styles.profileBtn}>👤 פרופיל</Link>
            <button onClick={handleLogout} style={styles.logoutBtn}>יציאה</button>
          </>
        ) : (
          <Link to="/login" style={styles.loginBtn}>כניסה</Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '10px 20px', 
    background: '#fff', 
    borderBottom: '2px solid #fce7f3',
    direction: 'rtl',
    fontFamily: 'Segoe UI'
  },
  logo: { fontSize: '1.5rem', fontWeight: 'bold' },
  logoLink: { textDecoration: 'none', color: '#db2777' },
  links: { display: 'flex', gap: '20px', alignItems: 'center' },
  link: { textDecoration: 'none', color: '#475569', fontWeight: '500' },
  adminLink: { 
    textDecoration: 'none', 
    color: '#db2777', 
    fontWeight: 'bold', 
    border: '2px solid #db2777', 
    padding: '4px 12px', 
    borderRadius: '8px',
    fontSize: '0.9rem',
    background: '#fff1f2'
  },
  userSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  welcomeText: { color: '#1e293b', fontSize: '0.95rem' },
  profileBtn: { 
    textDecoration: 'none', 
    background: '#fdf2f8', 
    color: '#db2777', 
    padding: '5px 12px', 
    borderRadius: '20px', 
    fontSize: '0.9rem',
    border: '1px solid #fbcfe8'
  },
  logoutBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#94a3b8', 
    cursor: 'pointer', 
    fontSize: '0.9rem' 
  },
  loginBtn: { 
    textDecoration: 'none', 
    background: '#db2777', 
    color: 'white', 
    padding: '8px 20px', 
    borderRadius: '8px' 
  }
};

export default Navbar;