import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Connections() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // שליפת המשתמש והטוקן
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    const fetchConnections = async (userId) => {
        try {
            const res = await fetch(`http://localhost:3000/my-connections?userId=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` } // 🔑 הוספנו מפתח
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
    }, [navigate, token]); // תלות בטוקן

    const handleFinalApprove = async (connectionId) => {
        try {
            const res = await fetch('http://localhost:3000/finalize-connection', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 הוספנו מפתח
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

    if (loading) return <div style={styles.loading}>טוען פרטים... 🔐</div>;

    // --- ה-HTML המקורי שלך (ללא שינוי) ---
    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>💍 השידוכים שלי</h1>
                <p style={styles.subtitle}>כאן מופיעים פרטי הבירורים עבור התאמות מאושרות.</p>

                {connections.length === 0 ? (
                    <div style={styles.empty}>
                        <h3>אין שידוכים פעילים כרגע</h3>
                        <button onClick={() => navigate('/inbox')} style={styles.linkBtn}>חזור לתיבת הבקשות</button>
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
                                        <h2>{conn.full_name}</h2>
                                        <span style={styles.badge}>
                                            {conn.status === 'waiting_for_shadchan' ? 'בטיפול שדכנית ⏳' : 'שלב בירורים'}
                                        </span>
                                    </div>
                                    
                                    <div style={styles.body}>
                                        <div style={styles.infoSection}>
                                            <h4>👥 פרטים לבירורים:</h4>
                                            <p><strong>ממליץ 1:</strong> {conn.reference_1_name || '---'} ({conn.reference_1_phone || '---'})</p>
                                            <p><strong>ממליץ 2:</strong> {conn.reference_2_name || '---'} ({conn.reference_2_phone || '---'})</p>
                                            <p><strong>{user.gender === 'male' ? 'רבנית:' : 'רב:'}</strong> {conn.rabbi_name || '---'} ({conn.rabbi_phone || '---'})</p>
                                        </div>

                                        {conn.status !== 'waiting_for_shadchan' && (
                                            <div style={styles.actionArea}>
                                                {otherSideReady && !alreadyApproved && (
                                                    <div style={styles.waitingNotice}>🔔 הצד השני סיים בירורים ומחכה לך!</div>
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

// --- העיצוב המקורי שלך (ללא שינוי) ---
const styles = {
    page: { fontFamily: 'Segoe UI', background: '#f9fafb', minHeight: '100vh', padding: '20px', direction: 'rtl' },
    loading: { textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' },
    container: { maxWidth: '1000px', margin: '0 auto' },
    title: { textAlign: 'center', color: '#db2777', marginBottom: '10px' },
    subtitle: { textAlign: 'center', color: '#6b7280', marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    card: { background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', overflow: 'hidden' },
    header: { background: '#fdf2f8', padding: '15px', borderBottom: '1px solid #fce7f3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    badge: { fontSize: '0.8rem', background: '#fce7f3', color: '#db2777', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' },
    body: { padding: '20px' },
    infoSection: { background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.95rem' },
    actionArea: { textAlign: 'center' },
    waitingNotice: { color: '#db2777', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem', animation: 'pulse 2s infinite' },
    approveBtn: { width: '100%', padding: '12px', background: '#db2777', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    doneBtn: { width: '100%', padding: '12px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'default' },
    successBox: { background: '#f0fdf4', color: '#166534', padding: '15px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #bbf7d0' },
    empty: { textAlign: 'center', marginTop: '50px', color: '#6b7280' },
    linkBtn: { background: 'none', border: 'none', color: '#db2777', textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem' }
};

export default Connections;