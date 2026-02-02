import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        blocked: 0,
        waitingMatches: 0,
        pendingProfiles: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || !user?.is_admin) {
            navigate('/login');
            return;
        }

        fetchStats(token);
    }, [navigate]);

    const fetchStats = async (token) => {
        try {
            // שליפת כל המשתמשים לסטטיסטיקה
            const usersRes = await fetch('http://localhost:3000/admin/all-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await usersRes.json();

            // שליפת שידוכים ממתינים
            const matchesRes = await fetch('http://localhost:3000/admin/matches-to-handle', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const matches = await matchesRes.json();

            // שליפת פרופילים ממתינים
            const profilesRes = await fetch('http://localhost:3000/admin/pending-profiles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const profiles = await profilesRes.json();

            setStats({
                total: Array.isArray(users) ? users.length : 0,
                approved: Array.isArray(users) ? users.filter(u => u.is_approved && !u.is_blocked).length : 0,
                pending: Array.isArray(users) ? users.filter(u => !u.is_approved).length : 0,
                blocked: Array.isArray(users) ? users.filter(u => u.is_blocked).length : 0,
                waitingMatches: Array.isArray(matches) ? matches.length : 0,
                pendingProfiles: Array.isArray(profiles) ? profiles.length : 0
            });
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען נתונים...</h2>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>📊 לוח בקרה</h1>
                <p style={styles.subtitle}>סקירה כללית של המערכת</p>

                {/* סטטיסטיקות */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>👥</div>
                        <div style={styles.statNumber}>{stats.total}</div>
                        <div style={styles.statLabel}>סה"כ משתמשים</div>
                    </div>
                    <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #d4edda, #c3e6cb)' }}>
                        <div style={styles.statIcon}>✅</div>
                        <div style={styles.statNumber}>{stats.approved}</div>
                        <div style={styles.statLabel}>מאושרים</div>
                    </div>
                    <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #fff3cd, #ffeeba)' }}>
                        <div style={styles.statIcon}>⏳</div>
                        <div style={styles.statNumber}>{stats.pending}</div>
                        <div style={styles.statLabel}>ממתינים לאישור</div>
                    </div>
                    <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f8d7da, #f5c6cb)' }}>
                        <div style={styles.statIcon}>🚫</div>
                        <div style={styles.statNumber}>{stats.blocked}</div>
                        <div style={styles.statLabel}>חסומים</div>
                    </div>
                </div>

                {/* התראות */}
                <div style={styles.alertsSection}>
                    <h2 style={styles.sectionTitle}>🔔 דורשים טיפול</h2>
                    <div style={styles.alertsGrid}>
                        <div
                            style={styles.alertCard}
                            onClick={() => navigate('/admin/matches')}
                        >
                            <div style={styles.alertBadge}>{stats.waitingMatches}</div>
                            <span>💍 שידוכים ממתינים לשדכנית</span>
                        </div>
                        <div
                            style={styles.alertCard}
                            onClick={() => navigate('/admin/pending-profiles')}
                        >
                            <div style={styles.alertBadge}>{stats.pendingProfiles}</div>
                            <span>📝 שינויי פרופיל לאישור</span>
                        </div>
                    </div>
                </div>

                {/* ניווט מהיר */}
                <div style={styles.quickNav}>
                    <h2 style={styles.sectionTitle}>⚡ ניווט מהיר</h2>
                    <div style={styles.navGrid}>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/users')}>
                            👥 ניהול משתמשים
                        </button>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/matches')}>
                            💍 ניהול שידוכים
                        </button>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/pending-profiles')}>
                            📝 אישור שינויים
                        </button>
                        <button style={styles.navBtnSecondary} onClick={() => navigate('/matches')}>
                            🔍 חיפוש שידוכים
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '20px',
        direction: 'rtl',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: { maxWidth: '1000px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)',
        color: 'white'
    },
    spinner: {
        width: '50px', height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    title: { color: '#fff', margin: '0 0 5px', fontSize: '2.2rem' },
    subtitle: { color: 'rgba(255,255,255,0.7)', margin: '0 0 30px' },

    // סטטיסטיקות
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
    },
    statCard: {
        background: 'linear-gradient(135deg, #fff, #f9fafb)',
        borderRadius: '15px',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    statIcon: { fontSize: '2rem', marginBottom: '10px' },
    statNumber: { fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a5f' },
    statLabel: { color: '#6b7280', fontSize: '0.9rem' },

    // התראות
    alertsSection: { marginBottom: '30px' },
    sectionTitle: { color: '#fff', margin: '0 0 15px', fontSize: '1.3rem' },
    alertsGrid: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    alertCard: {
        background: '#fff',
        borderRadius: '12px',
        padding: '15px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s',
        flex: '1',
        minWidth: '250px'
    },
    alertBadge: {
        background: '#c9a227',
        color: '#1a1a1a',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.2rem'
    },

    // ניווט מהיר
    quickNav: { marginBottom: '30px' },
    navGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
    },
    navBtn: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff',
        border: 'none',
        padding: '18px 25px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s'
    },
    navBtnSecondary: {
        background: 'linear-gradient(135deg, #c9a227, #d4a72c)',
        color: '#1a1a1a',
        border: 'none',
        padding: '18px 25px',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)'
    }
};

export default AdminDashboard;