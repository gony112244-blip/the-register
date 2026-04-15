import API_BASE from './config';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';
import MatchCardModal from './components/MatchCardModal';

// ── תרגומים בסיסיים לכרטיסי הרשימה ──
const T = {
    heritage_sector: { ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב' },
    family_background: { haredi: 'חרדי', dati_leumi: 'דתי לאומי', masorti: 'מסורתי', baal_teshuva: 'חוזר בתשובה' },
    body_type: { very_thin: 'רזה מאוד', thin: 'רזה', slim: 'רזה', average_thin: 'רזה-ממוצע', average: 'ממוצע', average_full: 'ממוצע-מלא', full: 'מלא' },
    appearance: { fair: 'נחמד', ok: 'בסדר גמור', good: 'טוב', handsome: 'נאה', very_handsome: 'נאה מאוד', stunning: 'מרשים במיוחד' },
    current_occupation: { studying: 'לומד/ת', working: 'עובד/ת', both: 'משלב/ת', fixed_times: 'קובע עיתים' },
};
const tr = (field, val) => T[field]?.[val] || val || '—';

// ── סיבות להעברה לסל מיחזור ──
const HIDE_REASONS = [
    { id: 1, text: 'לא הסגנון שלי' },
    { id: 2, text: 'נפגשנו פעם בעבר' },
    { id: 3, text: 'ביררנו ולא מתאים' },
    { id: 4, text: 'אחר' },
];

function Matches() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');

    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) { }

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [photoStatuses, setPhotoStatuses] = useState({});
    const [connectStatuses, setConnectStatuses] = useState({});
    const [requestingPhoto, setRequestingPhoto] = useState(null);
    const [connectingId, setConnectingId] = useState(null);
    const [modalMatch, setModalMatch] = useState(null);
    const [hideReasonModal, setHideReasonModal] = useState(null); // { userId, name }
    const itemsPerPage = 6;

    useEffect(() => {
        if (!token || !user) { navigate('/login'); return; }
        if (!user.is_approved) { setLoading(false); return; }
        fetchMatches();
        fetchSentRequests();
    }, []);

    const fetchMatches = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/matches?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMatches(data);
                if (data.length > 0) {
                    batchCheckPhotoStatus(data.map(m => m.id));
                }
            } else {
                showToast("שגיאה בטעינת שידוכים", "error");
            }
        } catch {
            showToast("תקלה בתקשורת", "error");
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchSentRequests = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/my-sent-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                const statuses = {};
                data.forEach(r => { statuses[r.user_id] = 'pending'; });
                setConnectStatuses(statuses);
            }
        } catch { /* לא קריטי */ }
    }, [token]);

    const batchCheckPhotoStatus = async (targetIds) => {
        try {
            const res = await fetch(`${API_BASE}/batch-photo-access`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetIds })
            });
            const statusMap = await res.json();
            if (res.ok) {
                setPhotoStatuses(prev => ({ ...prev, ...statusMap }));
            }
        } catch { }
    };

    const checkPhotoStatus = async (targetId) => {
        try {
            const res = await fetch(`${API_BASE}/check-photo-access/${targetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPhotoStatuses(prev => ({
                ...prev,
                [targetId]: data.canView ? 'approved' : (data.status === 'pending' ? 'pending' : 'none')
            }));
        } catch { }
    };

    const handleViewCard = async (match) => {
        setModalMatch(match);
        try {
            const res = await fetch(`${API_BASE}/match-card/${match.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setModalMatch(data);
            } else {
                setModalMatch(null);
                showToast(data.message || 'הכרטיס אינו זמין כרגע', 'info');
            }
        } catch { }
    };

    const handleRequestPhoto = async (targetId) => {
        setRequestingPhoto(targetId);
        try {
            const res = await fetch(`${API_BASE}/request-photo-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('📷 הבקשה נשלחה! תקבל הודעה כשיאשרו את הבקשה', 'success');
                setPhotoStatuses(prev => ({ ...prev, [targetId]: 'pending' }));
            } else {
                showToast(data.message || 'שגיאה', 'warning');
            }
        } catch {
            showToast('שגיאה בשליחת הבקשה', 'error');
        } finally {
            setRequestingPhoto(null);
        }
    };

    const handleConnect = async (targetId) => {
        setConnectingId(targetId);
        try {
            const res = await fetch(`${API_BASE}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ myId: user.id, targetId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('🎉 הפנייה נשלחה בהצלחה!', 'success');
                setConnectStatuses(prev => ({ ...prev, [targetId]: 'pending' }));
            } else {
                showToast(data.message || 'שגיאה', 'warning');
            }
        } catch {
            showToast('תקלה בתקשורת עם השרת', 'error');
        } finally {
            setConnectingId(null);
        }
    };

    // ── סל מיחזור עם בחירת סיבה ──
    const openHideModal = (userId, name) => {
        setHideReasonModal({ userId, name });
    };

    const confirmHide = async (reason) => {
        if (!hideReasonModal) return;
        const { userId: hiddenUserId } = hideReasonModal;
        setHideReasonModal(null);
        setMatches(prev => prev.filter(m => m.id !== hiddenUserId));
        try {
            await fetch(`${API_BASE}/api/hide-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user.id, hiddenUserId, reason })
            });
            showToast('הפרופיל הועבר לסל המיחזור 🗑️', 'info');
        } catch {
            showToast('שגיאה בהסתרה', 'error');
            fetchMatches();
        }
    };

    const indexOfLastMatch = currentPage * itemsPerPage;
    const currentMatches = matches.slice(indexOfLastMatch - itemsPerPage, indexOfLastMatch);
    const totalPages = Math.ceil(matches.length / itemsPerPage);

    if (loading) return (
        <div style={styles.page}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={styles.spinner} />
                <h2 style={{ color: '#fff' }}>טוען שידוכים מתאימים...</h2>
            </div>
        </div>
    );

    if (user && !user.is_approved) return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={{ ...styles.card, textAlign: 'center', padding: '50px', maxWidth: '500px', margin: '50px auto' }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
                    <h2 style={{ color: '#1e3a5f' }}>הפרופיל שלך בבדיקה</h2>
                    <p style={{ color: '#6b7280', lineHeight: '1.8' }}>לאחר שנאמת את הפרטים שלך, תוכל לראות הצעות מתאימות.</p>
                    <button onClick={() => navigate('/profile')} style={{ ...styles.connectBtn, marginTop: '20px' }}>לעדכון פרופיל</button>
                </div>
            </div>
        </div>
    );


    return (
        <div style={styles.page}>
            {modalMatch && <MatchCardModal person={modalMatch} onClose={() => setModalMatch(null)} token={token} />}

            {/* ── מודל בחירת סיבה לסל מיחזור ── */}
            {hideReasonModal && (
                <div style={hideModalOverlay}>
                    <div style={hideModalBox}>
                        <h3 style={{ color: '#1e3a5f', margin: '0 0 6px', fontSize: '1.1rem' }}>🗑️ העברה לסל המיחזור</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 18px', lineHeight: 1.6 }}>
                            מה הסיבה שהצעת <strong>{hideReasonModal.name}</strong> לא מתאימה לך?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {HIDE_REASONS.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => confirmHide(r.text)}
                                    style={hideReasonBtn}
                                >
                                    {r.text}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setHideReasonModal(null)} style={hideCloseBtn}>
                            ← ביטול
                        </button>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: '1200px', margin: '0 auto 10px', display: 'flex', justifyContent: 'flex-end', padding: '0 20px' }}>
                <button onClick={() => navigate('/hidden-profiles')} style={styles.ghostBtn}>🗑️ סל המיחזור</button>
            </div>

            <div style={styles.container}>
                <h1 style={styles.title}>✨ הצעות שידוך</h1>
                <p style={styles.subtitle}>נמצאו {matches.length} התאמות פוטנציאליות</p>

                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'white', marginTop: '60px' }}>
                        <h2>לא נמצאו התאמות כרגע 😕</h2>
                        <p>נסה להרחיב את טווחי החיפוש בפרופיל שלך</p>
                        <button onClick={() => navigate('/profile')} style={{ ...styles.connectBtn, display: 'inline-block', width: 'auto', marginTop: '15px' }}>לעריכת פרופיל</button>
                    </div>
                ) : (
                    <>
                        <div style={styles.grid}>
                            {currentMatches.map((match) => {
                                const photoStatus = photoStatuses[match.id] || 'none';
                                const connectStatus = connectStatuses[match.id] || null;
                                const hasPhotos = match.profile_images_count > 0;

                                return (
                                    <div key={match.id} style={{ ...styles.card, outline: connectStatus === 'pending' ? '2px solid #c9a227' : 'none' }}>
                                        {/* כפתור הסתרה */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openHideModal(match.id, match.full_name); }}
                                            style={styles.trashBtn}
                                            title="העבר לסל מיחזור"
                                        >🗑️</button>

                                        {/* badge "בקשה נשלחה" */}
                                        {connectStatus === 'pending' && (
                                            <div style={styles.pendingBadge}>⏳ הפנייה נשלחה — ממתין לתשובה</div>
                                        )}

                                        {/* תמונה */}
                                        <div style={styles.cardHeader}>
                                            <div style={styles.imageWrap}>
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(match.full_name)}&background=1e3a5f&color=c9a227&size=300&bold=true&font-size=0.35`}
                                                    alt={match.full_name}
                                                    style={styles.image}
                                                />
                                                {hasPhotos && photoStatus !== 'approved' && (
                                                    <div style={styles.photoHintOverlay}>
                                                        <div style={styles.photoBlurBadge}>
                                                            <span style={{ fontSize: '1.4rem' }}>📷</span>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{match.profile_images_count}</span>
                                                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>תמונות</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {hasPhotos && photoStatus === 'approved' && (
                                                    <div style={{ ...styles.photoHintOverlay, background: 'linear-gradient(to top, rgba(21,128,61,0.7) 0%, transparent 60%)' }}>
                                                        <div style={{ ...styles.photoBlurBadge, background: 'rgba(21,128,61,0.9)' }}>
                                                            <span>✅</span>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{match.profile_images_count} תמונות פתוחות</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* גוף הכרטיס */}
                                        <div style={styles.cardBody}>
                                            <h3 style={styles.name}>{match.full_name}{match.age ? `, ${match.age}` : ''}</h3>
                                            <p style={styles.detail}>📏 {match.height} ס"מ | {tr('current_occupation', match.current_occupation)}</p>
                                            <p style={styles.detail}>🛐 {tr('heritage_sector', match.heritage_sector)} | {tr('family_background', match.family_background)}</p>
                                            {match.city && <p style={styles.detail}>📍 {match.city}</p>}

                                            <div style={styles.tags}>
                                                {match.body_type && <span style={styles.tag}>{tr('body_type', match.body_type)}</span>}
                                                {match.appearance && <span style={styles.tag}>{tr('appearance', match.appearance)}</span>}
                                            </div>

                                            {match.about_me && (
                                                <p style={styles.about}>"{match.about_me.substring(0, 60)}..."</p>
                                            )}
                                        </div>

                                        {/* פעולות */}
                                        <div style={styles.cardFooter}>
                                            <button onClick={() => handleViewCard(match)} style={styles.viewBtn}>
                                                👁️ צפה בכרטיס המלא
                                            </button>

                                            {hasPhotos && photoStatus === 'none' && (
                                                <button
                                                    onClick={() => handleRequestPhoto(match.id)}
                                                    disabled={requestingPhoto === match.id}
                                                    style={styles.photoRequestBtn}
                                                >
                                                    {requestingPhoto === match.id ? '⏳ שולח...' : '📷 בקש תמונות'}
                                                </button>
                                            )}
                                            {hasPhotos && photoStatus === 'pending' && (
                                                <div style={styles.pendingPhotoBadge}>⏳ בקשת תמונות ממתינה לאישור</div>
                                            )}
                                            {!hasPhotos && (
                                                <div style={styles.noPhotoBadge}>📷 אין תמונות עדיין</div>
                                            )}

                                            {connectStatus !== 'pending' ? (
                                                <button
                                                    onClick={() => handleConnect(match.id)}
                                                    disabled={connectingId === match.id}
                                                    style={styles.connectBtn}
                                                >
                                                    {connectingId === match.id ? '⏳ שולח...' : '📩 שלח פנייה'}
                                                </button>
                                            ) : (
                                                <div style={styles.sentBadge}>✉️ פנייה נשלחה — ממתינה לתשובה</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={styles.pageBtn}>◀ קודם</button>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>עמוד {currentPage} מתוך {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={styles.pageBtn}>הבא ▶</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ── סגנונות ──
const styles = {
    page: {
        minHeight: '100vh', fontFamily: "'Heebo', sans-serif",
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '20px 0', direction: 'rtl'
    },
    container: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },
    spinner: {
        width: '50px', height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#c9a227', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    title: { textAlign: 'center', fontSize: '2.8rem', color: '#fff', marginBottom: '10px', fontWeight: '800' },
    subtitle: { textAlign: 'center', color: '#e2e8f0', marginBottom: '40px', fontSize: '1.1rem' },
    ghostBtn: {
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
        color: 'white', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '28px', paddingBottom: '40px' },
    card: {
        background: '#fff', borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative', display: 'flex', flexDirection: 'column'
    },
    trashBtn: {
        position: 'absolute', top: '10px', right: '10px',
        background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%',
        width: '34px', height: '34px', cursor: 'pointer', fontSize: '1.1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
    },
    pendingBadge: {
        background: 'linear-gradient(135deg, #c9a227, #b08d1f)',
        color: '#fff', fontSize: '0.78rem', fontWeight: '700',
        textAlign: 'center', padding: '6px 10px',
    },
    cardHeader: { position: 'relative', height: '220px', overflow: 'hidden' },
    imageWrap: { width: '100%', height: '100%', position: 'relative' },
    image: { width: '100%', height: '100%', objectFit: 'cover' },
    photoHintOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(30,58,95,0.75) 0%, transparent 60%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px'
    },
    photoBlurBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(201,162,39,0.92)', backdropFilter: 'blur(10px)',
        borderRadius: '20px', padding: '6px 16px', color: '#fff'
    },
    cardBody: { padding: '18px 20px', flex: 1 },
    name: { margin: '0 0 8px', fontSize: '1.4rem', color: '#1e3a5f', fontWeight: '800' },
    detail: { margin: '4px 0', color: '#64748b', fontSize: '0.9rem' },
    tags: { display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '10px', marginBottom: '10px' },
    tag: { background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '15px', fontSize: '0.82rem', fontWeight: '600' },
    about: { fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.6', fontStyle: 'italic' },
    cardFooter: {
        padding: '14px 18px', background: '#f8fafc',
        borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px'
    },
    viewBtn: {
        padding: '9px', background: '#f1f5f9',
        color: '#1e3a5f', border: '1px solid #e2e8f0', borderRadius: '10px',
        fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit'
    },
    photoRequestBtn: {
        padding: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: '#fff', border: 'none', borderRadius: '10px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit'
    },
    pendingPhotoBadge: {
        padding: '9px', background: '#fef9ec', border: '1px solid #f59e0b',
        borderRadius: '10px', color: '#92400e', fontSize: '0.82rem',
        textAlign: 'center', fontWeight: '600'
    },
    noPhotoBadge: {
        padding: '8px', background: '#f1f5f9', borderRadius: '10px',
        color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center'
    },
    connectBtn: {
        background: 'linear-gradient(135deg, #c9a227 0%, #dda15e 100%)',
        color: '#fff', border: 'none', padding: '12px 20px',
        borderRadius: '12px', fontSize: '1rem', fontWeight: '700',
        cursor: 'pointer', width: '100%', boxShadow: '0 4px 15px rgba(201,162,39,0.3)',
        fontFamily: 'inherit'
    },
    sentBadge: {
        background: '#f0fdf4', border: '1px solid #86efac',
        color: '#166534', borderRadius: '10px',
        padding: '10px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600'
    },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px' },
    pageBtn: {
        padding: '10px 20px', background: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
        borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'
    }
};

// ── סגנונות מודל סיבת הסתרה ──
const hideModalOverlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, direction: 'rtl'
};
const hideModalBox = {
    background: '#fff', borderRadius: '20px',
    padding: '28px 24px', maxWidth: '400px', width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
};
const hideReasonBtn = {
    padding: '12px 16px', background: '#f8fafc',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    cursor: 'pointer', textAlign: 'right', fontSize: '0.95rem',
    color: '#1e3a5f', fontWeight: '600', fontFamily: 'inherit',
    transition: 'all 0.15s'
};
const hideCloseBtn = {
    marginTop: '14px', width: '100%', padding: '10px',
    background: 'transparent', border: '1px solid #e2e8f0',
    borderRadius: '10px', cursor: 'pointer', color: '#64748b',
    fontWeight: '600', fontFamily: 'inherit'
};

export default Matches;
