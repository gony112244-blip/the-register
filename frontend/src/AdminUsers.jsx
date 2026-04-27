import API_BASE from './config';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileView from './ProfileView';
import AdminUserHistory from './AdminUserHistory';
import { useToast } from './components/ToastProvider';
import InitialsAvatar from './components/InitialsAvatar';

const STATUS_MAP = {
    active: 'פעיל',
    waiting_for_shadchan: 'ממתין לשדכנית',
    rejected: 'נדחה',
    cancelled: 'בוטל',
    pending: 'ממתין',
    handled: 'טופל'
};

const SECTOR_LABELS = {
    ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני',
    mixed: 'מעורב', other: 'אחר'
};

function AdminUsers() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');
    const [users, setUsers] = useState([]);
    const expandedPanelRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [expandingUserId, setExpandingUserId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [messageText, setMessageText] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // סינון
    const [searchText, setSearchText] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterAgeMin, setFilterAgeMin] = useState('');
    const [filterAgeMax, setFilterAgeMax] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // אבחון ממתינים
    const [showDiagnosis, setShowDiagnosis] = useState(false);
    const [diagnosisData, setDiagnosisData] = useState(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);

    // שגיאות אחרונות
    const [showErrors, setShowErrors] = useState(false);
    const [errorsData, setErrorsData] = useState(null);
    const [errorsLoading, setErrorsLoading] = useState(false);
    const [errorsDays, setErrorsDays] = useState(7);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchUsers();
    }, [navigate, token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/all-users?pageSize=2000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : (data.users || []));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    // גלילה אוטומטית לפאנל שנפתח
    useEffect(() => {
        if (selectedUser && expandedPanelRef.current) {
            setTimeout(() => {
                expandedPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [selectedUser]);

    const fetchFullUser = async (userId, noteDefault) => {
        setExpandingUserId(userId);
        setSelectedUser(null);
        setShowHistory(false);
        setHistoryData(null);
        setActiveTab('profile');
        try {
            const res = await fetch(`${API_BASE}/admin/user/${userId}/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSelectedUser(data);
            // admin_notes מגיע מהשרת תמיד - עדיפות לערך מהשרת
            const note = data.admin_notes || noteDefault || '';
            setNoteText(note);
        } catch (err) {
            console.error(err);
        }
        setExpandingUserId(null);
    };

    const fetchDiagnosis = async () => {
        setDiagnosisLoading(true);
        setShowDiagnosis(true);
        try {
            const res = await fetch(`${API_BASE}/admin/pending-users-diagnosis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setDiagnosisData(data);
            } else {
                showToast(data.message || 'שגיאה בטעינת האבחון', 'error');
                setShowDiagnosis(false);
            }
        } catch (err) {
            showToast('שגיאה בתקשורת עם השרת', 'error');
            setShowDiagnosis(false);
        }
        setDiagnosisLoading(false);
    };

    const fetchRecentErrors = async (days = errorsDays) => {
        setErrorsLoading(true);
        setShowErrors(true);
        try {
            const res = await fetch(`${API_BASE}/admin/recent-errors?days=${days}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setErrorsData(data);
            } else {
                showToast(data.message || 'שגיאה בטעינת השגיאות', 'error');
                setShowErrors(false);
            }
        } catch (err) {
            showToast('שגיאה בתקשורת עם השרת', 'error');
            setShowErrors(false);
        }
        setErrorsLoading(false);
    };

    const fetchHistory = async (userId) => {
        setHistoryLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/user-history/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setHistoryData(data);
        } catch (err) {
            console.error(err);
        }
        setHistoryLoading(false);
        setShowHistory(true);
    };

    const handleApprove = async (userId) => {
        try {
            const res = await fetch(`${API_BASE}/admin/approve/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('✅ המשתמש אושר בהצלחה', 'success');
                fetchUsers();
                if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, is_approved: true });
            } else {
                showToast('שגיאה באישור המשתמש', 'error');
            }
        } catch (err) {
            showToast('שגיאה בתקשורת עם השרת', 'error');
        }
    };

    const handleBlock = async (userId, block) => {
        const reason = block ? prompt('סיבת החסימה (אופציונלי):') : null;
        if (block && reason === null) return;
        try {
            const res = await fetch(`${API_BASE}/admin/block-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, block, reason })
            });
            if (res.ok) {
                fetchUsers();
                showToast(block ? '🔒 המשתמש נחסם בהצלחה' : '🔓 המשתמש שוחרר בהצלחה', 'success');
            } else {
                showToast('שגיאה בחסימה/שחרור', 'error');
            }
        } catch (err) {
            showToast('שגיאה', 'error');
        }
    };

    const handleSaveNote = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/user-note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: selectedUser.id, note: noteText })
            });
            if (res.ok) {
                showToast('📝 ההערה נשמרה', 'success');
                fetchUsers();
            } else {
                showToast('שגיאה בשמירה', 'error');
            }
        } catch (err) {
            showToast('שגיאה', 'error');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('⚠️ למחוק את המשתמש לצמיתות? פעולה זו אינה ניתנת לביטול!')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/delete-user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('🗑️ המשתמש נמחק', 'success');
                setSelectedUser(null);
                fetchUsers();
            } else {
                showToast('שגיאה במחיקת המשתמש', 'error');
            }
        } catch (err) {
            showToast('שגיאה בתקשורת עם השרת', 'error');
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/admin/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: selectedUser.id, message: messageText })
            });
            if (res.ok) {
                showToast('✉️ ההודעה נשלחה', 'success');
                setMessageText('');
            } else {
                showToast('שגיאה בשליחת הודעה', 'error');
            }
        } catch (err) {
            showToast('שגיאה', 'error');
        }
    };

    // סינון מורכב
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (filterStatus === 'approved' && !(u.is_approved && !u.is_blocked)) return false;
            if (filterStatus === 'pending' && u.is_approved) return false;
            if (filterStatus === 'blocked' && !u.is_blocked) return false;

            if (searchText) {
                const q = searchText.toLowerCase();
                const name = `${u.full_name || ''} ${u.last_name || ''}`.toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                if (!name.includes(q) && !phone.includes(q) && !email.includes(q) && !String(u.id).includes(q)) return false;
            }

            if (filterGender && u.gender !== filterGender) return false;
            if (filterSector && u.heritage_sector !== filterSector) return false;

            const age = parseInt(u.age);
            if (filterAgeMin && age < parseInt(filterAgeMin)) return false;
            if (filterAgeMax && age > parseInt(filterAgeMax)) return false;

            return true;
        });
    }, [users, filterStatus, searchText, filterGender, filterSector, filterAgeMin, filterAgeMax]);

    const clearFilters = () => {
        setSearchText(''); setFilterSector(''); setFilterGender('');
        setFilterAgeMin(''); setFilterAgeMax(''); setFilterStatus('all');
    };

    const hasActiveFilters = searchText || filterSector || filterGender || filterAgeMin || filterAgeMax || filterStatus !== 'all';

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '—';

    if (loading) return (
        <div style={st.loadingContainer}>
            <div style={st.spinner}></div>
            <h2 style={{ color: '#fff' }}>טוען משתמשים...</h2>
        </div>
    );

    return (
        <div style={st.page}>
            <div style={st.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={st.title}>👥 ניהול משתמשים</h1>
                        <p style={st.subtitle}>סה״כ {users.length} משתמשים · מוצגים {filteredUsers.length}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={fetchDiagnosis} style={st.diagnosisBtn}>
                            🔍 אבחון ממתינים
                        </button>
                        <button onClick={() => fetchRecentErrors()} style={st.errorsBtn}>
                            ⚠️ שגיאות אחרונות
                        </button>
                    </div>
                </div>

                {/* --- אזור סינון --- */}
                <div style={st.filterBox}>
                    <div style={st.filterRow}>
                        <input
                            type="text"
                            placeholder="🔍 חיפוש לפי שם / טלפון / מייל / מספר"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={st.searchInput}
                        />
                    </div>
                    <div style={st.filterRow}>
                        {/* סטטוס */}
                        <div style={st.filterGroup}>
                            <label style={st.filterLabel}>סטטוס</label>
                            <div style={st.btnGroup}>
                                {[
                                    { key: 'all', label: 'הכל' },
                                    { key: 'approved', label: '✅ מאושרים' },
                                    { key: 'pending', label: '⏳ ממתינים' },
                                    { key: 'blocked', label: '🚫 חסומים' }
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilterStatus(f.key)}
                                        style={filterStatus === f.key ? st.activeFilterBtn : st.filterBtn}
                                    >
                                        {f.label} ({
                                            f.key === 'all' ? users.length :
                                            f.key === 'approved' ? users.filter(u => u.is_approved && !u.is_blocked).length :
                                            f.key === 'pending' ? users.filter(u => !u.is_approved).length :
                                            users.filter(u => u.is_blocked).length
                                        })
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={st.filterRow}>
                        {/* מוצא */}
                        <div style={st.filterGroup}>
                            <label style={st.filterLabel}>מוצא</label>
                            <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={st.select}>
                                <option value="">הכל</option>
                                {Object.entries(SECTOR_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        {/* מין */}
                        <div style={st.filterGroup}>
                            <label style={st.filterLabel}>מין</label>
                            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={st.select}>
                                <option value="">הכל</option>
                                <option value="male">זכר</option>
                                <option value="female">נקבה</option>
                            </select>
                        </div>
                        {/* גיל */}
                        <div style={st.filterGroup}>
                            <label style={st.filterLabel}>גיל</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="number" placeholder="מ-" min="18" max="99"
                                    value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)}
                                    style={{ ...st.select, width: '70px' }} />
                                <span style={{ color: '#fff' }}>–</span>
                                <input type="number" placeholder="-עד" min="18" max="99"
                                    value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)}
                                    style={{ ...st.select, width: '70px' }} />
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} style={st.clearBtn}>✕ נקה סינון</button>
                        )}
                    </div>
                </div>

                {/* --- רשימת משתמשים --- */}
                <div>
                    {filteredUsers.length === 0 && (
                        <div style={{ color: '#fff', textAlign: 'center', padding: '40px', opacity: 0.7 }}>
                            לא נמצאו משתמשים התואמים את הסינון
                        </div>
                    )}
                    {showDiagnosis && (
                        <DiagnosisModal
                            data={diagnosisData}
                            loading={diagnosisLoading}
                            onClose={() => setShowDiagnosis(false)}
                            onApprove={handleApprove}
                            onOpenUser={(uid) => { setShowDiagnosis(false); fetchFullUser(uid); }}
                        />
                    )}
                    {showErrors && (
                        <RecentErrorsModal
                            data={errorsData}
                            loading={errorsLoading}
                            days={errorsDays}
                            onChangeDays={(d) => { setErrorsDays(d); fetchRecentErrors(d); }}
                            onClose={() => setShowErrors(false)}
                            onOpenUser={(uid) => { setShowErrors(false); fetchFullUser(uid); }}
                        />
                    )}
                    {filteredUsers.map(user => (
                        <div key={user.id} style={{ marginBottom: '10px' }}>
                            <div
                                style={{
                                    ...st.userCard,
                                    ...(user.is_blocked ? st.blockedCard : {}),
                                    ...(selectedUser?.id === user.id ? st.selectedCard : {})
                                }}
                                onClick={() => {
                                    if (selectedUser?.id === user.id) {
                                        setSelectedUser(null);
                                    } else {
                                        fetchFullUser(user.id, user.admin_notes);
                                    }
                                }}
                            >
                                <div style={st.userHeader}>
                                        <InitialsAvatar
                                            fullName={user.full_name}
                                            lastName={user.last_name}
                                            size={50}
                                            style={{ ...st.avatar, ...(user.is_blocked ? { background: '#ef4444', borderColor: '#ff8888' } : {}) }}
                                        />
                                    <div style={st.userInfo}>
                                        <h3 style={st.userName}>{user.full_name} {user.last_name || ''}</h3>
                                        <div style={st.userMeta}>
                                            <span>#{user.id}</span>
                                            <span>📱 {user.phone}</span>
                                            <span>📅 {user.age} שנים</span>
                                            <span>{user.gender === 'male' ? '👨 זכר' : '👩 נקבה'}</span>
                                            {user.heritage_sector && <span>🏘️ {SECTOR_LABELS[user.heritage_sector] || user.heritage_sector}</span>}
                                            {user.admin_notes && <span style={{ color: '#f59e0b' }}>📝 יש הערה</span>}
                                        </div>
                                    </div>
                                    <div style={st.badges}>
                                        {user.is_approved && !user.is_blocked && <span style={st.approvedBadge}>✅</span>}
                                        {!user.is_approved && <span style={st.pendingBadge}>⏳</span>}
                                        {user.is_blocked && <span style={st.blockedBadge}>🚫</span>}
                                    </div>
                                </div>
                            </div>

                            {/* פאנל מורחב */}
                            {(selectedUser?.id === user.id || expandingUserId === user.id) && (
                                <div ref={selectedUser?.id === user.id ? expandedPanelRef : null} style={st.expandedPanel}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => { setActiveTab('profile'); setShowHistory(false); }}
                                                style={activeTab === 'profile' ? st.activeTabBtn : st.tabBtn}
                                            >👤 פרופיל</button>
                                            <button
                                                onClick={() => { setActiveTab('notes'); setShowHistory(false); }}
                                                style={activeTab === 'notes' ? st.activeTabBtn : st.tabBtn}
                                            >📝 הערות והודעות</button>
                                            <button
                                                onClick={() => {
                                                    setActiveTab('history');
                                                    if (!historyData || historyData.userId !== user.id) {
                                                        fetchHistory(user.id);
                                                    } else {
                                                        setShowHistory(true);
                                                    }
                                                }}
                                                style={activeTab === 'history' ? st.activeTabBtn : st.tabBtn}
                                            >📋 היסטוריה</button>
                                        </div>
                                        <button onClick={() => { setSelectedUser(null); setExpandingUserId(null); }} style={st.closeCardBtn}>✖ סגור</button>
                                    </div>

                                    {expandingUserId === user.id && !selectedUser ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                            <div style={{ fontSize: '2rem' }}>⏳</div>
                                            <div>טוען פרטים מלאים...</div>
                                        </div>
                                    ) : selectedUser && selectedUser.id === user.id ? (
                                        <>
                                            {/* --- טאב פרופיל --- */}
                                            {activeTab === 'profile' && (
                                                <div style={{ marginBottom: '20px' }}>
                                                    <ProfileView externalUser={selectedUser} readOnly={true} isAdminView={true} />
                                                </div>
                                            )}

                                            {/* --- טאב הערות + הודעות --- */}
                                            {activeTab === 'notes' && (
                                                <div style={st.adminActionsGrid}>
                                                    <div style={st.section}>
                                                        <h4 style={st.sectionH}>📝 הערות פנימיות</h4>
                                                        {selectedUser?.admin_notes && (
                                                            <div style={st.existingNote}>
                                                                <strong>הערה נוכחית:</strong> {selectedUser.admin_notes}
                                                            </div>
                                                        )}
                                                        <textarea
                                                            value={noteText}
                                                            onChange={(e) => setNoteText(e.target.value)}
                                                            placeholder="הערות לשימוש פנימי בלבד..."
                                                            style={st.textarea}
                                                        />
                                                        <button onClick={handleSaveNote} style={st.saveBtn}>💾 שמור הערה</button>
                                                    </div>
                                                    <div style={st.section}>
                                                        <h4 style={st.sectionH}>✉️ שליחת הודעה למשתמש</h4>
                                                        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 8px' }}>
                                                            ההודעה תופיע תיבת הדואר שלו במערכת
                                                        </p>
                                                        <textarea
                                                            value={messageText}
                                                            onChange={(e) => setMessageText(e.target.value)}
                                                            placeholder="כתוב הודעה..."
                                                            style={st.textarea}
                                                        />
                                                        <button onClick={handleSendMessage} style={st.sendBtn}>📤 שלח הודעה</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* --- טאב היסטוריה --- */}
                                            {activeTab === 'history' && (
                                                <div>
                                                    {/* לוג פעילות */}
                                                    <AdminUserHistory
                                                        userId={user.id}
                                                        userName={user.full_name}
                                                        onClose={() => setActiveTab('profile')}
                                                        inline={true}
                                                    />
                                                </div>
                                            )}

                                            {/* פעולות מנהל */}
                                            <div style={st.adminActionsRow}>
                                                {!selectedUser.is_approved && (
                                                    <button onClick={() => handleApprove(selectedUser.id)} style={st.approveActionBtn}>
                                                        ✅ אשר משתמש
                                                    </button>
                                                )}
                                                {!selectedUser.is_blocked ? (
                                                    <button onClick={() => handleBlock(selectedUser.id, true)} style={st.blockBtn}>
                                                        🚫 חסום משתמש
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleBlock(selectedUser.id, false)} style={st.unblockBtn}>
                                                        ✅ שחרר חסימה
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(selectedUser.id)} style={st.deleteBtn}>
                                                    🗑️ מחק משתמש
                                                </button>
                                            </div>

                                            {selectedUser?.is_blocked && selectedUser?.blocked_reason && (
                                                <div style={st.blockReason}>
                                                    <strong>סיבת חסימה:</strong> {selectedUser.blocked_reason}
                                                </div>
                                            )}
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const st = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '20px', direction: 'rtl', fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: { maxWidth: '1100px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)'
    },
    spinner: {
        width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
    },
    title: { color: '#fff', margin: '0 0 5px', fontSize: '2rem' },
    subtitle: { color: 'rgba(255,255,255,0.7)', margin: '0 0 20px' },

    filterBox: {
        background: 'rgba(255,255,255,0.1)', borderRadius: '14px',
        padding: '16px 20px', marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.2)'
    },
    filterRow: { display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' },
    filterGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    filterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', fontWeight: 'bold' },
    searchInput: {
        flex: 1, padding: '11px 16px', borderRadius: '10px', border: 'none',
        fontSize: '1rem', outline: 'none', direction: 'rtl', minWidth: '280px'
    },
    btnGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    filterBtn: {
        padding: '8px 14px', background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
        borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
    },
    activeFilterBtn: {
        padding: '8px 14px', background: '#c9a227', border: 'none',
        color: '#1a1a1a', borderRadius: '8px', cursor: 'pointer',
        fontSize: '0.85rem', fontWeight: 'bold'
    },
    select: {
        padding: '9px 12px', borderRadius: '8px', border: 'none',
        fontSize: '0.9rem', outline: 'none', cursor: 'pointer', direction: 'rtl'
    },
    clearBtn: {
        padding: '9px 16px', background: 'rgba(239,68,68,0.8)', border: 'none',
        color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
    },

    userCard: {
        background: '#fff', borderRadius: '12px', padding: '14px 18px',
        cursor: 'pointer', transition: 'all 0.2s',
        border: '3px solid transparent'
    },
    blockedCard: { background: '#fef2f2', borderColor: '#ef4444' },
    selectedCard: { borderColor: '#c9a227', boxShadow: '0 0 20px rgba(201,162,39,0.4)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    userHeader: { display: 'flex', alignItems: 'center', gap: '14px' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 },
    userInfo: { flex: 1 },
    userName: { margin: '0 0 4px', color: '#1e3a5f', fontSize: '1.05rem' },
    userMeta: { display: 'flex', gap: '12px', fontSize: '0.83rem', color: '#6b7280', flexWrap: 'wrap' },
    badges: { display: 'flex', gap: '5px' },
    approvedBadge: { background: '#d4edda', padding: '4px 8px', borderRadius: '10px', fontSize: '0.85rem' },
    pendingBadge: { background: '#fff3cd', padding: '4px 8px', borderRadius: '10px', fontSize: '0.85rem' },
    blockedBadge: { background: '#f8d7da', padding: '4px 8px', borderRadius: '10px', fontSize: '0.85rem' },

    expandedPanel: {
        background: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px',
        padding: '22px', boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
        border: '3px solid #c9a227', borderTopWidth: 0, marginBottom: '10px'
    },
    tabBtn: {
        padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
        color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem'
    },
    activeTabBtn: {
        padding: '8px 16px', background: '#1e3a5f', border: 'none',
        color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'
    },
    closeCardBtn: {
        background: '#ef4444', color: '#fff', border: 'none',
        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold'
    },

    section: { marginBottom: '20px' },
    sectionH: { color: '#1e3a5f', margin: '0 0 10px', fontSize: '1rem' },
    adminActionsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0'
    },
    adminActionsRow: {
        display: 'flex', flexWrap: 'wrap', gap: '10px',
        marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0'
    },
    textarea: {
        width: '100%', minHeight: '80px', padding: '10px 12px',
        border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '0.95rem',
        resize: 'vertical', marginBottom: '10px', boxSizing: 'border-box'
    },
    saveBtn: {
        padding: '10px 22px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    sendBtn: {
        padding: '10px 22px', background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    approveActionBtn: {
        flex: 1, padding: '11px 18px', background: 'linear-gradient(135deg, #c9a227, #a8871d)',
        color: '#1a1a1a', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    blockBtn: {
        flex: 1, padding: '11px 18px', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    unblockBtn: {
        flex: 1, padding: '11px 18px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    deleteBtn: {
        flex: 1, padding: '11px 18px', background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        color: '#fff', border: '2px solid #ef4444', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
    },
    blockReason: {
        marginTop: '12px', background: '#fef2f2', border: '1px solid #ef4444',
        padding: '12px', borderRadius: '10px', color: '#991b1b'
    },
    historyItem: {
        background: '#f8fafc', borderRadius: '8px', padding: '10px 14px',
        marginBottom: '8px', borderRight: '3px solid #c9a227'
    },
    existingNote: {
        background: '#fef9ec', border: '1px solid #fcd34d', borderRadius: '8px',
        padding: '10px 14px', marginBottom: '12px', color: '#92400e', fontSize: '0.9rem',
        lineHeight: 1.5
    },
    diagnosisBtn: {
        padding: '12px 22px',
        background: 'linear-gradient(135deg, #c9a227, #a8871d)',
        color: '#1a1a1a', border: 'none', borderRadius: '10px',
        fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
    },
    errorsBtn: {
        padding: '12px 22px',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff', border: 'none', borderRadius: '10px',
        fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
    }
};

const DIAGNOSIS_LABELS = {
    not_completed: { text: '🔴 לא השלים את הפרופיל', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    partial_not_submitted: { text: '🟡 התחיל ולא שלח לאישור', color: '#92400e', bg: '#fef9ec', border: '#fcd34d' },
    ready_for_approval: { text: '🟢 מוכן לאישור', color: '#166534', bg: '#f0fdf4', border: '#86efac' }
};

const ACTION_LABELS = {
    registered: 'נרשם',
    login: 'התחבר',
    login_success: 'התחבר',
    profile_updated: 'עדכן פרופיל',
    profile_safe_fields_updated: 'עדכן פרטים',
    profile_submitted: 'שלח פרופיל',
    profile_update_failed: '⚠️ שמירת פרופיל נכשלה',
    photo_uploaded: 'העלה תמונה',
    email_verified: 'אימת מייל'
};

function DiagnosisModal({ data, loading, onClose, onApprove, onOpenUser }) {
    const fmt = (d) => d ? new Date(d).toLocaleString('he-IL', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <div style={dst.overlay} onClick={onClose}>
            <div style={dst.modal} onClick={(e) => e.stopPropagation()}>
                <div style={dst.header}>
                    <h2 style={dst.title}>🔍 אבחון משתמשים ממתינים</h2>
                    <button onClick={onClose} style={dst.closeBtn}>✖</button>
                </div>

                {loading ? (
                    <div style={dst.loading}>
                        <div style={{ fontSize: '2rem' }}>⏳</div>
                        <div>טוען אבחון...</div>
                    </div>
                ) : !data ? (
                    <div style={dst.loading}>אין נתונים</div>
                ) : data.users.length === 0 ? (
                    <div style={dst.loading}>אין משתמשים ממתינים לאישור 🎉</div>
                ) : (
                    <>
                        <div style={dst.summaryRow}>
                            <div style={{ ...dst.summaryCard, borderColor: DIAGNOSIS_LABELS.not_completed.border, background: DIAGNOSIS_LABELS.not_completed.bg }}>
                                <div style={{ ...dst.summaryNum, color: DIAGNOSIS_LABELS.not_completed.color }}>{data.summary.not_completed}</div>
                                <div style={dst.summaryLabel}>לא השלימו פרופיל</div>
                            </div>
                            <div style={{ ...dst.summaryCard, borderColor: DIAGNOSIS_LABELS.partial_not_submitted.border, background: DIAGNOSIS_LABELS.partial_not_submitted.bg }}>
                                <div style={{ ...dst.summaryNum, color: DIAGNOSIS_LABELS.partial_not_submitted.color }}>{data.summary.partial_not_submitted}</div>
                                <div style={dst.summaryLabel}>התחילו ולא שלחו</div>
                            </div>
                            <div style={{ ...dst.summaryCard, borderColor: DIAGNOSIS_LABELS.ready_for_approval.border, background: DIAGNOSIS_LABELS.ready_for_approval.bg }}>
                                <div style={{ ...dst.summaryNum, color: DIAGNOSIS_LABELS.ready_for_approval.color }}>{data.summary.ready_for_approval}</div>
                                <div style={dst.summaryLabel}>מוכנים לאישור</div>
                            </div>
                        </div>

                        <div style={dst.list}>
                            {data.users.map(u => {
                                const label = DIAGNOSIS_LABELS[u.diagnosis] || DIAGNOSIS_LABELS.not_completed;
                                return (
                                    <div key={u.id} style={{ ...dst.userBox, borderColor: label.border }}>
                                        <div style={dst.userTopRow}>
                                            <div>
                                                <div style={dst.userName}>
                                                    #{u.id} · {u.full_name || ''} {u.last_name || ''}
                                                </div>
                                                <div style={dst.userMeta}>
                                                    📱 {u.phone || '—'}
                                                    {' · '}
                                                    📧 {u.email || '—'} {u.is_email_verified ? '✓' : '✗'}
                                                    {' · '}
                                                    🖼️ {u.profile_images_count} תמונות
                                                </div>
                                                <div style={dst.userMeta}>
                                                    נרשם: {fmt(u.created_at)}
                                                    {' · '}
                                                    כניסה אחרונה: {u.last_login ? fmt(u.last_login) : 'לא חזר'}
                                                </div>
                                            </div>
                                            <div style={{ ...dst.diagnosisBadge, background: label.bg, color: label.color, borderColor: label.border }}>
                                                {label.text}
                                            </div>
                                        </div>

                                        <div style={dst.fieldsRow}>
                                            <div style={dst.fieldsBar}>
                                                <div style={{
                                                    ...dst.fieldsBarFill,
                                                    width: `${(u.fields_filled.length / u.fields_total) * 100}%`,
                                                    background: label.color
                                                }} />
                                            </div>
                                            <div style={dst.fieldsLabel}>
                                                {u.fields_filled.length}/{u.fields_total} שדות מולאו
                                            </div>
                                        </div>

                                        {u.fields_empty.length > 0 && (
                                            <details style={dst.details}>
                                                <summary style={dst.summary}>צפה בשדות החסרים ({u.fields_empty.length})</summary>
                                                <div style={dst.fieldsList}>
                                                    {u.fields_empty.map(f => (
                                                        <span key={f} style={dst.fieldChipEmpty}>{f}</span>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                        {u.recent_activity && u.recent_activity.length > 0 && (
                                            <details style={dst.details}>
                                                <summary style={dst.summary}>פעילות אחרונה ({u.recent_activity.length})</summary>
                                                <div style={{ marginTop: '8px' }}>
                                                    {u.recent_activity.map((a, i) => {
                                                        const isError = a.action === 'profile_update_failed';
                                                        return (
                                                            <div key={i} style={{
                                                                ...dst.activityItem,
                                                                ...(isError ? { background: '#fef2f2', border: '1px solid #fecaca' } : {})
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={isError ? { color: '#991b1b', fontWeight: 'bold' } : {}}>
                                                                        {ACTION_LABELS[a.action] || a.action}
                                                                    </span>
                                                                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{fmt(a.created_at)}</span>
                                                                </div>
                                                                {a.note && (
                                                                    <div style={{
                                                                        marginTop: '4px', fontSize: '0.78rem',
                                                                        color: isError ? '#991b1b' : '#6b7280',
                                                                        fontFamily: 'monospace', wordBreak: 'break-word'
                                                                    }}>
                                                                        {a.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        )}

                                        <div style={dst.actionsRow}>
                                            <button onClick={() => onOpenUser(u.id)} style={dst.viewBtn}>
                                                👁 לכרטיס המשתמש
                                            </button>
                                            {u.diagnosis === 'ready_for_approval' && (
                                                <button onClick={() => onApprove(u.id)} style={dst.quickApproveBtn}>
                                                    ✅ אשר עכשיו
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const dst = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000, padding: '20px', direction: 'rtl'
    },
    modal: {
        background: '#fff', borderRadius: '16px', maxWidth: '900px', width: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif", overflow: 'hidden'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)', color: '#fff'
    },
    title: { margin: 0, fontSize: '1.4rem' },
    closeBtn: {
        background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
        width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem'
    },
    loading: { padding: '60px', textAlign: 'center', color: '#6b7280' },
    summaryRow: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        padding: '20px 24px 0'
    },
    summaryCard: {
        padding: '14px', borderRadius: '12px', border: '2px solid', textAlign: 'center'
    },
    summaryNum: { fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1 },
    summaryLabel: { fontSize: '0.85rem', color: '#374151', marginTop: '4px' },
    list: { padding: '20px 24px', overflowY: 'auto' },
    userBox: {
        background: '#fff', border: '2px solid', borderRadius: '12px',
        padding: '16px', marginBottom: '12px'
    },
    userTopRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '12px', flexWrap: 'wrap', marginBottom: '12px'
    },
    userName: { fontWeight: 'bold', fontSize: '1.05rem', color: '#1f2937', marginBottom: '4px' },
    userMeta: { color: '#6b7280', fontSize: '0.85rem', marginTop: '2px' },
    diagnosisBadge: {
        padding: '6px 12px', borderRadius: '999px', border: '1px solid',
        fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap'
    },
    fieldsRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
    fieldsBar: {
        flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden'
    },
    fieldsBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.4s' },
    fieldsLabel: { fontSize: '0.85rem', color: '#374151', whiteSpace: 'nowrap' },
    details: { marginTop: '8px', cursor: 'pointer' },
    summary: { fontSize: '0.85rem', color: '#1e3a5f', cursor: 'pointer', userSelect: 'none' },
    fieldsList: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
    fieldChipEmpty: {
        background: '#fef2f2', color: '#991b1b', padding: '3px 9px',
        borderRadius: '999px', fontSize: '0.75rem', border: '1px solid #fecaca'
    },
    activityItem: {
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 10px', background: '#f9fafb', borderRadius: '6px',
        marginBottom: '4px', fontSize: '0.85rem'
    },
    actionsRow: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
    viewBtn: {
        padding: '8px 16px', background: '#1e3a5f', color: '#fff',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
    },
    quickApproveBtn: {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
    }
};

const ERROR_ACTION_LABELS = {
    profile_update_failed: '⚠️ שמירת פרופיל',
    login_failed: '🔐 ניסיון כניסה',
    photo_upload_failed: '📷 העלאת תמונה'
};

function RecentErrorsModal({ data, loading, days, onChangeDays, onClose, onOpenUser }) {
    const fmt = (d) => d ? new Date(d).toLocaleString('he-IL', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '—';

    const dayOptions = [1, 3, 7, 14, 30];

    return (
        <div style={dst.overlay} onClick={onClose}>
            <div style={dst.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ ...dst.header, background: 'linear-gradient(135deg, #991b1b, #dc2626)' }}>
                    <h2 style={dst.title}>⚠️ שגיאות אחרונות במערכת</h2>
                    <button onClick={onClose} style={dst.closeBtn}>✖</button>
                </div>

                <div style={est.daysRow}>
                    <span style={est.daysLabel}>תקופה:</span>
                    {dayOptions.map(d => (
                        <button
                            key={d}
                            onClick={() => onChangeDays(d)}
                            style={days === d ? est.dayBtnActive : est.dayBtn}
                        >
                            {d === 1 ? 'יום' : `${d} ימים`}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={dst.loading}>
                        <div style={{ fontSize: '2rem' }}>⏳</div>
                        <div>טוען שגיאות...</div>
                    </div>
                ) : !data ? (
                    <div style={dst.loading}>אין נתונים</div>
                ) : data.errors.length === 0 ? (
                    <div style={dst.loading}>
                        <div style={{ fontSize: '2.5rem' }}>🎉</div>
                        <div>אין שגיאות ב-{days} הימים האחרונים!</div>
                    </div>
                ) : (
                    <>
                        <div style={est.summaryRow}>
                            <div style={est.summaryCard}>
                                <div style={est.summaryNum}>{data.summary.total}</div>
                                <div style={est.summaryLabel}>סה״כ שגיאות</div>
                            </div>
                            <div style={est.summaryCard}>
                                <div style={est.summaryNum}>{data.summary.unique_users}</div>
                                <div style={est.summaryLabel}>משתמשים שנפגעו</div>
                            </div>
                            <div style={est.summaryCard}>
                                <div style={est.summaryNum}>{data.summary.profile_update_failed}</div>
                                <div style={est.summaryLabel}>שמירת פרופיל</div>
                            </div>
                            <div style={est.summaryCard}>
                                <div style={est.summaryNum}>{data.summary.photo_upload_failed}</div>
                                <div style={est.summaryLabel}>העלאת תמונה</div>
                            </div>
                        </div>

                        <div style={dst.list}>
                            {data.errors.map(e => (
                                <div key={e.id} style={est.errorBox}>
                                    <div style={est.errorTopRow}>
                                        <div>
                                            <div style={est.errorAction}>
                                                {ERROR_ACTION_LABELS[e.action] || e.action}
                                            </div>
                                            <div style={est.userRow}>
                                                {e.user_id ? (
                                                    <button
                                                        onClick={() => onOpenUser(e.user_id)}
                                                        style={est.userLink}
                                                    >
                                                        #{e.user_id} · {e.full_name || ''} {e.last_name || ''}
                                                    </button>
                                                ) : (
                                                    <span>משתמש לא ידוע</span>
                                                )}
                                                {e.is_blocked && <span style={est.blockedTag}>🚫 חסום</span>}
                                                {e.is_approved === false && <span style={est.pendingTag}>⏳ ממתין</span>}
                                            </div>
                                            {e.phone && <div style={est.userMeta}>📱 {e.phone}{e.email && ` · 📧 ${e.email}`}</div>}
                                        </div>
                                        <div style={est.errorTime}>{fmt(e.created_at)}</div>
                                    </div>
                                    {e.note && (
                                        <div style={est.errorNote}>{e.note}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const est = {
    daysRow: {
        display: 'flex', gap: '8px', padding: '14px 24px',
        borderBottom: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap'
    },
    daysLabel: { fontWeight: 'bold', color: '#374151' },
    dayBtn: {
        padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db',
        borderRadius: '999px', cursor: 'pointer', fontSize: '0.85rem'
    },
    dayBtnActive: {
        padding: '6px 14px', background: '#dc2626', border: '1px solid #dc2626',
        color: '#fff', borderRadius: '999px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
    },
    summaryRow: {
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
        padding: '16px 24px 0'
    },
    summaryCard: {
        padding: '12px', borderRadius: '10px', textAlign: 'center',
        background: '#fef2f2', border: '1px solid #fecaca'
    },
    summaryNum: { fontSize: '1.6rem', fontWeight: 'bold', color: '#991b1b', lineHeight: 1 },
    summaryLabel: { fontSize: '0.78rem', color: '#7f1d1d', marginTop: '4px' },
    errorBox: {
        background: '#fff', border: '1px solid #fecaca', borderRight: '4px solid #dc2626',
        borderRadius: '10px', padding: '14px', marginBottom: '10px'
    },
    errorTopRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '12px', flexWrap: 'wrap', marginBottom: '8px'
    },
    errorAction: { fontWeight: 'bold', color: '#991b1b', fontSize: '0.95rem' },
    userRow: {
        display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap'
    },
    userLink: {
        background: 'none', border: 'none', padding: 0, color: '#1e3a5f',
        textDecoration: 'underline', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold'
    },
    userMeta: { fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' },
    errorTime: { fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' },
    errorNote: {
        background: '#fef2f2', borderRadius: '6px', padding: '8px 10px',
        fontFamily: 'monospace', fontSize: '0.8rem', color: '#7f1d1d',
        wordBreak: 'break-word', marginTop: '6px'
    },
    blockedTag: {
        background: '#fee2e2', color: '#991b1b', padding: '2px 8px',
        borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold'
    },
    pendingTag: {
        background: '#fef3c7', color: '#92400e', padding: '2px 8px',
        borderRadius: '999px', fontSize: '0.72rem', fontWeight: 'bold'
    }
};

export default AdminUsers;
