import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const REJECT_OPTIONS = [
    { id: 1, label: '⏳ מעדיפים לא לשלוח בשלב זה', msg: '📷 מעדיפים לא לשלוח תמונות בשלב זה. תודה על ההבנה!' },
    { id: 2, label: '📷 שלח תמונה גם אתה קודם', msg: '📷 אשמח לתמונה גם ממך לפני שאשלח. נא הכנס תמונה למערכת ונשקול שוב 🙏' },
    { id: 3, label: '🔄 נחזור לזה בהמשך', msg: '📷 עדיין לא בשלב לשיתוף תמונות, נחזור לזה בהמשך התהליך.' },
];

function PhotoRequests() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState(null); // ID of user we're choosing rejection for
    const [selectedReject, setSelectedReject] = useState(null);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchRequests();
    }, [navigate, token]);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/pending-photo-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setRequests([]);
        }
        setLoading(false);
    };

    const handleResponse = async (requesterId, response, rejectMessage = null) => {
        try {
            const res = await fetch(`${API_BASE}/respond-photo-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ requesterId, response, rejectMessage })
            });
            const data = await res.json();
            setRequests(prev => prev.filter(r => r.requester_id !== requesterId));
            setRejectingId(null);
            setSelectedReject(null);
        } catch (err) {
            alert('שגיאה');
        }
    };

    const confirmReject = (requesterId) => {
        if (!selectedReject) return;
        const opt = REJECT_OPTIONS.find(o => o.id === selectedReject);
        handleResponse(requesterId, 'reject', opt?.msg);
    };

    const handleBlock = async (requesterId, name) => {
        if (!window.confirm(`לחסום את ${name}?\nהמשתמש לא יוכל עוד לפנות אליך או לצפות בכרטיס שלך.`)) return;
        try {
            const res = await fetch(`${API_BASE}/block-user/${requesterId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.requester_id !== requesterId));
                alert('המשתמש נחסם.');
            }
        } catch {
            alert('שגיאה');
        }
    };

    if (loading) return (
        <div style={styles.page}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
                <div style={styles.spinner} />
                <p style={{ color: 'white', fontSize: '1.2rem' }}>טוען בקשות...</p>
            </div>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={() => navigate(-1)} style={styles.backBtn}>← חזרה</button>
                    <div>
                        <h1 style={styles.title}>📷 בקשות תמונות</h1>
                        <p style={styles.subtitle}>אנשים שמעוניינים לראות את התמונות שלך</p>
                    </div>
                </div>

                {requests.length === 0 ? (
                    <div style={styles.emptyCard}>
                        <div style={{ fontSize: '60px', marginBottom: '15px' }}>📭</div>
                        <h3 style={{ color: '#1e3a5f', margin: '0 0 10px' }}>אין בקשות ממתינות</h3>
                        <p style={{ color: '#6b7280', margin: 0 }}>כשמישהו יבקש לראות את התמונות שלך, הבקשה תופיע כאן</p>
                    </div>
                ) : (
                    <div style={styles.list}>
                        {requests.map((req) => (
                            <div key={req.requester_id} style={styles.card}>
                                {/* Header */}
                                <div style={styles.cardHeader}>
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(((req.full_name || '') + ' ' + (req.last_name || '')).trim())}&background=1e3a5f&color=c9a227&size=80&bold=true&font-size=0.4`}
                                        alt={req.full_name}
                                        style={styles.avatar}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h3 style={styles.name}>{req.full_name}</h3>
                                        <p style={styles.photoCount}>
                                            {req.profile_images_count > 0
                                                ? `📷 יש לו/ה ${req.profile_images_count} תמונות במערכת`
                                                : '📷 עדיין לא העלה/תה תמונות'}
                                        </p>
                                    </div>
                                </div>

                                <div style={styles.requestBubble}>
                                    מבקש/ת לראות את התמונות שלך 📸
                                </div>

                                {/* Info box */}
                                <div style={styles.infoBox}>
                                    💡 אם תאשר — גם תוכל לראות את התמונות שלו/ה!
                                </div>

                                {/* Reject mode - choose reason */}
                                {rejectingId === req.requester_id ? (
                                    <div style={styles.rejectPanel}>
                                        <p style={{ margin: '0 0 12px', fontWeight: '700', color: '#1e3a5f', textAlign: 'center' }}>בחר/י סיבת הדחייה לשליחה:</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {REJECT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setSelectedReject(opt.id)}
                                                    style={{
                                                        ...styles.rejectOption,
                                                        ...(selectedReject === opt.id ? styles.rejectOptionSelected : {})
                                                    }}
                                                >
                                                    {opt.label}
                                                    {selectedReject === opt.id && <span style={{ marginRight: '8px' }}>✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                            <button
                                                onClick={() => confirmReject(req.requester_id)}
                                                disabled={!selectedReject}
                                                style={{ ...styles.sendRejectBtn, opacity: selectedReject ? 1 : 0.5 }}
                                            >
                                                📤 שלח תגובה
                                            </button>
                                            <button
                                                onClick={() => { setRejectingId(null); setSelectedReject(null); }}
                                                style={styles.cancelBtn}
                                            >
                                                ביטול
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Normal action buttons */
                                    <div style={styles.actions}>
                                        <button
                                            onClick={() => handleResponse(req.requester_id, 'approve')}
                                            style={styles.approveBtn}
                                        >
                                            ✅ אשר שיתוף
                                        </button>
                                        <button
                                            onClick={() => handleResponse(req.requester_id, 'auto_approve')}
                                            style={styles.autoBtn}
                                        >
                                            🔄 אשר תמיד
                                        </button>
                                        <button
                                            onClick={() => { setRejectingId(req.requester_id); setSelectedReject(null); }}
                                            style={styles.rejectBtn}
                                        >
                                            ❌ דחה
                                        </button>
                                        <button
                                            onClick={() => handleBlock(req.requester_id, req.full_name)}
                                            style={styles.blockBtn}
                                            title="חסום — ימנע פניות עתידיות"
                                        >
                                            🚫 חסום
                                        </button>
                                    </div>
                                )}

                                <p style={styles.autoExplain}>
                                    <strong>"אשר תמיד"</strong> = כל תמונה שתעלה בעתיד תהיה גלויה אוטומטית
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
        padding: '30px 20px',
        direction: 'rtl',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: { maxWidth: '620px', margin: '0 auto' },
    header: { display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '30px' },
    backBtn: {
        background: 'rgba(255,255,255,0.15)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '10px 18px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(5px)'
    },
    title: { color: '#fff', margin: '0 0 5px', fontSize: '1.8rem', fontWeight: '800' },
    subtitle: { color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '0.95rem' },
    spinner: {
        width: '48px', height: '48px',
        border: '4px solid rgba(255,255,255,0.2)',
        borderTopColor: '#c9a227',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    },
    emptyCard: {
        background: '#fff', borderRadius: '24px',
        padding: '50px 30px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
    },
    list: { display: 'flex', flexDirection: 'column', gap: '20px' },
    card: {
        background: '#fff', borderRadius: '24px',
        padding: '25px', boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)'
    },
    cardHeader: { display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '18px' },
    avatar: { width: '64px', height: '64px', borderRadius: '50%', border: '3px solid #c9a227', flexShrink: 0 },
    name: { margin: '0 0 5px', color: '#1e3a5f', fontSize: '1.25rem', fontWeight: '800' },
    photoCount: { margin: 0, color: '#64748b', fontSize: '0.88rem' },
    requestBubble: {
        background: 'linear-gradient(135deg, #f0f4ff, #e8eeff)',
        border: '1px solid #c7d2fe',
        borderRadius: '14px',
        padding: '12px 18px',
        color: '#3730a3',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '14px',
        fontSize: '0.95rem'
    },
    infoBox: {
        background: '#fef9ec',
        border: '1px solid #f59e0b',
        borderRadius: '12px',
        padding: '10px 16px',
        color: '#92400e',
        fontSize: '0.88rem',
        textAlign: 'center',
        marginBottom: '18px'
    },
    actions: { display: 'flex', gap: '10px', marginBottom: '12px' },
    approveBtn: {
        flex: 1, padding: '12px 8px',
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
        transition: 'transform 0.15s'
    },
    autoBtn: {
        flex: 1, padding: '12px 8px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        boxShadow: '0 4px 12px rgba(30,58,95,0.3)',
        transition: 'transform 0.15s'
    },
    rejectBtn: {
        flex: 1, padding: '12px 8px',
        background: '#f1f5f9', color: '#64748b',
        border: '2px solid #e2e8f0', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        transition: 'transform 0.15s'
    },
    rejectPanel: {
        background: '#fff8f0',
        border: '1px solid #fed7aa',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '12px'
    },
    rejectOption: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        background: '#fff', border: '2px solid #e2e8f0',
        borderRadius: '12px', cursor: 'pointer',
        fontSize: '0.92rem', color: '#374151', fontWeight: '600',
        textAlign: 'right', transition: 'all 0.15s',
        fontFamily: 'inherit'
    },
    rejectOptionSelected: {
        background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e'
    },
    sendRejectBtn: {
        flex: 1, padding: '11px',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        fontFamily: 'inherit'
    },
    cancelBtn: {
        padding: '11px 20px',
        background: '#f1f5f9', color: '#64748b',
        border: '2px solid #e2e8f0', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        fontFamily: 'inherit'
    },
    autoExplain: {
        fontSize: '0.8rem', color: '#9ca3af',
        textAlign: 'center', margin: 0, lineHeight: '1.5'
    },
    blockBtn: {
        flex: 1, padding: '12px 8px',
        background: '#fff7ed', color: '#9a3412',
        border: '1px solid #fed7aa', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        fontFamily: 'inherit'
    }
};

export default PhotoRequests;
