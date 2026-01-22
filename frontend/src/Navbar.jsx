import { useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // שליפת המשתמש מהזיכרון
    const user = JSON.parse(localStorage.getItem('user'));

    // אם אין משתמש מחובר, לא מציגים תפריט
    if (!user) return null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    // פונקציית עזר לבדוק אם אנחנו בדף מסוים (לצורך הדגשה)
    const isActive = (path) => location.pathname === path;

    return (
        <nav style={styles.nav}>
            <div style={styles.logo} onClick={() => navigate('/matches')}>
                Shiduch.App 💘
            </div>
            
            <div style={styles.links}>
                <button 
                    onClick={() => navigate('/matches')} 
                    style={{...styles.link, color: isActive('/matches') ? '#ec4899' : '#374151', fontWeight: isActive('/matches') ? 'bold' : 'normal'}}
                >
                    🔍 שידוכים
                </button>
                
                <button 
                    onClick={() => navigate('/inbox')} 
                    style={{...styles.link, color: isActive('/inbox') ? '#ec4899' : '#374151', fontWeight: isActive('/inbox') ? 'bold' : 'normal'}}
                >
                    📬 הודעות נכנסות
                </button>

                {/* --- הכפתור החדש שהוספנו --- */}
                <button 
                    onClick={() => navigate('/connections')} 
                    style={{...styles.link, color: isActive('/connections') ? '#ec4899' : '#374151', fontWeight: isActive('/connections') ? 'bold' : 'normal'}}
                >
                    📞 שידוכים פעילים
                </button>
                {/* --------------------------- */}

                <button 
                    onClick={() => navigate('/profile')} 
                    style={{...styles.link, color: isActive('/profile') ? '#ec4899' : '#374151', fontWeight: isActive('/profile') ? 'bold' : 'normal'}}
                >
                    👤 פרופיל
                </button>
                
                {/* כפתור ניהול - רק למנהלים */}
                {user.is_admin && (
                    <button 
                        onClick={() => navigate('/admin')} 
                        style={styles.adminLink}
                    >
                        🛡️ פאנל ניהול
                    </button>
                )}
            </div>

            <div style={styles.userSection}>
                <span style={styles.userName}>{user.full_name}</span>
                <button onClick={handleLogout} style={styles.logoutBtn}>התנתקות</button>
            </div>
        </nav>
    );
}

const styles = {
    nav: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 40px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'sticky', top: 0, zIndex: 1000, direction: 'rtl', fontFamily: 'Segoe UI'
    },
    logo: { fontSize: '1.4rem', fontWeight: 'bold', color: '#ec4899', cursor: 'pointer' },
    links: { display: 'flex', gap: '25px', alignItems: 'center' },
    link: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', transition: '0.2s' },
    adminLink: { background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' },
    userSection: { display: 'flex', alignItems: 'center', gap: '15px' },
    userName: { fontSize: '0.9rem', color: '#6b7280' },
    logoutBtn: { background: '#f3f4f6', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', color: '#4b5563', fontSize: '0.9rem' }
};

export default Navbar;