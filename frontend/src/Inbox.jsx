import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Inbox() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [messages, setMessages] = useState([]);
    const [connectionRequests, setConnectionRequests] = useState([]);
    const [photoRequests, setPhotoRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('messages');
    const [refResponseModal, setRefResponseModal] = useState(null); // { requestId, fromName }
    const [refName, setRefName] = useState('');
    const [refPhone, setRefPhone] = useState('');
    const [refSending, setRefSending] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchAll();
    }, [navigate, token]);

    const fetchAll = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));

            // 1. הודעות מערכת
            const msgRes = await fetch(`${API_BASE}/my-messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const msgData = await msgRes.json();
            const msgs = Array.isArray(msgData) ? msgData : [];
            setMessages(msgs);

            // סמן כל ההודעות כנקראות ברגע שהמשתמש רואה אותן
            if (msgs.some(m => !m.is_read)) {
                fetch(`${API_BASE}/mark-all-messages-read`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
                setMessages(msgs.map(m => ({ ...m, is_read: true })));
            }

            // 2. בקשות שידוך
            if (user && user.id) { // וודא שיש מזהה משתמש
                const reqRes = await fetch(`${API_BASE}/my-requests?userId=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const reqData = await reqRes.json();
                setConnectionRequests(Array.isArray(reqData) ? reqData : []);
            }

            // 3. בקשות תמונות
            const photoRes = await fetch(`${API_BASE}/pending-photo-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const photoData = await photoRes.json();
            setPhotoRequests(Array.isArray(photoData) ? photoData : []);

        } catch (err) {
            console.error("Error fetching inbox data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await fetch(`${API_BASE}/mark-message-read/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // עדכון לוקאלי
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        } catch (err) {
            console.error(err);
        }
    };

    const handleApproveConnection = async (connectionId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const res = await fetch(`${API_BASE}/approve-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId, userId: user.id })
            });
            if (res.ok) {
                alert("🎉 השידוך אושר!");
                fetchAll();
            }
        } catch (err) {
            alert('שגיאה');
        }
    };

    const handleRejectConnection = async (connectionId, userId) => {
        const choice = window.confirm("לדחות את ההצעה?");
        if (!choice) return;
        try {
            await fetch(`${API_BASE}/reject-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId })
            });
            // לאחר הדחייה, הצע חסימה בנוסח רך
            const shouldBlock = window.confirm(
                "ההצעה נדחתה.\n\nהאם תרצה שמועמד/ת זה לא יוכל/תוכל לפנות אליך שוב בעתיד?\n(לחץ 'אישור' כדי למנוע פניות חוזרות, או 'ביטול' כדי להשאיר אפשרות לפנייה חוזרת)"
            );
            if (shouldBlock && userId) {
                await fetch(`${API_BASE}/block-user/${userId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            fetchAll();
        } catch (err) {
            alert('שגיאה');
        }
    };

    const handleRespondRef = async (response) => {
        if (!refResponseModal) return;
        setRefSending(true);
        try {
            const res = await fetch(`${API_BASE}/respond-reference-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    requestId: refResponseModal.requestId,
                    response,
                    refName: refName.trim() || null,
                    refPhone: refPhone.trim() || null,
                })
            });
            if (res.ok) {
                alert(response === 'provide' ? '✅ תגובתך נשלחה!' : '✅ הודעתך נשלחה');
                setRefResponseModal(null);
                setRefName(''); setRefPhone('');
                fetchAll();
            }
        } catch { alert('שגיאה'); }
        setRefSending(false);
    };

    const getMessageIcon = (type) => {
        switch (type) {
            case 'system': return '📢';
            case 'admin_message': return '👮';
            case 'photo_request': return '📷';
            case 'photo_response': return '👁️';
            case 'admin_notification': return '🔔';
            case 'reference_request': return '📋';
            case 'reference_response': return '📋';
            default: return '📬';
        }
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>בודק דואר...</h2>
        </div>
    );

    const unreadMessages = messages.filter(m => !m.is_read).length;

    return (
        <div style={styles.page}>
            {/* מודל תגובה לבקשת ממליץ נוסף */}
            {refResponseModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, direction: 'rtl', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ color: '#1e3a5f', margin: '0 0 6px' }}>📋 תגובה לבקשת ממליץ</h3>
                        <p style={{ color: '#6b7280', margin: '0 0 18px', fontSize: '0.9rem' }}>
                            <strong>{refResponseModal.fromName}</strong> ביקש/ה ממליץ נוסף.
                        </p>

                        <p style={{ color: '#1e3a5f', fontWeight: 700, margin: '0 0 10px', fontSize: '0.9rem' }}>
                            האם תוכל/י לספק פרטי ממליץ נוסף?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            <input
                                placeholder="שם הממליץ"
                                value={refName}
                                onChange={e => setRefName(e.target.value)}
                                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', direction: 'rtl' }}
                            />
                            <input
                                placeholder="מספר טלפון"
                                value={refPhone}
                                onChange={e => setRefPhone(e.target.value)}
                                type="tel"
                                style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', direction: 'rtl' }}
                            />
                        </div>

                        <button
                            onClick={() => handleRespondRef('provide')}
                            disabled={refSending}
                            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', fontFamily: 'inherit', marginBottom: 10 }}
                        >
                            {refSending ? '⏳ שולח...' : '✅ שלח פרטי ממליץ'}
                        </button>

                        <button
                            onClick={() => handleRespondRef('cannot')}
                            disabled={refSending}
                            style={{ width: '100%', padding: '11px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: 10 }}
                        >
                            לצערי, בשלב זה אינני יכול/ה להביא ממליץ נוסף
                        </button>

                        <button
                            onClick={() => { setRefResponseModal(null); setRefName(''); setRefPhone(''); }}
                            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' }}
                        >
                            ← ביטול
                        </button>
                    </div>
                </div>
            )}

            <div style={styles.container}>
                <h1 style={styles.title}>📬 תיבת הדואר שלי</h1>

                {/* ניווט מהיר לדפים חשובים */}
                <div style={styles.quickLinks}>
                    <button
                        onClick={() => navigate('/photo-requests')}
                        style={styles.quickLinkBtn}
                    >
                        📷 בקשות תמונות
                        {photoRequests.length > 0 && <span style={styles.badge}>{photoRequests.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('connections')}
                        style={activeTab === 'connections' ? styles.activeQuickLink : styles.quickLinkBtn}
                    >
                        💍 הצעות שידוך
                        {connectionRequests.length > 0 && <span style={styles.badge}>{connectionRequests.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        style={activeTab === 'messages' ? styles.activeQuickLink : styles.quickLinkBtn}
                    >
                        📢 הודעות
                        {unreadMessages > 0 && <span style={styles.badge}>{unreadMessages}</span>}
                    </button>
                </div>

                {/* תוכן הטאבים */}
                <div style={styles.content}>

                    {/* טאב הודעות */}
                    {activeTab === 'messages' && (
                        <div style={styles.messagesList}>
                            {messages.length === 0 ? (
                                <div style={styles.emptyState}>אין הודעות חדשות</div>
                            ) : (
                                messages.map(msg => {
                                    const meta = msg.meta || (typeof msg.meta === 'string' ? JSON.parse(msg.meta) : null);
                                    const isRefRequest = msg.type === 'reference_request' && meta?.requestId;
                                    return (
                                    <div
                                        key={msg.id}
                                        style={{
                                            ...styles.messageCard,
                                            opacity: msg.is_read ? 0.7 : 1,
                                            borderRight: msg.is_read ? '2px solid #ccc' : '4px solid #c9a227'
                                        }}
                                        onClick={() => !msg.is_read && handleMarkAsRead(msg.id)}
                                    >
                                        <div style={styles.msgIcon}>{getMessageIcon(msg.type)}</div>
                                        <div style={styles.msgContent}>
                                            <p style={styles.msgText}>{msg.content}</p>
                                            <small style={styles.msgDate}>
                                                {new Date(msg.created_at).toLocaleString()}
                                            </small>
                                            {isRefRequest && (
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(msg.id);
                                                        setRefName(''); setRefPhone('');
                                                        setRefResponseModal({ requestId: meta.requestId, fromName: msg.from_name || 'הצד השני' });
                                                    }}
                                                    style={{ marginTop: 10, padding: '8px 16px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit' }}
                                                >
                                                    📋 הגב לבקשה
                                                </button>
                                            )}
                                        </div>
                                        {!msg.is_read && <div style={styles.unreadDot}></div>}
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* טאב שידוכים */}
                    {activeTab === 'connections' && (
                        <div style={styles.connectionsList}>
                            {connectionRequests.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <h3>אין הצעות חדשות כרגע</h3>
                                    <p>כשמישהו יעשה לך לייק - זה יופיע כאן!</p>
                                    <button onClick={() => navigate('/matches')} style={styles.actionBtn}>
                                        לחיפוש שידוכים
                                    </button>
                                </div>
                            ) : (
                                connectionRequests.map(req => (
                                    <div key={req.connection_id} style={styles.connectionCard}>
                                        <div style={styles.connInfo}>
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${req.full_name}&background=random&color=fff`}
                                                alt={req.full_name}
                                                style={styles.avatar}
                                            />
                                            <div>
                                                <h3>{req.full_name}, {req.age}</h3>
                                                <p>{req.sector} • {req.height} מ'</p>
                                            </div>
                                        </div>
                                        <div style={styles.connActions}>
                                            <button onClick={() => handleRejectConnection(req.connection_id)} style={styles.rejectBtn}>❌ דחה</button>
                                            <button onClick={() => handleApproveConnection(req.connection_id)} style={styles.approveBtn}>✅ אשר</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

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
    container: { maxWidth: '800px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
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
    title: { color: '#fff', textAlign: 'center', marginBottom: '30px' },
    quickLinks: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    quickLinkBtn: {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '30px',
        cursor: 'pointer',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
    },
    activeQuickLink: {
        background: '#fff',
        color: '#1e3a5f',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '30px',
        cursor: 'pointer',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 'bold',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    },
    badge: {
        background: '#ef4444',
        color: '#fff',
        fontSize: '0.75rem',
        padding: '2px 8px',
        borderRadius: '10px',
        fontWeight: 'bold'
    },
    content: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '20px',
        padding: '20px',
        minHeight: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
    },
    messageCard: {
        background: '#fff',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '15px',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'transform 0.1s'
    },
    msgIcon: { fontSize: '1.5rem' },
    msgContent: { flex: 1 },
    msgText: { margin: '0 0 5px', color: '#333', whiteSpace: 'pre-line' },
    msgDate: { color: '#888', fontSize: '0.8rem' },
    unreadDot: {
        width: '10px', height: '10px',
        background: '#c9a227',
        borderRadius: '50%',
        alignSelf: 'center'
    },
    connectionCard: {
        background: '#fff',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #eee',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    },
    connInfo: { display: 'flex', gap: '15px', alignItems: 'center' },
    avatar: { width: '50px', height: '50px', borderRadius: '50%' },
    connActions: { display: 'flex', gap: '10px' },
    approveBtn: {
        background: '#22c55e', color: '#fff',
        border: 'none', padding: '8px 15px', borderRadius: '8px',
        cursor: 'pointer', fontWeight: 'bold'
    },
    rejectBtn: {
        background: '#ef4444', color: '#fff',
        border: 'none', padding: '8px 15px', borderRadius: '8px',
        cursor: 'pointer', fontWeight: 'bold'
    },
    actionBtn: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)', color: '#fff',
        border: 'none', padding: '10px 25px', borderRadius: '10px',
        cursor: 'pointer', marginTop: '15px', fontWeight: 'bold'
    },
    emptyState: { textAlign: 'center', padding: '40px', color: '#666' }
};

export default Inbox;