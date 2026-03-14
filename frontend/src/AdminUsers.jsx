import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileView from './ProfileView';

function AdminUsers() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [expandingUserId, setExpandingUserId] = useState(null); // ID of user currently loading
    const [noteText, setNoteText] = useState('');
    const [messageText, setMessageText] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUsers();
    }, [navigate, token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:3000/admin/all-users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    // function to fetch full user details including images
    const fetchFullUser = async (userId, noteDefault) => {
        setExpandingUserId(userId);
        setSelectedUser(null);
        try {
            const res = await fetch(`http://localhost:3000/admin/user/${userId}/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSelectedUser(data);
            setNoteText(noteDefault || data.admin_notes || '');
        } catch (err) {
            console.error(err);
        }
        setExpandingUserId(null);
    };

    const handleApprove = async (userId) => {
        if (!window.confirm('האם לאשר את המשתמש?')) return;
        try {
            const res = await fetch(`http://localhost:3000/admin/approve/${userId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('המשתמש אושר בהצלחה');
                fetchUsers();
                if (selectedUser?.id === userId) {
                    setSelectedUser({ ...selectedUser, is_approved: true });
                }
            } else {
                alert('שגיאה באישור המשתמש');
            }
        } catch (err) {
            console.error(err);
            alert('שגיאה בתקשורת עם השרת');
        }
    };

    const handleBlock = async (userId, block) => {
        const reason = block ? prompt('סיבת החסימה (אופציונלי):') : null;
        try {
            await fetch('http://localhost:3000/admin/block-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, block, reason })
            });
            fetchUsers();
            alert(block ? 'המשתמש נחסם' : 'המשתמש שוחרר');
        } catch (err) {
            alert('שגיאה');
        }
    };

    const handleSaveNote = async () => {
        try {
            await fetch('http://localhost:3000/admin/user-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: selectedUser.id, note: noteText })
            });
            alert('ההערה נשמרה');
            fetchUsers();
        } catch (err) {
            alert('שגיאה');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('⚠️ האם למחוק את המשתמש לצמיתות? פעולה זו אינה ניתנת לביטול!')) return;
        try {
            const res = await fetch(`http://localhost:3000/admin/delete-user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('המשתמש נמחק בהצלחה');
                setSelectedUser(null);
                fetchUsers();
            } else {
                alert('שגיאה במחיקת המשתמש');
            }
        } catch (err) {
            console.error(err);
            alert('שגיאה בתקשורת עם השרת');
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim()) return;
        try {
            await fetch('http://localhost:3000/admin/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: selectedUser.id, message: messageText })
            });
            alert('ההודעה נשלחה');
            setMessageText('');
        } catch (err) {
            alert('שגיאה');
        }
    };

    const filteredUsers = users.filter(u => {
        if (filter === 'approved') return u.is_approved && !u.is_blocked;
        if (filter === 'pending') return !u.is_approved;
        if (filter === 'blocked') return u.is_blocked;
        return true;
    });

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען משתמשים...</h2>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>👥 ניהול משתמשים</h1>
                <p style={styles.subtitle}>סה"כ {users.length} משתמשים במערכת</p>

                {/* פילטרים */}
                <div style={styles.filters}>
                    {[
                        { key: 'all', label: '🌐 הכל', count: users.length },
                        { key: 'approved', label: '✅ מאושרים', count: users.filter(u => u.is_approved && !u.is_blocked).length },
                        { key: 'pending', label: '⏳ ממתינים', count: users.filter(u => !u.is_approved).length },
                        { key: 'blocked', label: '🚫 חסומים', count: users.filter(u => u.is_blocked).length }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={filter === f.key ? styles.activeFilter : styles.filterBtn}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>

                {/* Layout - רשימה נפתחת */}
                <div style={styles.mainLayout}>
                    <div style={styles.usersList}>
                        {filteredUsers.map(user => (
                            <div key={user.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                                <div
                                    style={{
                                        ...styles.userCard,
                                        ...(user.is_blocked ? styles.blockedCard : {}),
                                        ...(selectedUser?.id === user.id ? styles.selectedCard : {})
                                    }}
                                    onClick={() => {
                                        if (selectedUser?.id === user.id) {
                                            setSelectedUser(null);
                                        } else {
                                            fetchFullUser(user.id, user.admin_notes);
                                        }
                                    }}
                                >
                                    <div style={styles.userHeader}>
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=${user.is_blocked ? 'ef4444' : '1e3a5f'}&color=fff&size=50&bold=true`}
                                            alt={user.full_name}
                                            style={styles.avatar}
                                        />
                                        <div style={styles.userInfo}>
                                            <h3 style={styles.userName}>{user.full_name} {user.last_name || ''}</h3>
                                            <div style={styles.userMeta}>
                                                <span>#{user.id}</span>
                                                <span>📱 {user.phone}</span>
                                                <span>📅 {user.age} שנים</span>
                                                <span>{user.gender === 'male' ? '👨' : '👩'}</span>
                                            </div>
                                        </div>
                                        <div style={styles.badges}>
                                            {user.is_approved && <span style={styles.approvedBadge}>✅</span>}
                                            {!user.is_approved && <span style={styles.pendingBadge}>⏳</span>}
                                            {user.is_blocked && <span style={styles.blockedBadge}>🚫</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Panel for selected user */}
                                {(selectedUser?.id === user.id || expandingUserId === user.id) && (
                                    <div style={styles.expandedPanel}>
                                        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
                                            <button onClick={() => { setSelectedUser(null); setExpandingUserId(null); }} style={styles.closeCardBtn}>✖ סגור כרטיסייה</button>
                                        </div>
                                        
                                        {expandingUserId === user.id && !selectedUser ? (
                                            <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
                                                <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
                                                <div>טוען פרטים מלאים...</div>
                                            </div>
                                        ) : selectedUser && selectedUser.id === user.id ? (
                                            <div style={styles.fullDetailsSection}>
                                                <ProfileView externalUser={selectedUser} readOnly={true} isAdminView={true} />
                                            </div>
                                        ) : null}

                                        <div style={styles.adminActionsGrid}>
                                            {/* הערות מנהל */}
                                            <div style={styles.section}>
                                                <h4 style={{color: '#1e3a5f', marginTop: 0}}>📝 הערות פנימיות:</h4>
                                                <textarea
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    placeholder="הערות לשימוש פנימי בלבד..."
                                                    style={styles.textarea}
                                                />
                                                <button onClick={handleSaveNote} style={styles.saveBtn}>
                                                    💾 שמור הערה
                                                </button>
                                            </div>

                                            {/* שליחת הודעה */}
                                            <div style={styles.section}>
                                                <h4 style={{color: '#1e3a5f', marginTop: 0}}>✉️ שליחת הודעה למשתמש:</h4>
                                                <textarea
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    placeholder="כתוב הודעה..."
                                                    style={styles.textarea}
                                                />
                                                <button onClick={handleSendMessage} style={styles.sendBtn}>
                                                    📤 שלח הודעה
                                                </button>
                                            </div>
                                        </div>

                                        {/* פעולות מנהל */}
                                        {selectedUser && (
                                        <div style={styles.adminActionsRow}>
                                            {!selectedUser.is_approved && (
                                                <button onClick={() => handleApprove(selectedUser.id)} style={{...styles.approveActionBtn, width: 'auto', flex: 1, margin: 0}}>
                                                    ✅ אשר משתמש
                                                </button>
                                            )}
                                            {!selectedUser.is_blocked ? (
                                                <button onClick={() => handleBlock(selectedUser.id, true)} style={{...styles.blockBtn, width: 'auto', flex: 1, margin: 0}}>
                                                    🚫 חסימת משתמש
                                                </button>
                                            ) : (
                                                <button onClick={() => handleBlock(selectedUser.id, false)} style={{...styles.unblockBtn, width: 'auto', flex: 1, margin: 0}}>
                                                    ✅ שחרר חסימה
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(selectedUser.id)} style={{...styles.deleteBtn, width: 'auto', flex: 1, marginTop: 0}}>
                                                🗑️ מחק משתמש
                                            </button>
                                        </div>
                                        )}

                                        {selectedUser?.is_blocked && selectedUser?.blocked_reason && (
                                            <div style={styles.blockReason}>
                                                <strong>סיבת חסימה:</strong> {selectedUser.blocked_reason}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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
    container: { maxWidth: '1400px', margin: '0 auto' },
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
    title: { color: '#fff', margin: '0 0 5px', fontSize: '2rem' },
    subtitle: { color: 'rgba(255,255,255,0.7)', margin: '0 0 25px' },
    filters: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    filterBtn: {
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    activeFilter: {
        padding: '10px 20px',
        background: '#c9a227',
        border: 'none',
        color: '#1a1a1a',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    mainLayout: {
        display: 'block',
        marginTop: '20px'
    },
    usersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0px'
    },
    userCard: {
        background: '#fff',
        borderTopLeftRadius: '15px',
        borderTopRightRadius: '15px',
        borderBottomLeftRadius: '15px',
        borderBottomRightRadius: '15px',
        padding: '15px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: 'transparent'
    },
    blockedCard: { background: '#fef2f2', borderColor: '#ef4444' },
    selectedCard: { borderColor: '#c9a227', boxShadow: '0 0 20px rgba(201, 162, 39, 0.5)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    userHeader: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '50px', height: '50px', borderRadius: '50%' },
    userInfo: { flex: 1 },
    userName: { margin: '0 0 5px', color: '#1e3a5f', fontSize: '1.1rem' },
    userMeta: { display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#6b7280', flexWrap: 'wrap' },
    badges: { display: 'flex', gap: '5px' },
    approvedBadge: { background: '#d4edda', padding: '4px 8px', borderRadius: '10px', fontSize: '0.9rem' },
    pendingBadge: { background: '#fff3cd', padding: '4px 8px', borderRadius: '10px', fontSize: '0.9rem' },
    blockedBadge: { background: '#f8d7da', padding: '4px 8px', borderRadius: '10px', fontSize: '0.9rem' },
    expandedPanel: {
        background: '#fff',
        borderBottomLeftRadius: '15px',
        borderBottomRightRadius: '15px',
        borderTop: 'none',
        padding: '25px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        border: '3px solid #c9a227',
        borderTopWidth: '0',
        marginTop: '0px',
        marginBottom: '15px',
    },
    noSelection: { textAlign: 'center', padding: '40px 20px', color: '#6b7280' },
    panelTitle: { margin: '0 0 20px', color: '#1e3a5f' },
    photosSection: { marginBottom: '20px' },
    photosGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    photo: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer', border: '2px solid #e5e7eb' },
    section: { marginBottom: '20px' },
    textarea: {
        width: '100%',
        minHeight: '70px',
        padding: '12px',
        border: '2px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.95rem',
        resize: 'vertical',
        marginBottom: '10px',
        boxSizing: 'border-box'
    },
    saveBtn: {
        padding: '10px 25px',
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    sendBtn: {
        padding: '10px 25px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    actions: { marginTop: '20px' },
    blockBtn: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '10px'
    },
    unblockBtn: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '10px'
    },
    deleteBtn: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        color: '#fff',
        border: '2px solid #ef4444',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '5px'
    },
    approveActionBtn: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #c9a227, #a8871d)',
        color: '#1a1a1a',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '10px'
    },
    blockReason: {
        marginTop: '15px',
        background: '#fef2f2',
        border: '1px solid #ef4444',
        padding: '12px',
        borderRadius: '10px',
        color: '#991b1b'
    },
    badge: {
        background: '#e0e7ff', color: '#3730a3',
        padding: '6px 14px', borderRadius: '20px',
        fontSize: '0.9rem', fontWeight: 'bold'
    },
    fullDetailsSection: {
        marginBottom: '20px',
    },
    closeCardBtn: {
        background: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    adminActionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
    },
    adminActionsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
    }
};

export default AdminUsers;
