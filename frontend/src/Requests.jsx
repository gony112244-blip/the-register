import API_BASE from './config';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';
import MatchCardModal from './components/MatchCardModal';

const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const T = {
    heritage_sector: { ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב' },
    current_occupation: { studying: 'לומד/ת', working: 'עובד/ת', both: 'משלב/ת', fixed_times: 'קובע עיתים' },
};
const tr = (field, val) => T[field]?.[val] || val || null;

// ── קומפוננטת שורת בקשה ──
function RequestRow({ item, type, onViewCard, onAction }) {
    const isConn = type === 'conn';
    const isPhoto = type === 'photo';

    return (
        <div style={S.row}>
            <div style={S.rowLeft}>
                <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name)}&background=1e3a5f&color=c9a227&size=80&bold=true`}
                    alt={item.full_name}
                    style={S.avatar}
                />
                <div>
                    <div style={S.rowName}>{item.full_name}{item.age ? `, ${item.age}` : ''}</div>
                    <div style={S.rowSub}>
                        {item.height && `${item.height} ס"מ`}
                        {item.heritage_sector && ` · ${tr('heritage_sector', item.heritage_sector)}`}
                        {item.current_occupation && ` · ${tr('current_occupation', item.current_occupation)}`}
                    </div>
                    <div style={S.rowDate}>
                        {isConn ? '📩 בקשה לפרטיי התקשרות' : '📷 בקשה לצפייה בתמונות'} · {fmtDate(item.created_at)}
                    </div>
                </div>
            </div>

            <div style={S.rowActions}>
                <button onClick={() => onViewCard(item)} style={S.viewBtn}>
                    👁️ כרטיס
                </button>
                {onAction && onAction(item)}
            </div>
        </div>
    );
}

