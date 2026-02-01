import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPendingProfiles() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        if (!user?.is_admin) {
            navigate('/');
            return;
        }
        fetchPending();
    }, [navigate, user]);

    const fetchPending = async () => {
        try {
            const res = await fetch('http://localhost:3000/admin/pending-profiles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPending(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('לאשר את השינויים?')) return;

        try {
            const res = await fetch(`http://localhost:3000/admin/approve-profile-changes/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('✅ השינויים אושרו!');
                fetchPending();
                setSelectedUser(null);
            }
        } catch (err) {
            alert('שגיאה באישור');
        }
    };

    const handleReject = async (id) => {
        if (!rejectReason.trim()) {
            alert('נא להזין סיבת דחייה');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/admin/reject-profile-changes/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: rejectReason })
            });

            if (res.ok) {
                alert('❌ השינויים נדחו והמשתמש קיבל הודעה');
                fetchPending();
                setSelectedUser(null);
                setRejectReason('');
            }
        } catch (err) {
            alert('שגיאה בדחייה');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        return `${date.toLocaleDateString('he-IL')} (לפני ${hours} שעות)`;
    };

    const translateField = (field) => {
        const translations = {
            full_name: 'שם', last_name: 'שם משפחה', age: 'גיל', gender: 'מגדר',
            status: 'סטטוס', family_background: 'רקע משפחתי', heritage_sector: 'מגזר עדתי',
            height: 'גובה', body_type: 'מבנה גוף', appearance: 'מראה',
            about_me: 'על עצמי', partner_description: 'תיאור השידוך',
            father_occupation: 'עיסוק האב', mother_occupation: 'עיסוק האם',
            has_children: 'ילדים', children_count: 'מספר ילדים'
        };
        return translations[field] || field;
    };

    // 🚨 שדות רגישים - שינוי בהם דורש תשומת לב מיוחדת!
    const sensitiveFields = [
        'age', 'gender', 'status', 'has_children', 'children_count',
        'family_background', 'heritage_sector', 'height'
    ];

    const isSensitive = (field) => sensitiveFields.includes(field);

    // בדיקה האם יש שינויים רגישים בבקשה
    const hasSensitiveChanges = (changes) => {
        if (!changes) return false;
        return Object.keys(changes).some(key => isSensitive(key));
    };

    if (loading) return <div style={styles.loading}>⏳ טוען...</div>;

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.title}>📝 בקשות שינוי פרופיל</h1>
                <p style={styles.subtitle}>
                    {pending.length} בקשות ממתינות לאישור
                </p>

                {pending.length === 0 ? (
                    <div style={styles.empty}>
                        <span style={{ fontSize: '3rem' }}>🎉</span>
                        <p>אין בקשות ממתינות!</p>
                    </div>
                ) : (
                    <div style={styles.list}>
                        {pending.map(p => (
                            <div key={p.id} style={{
                                ...styles.card,
                                ...(hasSensitiveChanges(p.pending_changes) && {
                                    border: '3px solid #ef4444',
                                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                                })
                            }}>
                                {/* 🚨 התראה על שינויים רגישים */}
                                {hasSensitiveChanges(p.pending_changes) && (
                                    <div style={styles.sensitiveAlert}>
                                        🚨 <strong>שינוי רגיש!</strong> יש לבדוק בקפידה
                                    </div>
                                )}

                                <div style={styles.cardHeader}>
                                    <div>
                                        <h3 style={styles.cardName}>{p.full_name}</h3>
                                        <span style={styles.cardPhone}>{p.phone}</span>
                                    </div>
                                    <div style={styles.badges}>
                                        <span style={styles.editBadge}>
                                            עריכה #{p.profile_edit_count}
                                        </span>
                                        {hasSensitiveChanges(p.pending_changes) && (
                                            <span style={styles.sensitiveBadge}>⚠️ רגיש</span>
                                        )}
                                    </div>
                                </div>

                                <p style={styles.cardDate}>
                                    📅 הוגש: {formatDate(p.pending_changes_at)}
                                </p>

                                {/* תצוגת השינויים */}
                                <div style={styles.changesBox}>
                                    <strong>שינויים מבוקשים:</strong>
                                    <div style={styles.changesList}>
                                        {p.pending_changes && Object.entries(p.pending_changes).slice(0, 8).map(([key, value]) => (
                                            <div key={key} style={{
                                                ...styles.changeItem,
                                                ...(isSensitive(key) && {
                                                    background: '#fef2f2',
                                                    border: '2px solid #fca5a5',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px'
                                                })
                                            }}>
                                                <span style={{
                                                    ...styles.changeKey,
                                                    ...(isSensitive(key) && { color: '#dc2626' })
                                                }}>
                                                    {isSensitive(key) && '🔴 '}{translateField(key)}:
                                                </span>
                                                <span style={{
                                                    ...styles.changeValue,
                                                    ...(isSensitive(key) && { color: '#dc2626', fontWeight: 'bold' })
                                                }}>
                                                    {typeof value === 'boolean' ? (value ? 'כן' : 'לא') :
                                                        typeof value === 'object' ? JSON.stringify(value) :
                                                            String(value).substring(0, 50)}
                                                </span>
                                            </div>
                                        ))}
                                        {p.pending_changes && Object.keys(p.pending_changes).length > 8 && (
                                            <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                                + עוד {Object.keys(p.pending_changes).length - 8} שדות...
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* כפתורים */}
                                <div style={styles.actions}>
                                    <button
                                        onClick={() => handleApprove(p.id)}
                                        style={styles.approveBtn}
                                    >
                                        ✅ אשר
                                    </button>
                                    <button
                                        onClick={() => setSelectedUser(selectedUser === p.id ? null : p.id)}
                                        style={styles.rejectBtn}
                                    >
                                        ❌ דחה
                                    </button>
                                </div>

                                {/* טופס דחייה */}
                                {selectedUser === p.id && (
                                    <div style={styles.rejectBox}>
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="סיבת הדחייה..."
                                            style={styles.rejectInput}
                                        />
                                        <button
                                            onClick={() => handleReject(p.id)}
                                            style={styles.confirmRejectBtn}
                                        >
                                            שלח דחייה
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={() => navigate('/admin')} style={styles.backBtn}>
                    ← חזרה לניהול
                </button>
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
    container: { maxWidth: '900px', margin: '0 auto' },
    loading: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', color: '#fff',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)'
    },
    title: { textAlign: 'center', color: '#fff', fontSize: '2rem', margin: '0 0 10px' },
    subtitle: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginBottom: '30px' },
    empty: {
        textAlign: 'center', padding: '60px', background: '#fff',
        borderRadius: '15px', color: '#374151'
    },
    list: { display: 'flex', flexDirection: 'column', gap: '20px' },
    card: {
        background: '#fff', borderRadius: '15px', padding: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' },
    cardName: { margin: 0, fontSize: '1.3rem', color: '#1e3a5f' },
    cardPhone: { color: '#6b7280', fontSize: '0.95rem' },
    badges: { display: 'flex', gap: '8px' },
    editBadge: {
        background: '#fef3c7', color: '#92400e', padding: '4px 10px',
        borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
    },
    sensitiveBadge: {
        background: '#fef2f2', color: '#dc2626', padding: '4px 10px',
        borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
        border: '1px solid #fca5a5'
    },
    sensitiveAlert: {
        background: 'linear-gradient(90deg, #fee2e2, #fecaca)',
        color: '#991b1b', padding: '12px 15px',
        borderRadius: '8px', marginBottom: '15px',
        fontSize: '0.95rem', textAlign: 'center',
        border: '1px solid #fca5a5'
    },
    cardDate: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '15px' },
    changesBox: {
        background: '#f8fafc', padding: '15px', borderRadius: '10px',
        marginBottom: '20px', border: '1px solid #e5e7eb'
    },
    changesList: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
    changeItem: { display: 'flex', gap: '10px', fontSize: '0.95rem' },
    changeKey: { fontWeight: '600', color: '#374151', minWidth: '100px' },
    changeValue: { color: '#059669' },
    actions: { display: 'flex', gap: '10px' },
    approveBtn: {
        flex: 1, padding: '12px', background: '#10b981', color: '#fff',
        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
    },
    rejectBtn: {
        flex: 1, padding: '12px', background: '#ef4444', color: '#fff',
        border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'
    },
    rejectBox: {
        marginTop: '15px', display: 'flex', gap: '10px',
        padding: '15px', background: '#fef2f2', borderRadius: '10px'
    },
    rejectInput: {
        flex: 1, padding: '10px', border: '1px solid #fca5a5',
        borderRadius: '8px', fontSize: '1rem'
    },
    confirmRejectBtn: {
        padding: '10px 20px', background: '#dc2626', color: '#fff',
        border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
    },
    backBtn: {
        width: '100%', marginTop: '30px', padding: '14px',
        background: 'transparent', border: '2px solid rgba(255,255,255,0.5)',
        borderRadius: '12px', color: '#fff', fontSize: '1rem', cursor: 'pointer'
    }
};

export default AdminPendingProfiles;
