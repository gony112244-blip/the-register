import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// רישום רכיבי הגרפים
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        matches: 0,
        sectors: [],
        monthly: []
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
            // קריאה אחת יעילה לכל הנתונים
            const res = await fetch('http://localhost:3000/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setStats(data);
            }
        } catch (err) {
            console.error("שגיאה בטעינת דשבורד", err);
        }
        setLoading(false);
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען דשבורד...</h2>
        </div>
    );

    // נתוני גרף עוגה (מגזרים)
    const pieData = {
        labels: stats.sectors.map(s => s.sector || 'לא מוגדר'),
        datasets: [{
            data: stats.sectors.map(s => s.count),
            backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#C9CBCF'],
            borderWidth: 2,
            borderColor: '#fff'
        }],
    };

    // נתוני גרף עמודות (הרשמות חודשיות)
    const barData = {
        labels: stats.monthly.map(m => m.month),
        datasets: [{
            label: 'נרשמים חדשים',
            data: stats.monthly.map(m => m.count),
            backgroundColor: '#c9a227',
            borderRadius: 5
        }]
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'מגמת הצטרפות (חצי שנה אחרונה)' }
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>📊 דשבורד מנהל</h1>
                <p style={styles.subtitle}>תמונת מצב בזמן אמת</p>
                
                {/* התראת משימות לטיפול */}
                {(stats.pending > 0 || stats.matches > 0) && (
                    <div style={styles.alertBanner}>
                        <div style={{fontSize: '1.5rem'}}>🔔</div>
                        <div>
                            <strong>פעולות ממתינות לטיפול:</strong><br/>
                            {stats.pending > 0 && <span>- ישנם {stats.pending} משתמשים הממתינים לאישור או עדכון פרופיל.<br/></span>}
                            {stats.matches > 0 && <span>- ישנם {stats.matches} הצעות שידוך פעילות שכדאי לבדוק או להעביר לשדכנית.<br/></span>}
                        </div>
                        <button onClick={() => navigate(stats.pending > 0 ? '/admin/pending-profiles' : '/admin/matches')} style={styles.alertBtn}>
                            לטפל עכשיו ←
                        </button>
                    </div>
                )}

                {/* KPI Cards */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statIcon}>👥</div>
                        <div style={styles.statNumber}>{stats.total}</div>
                        <div style={styles.statLabel}>סה"כ משתמשים</div>
                    </div>
                    <div style={{ ...styles.statCard, borderRight: '5px solid #ffc107' }}>
                        <div style={styles.statIcon}>⏳</div>
                        <div style={styles.statNumber}>{stats.pending}</div>
                        <div style={styles.statLabel}>ממתינים לאישור</div>
                    </div>
                    <div style={{ ...styles.statCard, borderRight: '5px solid #28a745' }}>
                        <div style={styles.statIcon}>💍</div>
                        <div style={styles.statNumber}>{stats.matches}</div>
                        <div style={styles.statLabel}>שידוכים פעילים</div>
                    </div>
                </div>

                {/* Charts Section */}
                <div style={styles.chartsGrid}>
                    <div style={styles.chartCard}>
                        <h3 style={styles.chartTitle}>פילוח לפי מגזר</h3>
                        <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                            <Doughnut data={pieData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                    <div style={styles.chartCard}>
                        <h3 style={styles.chartTitle}>צמיחה חודשית</h3>
                        <div style={{ height: '250px' }}>
                            <Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>

                {/* Quick Navigation */}
                <div style={styles.quickNav}>
                    <h2 style={styles.sectionTitle}>⚡ פעולות מהירות</h2>
                    <div style={styles.navGrid}>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/users')}>
                            👥 משתמשים
                        </button>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/matches')}>
                            💍 שידוכים ({stats.matches})
                        </button>
                        <button style={styles.navBtn} onClick={() => navigate('/admin/pending-profiles')}>
                            📝 אישורים ({stats.pending})
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
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    container: { maxWidth: '1200px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    spinner: {
        width: '50px', height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    title: { color: 'white', fontSize: '2.5rem', margin: '0 0 10px' },
    subtitle: { color: '#cbd5e1', marginBottom: '30px' },

    alertBanner: {
        background: 'rgba(201, 162, 39, 0.9)',
        color: '#1e3a5f',
        padding: '15px 25px',
        borderRadius: '12px',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        boxShadow: '0 5px 20px rgba(201, 162, 39, 0.4)',
        border: '1px solid #ffd700'
    },
    alertBtn: {
        marginRight: 'auto',
        background: '#1e3a5f',
        color: '#fff',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },

    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    statCard: {
        background: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        textAlign: 'center',
        transition: 'transform 0.2s',
        cursor: 'default'
    },
    statIcon: { fontSize: '2.5rem', marginBottom: '10px' },
    statNumber: { fontSize: '3rem', fontWeight: '800', color: '#1e3a5f', lineHeight: 1 },
    statLabel: { color: '#64748b', fontSize: '1rem', marginTop: '5px' },

    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
    },
    chartCard: {
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
    },
    chartTitle: { textAlign: 'center', color: '#1e3a5f', marginBottom: '20px' },

    sectionTitle: { color: 'white', marginBottom: '15px' },
    navGrid: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    navBtn: {
        flex: 1,
        padding: '15px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'white',
        borderRadius: '10px',
        fontSize: '1.1rem',
        cursor: 'pointer',
        transition: 'background 0.2s',
        minWidth: '200px'
    }
};

export default AdminDashboard;