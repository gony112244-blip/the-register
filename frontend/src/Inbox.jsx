import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Inbox() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    // שליפת הטוקן והמשתמש מהזיכרון
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // פונקציה לטעינת הבקשות
    const fetchRequests = async () => {
        if (!user || !token) {
            navigate('/login');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/my-requests?userId=${user.id}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 הוספנו את המפתח
                }
            });

            // טיפול במקרה שהחיבור פג תוקף
            if (res.status === 401 || res.status === 403) {
                alert("החיבור פג תוקף, נא להתחבר מחדש");
                navigate('/login');
                return;
            }

            const data = await res.json();

            // הגנה מקריסה: מוודאים שקיבלנו מערך לפני שעושים map
            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]); // אם השרת מחזיר הודעה במקום רשימה
            }
        } catch (err) {
            console.error("Error loading requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // טיפול באישור
    const handleApprove = async (connection_id) => {
        try {
            const res = await fetch('http://localhost:3000/approve-request', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 חובה גם כאן
                },
                body: JSON.stringify({ connectionId: connection_id, userId: user.id })
            });
            
            if (res.ok) {
                alert("🎉 מזל טוב! השידוך הפך לפעיל.");
                fetchRequests(); // רענון הרשימה
            }
        } catch (err) {
            console.error(err);
        }
    };

    // טיפול בדחייה
    const handleReject = async (connection_id) => {
        if (!window.confirm("האם את/ה בטוח/ה שברצונך לדחות את ההצעה?")) return;
        
        try {
            const res = await fetch('http://localhost:3000/reject-request', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 חובה גם כאן
                },
                body: JSON.stringify({ connectionId: connection_id })
            });

            if (res.ok) fetchRequests();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div style={{textAlign: 'center', marginTop: '50px', fontFamily: 'Segoe UI'}}>בודק דואר... 📩</div>;

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1>תיבת הבקשות שלי 📬</h1>
                <button onClick={() => navigate('/matches')} style={styles.backButton}>חזרה לשידוכים</button>
            </header>

            <div style={styles.container}>
                {requests.length === 0 ? (
                    <div style={styles.empty}>
                        <h3>אין בקשות חדשות כרגע...</h3>
                        <p>אבל אל דאגה, ברגע שמישהו יעשה לך לייק - זה יופיע כאן!</p>
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req.connection_id} style={styles.card}>
                            <div style={styles.info}>
                                <h2>{req.full_name}, {req.age}</h2>
                                <p>{req.sector} • {req.height} מ'</p>
                                <small>התקבל בתאריך: {new Date(req.created_at).toLocaleDateString()}</small>
                            </div>
                            <div style={styles.actions}>
                                <button onClick={() => handleReject(req.connection_id)} style={styles.rejectBtn}>❌ לא תודה</button>
                                <button onClick={() => handleApprove(req.connection_id)} style={styles.approveBtn}>✅ מאשר/ת!</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// העיצוב המקורי שלך - לא נגעתי בו
const styles = {
    page: { fontFamily: 'Segoe UI', background: '#f0f2f5', minHeight: '100vh', direction: 'rtl' },
    header: { background: '#fff', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    backButton: { background: 'none', border: '1px solid #333', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Segoe UI' },
    container: { maxWidth: '800px', margin: '30px auto', padding: '0 20px' },
    card: { background: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    info: { flex: 1 },
    actions: { display: 'flex', gap: '10px' },
    approveBtn: { background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'Segoe UI' },
    rejectBtn: { background: '#ff4d4d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Segoe UI' },
    empty: { textAlign: 'center', color: '#666', marginTop: '50px' }
};

export default Inbox;