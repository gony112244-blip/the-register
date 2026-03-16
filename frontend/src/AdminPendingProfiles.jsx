import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileView from './ProfileView';

function AdminPendingProfiles() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [expandedUser, setExpandedUser] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser?.is_admin) {
            navigate('/');
            return;
        }
        fetchPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const fetchPending = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/pending-profiles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const text = await res.text();
                console.error(`Status: ${res.status}, Text: ${text}`);
                setLoading(false);
                return;
            }

            const data = await res.json();
            setPending(data);
            setLoading(false);
        } catch (err) {
            console.error("Fetch error:", err);
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('לאשר את השינויים?')) return;

        try {
            const res = await fetch(`${API_BASE}/admin/approve-profile-changes/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('✅ השינויים אושרו!');
                fetchPending();
                setSelectedUser(null);
                window.dispatchEvent(new CustomEvent('adminStatsUpdated'));
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
            const res = await fetch(`${API_BASE}/admin/reject-profile-changes/${id}`, {
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
                window.dispatchEvent(new CustomEvent('adminStatsUpdated'));
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
            full_name: 'שם מלא', last_name: 'שם משפחה', age: 'גיל', gender: 'מגדר',
            status: 'סטטוס', family_background: 'רקע משפחתי', heritage_sector: 'מגזר עדתי',
            father_heritage: 'עדות האב', mother_heritage: 'עדות האם',
            height: 'גובה', body_type: 'מבנה גוף', skin_tone: 'גוון עור', appearance: 'מראה כללי',

            // עיסוק ולימודים
            current_occupation: 'עיסוק נוכחי', occupation_details: 'פרטי עיסוק',
            work_field: 'תחום עיסוק', study_field: 'תחום לימודים', study_place: 'מקום לימודים',
            yeshiva_name: 'ישיבה', yeshiva_ketana_name: 'ישיבה קטנה',
            life_aspiration: 'שאיפה בחיים', favorite_study: 'לימוד מועדף',

            // משפחה ורקע
            country_of_birth: 'ארץ לידה', city: 'עיר מגורים', address: 'כתובת',
            father_full_name: 'שם האב', mother_full_name: 'שם האם',
            father_occupation: 'עיסוק האב', mother_occupation: 'עיסוק האם',
            siblings_count: 'מספר אחים/אחיות', sibling_position: 'מיקום במשפחה',
            siblings_details: 'פרטי אחים',

            // דרישות ושידוך
            about_me: 'על עצמי', partner_description: 'תיאור השידוך',
            home_style: 'סגנון בית', important_in_life: 'חשוב בחיים',
            has_children: 'יש ילדים', children_count: 'מספר ילדים',

            // כספים
            apartment_help: 'עזרה בדירה', apartment_amount: 'סכום לדירה',
            search_financial_min: 'דרישה כספית מינימלית', search_financial_discuss: 'פתוח לדיון כספי',

            // אנשי קשר
            contact_person_name: 'איש קשר ראשי', contact_person_type: 'סוג קשר',
            contact_phone_1: 'טלפון קשר 1', contact_phone_2: 'טלפון קשר 2',
            reference_1_name: 'ממליץ 1', reference_1_phone: 'טלפון ממליץ 1',
            reference_2_name: 'ממליץ 2', reference_2_phone: 'טלפון ממליץ 2',
            rabbi_name: 'שם הרב', rabbi_phone: 'טלפון הרב',
            mechutanim_name: 'מחותנים', mechutanim_phone: 'טלפון מחותנים'
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
                                        <span style={styles.cardInfo}>📱 {p.phone}</span>
                                        {p.real_id_number && (
                                            <span style={styles.cardInfo}> | 🪪 ת.ז: {p.real_id_number}</span>
                                        )}
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

                                <div style={{ marginBottom: '15px' }}>
                                    <button
                                        onClick={() => setExpandedUser(expandedUser === p.id ? null : p.id)}
                                        style={{ padding: '8px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        {expandedUser === p.id ? '🔼 סגור כרטיסייה' : '👁️ צפה בכרטיסייה המלאה'}
                                    </button>
                                </div>

                                {/* כרטיסיונת מלאה */}
                                {expandedUser === p.id && (
                                    <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', marginBottom: '-50px', background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '2px solid #cbd5e1', alignSelf: 'stretch' }}>
                                         <h4 style={{textAlign: 'center', color: '#1e3a5f', marginTop: 0}}>כרטיסיית משתמש (לפני השינויים המבוקשים)</h4>
                                         <ProfileView externalUser={p} readOnly={true} isAdminView={true} />
                                    </div>
                                )}

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
    cardInfo: { color: '#6b7280', fontSize: '0.95rem', display: 'inline-block', marginTo: '5px' },
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
