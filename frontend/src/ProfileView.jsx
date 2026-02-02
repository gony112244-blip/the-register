import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ProfileView() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(1); // איזה חלק מוצג

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetch('http://localhost:3000/my-profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setUser(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [navigate, token]);

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2 style={{ marginTop: '20px', color: '#fff' }}>טוען את הכרטיסייה...</h2>
        </div>
    );

    if (!user) return <div style={styles.loadingContainer}><h2>❌ שגיאה בטעינה</h2></div>;

    // תרגומים
    const t = {
        gender: { male: 'גבר', female: 'אישה' },
        status: { single: 'רווק/ה', divorced: 'גרוש/ה', widower: 'אלמן/ה' },
        family_background: { haredi: 'חרדי', dati_leumi: 'דתי לאומי', masorti: 'מסורתי', baal_teshuva: 'חוזר בתשובה' },
        heritage_sector: { ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב' },
        body_type: { very_thin: 'רזה מאוד', thin: 'רזה', average: 'ממוצע', full: 'מלא' },
        appearance: { fair: 'סביר', ok: 'בסדר גמור', good: 'טוב', handsome: 'נאה', very_handsome: 'נאה מאוד' },
        current_occupation: { studying: 'לומד/ת', working: 'עובד/ת', both: 'משלב', fixed_times: 'קובע עיתים' },
        contact_person_type: { self: 'המועמד עצמו', father: 'האבא', mother: 'האמא', both_parents: 'שני ההורים', sibling: 'אח/אחות', other: 'אחר' }
    };

    const tr = (field, value) => t[field]?.[value] || value || '-';
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '-';

    return (
        <div style={styles.pageWrapper}>
            {/* כותרת */}
            <div style={styles.header}>
                <h1 style={styles.logo}>📋 הכרטיסייה שלי</h1>
                <p style={styles.headerSub}>כך נראה הפרופיל שלך למציעים</p>
            </div>

            {/* הכרטיסייה הראשית - כמו כרטיס שידוך! */}
            <div style={styles.mainCard}>
                {/* חלק עליון - תמונה + פרטים בסיסיים */}
                <div style={styles.cardTop}>
                    <div style={styles.avatarSection}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${user.full_name}&background=c9a227&color=fff&size=150&bold=true`}
                            alt={user.full_name}
                            style={styles.avatar}
                        />
                        <div style={styles.statusBadge(user.is_approved)}>
                            {user.is_approved ? '✅ מאושר' : '⏳ ממתין לאישור'}
                        </div>
                    </div>

                    <div style={styles.basicInfo}>
                        <h2 style={styles.name}>{user.full_name} {user.last_name || ''}</h2>
                        <div style={styles.keyInfo}>
                            <span style={styles.tag}>🎂 {user.age} שנים</span>
                            <span style={styles.tag}>📏 {user.height || '?'} ס"מ</span>
                            <span style={styles.tag}>{tr('status', user.status)}</span>
                            <span style={styles.tag}>{tr('heritage_sector', user.heritage_sector)}</span>
                        </div>
                        <p style={styles.dateInfo}>📅 תאריך פתיחת כרטיס: {formatDate(user.created_at)}</p>
                    </div>
                </div>

                {/* טאבים */}
                <div style={styles.tabs}>
                    <button onClick={() => setActiveTab(1)} style={activeTab === 1 ? styles.activeTab : styles.tab}>
                        📝 חלק א' - פרטים
                    </button>
                    <button onClick={() => setActiveTab(2)} style={activeTab === 2 ? styles.activeTab : styles.tab}>
                        🔒 חלק ב' - ממליצים
                    </button>
                    <button onClick={() => setActiveTab(3)} style={activeTab === 3 ? styles.activeTab : styles.tab}>
                        🔍 חלק ג' - דרישות
                    </button>
                </div>

                {/* תוכן הטאב */}
                <div style={styles.tabContent}>
                    {/* ======= חלק א' ======= */}
                    {activeTab === 1 && (
                        <div>
                            {/* איש קשר */}
                            <div style={styles.infoBox('#fef3c7', '#f59e0b')}>
                                <h4 style={styles.boxTitle}>📞 איש קשר לשידוך</h4>
                                <div style={styles.infoRow}>
                                    <span>מי מטפל:</span>
                                    <strong>{tr('contact_person_type', user.contact_person_type)}</strong>
                                </div>
                                {user.contact_person_name && (
                                    <div style={styles.infoRow}>
                                        <span>שם:</span>
                                        <strong>{user.contact_person_name}</strong>
                                    </div>
                                )}
                                <div style={styles.infoRow}>
                                    <span>טלפון:</span>
                                    <strong>{user.contact_phone_1 || user.phone}</strong>
                                </div>
                                {user.contact_phone_2 && (
                                    <div style={styles.infoRow}>
                                        <span>טלפון נוסף:</span>
                                        <strong>{user.contact_phone_2}</strong>
                                    </div>
                                )}
                            </div>

                            {/* רקע משפחתי */}
                            <div style={styles.infoBox('#f0fdf4', '#22c55e')}>
                                <h4 style={styles.boxTitle}>👨‍👩‍👧‍👦 רקע משפחתי</h4>
                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}><span>רקע דתי:</span> <strong>{tr('family_background', user.family_background)}</strong></div>
                                    <div style={styles.detailItem}><span>עדת האב:</span> <strong>{user.father_heritage || '-'}</strong></div>
                                    <div style={styles.detailItem}><span>עדת האם:</span> <strong>{user.mother_heritage || '-'}</strong></div>
                                    <div style={styles.detailItem}><span>עיסוק האב:</span> <strong>{user.father_occupation || '-'}</strong></div>
                                    <div style={styles.detailItem}><span>עיסוק האם:</span> <strong>{user.mother_occupation || '-'}</strong></div>
                                    <div style={styles.detailItem}><span>אחים:</span> <strong>{user.siblings_count || '-'}</strong></div>
                                </div>
                            </div>

                            {/* מראה */}
                            <div style={styles.infoBox('#f0f9ff', '#1e3a5f')}>
                                <h4 style={styles.boxTitle}>🪞 מראה חיצוני</h4>
                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}><span>גובה:</span> <strong>{user.height || '-'} ס"מ</strong></div>
                                    <div style={styles.detailItem}><span>מבנה גוף:</span> <strong>{tr('body_type', user.body_type)}</strong></div>
                                    <div style={styles.detailItem}><span>מראה כללי:</span> <strong>{tr('appearance', user.appearance)}</strong></div>
                                </div>
                            </div>

                            {/* עיסוק */}
                            <div style={styles.infoBox('#f0f9ff', '#1e3a5f')}>
                                <h4 style={styles.boxTitle}>💼 עיסוק</h4>
                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}><span>עיסוק:</span> <strong>{tr('current_occupation', user.current_occupation)}</strong></div>
                                    {user.yeshiva_name && <div style={styles.detailItem}><span>ישיבה:</span> <strong>{user.yeshiva_name}</strong></div>}
                                    {user.work_field && <div style={styles.detailItem}><span>תחום:</span> <strong>{user.work_field}</strong></div>}
                                </div>
                            </div>

                            {/* על עצמי */}
                            {user.about_me && (
                                <div style={styles.infoBox('#f8fafc', '#64748b')}>
                                    <h4 style={styles.boxTitle}>💭 על עצמי</h4>
                                    <p style={styles.freeText}>{user.about_me}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ======= חלק ב' ======= */}
                    {activeTab === 2 && (
                        <div>
                            <div style={styles.lockedNote}>
                                🔒 הפרטים הבאים נחשפים רק לאחר הסכמה הדדית
                            </div>

                            <div style={styles.infoBox('#fef2f2', '#ef4444')}>
                                <h4 style={styles.boxTitle}>📍 פרטים מזהים</h4>
                                <div style={styles.detailItem}><span>כתובת:</span> <strong>{user.full_address || '-'}</strong></div>
                                <div style={styles.detailItem}><span>שם האב:</span> <strong>{user.father_full_name || '-'}</strong></div>
                                <div style={styles.detailItem}><span>שם האם:</span> <strong>{user.mother_full_name || '-'}</strong></div>
                            </div>

                            <div style={styles.infoBox('#f0fdf4', '#22c55e')}>
                                <h4 style={styles.boxTitle}>📞 ממליצים</h4>
                                {user.reference_1_name && <div style={styles.detailItem}><span>חבר 1:</span> <strong>{user.reference_1_name} - {user.reference_1_phone}</strong></div>}
                                {user.reference_2_name && <div style={styles.detailItem}><span>חבר 2:</span> <strong>{user.reference_2_name} - {user.reference_2_phone}</strong></div>}
                                {user.reference_3_name && <div style={styles.detailItem}><span>חבר 3:</span> <strong>{user.reference_3_name} - {user.reference_3_phone}</strong></div>}
                                {user.family_reference_name && <div style={styles.detailItem}><span>מכיר משפחה:</span> <strong>{user.family_reference_name} - {user.family_reference_phone}</strong></div>}
                                {user.rabbi_name && <div style={styles.detailItem}><span>רב:</span> <strong>{user.rabbi_name} - {user.rabbi_phone}</strong></div>}
                            </div>
                        </div>
                    )}

                    {/* ======= חלק ג' ======= */}
                    {activeTab === 3 && (
                        <div>
                            <div style={styles.infoBox('#fef3c7', '#f59e0b')}>
                                <h4 style={styles.boxTitle}>🔍 מה אני מחפש</h4>
                                <div style={styles.detailsGrid}>
                                    <div style={styles.detailItem}><span>טווח גילאים:</span> <strong>{user.search_min_age || '?'} - {user.search_max_age || '?'}</strong></div>
                                    <div style={styles.detailItem}><span>טווח גובה:</span> <strong>{user.search_height_min || '?'} - {user.search_height_max || '?'} ס"מ</strong></div>
                                </div>
                                {user.search_heritage_sectors && (
                                    <div style={{ marginTop: '10px' }}>
                                        <span>מגזרים עדתיים: </span>
                                        <strong>{user.search_heritage_sectors.split(',').map(s => tr('heritage_sector', s.trim())).join(', ')}</strong>
                                    </div>
                                )}
                                {user.search_statuses && (
                                    <div style={{ marginTop: '10px' }}>
                                        <span>סטטוסים: </span>
                                        <strong>{user.search_statuses.split(',').map(s => tr('status', s.trim())).join(', ')}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* כפתורים */}
                <div style={styles.actions}>
                    <button onClick={() => navigate('/profile')} style={styles.editButton}>
                        ✏️ לעריכת הפרופיל
                    </button>
                    <button onClick={() => navigate('/matches')} style={styles.secondaryButton}>
                        ← חזרה לשידוכים
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif",
        direction: 'rtl',
        padding: '20px'
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
        width: '50px',
        height: '50px',
        border: '5px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    header: {
        textAlign: 'center',
        color: '#fff',
        marginBottom: '25px'
    },
    logo: { fontSize: '2.2rem', margin: '0 0 10px', fontWeight: '700' },
    headerSub: { fontSize: '1rem', opacity: 0.9, margin: 0 },
    mainCard: {
        maxWidth: '700px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
    },
    cardTop: {
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '30px',
        display: 'flex',
        gap: '25px',
        alignItems: 'center'
    },
    avatarSection: { textAlign: 'center' },
    avatar: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        border: '4px solid #c9a227',
        boxShadow: '0 5px 20px rgba(0,0,0,0.3)'
    },
    statusBadge: (approved) => ({
        marginTop: '10px',
        padding: '6px 14px',
        background: approved ? '#22c55e' : '#f59e0b',
        color: '#fff',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600'
    }),
    basicInfo: { flex: 1, color: '#fff' },
    name: { margin: '0 0 12px', fontSize: '1.8rem', fontWeight: '700' },
    keyInfo: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' },
    tag: {
        background: 'rgba(255,255,255,0.2)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.9rem',
        backdropFilter: 'blur(5px)'
    },
    dateInfo: { fontSize: '0.85rem', opacity: 0.8, margin: 0 },
    tabs: {
        display: 'flex',
        borderBottom: '2px solid #e5e7eb'
    },
    tab: {
        flex: 1,
        padding: '15px',
        background: '#f8fafc',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.95rem',
        color: '#6b7280'
    },
    activeTab: {
        flex: 1,
        padding: '15px',
        background: '#fff',
        border: 'none',
        borderBottom: '3px solid #c9a227',
        cursor: 'pointer',
        fontSize: '0.95rem',
        color: '#1e3a5f',
        fontWeight: '700'
    },
    tabContent: { padding: '25px' },
    infoBox: (bg, border) => ({
        background: bg,
        border: `2px solid ${border}`,
        borderRadius: '12px',
        padding: '18px',
        marginBottom: '15px'
    }),
    boxTitle: { margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.05rem' },
    infoRow: { display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '0.95rem' },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
    },
    detailItem: { display: 'flex', gap: '8px', fontSize: '0.95rem' },
    freeText: { margin: 0, lineHeight: 1.7, color: '#374151' },
    lockedNote: {
        textAlign: 'center',
        padding: '15px',
        background: '#fff7ed',
        borderRadius: '10px',
        marginBottom: '20px',
        color: '#c2410c',
        fontWeight: '600'
    },
    actions: {
        padding: '20px 25px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '12px'
    },
    editButton: {
        flex: 1,
        padding: '14px',
        background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
        color: '#1a1a1a',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '700',
        cursor: 'pointer'
    },
    secondaryButton: {
        flex: 1,
        padding: '14px',
        background: '#f1f5f9',
        color: '#475569',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

export default ProfileView;
