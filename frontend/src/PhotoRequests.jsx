import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function PhotoRequests() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchRequests();
    }, [navigate, token]);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:3000/pending-photo-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            // הגנה: וודא שזה מערך
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setRequests([]);
        }
        setLoading(false);
    };

    const handleResponse = async (requesterId, response) => {
        try {
            const res = await fetch('http://localhost:3000/respond-photo-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ requesterId, response })
            });
            const data = await res.json();
            alert(data.message);

            // הסרת הבקשה מהרשימה
            setRequests(prev => prev.filter(r => r.requester_id !== requesterId));
        } catch (err) {
            alert('שגיאה');
        }
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען בקשות...</h2>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    ← חזרה
                </button>

                <h1 style={styles.title}>📷 בקשות לצפייה בתמונות</h1>
                <p style={styles.subtitle}>
                    אנשים שמעוניינים לראות את התמונות שלך
                </p>

                {requests.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>📭</div>
                        <h3>אין בקשות ממתינות</h3>
                        <p>כשמישהו יבקש לראות את התמונות שלך, הבקשה תופיע כאן</p>
                    </div>
                ) : (
                    <div style={styles.requestsList}>
                        {requests.map((req, idx) => (
                            <div key={idx} style={styles.requestCard}>
                                <div style={styles.requestHeader}>
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${req.full_name}&background=1e3a5f&color=fff&size=60&bold=true`}
                                        alt={req.full_name}
                                        style={styles.avatar}
                                    />
                                    <div>
                                        <h3 style={styles.requestName}>{req.full_name}</h3>
                                        <p style={styles.requestInfo}>
                                            {req.profile_images_count > 0
                                                ? `📷 יש לו ${req.profile_images_count} תמונות`
                                                : '📷 אין לו תמונות עדיין'}
                                        </p>
                                    </div>
                                </div>

                                <p style={styles.requestMessage}>
                                    מבקש/ת לראות את התמונות שלך
                                </p>

                                <div style={styles.infoBox}>
                                    <strong>💡 שים לב:</strong> אם תאשר, גם תוכל לראות את התמונות שלו!
                                </div>

                                <div style={styles.buttonsRow}>
                                    <button
                                        onClick={() => handleResponse(req.requester_id, 'approve')}
                                        style={styles.approveButton}
                                    >
                                        ✅ לאשר
                                    </button>
                                    <button
                                        onClick={() => handleResponse(req.requester_id, 'auto_approve')}
                                        style={styles.autoApproveButton}
                                    >
                                        🔄 לאשר תמיד
                                    </button>
                                    <button
                                        onClick={() => handleResponse(req.requester_id, 'reject')}
                                        style={styles.rejectButton}
                                    >
                                        ❌ לא כרגע
                                    </button>
                                </div>

                                <p style={styles.optionExplain}>
                                    <strong>"לאשר תמיד"</strong> = כל תמונה שתעלה בעתיד תהיה גלויה לו
                                </p>
                            </div>
                        ))}
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
    container: {
        maxWidth: '600px',
        margin: '0 auto'
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
        width: '50px',
        height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    backButton: {
        background: 'rgba(255,255,255,0.2)',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '10px',
        cursor: 'pointer',
        marginBottom: '20px'
    },
    title: {
        color: '#fff',
        margin: '0 0 10px',
        fontSize: '1.8rem'
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        margin: '0 0 30px'
    },
    emptyState: {
        background: '#fff',
        borderRadius: '20px',
        padding: '50px 30px',
        textAlign: 'center',
        color: '#374151'
    },
    requestsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    requestCard: {
        background: '#fff',
        borderRadius: '20px',
        padding: '25px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    },
    requestHeader: {
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        marginBottom: '15px'
    },
    avatar: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '3px solid #c9a227'
    },
    requestName: {
        margin: '0 0 5px',
        color: '#1e3a5f',
        fontSize: '1.2rem'
    },
    requestInfo: {
        margin: 0,
        color: '#6b7280',
        fontSize: '0.9rem'
    },
    requestMessage: {
        background: '#f3f4f6',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '15px',
        textAlign: 'center',
        color: '#374151'
    },
    infoBox: {
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        padding: '12px',
        borderRadius: '10px',
        marginBottom: '15px',
        fontSize: '0.9rem',
        color: '#92400e'
    },
    buttonsRow: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px'
    },
    approveButton: {
        flex: 1,
        padding: '12px',
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    autoApproveButton: {
        flex: 1,
        padding: '12px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    rejectButton: {
        flex: 1,
        padding: '12px',
        background: '#f1f5f9',
        color: '#64748b',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    optionExplain: {
        fontSize: '0.8rem',
        color: '#9ca3af',
        textAlign: 'center',
        margin: 0
    }
};

export default PhotoRequests;
