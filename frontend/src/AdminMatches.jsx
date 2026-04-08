import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchCardModal from './components/MatchCardModal';

const STATUS_LABELS = {
    active: 'פעיל',
    waiting_for_shadchan: 'ממתין לשדכנית',
    handled: 'טופל',
    successful: 'הצליח 🎉',
    rejected: 'נסגר'
};

const SECTOR_LABELS = {
    haredi: 'חרדי', dati_leumi: 'דתי לאומי', ashkenazi: 'אשכנזי',
    sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב'
};

function AdminMatches() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [activeTab, setActiveTab] = useState('matches');
    const [matches, setMatches] = useState([]);
    const [shadchaniot, setShadchaniot] = useState([]);
    const [successfulMatches, setSuccessfulMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // מודל כרטיס
    const [cardModal, setCardModal] = useState(null); // { userId }

    // שדכניות
    const [showShadchanitForm, setShowShadchanitForm] = useState(false);
    const [editingShadchanit, setEditingShadchanit] = useState(null);
    const [shadchanitForm, setShadchanitForm] = useState({ name: '', phone: '', email: '' });
    const [shadchanitHistory, setShadchanitHistory] = useState(null);
    const [selectedShadchanitId, setSelectedShadchanitId] = useState(null);

    // סגירת שידוך
    const [closeModal, setCloseModal] = useState(null); // { connectionId, senderName, receiverName }
    const [closeForm, setCloseForm] = useState({ succeeded: null, failReason: '', summary: '' });

    // הודעת סטטוס
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchAll();
    }, [navigate, token]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3500);
    };

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchMatches(), fetchShadchaniot(), fetchSuccessful()]);
        setLoading(false);
    };

    const fetchMatches = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/matches-to-handle`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setMatches(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const fetchShadchaniot = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/shadchaniot`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setShadchaniot(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const fetchSuccessful = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/successful-matches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSuccessfulMatches(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    // --- שדכניות ---
    const handleSaveShadchanit = async () => {
        if (!shadchanitForm.name.trim()) { alert('שם חובה'); return; }
        try {
            const url = editingShadchanit
                ? `${API_BASE}/admin/shadchaniot/${editingShadchanit}`
                : `${API_BASE}/admin/shadchaniot`;
            const method = editingShadchanit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(shadchanitForm)
            });
            if (res.ok) {
                showToast(editingShadchanit ? '✅ שדכנית עודכנה' : '✅ שדכנית נוספה');
                setShowShadchanitForm(false);
                setEditingShadchanit(null);
                setShadchanitForm({ name: '', phone: '', email: '' });
                fetchShadchaniot();
            }
        } catch (err) { alert('שגיאה'); }
    };

    const handleDeleteShadchanit = async (id) => {
        try {
            await fetch(`${API_BASE}/admin/shadchaniot/${id}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            showToast('🗑️ שדכנית נמחקה');
            fetchShadchaniot();
        } catch (err) { alert('שגיאה'); }
    };

    const handleShadchanitHistory = async (shadchanitId) => {
        if (selectedShadchanitId === shadchanitId) { setSelectedShadchanitId(null); setShadchanitHistory(null); return; }
        setSelectedShadchanitId(shadchanitId);
        try {
            const res = await fetch(`${API_BASE}/admin/shadchanit-history/${shadchanitId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setShadchanitHistory(data);
        } catch (err) { console.error(err); }
    };

    // --- שיוך שדכנית לשידוך ---
    const handleAssignShadchanit = async (connectionId, shadchanitId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/match-shadchanit/${connectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ shadchanitId: shadchanitId || null })
            });
            if (res.ok) {
                showToast('✅ שדכנית שויכה');
                setMatches(prev => prev.map(m =>
                    m.connection_id === connectionId
                        ? { ...m, shadchanit_id: shadchanitId ? parseInt(shadchanitId) : null }
                        : m
                ));
            }
        } catch (err) { alert('שגיאה'); }
    };

    // --- שליחת כרטיסיות ---
    const handleSendCards = async (connectionId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/send-match-cards/${connectionId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) showToast('📧 הכרטיסיות נשלחו לשדכנית');
            else showToast(data.message || 'שגיאה בשליחה');
        } catch (err) { showToast('שגיאה בשליחה'); }
    };

    // --- סגירת שידוך ---
    const handleCloseMatch = async () => {
        if (closeForm.succeeded === null) { alert('בחר האם השידוך הצליח'); return; }
        if (!closeForm.succeeded && !closeForm.failReason.trim()) { alert('נא לציין סיבת סגירה'); return; }
        try {
            const res = await fetch(`${API_BASE}/admin/close-match/${closeModal.connectionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    succeeded: closeForm.succeeded,
                    failReason: closeForm.failReason,
                    summary: closeForm.summary
                })
            });
            if (res.ok) {
                showToast(closeForm.succeeded ? '🎉 שידוך הצליח! נרשם בהיסטוריה' : '✅ שידוך נסגר');
                setCloseModal(null);
                setCloseForm({ succeeded: null, failReason: '', summary: '' });
                fetchAll();
            }
        } catch (err) { alert('שגיאה'); }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '—';

    if (loading) return (
        <div style={s.loadingPage}>
            <div style={s.spinner}></div>
            <p style={{ color: '#fff', marginTop: '16px' }}>טוען...</p>
        </div>
    );

    return (
        <div style={s.page}>
            {toast && <div style={s.toast}>{toast}</div>}

            <div style={s.container}>
                <h1 style={s.title}>💍 ניהול שידוכים</h1>

                {/* טאבים */}
                <div style={s.tabs}>
                    <button style={activeTab === 'matches' ? s.activeTab : s.tab} onClick={() => setActiveTab('matches')}>
                        📋 שידוכים פעילים {matches.length > 0 && <span style={s.badge}>{matches.length}</span>}
                    </button>
                    <button style={activeTab === 'shadchaniot' ? s.activeTab : s.tab} onClick={() => setActiveTab('shadchaniot')}>
                        👩 שדכניות {shadchaniot.length > 0 && <span style={s.badge}>{shadchaniot.length}</span>}
                    </button>
                    <button style={activeTab === 'successful' ? s.activeTab : s.tab} onClick={() => setActiveTab('successful')}>
                        🎉 שידוכים שהצליחו {successfulMatches.length > 0 && <span style={s.badge}>{successfulMatches.length}</span>}
                    </button>
                </div>

                {/* ===== טאב שידוכים פעילים ===== */}
                {activeTab === 'matches' && (
                    <div>
                        {matches.length === 0 ? (
                            <div style={s.empty}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✨</div>
                                <div>אין כרגע שידוכים הממתינים לטיפול</div>
                            </div>
                        ) : (
                            matches.map(match => (
                                <div key={match.connection_id} style={s.matchCard}>
                                    {/* כותרת */}
                                    <div style={s.matchHeader}>
                                        <div style={s.matchTitle}>
                                            💍 {match.sender_name} & {match.receiver_name}
                                        </div>
                                        <span style={s.statusBadge}>{STATUS_LABELS[match.status] || match.status}</span>
                                    </div>

                                    {/* שני הצדדים */}
                                    <div style={s.sidesGrid}>
                                        <div style={s.side}>
                                            <div style={s.sideName}>👨 {match.sender_name}</div>
                                            <div style={s.sideMeta}>
                                                <span>📱 {match.sender_phone}</span>
                                                {match.sender_rabbi && <span>✡️ {match.sender_rabbi}</span>}
                                            </div>
                                            <button
                                                onClick={() => setCardModal({ userId: match.sender_id || match.sender_user_id })}
                                                style={s.viewCardBtn}
                                            >
                                                👁️ צפה בכרטיס
                                            </button>
                                        </div>

                                        <div style={s.sideDivider}>💍</div>

                                        <div style={s.side}>
                                            <div style={s.sideName}>👩 {match.receiver_name}</div>
                                            <div style={s.sideMeta}>
                                                <span>📱 {match.receiver_phone}</span>
                                                {match.receiver_rabbi && <span>✡️ {match.receiver_rabbi}</span>}
                                            </div>
                                            <button
                                                onClick={() => setCardModal({ userId: match.receiver_id || match.receiver_user_id })}
                                                style={s.viewCardBtn}
                                            >
                                                👁️ צפה בכרטיס
                                            </button>
                                        </div>
                                    </div>

                                    {/* שיוך שדכנית */}
                                    <div style={s.shadchanitRow}>
                                        <label style={s.shadchanitLabel}>👩‍💼 שדכנית מטפלת:</label>
                                        <select
                                            value={match.shadchanit_id || ''}
                                            onChange={e => handleAssignShadchanit(match.connection_id, e.target.value)}
                                            style={s.shadchanitSelect}
                                        >
                                            <option value="">— בחר שדכנית —</option>
                                            {shadchaniot.map(sh => (
                                                <option key={sh.id} value={sh.id}>{sh.name}</option>
                                            ))}
                                        </select>
                                        {match.shadchanit_id && (
                                            <button
                                                onClick={() => handleSendCards(match.connection_id)}
                                                style={s.sendBtn}
                                            >
                                                📧 שלח כרטיסיות למייל
                                            </button>
                                        )}
                                    </div>

                                    {/* כפתור סגירה */}
                                    <div style={s.matchActions}>
                                        <button
                                            onClick={() => {
                                                setCloseModal({
                                                    connectionId: match.connection_id,
                                                    senderName: match.sender_name,
                                                    receiverName: match.receiver_name
                                                });
                                                setCloseForm({ succeeded: null, failReason: '', summary: '' });
                                            }}
                                            style={s.closeMatchBtn}
                                        >
                                            📁 סגור תיק שידוך
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===== טאב שדכניות ===== */}
                {activeTab === 'shadchaniot' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <button
                                onClick={() => {
                                    setShowShadchanitForm(true);
                                    setEditingShadchanit(null);
                                    setShadchanitForm({ name: '', phone: '', email: '' });
                                }}
                                style={s.addBtn}
                            >
                                + הוסף שדכנית
                            </button>
                        </div>

                        {showShadchanitForm && (
                            <div style={s.formCard}>
                                <h3 style={s.formTitle}>{editingShadchanit ? 'עריכת שדכנית' : 'הוספת שדכנית חדשה'}</h3>
                                <div style={s.formGrid}>
                                    <div style={s.formGroup}>
                                        <label style={s.formLabel}>שם *</label>
                                        <input
                                            value={shadchanitForm.name}
                                            onChange={e => setShadchanitForm(p => ({ ...p, name: e.target.value }))}
                                            placeholder="שם השדכנית"
                                            style={s.formInput}
                                        />
                                    </div>
                                    <div style={s.formGroup}>
                                        <label style={s.formLabel}>טלפון</label>
                                        <input
                                            value={shadchanitForm.phone}
                                            onChange={e => setShadchanitForm(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="050-0000000"
                                            style={s.formInput}
                                        />
                                    </div>
                                    <div style={s.formGroup}>
                                        <label style={s.formLabel}>מייל</label>
                                        <input
                                            value={shadchanitForm.email}
                                            onChange={e => setShadchanitForm(p => ({ ...p, email: e.target.value }))}
                                            placeholder="example@email.com"
                                            style={s.formInput}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                    <button onClick={handleSaveShadchanit} style={s.saveBtn}>💾 שמור</button>
                                    <button onClick={() => { setShowShadchanitForm(false); setEditingShadchanit(null); }} style={s.cancelBtn}>ביטול</button>
                                </div>
                            </div>
                        )}

                        {shadchaniot.length === 0 ? (
                            <div style={s.empty}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👩‍💼</div>
                                <div>לא הוגדרו שדכניות עדיין</div>
                            </div>
                        ) : (
                            shadchaniot.map(sh => (
                                <div key={sh.id} style={s.shadchanitCard}>
                                    <div style={s.shadchanitInfo}>
                                        <div style={s.shadchanitName}>{sh.name}</div>
                                        <div style={s.shadchanitMeta}>
                                            {sh.phone && <span>📱 {sh.phone}</span>}
                                            {sh.email && <span>✉️ {sh.email}</span>}
                                            <span style={{ color: '#10b981' }}>💍 {sh.active_matches || 0} פעילים</span>
                                            <span style={{ color: '#c9a227' }}>🎉 {sh.successful_matches || 0} הצליחו</span>
                                        </div>
                                    </div>
                                    <div style={s.shadchanitActions}>
                                        <button
                                            onClick={() => handleShadchanitHistory(sh.id)}
                                            style={s.historyBtn}
                                        >
                                            📋 {selectedShadchanitId === sh.id ? 'הסתר' : 'היסטוריה'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingShadchanit(sh.id);
                                                setShadchanitForm({ name: sh.name, phone: sh.phone || '', email: sh.email || '' });
                                                setShowShadchanitForm(true);
                                            }}
                                            style={s.editBtn}
                                        >
                                            ✏️ ערוך
                                        </button>
                                        <button onClick={() => handleDeleteShadchanit(sh.id)} style={s.deleteBtn}>🗑️</button>
                                    </div>

                                    {selectedShadchanitId === sh.id && shadchanitHistory && (
                                        <div style={s.historyPanel}>
                                            <h4 style={{ color: '#1e3a5f', margin: '0 0 12px' }}>📋 היסטוריית שידוכים</h4>
                                            {shadchanitHistory.length === 0 ? (
                                                <p style={{ color: '#9ca3af' }}>אין היסטוריה עדיין</p>
                                            ) : (
                                                shadchanitHistory.map(h => (
                                                    <div key={h.id} style={{
                                                        ...s.historyItem,
                                                        borderRight: `3px solid ${h.match_succeeded ? '#10b981' : '#ef4444'}`
                                                    }}>
                                                        <div style={{ fontWeight: 'bold' }}>
                                                            {h.match_succeeded ? '🎉' : '❌'} {h.sender_name} & {h.receiver_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                                                            {fmtDate(h.closed_at)}
                                                            {h.fail_reason && ` · סיבה: ${h.fail_reason}`}
                                                            {h.close_summary && ` · ${h.close_summary}`}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===== טאב שידוכים שהצליחו ===== */}
                {activeTab === 'successful' && (
                    <div>
                        {successfulMatches.length === 0 ? (
                            <div style={s.empty}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💍</div>
                                <div>אין שידוכים מוצלחים עדיין</div>
                            </div>
                        ) : (
                            <>
                                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
                                    סה"כ <strong>{successfulMatches.length}</strong> שידוכים מוצלחים!
                                </p>
                                {successfulMatches.map(m => (
                                    <div key={m.id} style={{ ...s.matchCard, borderTop: '4px solid #10b981' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ ...s.matchTitle, color: '#10b981' }}>
                                                    🎉 {m.sender_name} & {m.receiver_name}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '6px' }}>
                                                    {m.shadchanit_name && <span>👩‍💼 {m.shadchanit_name} · </span>}
                                                    📅 {fmtDate(m.closed_at)}
                                                    {m.close_summary && <span> · {m.close_summary}</span>}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '2rem' }}>💍</div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ===== מודל צפייה בכרטיס ===== */}
            {cardModal && (
                <MatchCardModal
                    targetId={cardModal.userId}
                    isAdmin={true}
                    onClose={() => setCardModal(null)}
                />
            )}

            {/* ===== מודל סגירת שידוך ===== */}
            {closeModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modal}>
                        <h3 style={s.modalTitle}>📁 סגירת תיק שידוך</h3>
                        <p style={s.modalSubtitle}>{closeModal.senderName} & {closeModal.receiverName}</p>

                        <div style={s.radioGroup}>
                            <label style={s.radioLabel}>
                                <input
                                    type="radio" name="outcome" value="success"
                                    checked={closeForm.succeeded === true}
                                    onChange={() => setCloseForm(p => ({ ...p, succeeded: true }))}
                                />
                                {' '}🎉 השידוך הצליח!
                            </label>
                            <label style={s.radioLabel}>
                                <input
                                    type="radio" name="outcome" value="failure"
                                    checked={closeForm.succeeded === false}
                                    onChange={() => setCloseForm(p => ({ ...p, succeeded: false }))}
                                />
                                {' '}❌ השידוך לא הצליח
                            </label>
                        </div>

                        {closeForm.succeeded === false && (
                            <div style={{ marginBottom: '12px' }}>
                                <label style={s.fieldLabel}>סיבת הסגירה *</label>
                                <input
                                    value={closeForm.failReason}
                                    onChange={e => setCloseForm(p => ({ ...p, failReason: e.target.value }))}
                                    placeholder="לדוגמה: לא התאימו, הצד סירב..."
                                    style={s.modalInput}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={s.fieldLabel}>סיכום (אופציונלי)</label>
                            <textarea
                                value={closeForm.summary}
                                onChange={e => setCloseForm(p => ({ ...p, summary: e.target.value }))}
                                placeholder="הערות לסיום..."
                                rows={3}
                                style={s.modalTextarea}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleCloseMatch} style={s.confirmBtn}>✅ אשר סגירה</button>
                            <button onClick={() => setCloseModal(null)} style={s.cancelBtn}>ביטול</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '30px 20px', direction: 'rtl', fontFamily: "'Heebo', sans-serif"
    },
    loadingPage: {
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f, #2d4a6f)'
    },
    spinner: {
        width: '45px', height: '45px', border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
    },
    container: { maxWidth: '1000px', margin: '0 auto' },
    title: { color: '#fff', margin: '0 0 20px', fontSize: '2rem' },
    toast: {
        position: 'fixed', top: '20px', right: '50%', transform: 'translateX(50%)',
        background: '#1e3a5f', color: '#fff', padding: '14px 28px',
        borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 9999, fontWeight: 'bold', fontSize: '1rem'
    },

    tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
    tab: {
        padding: '10px 20px', background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
        borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem',
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    activeTab: {
        padding: '10px 20px', background: '#c9a227', border: 'none',
        color: '#1a1a1a', borderRadius: '10px', cursor: 'pointer',
        fontSize: '0.95rem', fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    badge: {
        background: '#ef4444', color: '#fff', borderRadius: '50%',
        width: '20px', height: '20px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold'
    },

    empty: {
        background: 'rgba(255,255,255,0.1)', borderRadius: '14px',
        padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.7)'
    },

    matchCard: {
        background: '#fff', borderRadius: '14px', padding: '22px',
        marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    matchHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px'
    },
    matchTitle: { fontSize: '1.2rem', fontWeight: 'bold', color: '#1e3a5f' },
    statusBadge: {
        background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px',
        borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
    },
    sidesGrid: {
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px',
        alignItems: 'start', marginBottom: '16px'
    },
    side: { background: '#f8fafc', borderRadius: '10px', padding: '14px' },
    sideName: { fontWeight: 'bold', color: '#1e3a5f', fontSize: '1.05rem', marginBottom: '8px' },
    sideMeta: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: '#6b7280', marginBottom: '10px' },
    sideDivider: { fontSize: '1.5rem', paddingTop: '20px' },
    viewCardBtn: {
        width: '100%', padding: '8px', background: '#1e3a5f', color: '#fff',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
    },

    shadchanitRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', background: '#f0fdf4', borderRadius: '10px',
        marginBottom: '12px', flexWrap: 'wrap'
    },
    shadchanitLabel: { color: '#166534', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' },
    shadchanitSelect: {
        flex: 1, padding: '8px 12px', borderRadius: '8px',
        border: '1px solid #d1d5db', fontSize: '0.9rem', minWidth: '200px'
    },
    sendBtn: {
        padding: '8px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
        fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap'
    },
    matchActions: { display: 'flex', justifyContent: 'flex-end' },
    closeMatchBtn: {
        padding: '10px 22px', background: 'linear-gradient(135deg, #374151, #1f2937)',
        color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold'
    },

    addBtn: {
        padding: '10px 22px', background: 'linear-gradient(135deg, #c9a227, #a8871d)',
        color: '#1a1a1a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    formCard: {
        background: '#fff', borderRadius: '14px', padding: '22px',
        marginBottom: '16px', border: '2px solid #c9a227'
    },
    formTitle: { color: '#1e3a5f', margin: '0 0 16px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    formLabel: { color: '#374151', fontSize: '0.85rem', fontWeight: 'bold' },
    formInput: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' },

    shadchanitCard: {
        background: '#fff', borderRadius: '12px', padding: '18px 20px',
        marginBottom: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    },
    shadchanitInfo: { flex: 1, marginBottom: '10px' },
    shadchanitName: { fontWeight: 'bold', color: '#1e3a5f', fontSize: '1.1rem', marginBottom: '6px' },
    shadchanitMeta: { display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#6b7280', flexWrap: 'wrap' },
    shadchanitActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    historyBtn: {
        padding: '7px 14px', background: '#f0f9ff', border: '1px solid #bae6fd',
        color: '#0369a1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
    },
    editBtn: {
        padding: '7px 14px', background: '#fef9ec', border: '1px solid #fcd34d',
        color: '#92400e', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
    },
    deleteBtn: {
        padding: '7px 12px', background: '#fef2f2', border: '1px solid #fca5a5',
        color: '#dc2626', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem'
    },
    historyPanel: {
        marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e5e7eb'
    },
    historyItem: {
        background: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
        marginBottom: '8px'
    },

    saveBtn: {
        padding: '10px 22px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    cancelBtn: {
        padding: '10px 22px', background: '#f1f5f9', border: '1px solid #d1d5db',
        color: '#374151', borderRadius: '10px', cursor: 'pointer'
    },

    modalOverlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000, padding: '20px'
    },
    modal: {
        background: '#fff', borderRadius: '16px', padding: '30px',
        width: '100%', maxWidth: '480px', direction: 'rtl'
    },
    modalTitle: { color: '#1e3a5f', margin: '0 0 6px', fontSize: '1.3rem' },
    modalSubtitle: { color: '#6b7280', margin: '0 0 20px' },
    radioGroup: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
    radioLabel: { fontSize: '1rem', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    fieldLabel: { display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.9rem' },
    modalInput: {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1px solid #d1d5db', fontSize: '0.95rem', boxSizing: 'border-box'
    },
    modalTextarea: {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1px solid #d1d5db', fontSize: '0.95rem', resize: 'vertical',
        boxSizing: 'border-box'
    },
    confirmBtn: {
        flex: 1, padding: '11px 20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    }
};

export default AdminMatches;
