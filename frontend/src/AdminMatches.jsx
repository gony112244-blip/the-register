import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminMatches() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. שליפת הטוקן (חובה!)
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchWaitingMatches();
    }, [navigate, token]);

    // 2. שליפה מאובטחת עם הטוקן
    const fetchWaitingMatches = async () => {
        try {
            const res = await fetch('http://localhost:3000/admin/matches-to-handle', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 המפתח
                }
            });

            if (res.status === 401 || res.status === 403) {
                navigate('/login');
                return;
            }

            const data = await res.json();
            
            if (Array.isArray(data)) {
                setMatches(data);
            } else {
                setMatches([]);
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching admin data:", err);
            setLoading(false);
        }
    };

    // 3. הפונקציה לטיפול בכפתור (סוגר את התיק)
    const handleMarkAsDone = async (connectionId) => {
        if(!window.confirm("האם יצרת קשר עם הזוג ואפשר לסגור את התיק?")) return;

        try {
            const res = await fetch(`http://localhost:3000/admin/mark-handled/${connectionId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}` // 🔑 חובה גם כאן
                }
            });

            if (res.ok) {
                alert("התיק נסגר והועבר לארכיון! 🎉");
                // מחיקה מהמסך מיד
                setMatches(matches.filter(m => m.connection_id !== connectionId));
            } else {
                alert("שגיאה בעדכון התיק");
            }
        } catch (err) {
            console.error(err);
            alert("תקלה בתקשורת");
        }
    };

    if (loading) return <div style={styles.info}>טוען תיקי שידוך... 📂</div>;

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1>🛡️ פאנל ניהול שידוכים</h1>
                <p>כאן מופיעים זוגות שסיימו בירורים וממתינים לשיחת טלפון מהשדכנית.</p>
            </header>

            <div style={styles.container}>
                {matches.length === 0 ? (
                    <div style={styles.empty}>אין כרגע שידוכים הממתינים לטיפול.</div>
                ) : (
                    matches.map(match => (
                        <div key={match.connection_id} style={styles.matchCard}>
                            {/* צד א' - היוזם */}
                            <div style={styles.side}>
                                <h3 style={styles.name}>{match.sender_name}</h3>
                                <div style={styles.phoneBox}>
                                    <span style={styles.label}>טלפון ליצירת קשר:</span>
                                    <a href={`tel:${match.sender_phone}`} style={styles.phoneNumber}>{match.sender_phone}</a>
                                </div>
                                <p><strong>רב/ממליץ:</strong> {match.sender_rabbi || 'לא הוזן'}</p>
                            </div>

                            <div style={styles.divider}>
                                <div style={styles.heart}>❤️</div>
                                <div style={styles.line}></div>
                            </div>

                            {/* צד ב' - המשיב */}
                            <div style={styles.side}>
                                <h3 style={styles.name}>{match.receiver_name}</h3>
                                <div style={styles.phoneBox}>
                                    <span style={styles.label}>טלפון ליצירת קשר:</span>
                                    <a href={`tel:${match.receiver_phone}`} style={styles.phoneNumber}>{match.receiver_phone}</a>
                                </div>
                                <p><strong>רב/מורה:</strong> {match.receiver_rabbi || 'לא הוזן'}</p>
                            </div>

                            {/* --- כאן הכפתור שהיה חסר! --- */}
                            <button 
                                onClick={() => handleMarkAsDone(match.connection_id)}
                                style={styles.actionBtn}
                            >
                                ✅ סמן כטופל וסגור תיק
                            </button>
                            {/* --------------------------- */}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { padding: '30px', direction: 'rtl', fontFamily: 'Segoe UI', background: '#f0f2f5', minHeight: '100vh' },
    header: { textAlign: 'center', marginBottom: '40px' },
    container: { maxWidth: '900px', margin: '0 auto' },
    matchCard: { 
        display: 'flex', flexWrap: 'wrap', // הוספתי wrap כדי שהכפתור ירד למטה אם צריך
        background: 'white', borderRadius: '15px', padding: '25px', 
        marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', alignItems: 'center',
        position: 'relative'
    },
    side: { flex: 1, textAlign: 'center', minWidth: '200px' },
    name: { color: '#db2777', fontSize: '1.4rem', marginBottom: '10px' },
    phoneBox: { background: '#fdf2f8', padding: '15px', borderRadius: '10px', marginBottom: '10px' },
    label: { display: 'block', fontSize: '0.8rem', color: '#666' },
    phoneNumber: { fontSize: '1.6rem', fontWeight: 'bold', color: '#db2777', textDecoration: 'none' },
    divider: { padding: '0 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    heart: { fontSize: '1.5rem', marginBottom: '5px' },
    line: { width: '2px', height: '80px', background: '#fbcfe8' },
    empty: { textAlign: 'center', fontSize: '1.2rem', color: '#666', marginTop: '50px' },
    info: { textAlign: 'center', marginTop: '100px', fontSize: '1.2rem' },
    
    // סגנון הכפתור החדש
    actionBtn: {
        width: '100%',
        marginTop: '20px',
        padding: '15px',
        background: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        flexBasis: '100%' // גורם לכפתור לתפוס שורה מלאה למטה
    }
};

export default AdminMatches;