export default function Requests() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');

    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) { }

    const [tab, setTab] = useState('received'); // received | sent
    const [sentConn, setSentConn] = useState([]);
    const [sentPhoto, setSentPhoto] = useState([]);
    const [receivedConn, setReceivedConn] = useState([]);
    const [receivedPhoto, setReceivedPhoto] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalPerson, setModalPerson] = useState(null);
    const [rejectPhotoModal, setRejectPhotoModal] = useState(null); // { requesterId, name }

    const PHOTO_REJECT_REASONS = [
        { id: 1, text: 'אינני מעוניין/ת לשתף תמונות בשלב זה' },
        { id: 2, text: 'אשמח לשתף תמונות לאחר שגם אתה/ת תעלה/י תמונה לאתר' },
        { id: 3, text: 'מעדיף/ה לשתף תמונות רק לאחר שיחות הבירור' },
        { id: 4, text: 'אשמח לטפל בנושא זה דרך השדכנית בלבד' },
    ];

    const fetchAll = useCallback(async () => {
        if (!token) { navigate('/login'); return; }
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const [sc, sp, rc, rp] = await Promise.all([
                fetch(`${API_BASE}/my-sent-requests`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/my-sent-photo-requests`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/my-requests?userId=${user?.id}`, { headers }).then(r => r.json()),
                fetch(`${API_BASE}/pending-photo-requests`, { headers }).then(r => r.json()),
            ]);

            setSentConn(Array.isArray(sc) ? sc : []);
            setSentPhoto(Array.isArray(sp) ? sp : []);
            setReceivedConn(Array.isArray(rc) ? rc : []);
            setReceivedPhoto(Array.isArray(rp) ? rp : []);
        } catch (err) {
            showToast('שגיאה בטעינת הבקשות', 'error');
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleViewCard = async (item) => {
        const userId = item.user_id || item.id;
        setModalPerson(item);
        try {
            const res = await fetch(`${API_BASE}/match-card/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                if (data.is_blocked_by_target) {
                    setModalPerson(null);
                    showToast('🚫 משתמש זה חסם אותך — לא ניתן לצפות בכרטיס', 'info');
                    return;
                }
                setModalPerson({ ...data, full_name: data.full_name || item.full_name });
            }
        } catch { }
    };

    // ── פעולות ──
    const handleApproveConn = async (connectionId) => {
        try {
            const res = await fetch(`${API_BASE}/approve-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId, userId: user.id })
            });
            if (res.ok) {
                showToast('✅ הפנייה אושרה!', 'success');
                fetchAll();
                window.dispatchEvent(new CustomEvent('requestsUpdated'));
            }
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleRejectConn = async (connectionId) => {
        if (!window.confirm('לדחות את הפנייה?')) return;
        try {
            await fetch(`${API_BASE}/reject-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId })
            });
            showToast('הפנייה נדחתה', 'info');
            fetchAll();
            window.dispatchEvent(new CustomEvent('requestsUpdated'));
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleCancelConn = async (connectionId) => {
        if (!window.confirm('לבטל את הפנייה שנשלחה?')) return;
        try {
            const res = await fetch(`${API_BASE}/cancel-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ connectionId })
            });
            if (res.ok) {
                showToast('הפנייה בוטלה', 'info');
                fetchAll();
            }
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleApprovePhoto = async (requesterId) => {
        try {
            await fetch(`${API_BASE}/respond-photo-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ requesterId, response: 'approve' })
            });
            showToast('✅ בקשת התמונות אושרה!', 'success');
            fetchAll();
            window.dispatchEvent(new CustomEvent('requestsUpdated'));
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleCancelPhoto = async (targetId) => {
        if (!window.confirm('לבטל את בקשת התמונות שנשלחה?')) return;
        try {
            const res = await fetch(`${API_BASE}/cancel-photo-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetId })
            });
            if (res.ok) {
                showToast('בקשת התמונות בוטלה', 'info');
                fetchAll();
                window.dispatchEvent(new CustomEvent('requestsUpdated'));
            }
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleRejectPhotoWithReason = async (requesterId, reason) => {
        try {
            await fetch(`${API_BASE}/respond-photo-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ requesterId, response: 'reject', rejectMessage: `📷 בקשת הצפייה בתמונות נדחתה.\nסיבה: ${reason}` })
            });
            showToast('הבקשה נדחתה', 'info');
            setRejectPhotoModal(null);
            fetchAll();
            window.dispatchEvent(new CustomEvent('requestsUpdated'));
        } catch { showToast('שגיאה', 'error'); }
    };

    const handleBlockUser = async (userId, name) => {
        if (!window.confirm(`לחסום את ${name}?\nהם לא יוכלו יותר לשלוח לך פניות או בקשות תמונות, ולא יראו את הכרטיס שלך.`)) return;
        try {
            const res = await fetch(`${API_BASE}/block-user/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                showToast('🚫 המשתמש נחסם', 'info');
                fetchAll();
                window.dispatchEvent(new CustomEvent('requestsUpdated'));
            } else {
                showToast(data.message || 'שגיאה', 'error');
            }
        } catch { showToast('שגיאה', 'error'); }
    };

    const totalReceived = receivedConn.length + receivedPhoto.length;
    const totalSent = sentConn.length + sentPhoto.length;

    if (loading) return (
        <div style={S.page}>
            <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ color: '#fff' }}>טוען בקשות...</h2>
            </div>
        </div>
    );

    return (
        <div style={S.page}>
            {modalPerson && <MatchCardModal person={modalPerson} onClose={() => setModalPerson(null)} token={localStorage.getItem('token')} />}

            {/* ── מודל דחיית בקשת תמונות ── */}
            {rejectPhotoModal && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <h3 style={S.modalTitle}>❌ דחיית בקשת תמונות</h3>
                        <p style={S.modalSub}>מאת: <strong>{rejectPhotoModal.name}</strong></p>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>בחר/י סיבה — היא תישלח למבקש/ת:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {PHOTO_REJECT_REASONS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleRejectPhotoWithReason(rejectPhotoModal.requesterId, r.text)}
                                    style={S.reasonBtn}
                                >
                                    {r.text}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setRejectPhotoModal(null)} style={S.cancelModalBtn}>ביטול</button>
                    </div>
                </div>
            )}

            <div style={S.container}>
                <h1 style={S.title}>📋 הבקשות שלי</h1>

                {/* לשוניות */}
                <div style={S.tabs}>
                    <button
                        onClick={() => setTab('received')}
                        style={{ ...S.tab, ...(tab === 'received' ? S.activeTab : {}) }}
                    >
                        📥 בקשות שהתקבלו
                        {totalReceived > 0 && <span style={S.badge}>{totalReceived}</span>}
                    </button>
                    <button
                        onClick={() => setTab('sent')}
                        style={{ ...S.tab, ...(tab === 'sent' ? S.activeTab : {}) }}
                    >
                        📤 בקשות שנשלחו
                        {totalSent > 0 && <span style={S.badge}>{totalSent}</span>}
                    </button>
                </div>

                <div style={S.content}>

                    {/* ── בקשות שהתקבלו ── */}
                    {tab === 'received' && (
                        <>
                            {totalReceived === 0 ? (
                                <div style={S.empty}>
                                    <div style={{ fontSize: 50, marginBottom: 16 }}>📭</div>
                                    <h3>אין בקשות חדשות</h3>
                                    <p>כשמישהו ישלח לך פנייה או יבקש תמונות — זה יופיע כאן</p>
                                </div>
                            ) : (
                                <>
                                    {receivedConn.length > 0 && (
                                        <div style={S.section}>
                                            <div style={S.sectionTitle}>📩 פניות לפרטיי התקשרות ({receivedConn.length})</div>
                                            {receivedConn.map(item => (
                                                <RequestRow
                                                    key={item.connection_id}
                                                    item={{ ...item, user_id: item.user_id }}
                                                    type="conn"
                                                    onViewCard={handleViewCard}
                                                    onAction={() => (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button onClick={() => handleRejectConn(item.connection_id)} style={S.rejectBtn}>❌</button>
                                                            <button onClick={() => handleApproveConn(item.connection_id)} style={S.approveBtn}>✅ אשר</button>
                                                            <button onClick={() => handleBlockUser(item.user_id, item.full_name)} style={S.blockBtn} title="חסום משתמש">🚫</button>
                                                        </div>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {receivedPhoto.length > 0 && (
                                        <div style={S.section}>
                                            <div style={S.sectionTitle}>📷 בקשות צפייה בתמונות ({receivedPhoto.length})</div>
                                            {receivedPhoto.map(item => (
                                                <RequestRow
                                                    key={item.id || item.requester_id}
                                                    item={{ ...item, user_id: item.requester_id, full_name: item.full_name }}
                                                    type="photo"
                                                    onViewCard={handleViewCard}
                                                    onAction={() => (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button
                                                                onClick={() => setRejectPhotoModal({ requesterId: item.requester_id, name: item.full_name })}
                                                                style={S.rejectBtn}
                                                            >❌ דחה</button>
                                                            <button onClick={() => handleApprovePhoto(item.requester_id)} style={S.approveBtn}>✅ אשר</button>
                                                            <button onClick={() => handleBlockUser(item.requester_id, item.full_name)} style={S.blockBtn} title="חסום משתמש">🚫</button>
                                                        </div>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* ── בקשות שנשלחו ── */}
                    {tab === 'sent' && (
                        <>
                            {totalSent === 0 ? (
                                <div style={S.empty}>
                                    <div style={{ fontSize: 50, marginBottom: 16 }}>📤</div>
                                    <h3>לא שלחת בקשות עדיין</h3>
                                    <p>בקשות שתשלח מדף השידוכים יופיעו כאן</p>
                                    <button onClick={() => navigate('/matches')} style={S.goBtn}>לדף השידוכים</button>
                                </div>
                            ) : (
                                <>
                                    {sentConn.length > 0 && (
                                        <div style={S.section}>
                                            <div style={S.sectionTitle}>📩 פניות לפרטיי התקשרות שנשלחו ({sentConn.length})</div>
                                            {sentConn.map(item => (
                                                <RequestRow
                                                    key={item.connection_id}
                                                    item={item}
                                                    type="conn"
                                                    onViewCard={handleViewCard}
                                                    onAction={() => (
                                                        <button onClick={() => handleCancelConn(item.connection_id)} style={S.cancelBtn}>
                                                            ✕ בטל
                                                        </button>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {sentPhoto.length > 0 && (
                                        <div style={S.section}>
                                            <div style={S.sectionTitle}>📷 בקשות תמונות שנשלחו ({sentPhoto.length})</div>
                                            {sentPhoto.map(item => (
                                                <RequestRow
                                                    key={item.id || item.user_id}
                                                    item={item}
                                                    type="photo"
                                                    onViewCard={handleViewCard}
                                                    onAction={() => (
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <div style={S.waitingTag}>⏳ ממתין</div>
                                                            <button
                                                                onClick={() => handleCancelPhoto(item.user_id || item.target_id)}
                                                                style={S.cancelBtn}
                                                            >
                                                                ✕ בטל
                                                            </button>
                                                        </div>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── סגנונות ──
const S = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '28px 16px', direction: 'rtl',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: { maxWidth: '760px', margin: '0 auto' },
    title: { color: '#fff', textAlign: 'center', marginBottom: 28, fontSize: '2rem', fontWeight: 800 },
    tabs: { display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' },
    tab: {
        padding: '12px 28px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.08)', color: '#fff',
        cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.2s', fontFamily: 'inherit', fontWeight: 500
    },
    activeTab: {
        background: '#fff', color: '#1e3a5f', border: 'none',
        fontWeight: 700, boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    },
    badge: {
        background: '#ef4444', color: '#fff', fontSize: '0.75rem',
        padding: '2px 8px', borderRadius: 10, fontWeight: 700
    },
    content: {
        background: 'rgba(255,255,255,0.97)', borderRadius: 20,
        padding: '24px', minHeight: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
    },
    section: { marginBottom: 28 },
    sectionTitle: {
        fontWeight: 700, color: '#1e3a5f', fontSize: '1rem',
        marginBottom: 14, paddingBottom: 8,
        borderBottom: '2px solid #e2e8f0'
    },
    row: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid #f1f5f9', gap: 12
    },
    rowLeft: { display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 },
    avatar: { width: 52, height: 52, borderRadius: '50%', border: '2px solid #e2e8f0', flexShrink: 0 },
    rowName: { fontWeight: 700, color: '#1e3a5f', fontSize: '1rem', marginBottom: 2 },
    rowSub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 3 },
    rowDate: { color: '#94a3b8', fontSize: '0.78rem' },
    rowActions: { display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 },
    viewBtn: {
        padding: '7px 12px', background: '#f1f5f9', color: '#1e3a5f',
        border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap'
    },
    approveBtn: {
        padding: '7px 14px', background: '#22c55e', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap'
    },
    rejectBtn: {
        padding: '7px 10px', background: '#fee2e2', color: '#dc2626',
        border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.85rem', fontFamily: 'inherit'
    },
    cancelBtn: {
        padding: '7px 12px', background: '#f1f5f9', color: '#64748b',
        border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.82rem', fontFamily: 'inherit', whiteSpace: 'nowrap'
    },
    blockBtn: {
        padding: '7px 10px', background: '#fff7ed', color: '#9a3412',
        border: '1px solid #fed7aa', borderRadius: 8, cursor: 'pointer',
        fontSize: '0.85rem', fontFamily: 'inherit', whiteSpace: 'nowrap'
    },
    waitingTag: {
        background: '#fef9ec', border: '1px solid #f59e0b',
        color: '#92400e', borderRadius: 8, padding: '6px 10px',
        fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap'
    },
    empty: { textAlign: 'center', padding: '50px 20px', color: '#64748b' },
    goBtn: {
        marginTop: 16, background: 'linear-gradient(135deg, #1e3a5f, #2d5a8f)',
        color: '#fff', border: 'none', padding: '11px 28px',
        borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
        fontFamily: 'inherit'
    },
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '20px'
    },
    modal: {
        background: '#fff', borderRadius: '16px', padding: '28px 30px',
        maxWidth: '460px', width: '100%', direction: 'rtl',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    modalTitle: { color: '#1e3a5f', margin: '0 0 6px', fontSize: '1.2rem' },
    modalSub: { color: '#64748b', margin: '0 0 12px', fontSize: '0.95rem' },
    reasonBtn: {
        width: '100%', padding: '12px 16px', background: '#f8fafc',
        border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: '0.95rem', color: '#1e3a5f',
        textAlign: 'right', transition: 'background 0.2s', fontWeight: 500
    },
    cancelModalBtn: {
        marginTop: '16px', width: '100%', padding: '11px',
        background: '#f1f5f9', border: '1px solid #e2e8f0',
        borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '0.9rem', color: '#64748b'
    },
};

