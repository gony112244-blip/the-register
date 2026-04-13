import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchCardModal from './components/MatchCardModal';
import { useToast } from './components/ToastProvider';

const CANCEL_REASONS = [
    { id: 1, text: 'לצערנו, לאחר בירורים נראה שאנחנו פחות מתאימים זה לזה' },
    { id: 2, text: 'יש לנו כרגע הצעה אחרת שמתקדמת — אולי בהמשך' },
    { id: 3, text: 'כבר נפגשנו בעבר ולא מצאנו לנכון להמשיך' },
    { id: 4, text: 'הצעה זו כבר הוצעה לנו בעבר' },
];

const REF_REASONS = [
    { id: 'not_enough', label: '⏳ לא הספיק לנו לברר באמצעות הממליצים שסיפקת' },
    { id: 'no_answer',  label: '📵 הממליצים שסיפקת לא ענו לנו' },
    { id: 'family_ref', label: '👨‍👩‍👧 נבקש מכר שמכיר את המשפחה' },
];

function formatAddress(full_address) {
    if (!full_address) return null;
    const parts = full_address.split(' | ');
    if (parts.length === 2) return `רחוב ${parts[0]} מס׳ ${parts[1]}`;
    return full_address;
}

function Connections() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalPerson, setModalPerson] = useState(null);
    const [cancelModal, setCancelModal] = useState(null);
    const [refModal, setRefModal] = useState(null); // { connectionId, otherName }
    const [refReason, setRefReason] = useState('');
    const [refCount, setRefCount] = useState(1);
    const [refSending, setRefSending] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    const fetchConnections = async (userId) => {
        try {
            const res = await fetch(`${API_BASE}/my-connections?userId=${userId}`, {
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

    const handleCancelConnection = async (connectionId, reason) => {
        try {
            const res = await fetch(`${API_BASE}/cancel-active-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId, reason })
            });
            if (res.ok) {
                setCancelModal(null);
                fetchConnections(user.id);
            } else {
                showToast('שגיאה בביטול השידוך', 'error');
            }
        } catch {
            showToast('שגיאה בתקשורת עם השרת', 'error');
        }
    };

    const handleSendRefRequest = async () => {
        if (!refReason) { showToast('יש לבחור סיבה', 'error'); return; }
        setRefSending(true);
        try {
            const res = await fetch(`${API_BASE}/request-additional-reference`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId: refModal.connectionId, reason: refReason, count: refCount })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('✅ הבקשה נשלחה לצד השני', 'success');
                setRefModal(null);
                setRefReason('');
                setRefCount(1);
            } else {
                showToast(data.message || 'שגיאה', 'error');
            }
        } catch {
            showToast('שגיאה בשליחה', 'error');
        }
        setRefSending(false);
    };

    const handleFinalApprove = async (connectionId) => {
        try {
            const res = await fetch(`${API_BASE}/finalize-connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ connectionId, userId: user.id })
            });
            const result = await res.json();
            // החליפת הודעות בהתאם לסטטוס
            if (result.status === 'completed') {
                showToast('🎉 שניכם אישרתם! הפרטים עברו לשדכנית', 'success');
            } else {
                showToast('✅ האישור שלך התקבל. ממתינים לצד השני לסיים בירורים ולאשר', 'info');
            }
            fetchConnections(user.id);
        } catch (err) {
            showToast("שגיאה בשליחת האישור", 'error');
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
            {modalPerson && (
                <MatchCardModal
                    person={modalPerson}
                    onClose={() => setModalPerson(null)}
                    token={token}
                />
            )}

            {/* מודל בקשת ממליץ נוסף */}
            {refModal && (
                <div style={styles.overlay}>
                    <div style={styles.cancelModalBox}>
                        <h3 style={{ color: '#1e3a5f', margin: '0 0 6px' }}>📋 בקשת ממליץ נוסף</h3>
                        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '0.9rem' }}>
                            מ: <strong>{refModal.otherName}</strong>
                        </p>

                        <p style={{ color: '#1e3a5f', fontWeight: 700, margin: '0 0 10px', fontSize: '0.9rem' }}>סיבת הבקשה:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {REF_REASONS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => setRefReason(r.id)}
                                    style={{
                                        ...styles.reasonBtn,
                                        background: refReason === r.id ? '#eff6ff' : '#f8fafc',
                                        borderColor: refReason === r.id ? '#3b82f6' : '#e2e8f0',
                                        color: refReason === r.id ? '#1e3a5f' : '#475569',
                                        fontWeight: refReason === r.id ? 700 : 500,
                                    }}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>

                        <p style={{ color: '#1e3a5f', fontWeight: 700, margin: '0 0 8px', fontSize: '0.9rem' }}>כמה מספרים לבקש?</p>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            {[1, 2].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setRefCount(n)}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: refCount === n ? '#1e3a5f' : '#f1f5f9',
                                        color: refCount === n ? '#fff' : '#475569',
                                        border: 'none', borderRadius: 10,
                                        fontWeight: 700, cursor: 'pointer',
                                        fontSize: '0.95rem', fontFamily: 'inherit'
                                    }}
                                >
                                    {n === 1 ? 'מספר אחד' : 'שני מספרים'}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleSendRefRequest}
                            disabled={!refReason || refSending}
                            style={{
                                ...styles.approveBtn,
                                opacity: (!refReason || refSending) ? 0.5 : 1,
                                marginBottom: 10, width: '100%', fontFamily: 'inherit'
                            }}
                        >
                            {refSending ? '⏳ שולח...' : '📤 שלח בקשה'}
                        </button>
                        <button
                            onClick={() => { setRefModal(null); setRefReason(''); setRefCount(1); }}
                            style={styles.cancelModalCloseBtn}
                        >
                            ← ביטול
                        </button>
                    </div>
                </div>
            )}

            {/* מודל ביטול שידוך */}
            {cancelModal && (
                <div style={styles.overlay}>
                    <div style={styles.cancelModalBox}>
                        <h3 style={{ color: '#1e3a5f', margin: '0 0 6px' }}>בטל הצעת שידוך</h3>
                        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: '0.9rem' }}>
                            עם: <strong>{cancelModal.name}</strong><br />
                            בחר/י סיבה — תישלח לצד השני
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {CANCEL_REASONS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleCancelConnection(cancelModal.connectionId, r.text)}
                                    style={styles.reasonBtn}
                                >
                                    {r.text}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setCancelModal(null)} style={styles.cancelModalCloseBtn}>
                            ← חזור
                        </button>
                    </div>
                </div>
            )}

            <div style={styles.container}>
                <h1 style={styles.title}>💍 השידוכים שלי</h1>
                <p style={styles.subtitle}>כאן מופיעים פרטי הבירורים עבור התאמות מאושרות</p>

                {connections.length === 0 ? (
                    <div style={styles.empty}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔍</div>
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
                            const addrText = formatAddress(conn.full_address);

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
                                        {/* כפתור לכרטיס המלא */}
                                        <button
                                            onClick={() => setModalPerson({ id: isSender ? conn.receiver_id : conn.sender_id, full_name: conn.full_name })}
                                            style={styles.cardBtn}
                                        >
                                            👁️ צפה בכרטיס המלא
                                        </button>

                                        <div style={styles.infoSection}>
                                            <h4 style={styles.infoTitle}>👥 פרטים לבירורים:</h4>

                                            {/* הורים */}
                                            {(conn.father_full_name || conn.mother_full_name) && (
                                                <div style={{ ...styles.infoItem, flexWrap: 'wrap', gap: '6px 20px', paddingBottom: 8, marginBottom: 4, borderBottom: '1px solid #e2e8f0' }}>
                                                    {conn.father_full_name && (
                                                        <span><span style={styles.infoLabel}>אב: </span>{conn.father_full_name}</span>
                                                    )}
                                                    {conn.mother_full_name && (
                                                        <span><span style={styles.infoLabel}>אם: </span>{conn.mother_full_name}</span>
                                                    )}
                                                </div>
                                            )}

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

                                            {addrText && (
                                                <div style={styles.addressItem}>
                                                    <span style={styles.infoLabel}>📍 כתובת:</span>
                                                    <span style={{ color: '#1e3a5f', fontWeight: 700 }}>{addrText}</span>
                                                </div>
                                            )}
                                        </div>

                                        {conn.status !== 'waiting_for_shadchan' && (
                                            <div style={styles.actionArea}>
                                                {otherSideReady && !alreadyApproved && (
                                                    <div style={styles.waitingNotice}>
                                                        🔔 הצד השני סיים בירורים ומחכה לך!
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 'normal', margin: '6px 0 0' }}>
                                                            לחץ על "סיימתי בירורים" כדי להעביר את הכרטיס לשדכנית.
                                                        </p>
                                                    </div>
                                                )}

                                                {alreadyApproved && !otherSideReady && (
                                                    <div style={styles.pendingOtherSide}>
                                                        ⏳ אישרת — ממתינים לצד השני לסיים בירורים
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleFinalApprove(conn.id)}
                                                    disabled={alreadyApproved}
                                                    style={alreadyApproved ? styles.doneBtn : styles.approveBtn}
                                                >
                                                    {alreadyApproved ? 'הודעתך הועברה לשדכנית ✅' : 'סיימתי בירורים - אני מעוניין/ת 👍'}
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setRefModal({ connectionId: conn.id, otherName: conn.full_name });
                                                        setRefReason('');
                                                        setRefCount(1);
                                                    }}
                                                    style={styles.refBtn}
                                                >
                                                    📋 בקש ממליץ נוסף
                                                </button>

                                                <button
                                                    onClick={() => setCancelModal({ connectionId: conn.id, name: conn.full_name })}
                                                    style={styles.cancelConnBtn}
                                                >
                                                    ✕ בטל הצעת שידוך
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
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #c9a227' },
    name: { color: '#fff', margin: 0, fontSize: '1.2rem' },
    badge: {
        background: 'rgba(201,162,39,0.2)',
        color: '#c9a227',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '700',
        border: '1px solid rgba(201,162,39,0.4)'
    },
    badgeGold: {
        background: 'rgba(201,162,39,0.3)',
        color: '#ffd700',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '700',
        border: '1px solid rgba(201,162,39,0.6)'
    },
    body: { padding: '20px' },
    cardBtn: {
        width: '100%',
        padding: '10px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '600',
        marginBottom: '16px',
        fontSize: '0.95rem'
    },
    infoSection: {
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '16px',
        border: '1px solid #e2e8f0'
    },
    infoTitle: {
        color: '#1e3a5f',
        margin: '0 0 12px',
        fontSize: '0.95rem',
        fontWeight: '700'
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        fontSize: '0.9rem',
        flexWrap: 'wrap'
    },
    addressItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '10px',
        padding: '8px 12px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '10px',
        fontSize: '0.9rem'
    },
    infoLabel: {
        color: '#64748b',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        fontSize: '0.85rem'
    },
    phoneLink: {
        color: '#c9a227',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    actionArea: { display: 'flex', flexDirection: 'column', gap: '10px' },
    waitingNotice: {
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '10px',
        padding: '12px',
        color: '#92400e',
        fontSize: '0.9rem',
        fontWeight: '700'
    },
    pendingOtherSide: {
        background: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '10px',
        padding: '12px',
        color: '#0369a1',
        fontSize: '0.9rem',
        fontWeight: '600',
        textAlign: 'center'
    },
    approveBtn: {
        padding: '12px',
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '0.95rem'
    },
    doneBtn: {
        padding: '12px',
        background: '#e2e8f0',
        color: '#64748b',
        border: 'none',
        borderRadius: '10px',
        cursor: 'default',
        fontWeight: '700',
        fontSize: '0.95rem'
    },
    refBtn: {
        padding: '10px',
        background: 'transparent',
        color: '#1e3a5f',
        border: '1.5px solid #1e3a5f',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '0.9rem',
        fontFamily: 'inherit'
    },
    cancelConnBtn: {
        padding: '10px',
        background: 'transparent',
        color: '#ef4444',
        border: '1.5px solid #ef4444',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '0.9rem'
    },
    successBox: {
        background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
        border: '1px solid #34d399',
        borderRadius: '10px',
        padding: '14px',
        color: '#065f46',
        fontWeight: '700',
        textAlign: 'center',
        fontSize: '0.95rem'
    },
    empty: {
        textAlign: 'center',
        color: '#fff',
        padding: '60px 20px'
    },
    linkBtn: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #c9a227, #b08d1f)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '1rem'
    },
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, direction: 'rtl'
    },
    cancelModalBox: {
        background: '#fff',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '440px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    reasonBtn: {
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        textAlign: 'right',
        fontSize: '0.9rem',
        color: '#1e3a5f',
        fontWeight: '500',
        transition: 'all 0.15s'
    },
    cancelModalCloseBtn: {
        marginTop: '16px',
        width: '100%',
        padding: '10px',
        background: 'transparent',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        cursor: 'pointer',
        color: '#64748b',
        fontWeight: '600'
    }
};

export default Connections;