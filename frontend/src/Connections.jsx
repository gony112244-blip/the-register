import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Connections() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // שליפת המשתמש
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        // הגנה: אם אין משתמש, זורקים ללוגין
        if (!user) {
            navigate('/login');
            return;
        }

        // שליפת הנתונים מהשרת
        fetch(`http://localhost:3000/my-connections?userId=${user.id}`)
            .then(res => {
                // בדיקה אם השרת החזיר שגיאה (כמו 500 או 400)
                if (!res.ok) {
                    throw new Error('Server error');
                }
                return res.json();
            })
            .then(data => {
                // הגנה קריטית: וודא שקיבלנו מערך לפני שמנסים להציג אותו
                if (Array.isArray(data)) {
                    setConnections(data);
                } else {
                    console.warn("התקבל מידע שאינו מערך:", data);
                    setConnections([]); 
                }
                setLoading(false);
            })
            .catch(err => {
                // במקרה של תקלה, מדפיסים לקונסול ולא מפילים את האתר
                console.error("Error loading connections:", err);
                setConnections([]); // מציגים רשימה ריקה כדי שהאתר ימשיך לעבוד
                setLoading(false);
            });
            
    }, [navigate]);

    if (loading) return <div style={styles.loading}>טוען פרטים רגישים... 🔐</div>;

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>🎉 השידוכים המאושרים שלי</h1>
                <p style={styles.subtitle}>כאן מופיעים אנשים שהשידוך איתם אושר. בהצלחה!</p>

                {connections.length === 0 ? (
                    <div style={styles.empty}>
                        <h3>עדיין אין שידוכים פעילים</h3>
                        <p>ייתכן שהצד השני עדיין לא אישר, או שיש תקלה בטעינת הנתונים.</p>
                        <button onClick={() => navigate('/inbox')} style={styles.linkBtn}>בדוק את ה-Inbox שלך</button>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {connections.map(conn => (
                            <div key={conn.connection_id} style={styles.card}>
                                <div style={styles.header}>
                                    <h2>{conn.full_name}, {conn.age}</h2>
                                    <span style={styles.badge}>פעיל ✅</span>
                                </div>
                                
                                <div style={styles.body}>
                                    <div style={styles.section}>
                                        <label>📞 טלפון אישי:</label>
                                        <div style={styles.phoneBox}>{conn.phone}</div>
                                    </div>

                                    <div style={styles.divider}></div>

                                    <h4>👥 ממליצים:</h4>
                                    {conn.reference_1_name ? (
                                        <div style={styles.refRow}>
                                            <span>{conn.reference_1_name}:</span>
                                            <a href={`tel:${conn.reference_1_phone}`} style={styles.refPhone}>{conn.reference_1_phone}</a>
                                        </div>
                                    ) : <p style={styles.noInfo}>לא הוזנו ממליצים</p>}

                                    {conn.reference_2_name && (
                                        <div style={styles.refRow}>
                                            <span>{conn.reference_2_name}:</span>
                                            <a href={`tel:${conn.reference_2_phone}`} style={styles.refPhone}>{conn.reference_2_phone}</a>
                                        </div>
                                    )}

                                    <div style={styles.warningBox}>
                                        ⚠️ שים לב: השידוך פתוח ל-24 שעות בלבד.
                                        <br/>יש ליצור קשר בהקדם.
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { fontFamily: 'Segoe UI', background: '#f8fafc', minHeight: '100vh', padding: '20px', direction: 'rtl' },
    loading: { textAlign: 'center', marginTop: '50px', fontSize: '1.5rem', color: '#4f46e5' },
    container: { maxWidth: '1000px', margin: '0 auto' },
    title: { textAlign: 'center', color: '#1e293b', marginBottom: '10px' },
    subtitle: { textAlign: 'center', color: '#64748b', marginBottom: '40px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { background: 'white', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' },
    header: { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    badge: { background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8rem' },
    body: { padding: '20px' },
    section: { marginBottom: '15px' },
    phoneBox: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', background: '#f1f5f9', padding: '10px', borderRadius: '8px', textAlign: 'center', marginTop: '5px' },
    divider: { height: '1px', background: '#e2e8f0', margin: '20px 0' },
    refRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' },
    refPhone: { color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' },
    noInfo: { color: '#94a3b8', fontStyle: 'italic' },
    warningBox: { marginTop: '20px', background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: '50px', color: '#64748b' },
    linkBtn: { background: 'none', border: 'none', color: '#4f46e5', textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }
};

export default Connections;