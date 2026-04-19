import API_BASE from './config';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, pending: 0, matches: 0, sectors: [], monthly: [], ivr: null, web: null });
    const [openTickets, setOpenTickets] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (!token || !user?.is_admin) { navigate('/login'); return; }
        fetchStats(token);
    }, [navigate]);

    const fetchStats = async (token) => {
        try {
            const res = await fetch(`${API_BASE}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (err) {
            console.error("שגיאה בטעינת דשבורד", err);
        }
        // שליפת מספר פניות פתוחות
        try {
            const ticketsRes = await fetch(`${API_BASE}/admin/support/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const ticketsData = await ticketsRes.json();
            if (Array.isArray(ticketsData)) {
                setOpenTickets(ticketsData.filter(t => t.status === 'open').length);
            }
        } catch {}
        setLoading(false);
    };

    if (loading) return (
        <div style={s.loadingContainer}>
            <div style={s.spinner}></div>
            <h2 style={{ color: '#fff' }}>טוען...</h2>
        </div>
    );

    const sectorLabels = {
        ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני',
        haredi: 'חרדי', dati_leumi: 'דתי לאומי', mixed: 'מעורב', other: 'אחר'
    };

    return (
        <div style={s.page}>
            <div style={s.container}>
                <h1 style={s.title}>🏠 לוח בקרה</h1>

                {/* התראות פעולות נדרשות */}
                {(stats.pending > 0 || stats.matches > 0) && (
                    <div style={s.alertBanner}>
                        <span style={{ fontSize: '1.4rem' }}>🔔</span>
                        <div style={{ flex: 1 }}>
                            {stats.pending > 0 && (
                                <div>⚠️ <strong>{stats.pending}</strong> משתמשים ממתינים לאישור</div>
                            )}
                            {stats.matches > 0 && (
                                <div>💍 <strong>{stats.matches}</strong> שידוכים פעילים הממתינים לטיפול</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {stats.pending > 0 && (
                                <button onClick={() => navigate('/admin/pending-profiles')} style={s.alertBtn}>
                                    לאישורים ←
                                </button>
                            )}
                            {stats.matches > 0 && (
                                <button onClick={() => navigate('/admin/matches')} style={{ ...s.alertBtn, background: '#059669', color: '#fff' }}>
                                    לשידוכים ←
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* התראת פניות פתוחות */}
                {openTickets > 0 && (
                    <div style={{ ...s.alertBanner, background: 'rgba(59,130,246,0.15)', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.4rem' }}>📬</span>
                        <div style={{ flex: 1 }}>
                            <strong>{openTickets}</strong> פניות תמיכה חדשות ממתינות לטיפול
                        </div>
                        <button onClick={() => navigate('/admin/support')} style={{ ...s.alertBtn, background: '#1e3a5f', color: '#fff' }}>
                            לפניות ←
                        </button>
                    </div>
                )}

                {/* כרטיסי KPI */}
                <div style={s.kpiGrid}>
                    <div style={{ ...s.kpiCard, cursor: 'pointer' }} onClick={() => navigate('/admin/users')}>
                        <div style={s.kpiIcon}>👥</div>
                        <div style={s.kpiNum}>{stats.total}</div>
                        <div style={s.kpiLabel}>סה״כ משתמשים</div>
                        <div style={s.kpiLink}>צפה ברשימה ←</div>
                    </div>
                    <div style={{ ...s.kpiCard, borderTop: '4px solid #f59e0b', cursor: 'pointer' }} onClick={() => navigate('/admin/pending-profiles')}>
                        <div style={s.kpiIcon}>⏳</div>
                        <div style={{ ...s.kpiNum, color: stats.pending > 0 ? '#d97706' : '#1e3a5f' }}>{stats.pending}</div>
                        <div style={s.kpiLabel}>ממתינים לאישור</div>
                        <div style={s.kpiLink}>לטיפול ←</div>
                    </div>
                    <div style={{ ...s.kpiCard, borderTop: '4px solid #10b981', cursor: 'pointer' }} onClick={() => navigate('/admin/matches')}>
                        <div style={s.kpiIcon}>💍</div>
                        <div style={{ ...s.kpiNum, color: stats.matches > 0 ? '#059669' : '#1e3a5f' }}>{stats.matches}</div>
                        <div style={s.kpiLabel}>שידוכים פעילים</div>
                        <div style={s.kpiLink}>ניהול שידוכים ←</div>
                    </div>
                </div>

                {/* ניווט מהיר */}
                <div style={s.section}>
                    <h2 style={s.sectionTitle}>⚡ פעולות מהירות</h2>
                    <div style={s.navGrid}>
                        <button style={s.navBtn} onClick={() => navigate('/admin/users')}>
                            <div style={{ fontSize: '2rem' }}>👥</div>
                            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>ניהול משתמשים</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>חיפוש, סינון, עריכה</div>
                        </button>
                        <button style={s.navBtn} onClick={() => navigate('/admin/matches')}>
                            <div style={{ fontSize: '2rem' }}>💍</div>
                            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>ניהול שידוכים</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>שדכניות, כרטיסיות, סגירה</div>
                        </button>
                        <button style={s.navBtn} onClick={() => navigate('/admin/pending-profiles')}>
                            <div style={{ fontSize: '2rem' }}>📝</div>
                            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>אישורי פרופיל</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                                {stats.pending > 0 ? `${stats.pending} ממתינים` : 'הכל מטופל ✓'}
                            </div>
                        </button>
                        <button style={s.navBtn} onClick={() => navigate('/admin/support')}>
                            <div style={{ fontSize: '2rem' }}>📬</div>
                            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>פניות תמיכה</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                                {openTickets > 0 ? `${openTickets} חדשות` : 'הכל מטופל ✓'}
                            </div>
                        </button>
                    </div>
                </div>

                {/* סטטיסטיקות מורחבות */}
                <div style={s.section}>
                    <button style={s.statsToggle} onClick={() => setShowStats(!showStats)}>
                        📊 {showStats ? 'הסתר' : 'הצג'} סטטיסטיקות מפורטות
                    </button>

                    {showStats && (
                        <div style={s.statsPanel}>
                            {stats.sectors.length > 0 && (
                                <div style={s.statsBlock}>
                                    <h3 style={s.statsBlockTitle}>פילוח לפי מגזר</h3>
                                    <div style={s.statsGrid}>
                                        {stats.sectors.map((s2, i) => (
                                            <div key={i} style={s.statRow}>
                                                <span style={s.statRowLabel}>{sectorLabels[s2.heritage_sector] || s2.heritage_sector || 'לא מוגדר'}</span>
                                                <span style={s.statRowVal}>{s2.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.monthly.length > 0 && (
                                <div style={s.statsBlock}>
                                    <h3 style={s.statsBlockTitle}>ההרשמות — 6 חודשים אחרונים</h3>
                                    <div style={s.statsGrid}>
                                        {stats.monthly.map((m, i) => (
                                            <div key={i} style={s.statRow}>
                                                <span style={s.statRowLabel}>{m.month}</span>
                                                <span style={s.statRowVal}>{m.count} נרשמים</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* סטטיסטיקות IVR */}
                            <div style={s.statsBlock}>
                                <h3 style={s.statsBlockTitle}>📞 שיחות טלפון — 30 ימים אחרונים</h3>
                                <div style={s.statsGrid}>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>סה״כ שיחות</span>
                                        <span style={s.statRowVal}>{stats.ivr?.total_calls ?? '—'}</span>
                                    </div>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>מתקשרים ייחודיים</span>
                                        <span style={s.statRowVal}>{stats.ivr?.unique_callers ?? '—'}</span>
                                    </div>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>סה״כ דקות שיחה</span>
                                        <span style={s.statRowVal}>{stats.ivr?.total_minutes ?? '—'} דק׳</span>
                                    </div>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>ממוצע לשיחה</span>
                                        <span style={s.statRowVal}>{stats.ivr?.avg_seconds ? `${Math.round(stats.ivr.avg_seconds / 60)} דק׳ ${stats.ivr.avg_seconds % 60} שנ׳` : '—'}</span>
                                    </div>
                                </div>
                                {stats.ivr?.daily?.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>לפי יום — שבוע אחרון</div>
                                        <div style={s.statsGrid}>
                                            {stats.ivr.daily.map((d, i) => (
                                                <div key={i} style={s.statRow}>
                                                    <span style={s.statRowLabel}>{d.day}</span>
                                                    <span style={s.statRowVal}>{d.calls} שיחות · {d.minutes} דק׳</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* סטטיסטיקות התחברויות לאתר */}
                            <div style={s.statsBlock}>
                                <h3 style={s.statsBlockTitle}>🌐 התחברויות לאתר — 30 ימים אחרונים</h3>
                                <div style={s.statsGrid}>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>סה״כ התחברויות</span>
                                        <span style={s.statRowVal}>{stats.web?.total_logins ?? '—'}</span>
                                    </div>
                                    <div style={s.statRow}>
                                        <span style={s.statRowLabel}>משתמשים ייחודיים</span>
                                        <span style={s.statRowVal}>{stats.web?.unique_users ?? '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '30px 20px',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    container: { maxWidth: '900px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)'
    },
    spinner: {
        width: '45px', height: '45px',
        border: '5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
        borderRadius: '50%', animation: 'spin 1s linear infinite'
    },
    title: { color: '#fff', fontSize: '2rem', margin: '0 0 25px' },

    alertBanner: {
        background: 'rgba(251, 191, 36, 0.95)', color: '#1e3a5f',
        padding: '18px 22px', borderRadius: '14px', marginBottom: '28px',
        display: 'flex', alignItems: 'center', gap: '15px',
        boxShadow: '0 4px 20px rgba(251,191,36,0.4)',
        lineHeight: 1.8
    },
    alertBtn: {
        background: '#c9a227', color: '#1e3a5f', border: 'none',
        padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold',
        cursor: 'pointer', whiteSpace: 'nowrap'
    },

    kpiGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px', marginBottom: '30px'
    },
    kpiCard: {
        background: '#fff', borderRadius: '14px', padding: '22px',
        textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderTop: '4px solid #1e3a5f', transition: 'transform 0.2s',
    },
    kpiIcon: { fontSize: '2.2rem', marginBottom: '8px' },
    kpiNum: { fontSize: '2.8rem', fontWeight: '800', color: '#1e3a5f', lineHeight: 1 },
    kpiLabel: { color: '#64748b', fontSize: '0.95rem', marginTop: '6px' },
    kpiLink: { marginTop: '10px', color: '#c9a227', fontSize: '0.85rem', fontWeight: 'bold' },

    section: { marginBottom: '30px' },
    sectionTitle: { color: '#fff', margin: '0 0 15px', fontSize: '1.2rem' },
    navGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' },
    navBtn: {
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff', borderRadius: '14px', padding: '22px 18px',
        cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s',
        width: '100%'
    },

    statsToggle: {
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff', borderRadius: '10px', padding: '12px 22px',
        cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'
    },
    statsPanel: {
        marginTop: '16px', background: '#fff', borderRadius: '14px',
        padding: '20px', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'
    },
    statsBlock: {},
    statsBlockTitle: { color: '#1e3a5f', margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold' },
    statsGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
    statRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', background: '#f8fafc', borderRadius: '8px'
    },
    statRowLabel: { color: '#374151', fontSize: '0.95rem' },
    statRowVal: { color: '#1e3a5f', fontWeight: 'bold', fontSize: '1rem' },
};

export default AdminDashboard;
