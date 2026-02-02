import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Connections() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    const fetchConnections = async (userId) => {
        try {
            const res = await fetch(`http://localhost:3000/my-connections?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                navigate('/login');
                return;
            }

            const data = await res.json();

            if (Array.isArray(data)) {
                setConnections(data);
            } else {
                setConnections([]);
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching connections:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }
        fetchConnections(user.id);
    }, [navigate, token]);

    const handleFinalApprove = async (connectionId) => {
        try {
            const res = await fetch('http://localhost:3000/finalize-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ connectionId, userId: user.id })
            });
            const result = await res.json();
            alert(result.message);
            fetchConnections(user.id);
        } catch (err) {
            alert("שגיאה בשליחת האישור");
        }
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען פרטים...</h2>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>💍 השידוכים שלי</h1>
                <p style={styles.subtitle}>כאן מופיעים פרטי הבירורים עבור התאמות מאושרות</p>

                {connections.length === 0 ? (
                    <div style={styles.empty}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>💔</div>
                        <h3>אין שידוכים פעילים כרגע</h3>
                        <p>כשתאשרו התאמה הדדית, היא תופיע כאן</p>
                        <button onClick={() => navigate('/inbox')} style={styles.linkBtn}>
                            לתיבת ההודעות
                        </button>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {connections.map(conn => {
                            const isSender = conn.sender_id === user.id;
                            const alreadyApproved = isSender ? conn.sender_final_approve : conn.receiver_final_approve;
                            const otherSideReady = isSender ? conn.receiver_final_approve : conn.sender_final_approve;

                            return (
                                <div key={conn.id} style={styles.card}>
                                    <div style={styles.header}>
                                        <div style={styles.headerLeft}>
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${conn.full_name}&background=1e3a5f&color=fff&size=50`}
                                                alt={conn.full_name}
                                                style={styles.avatar}
                                            />
                                            <h2 style={styles.name}>{conn.full_name}</h2>
                                        </div>
                                        <span style={conn.status === 'waiting_for_shadchan' ? styles.badgeGold : styles.badge}>
                                            {conn.status === 'waiting_for_shadchan' ? '⏳ בטיפול שדכנית' : '🔍 שלב בירורים'}
                                        </span>
                                    </div>

                                    <div style={styles.body}>
                                        <div style={styles.infoSection}>
                                            <h4 style={styles.infoTitle}>👥 פרטים לבירורים:</h4>
                                            <div style={styles.infoItem}>
                                                <span style={styles.infoLabel}>ממליץ 1:</span>
                                                <span>{conn.reference_1_name || '---'}</span>
                                                <a href={`tel:${conn.reference_1_phone}`} style={styles.phoneLink}>
                                                    📞 {conn.reference_1_phone || '---'}
                                                </a>
                                            </div>
                                            <div style={styles.infoItem}>
                                                <span style={styles.infoLabel}>ממליץ 2:</span>
                                                <span>{conn.reference_2_name || '---'}</span>
                                                <a href={`tel:${conn.reference_2_phone}`} style={styles.phoneLink}>
                                                    📞 {conn.reference_2_phone || '---'}
                                                </a>
                                            </div>
                                            <div style={styles.infoItem}>
                                                <span style={styles.infoLabel}>{user.gender === 'male' ? 'רבנית:' : 'רב:'}</span>
                                                <span>{conn.rabbi_name || '---'}</span>
                                                <a href={`tel:${conn.rabbi_phone}`} style={styles.phoneLink}>
                                                    📞 {conn.rabbi_phone || '---'}
                                                </a>
                                            </div>
                                        </div>

                                        {conn.status !== 'waiting_for_shadchan' && (
                                            <div style={styles.actionArea}>
                                                {otherSideReady && !alreadyApproved && (
                                                    <div style={styles.waitingNotice}>
                                                        🔔 הצד השני סיים בירורים ומחכה לך!
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleFinalApprove(conn.id)}
                                                    disabled={alreadyApproved}
                                                    style={alreadyApproved ? styles.doneBtn : styles.approveBtn}
                                                >
                                                    {alreadyApproved ? 'הודעתך הועברה לשדכנית ✅' : 'סיימתי בירורים - אני מעוניין/ת 👍'}
                                                </button>
                                            </div>
                                        )}

                                        {conn.status === 'waiting_for_shadchan' && (
                                            <div style={styles.successBox}>
                                                🎉 שניכם אישרתם! הפרטים הועברו לשדכנית ליצירת קשר.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
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
    container: { maxWidth: '1000px', margin: '0 auto' },
    title: { color: '#fff', textAlign: 'center', marginBottom: '10px', fontSize: '2rem' },
    subtitle: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    card: {
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        overflow: 'hidden'
    },
    header: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #c9a227' },
    name: { color: '#fff', margin: 0, fontSize: '1.3rem' },
    badge: {
        fontSize: '0.8rem',
        background: 'rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontWeight: 'bold'
    },
    badgeGold: {
        fontSize: '0.8rem',
        background: '#c9a227',
        color: '#1a1a1a',
        padding: '6px 12px',
        borderRadius: '20px',
        fontWeight: 'bold'
    },
    body: { padding: '25px' },
    infoSection: {
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px'
    },
    infoTitle: { margin: '0 0 15px', color: '#1e3a5f' },
    infoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb'
    },
    infoLabel: { fontWeight: 'bold', color: '#374151' },
    phoneLink: { color: '#1e3a5f', textDecoration: 'none', fontWeight: 'bold' },
    actionArea: { textAlign: 'center' },
    waitingNotice: {
        color: '#c9a227',
        fontWeight: 'bold',
        marginBottom: '15px',
        fontSize: '1rem',
        background: '#fef3c7',
        padding: '10px',
        borderRadius: '10px'
    },
    approveBtn: {
        width: '100%',
        padding: '15px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 15px rgba(30, 58, 95, 0.3)'
    },
    doneBtn: {
        width: '100%',
        padding: '15px',
        background: '#9ca3af',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'default'
    },
    successBox: {
        background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
        color: '#155724',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1rem'
    },
    empty: {
        background: '#fff',
        borderRadius: '20px',
        padding: '50px',
        textAlign: 'center',
        color: '#374151'
    },
    linkBtn: {
        background: 'linear-gradient(135deg, #c9a227, #d4a72c)',
        color: '#1a1a1a',
        border: 'none',
        padding: '12px 30px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginTop: '20px'
    }
};

export default Connections;