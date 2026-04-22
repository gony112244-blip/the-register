import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function IvrSettings() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState('no_pass'); // 'no_pass' | 'with_pin'
    const [hasPin, setHasPin] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetch(`${API_BASE}/api/ivr-settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setMode(data.allow_ivr_no_pass ? 'no_pass' : 'with_pin');
                    setHasPin(data.has_pin);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [token, navigate]);

    const handleSave = async () => {
        if (mode === 'with_pin' && newPin) {
            if (!/^\d{4}$/.test(newPin)) {
                showToast('הקוד חייב להיות 4 ספרות בדיוק', 'error'); return;
            }
            if (newPin !== confirmPin) {
                showToast('הקודים אינם תואמים — נסה שוב', 'error'); return;
            }
        }
        if (mode === 'with_pin' && !hasPin && !newPin) {
            showToast('יש להזין קוד 4 ספרות', 'error'); return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/ivr-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    allow_ivr_no_pass: mode === 'no_pass',
                    new_pin: mode === 'with_pin' && newPin ? newPin : undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('✅ ההגדרות נשמרו בהצלחה', 'success');
                setNewPin('');
                setConfirmPin('');
                if (mode === 'with_pin' && newPin) setHasPin(true);
                if (mode === 'no_pass') setHasPin(false);
            } else {
                showToast(data.message || 'שגיאה בשמירה', 'error');
            }
        } catch {
            showToast('תקלה בתקשורת עם השרת', 'error');
        }
        setSaving(false);
    };

    if (loading) return (
        <div style={styles.page}>
            <div style={styles.loadingBox}>⏳ טוען הגדרות...</div>
        </div>
    );

    const phoneMain = '02-313-0778';

    return (
        <div style={styles.page}>
            <div style={styles.container}>

                {/* כותרת */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>📞</div>
                    <h1 style={styles.title}>הגדרות מערכת הטלפון</h1>
                    <p style={styles.subtitle}>
                        חייג ל-<strong>{phoneMain}</strong> ונהל את השידוך ישירות מהטלפון
                    </p>
                </div>

                {/* מספר חיוג */}
                <div style={styles.phoneBox}>
                    <div style={styles.phoneRow}>
                        <span style={styles.phoneLabel}>📲 מספר לחיוג</span>
                        <a href="tel:023130778" style={styles.phoneLink}>{phoneMain}</a>
                    </div>
                    <a href="tel:023130778" style={styles.callBtn}>
                        📞 חייג עכשיו — {phoneMain}
                    </a>
                </div>

                {/* מדריך מקשים */}
                <div style={styles.guideBox}>
                    <div style={styles.guideTitle}>🗝️ מפת המקשים — שמור אותה!</div>

                    {/* תפריט ראשי */}
                    <div style={styles.sectionLabel}>📋 תפריט ראשי (בכניסה למערכת)</div>
                    <div style={styles.keysGrid}>
                        {[
                            { key: '1', desc: 'הצעות חדשות' },
                            { key: '2', desc: 'אישור / דחיית בקשות תמונה' },
                            { key: '3', desc: 'בקשות שידוך שהגיעו אליי' },
                            { key: '4', desc: 'פניות ששלחתי (ממתינות)' },
                            { key: '5', desc: 'שידוכים פעילים' },
                            { key: '6', desc: 'הודעות חשובות' },
                            { key: '7', desc: 'כל ההצעות כולל ישנות' },
                            { key: '8', desc: 'הודעות אחרונות (שבוע אחרון)' },
                            { key: '0', desc: 'שמיעה חוזרת של התפריט' },
                        ].map(({ key, desc }) => (
                            <div key={key} style={styles.keyItem}>
                                <span style={styles.keyBadge}>{key}</span>
                                <span style={styles.keyDesc}>{desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* בזמן הקראה */}
                    <div style={{ ...styles.sectionLabel, marginTop: '14px' }}>🎧 בזמן הקראת פרופיל / בקשה</div>
                    <div style={styles.keysGrid}>
                        {[
                            { key: '1', desc: 'כן / אישור / שלח פנייה' },
                            { key: '2', desc: 'לא / דחייה / ביטול' },
                            { key: '4', desc: 'פרטים על המבקש/ת (בבקשות תמונה)' },
                            { key: '8', desc: 'הבא / דלג' },
                            { key: '9', desc: 'שמיעה חוזרת (השמע שוב)' },
                            { key: '0', desc: 'חזרה לתפריט ראשי' },
                            { key: '#', desc: 'חזרה לתפריט (מכל מקום)' },
                        ].map(({ key, desc }) => (
                            <div key={key} style={styles.keyItem}>
                                <span style={styles.keyBadge}>{key}</span>
                                <span style={styles.keyDesc}>{desc}</span>
                            </div>
                        ))}
                    </div>

                    <div style={styles.guideTip}>
                        💡 <strong>טיפ:</strong> אפשר ללחוץ מיד — לא צריך להמתין לסוף ההקראה
                    </div>
                </div>

                {/* הסבר */}
                <div style={styles.infoBox}>
                    <div style={styles.infoIcon}>ℹ️</div>
                    <div>
                        <strong>איך זה עובד?</strong>
                        <br />
                        המערכת מזהה אותך לפי <strong>מספר הטלפון שלך</strong> — אין צורך להזין שם משתמש.
                        <br />
                        אם תרצה, הוסף <strong>קוד סודי של 4 ספרות</strong> שיידרש בכל כניסה, להגנה נוספת על הפרטיות שלך.
                    </div>
                </div>

                {/* בחירת מצב */}
                <div style={styles.modeGrid}>
                    <button
                        type="button"
                        onClick={() => setMode('no_pass')}
                        style={{
                            ...styles.modeCard,
                            ...(mode === 'no_pass' ? styles.modeCardActive : {})
                        }}
                    >
                        <div style={styles.modeEmoji}>⚡</div>
                        <div style={styles.modeTitle}>כניסה מהירה</div>
                        <div style={styles.modeDesc}>
                            המערכת מזהה אותי לפי מספר הטלפון
                            <br />ללא קוד — מהיר ונוח
                        </div>
                        {mode === 'no_pass' && <div style={styles.modeCheck}>✓ נבחר</div>}
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode('with_pin')}
                        style={{
                            ...styles.modeCard,
                            ...(mode === 'with_pin' ? styles.modeCardActiveSec : {})
                        }}
                    >
                        <div style={styles.modeEmoji}>🔐</div>
                        <div style={styles.modeTitle}>כניסה עם קוד סודי</div>
                        <div style={styles.modeDesc}>
                            4 ספרות שרק אתה יודע
                            <br />מגן על פרטיותך
                        </div>
                        {mode === 'with_pin' && <div style={{ ...styles.modeCheck, color: '#0891b2' }}>✓ נבחר</div>}
                    </button>
                </div>

                {/* שדות קוד — רק במצב with_pin */}
                {mode === 'with_pin' && (
                    <div style={styles.pinSection}>
                        <h3 style={styles.pinTitle}>
                            {hasPin ? '🔄 שינוי קוד סודי (אופציונלי)' : '🔑 הגדרת קוד סודי'}
                        </h3>
                        {hasPin && (
                            <p style={styles.pinNote}>
                                יש לך קוד מוגדר. אם לא תמלא כלום — הקוד הקיים יישמר.
                            </p>
                        )}

                        <div style={styles.pinRow}>
                            <div style={styles.pinField}>
                                <label style={styles.pinLabel}>
                                    {hasPin ? 'קוד חדש' : 'בחר קוד'}
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="• • • •"
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    style={styles.pinInput}
                                    dir="ltr"
                                />
                            </div>
                            <div style={styles.pinField}>
                                <label style={styles.pinLabel}>אישור קוד</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="• • • •"
                                    value={confirmPin}
                                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    style={{
                                        ...styles.pinInput,
                                        borderColor: confirmPin && newPin !== confirmPin ? '#ef4444' : undefined
                                    }}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        {confirmPin && newPin !== confirmPin && (
                            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>
                                ❌ הקודים אינם תואמים
                            </p>
                        )}
                        {confirmPin && newPin === confirmPin && newPin.length === 4 && (
                            <p style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: '6px' }}>
                                ✅ הקודים תואמים
                            </p>
                        )}
                    </div>
                )}

                {/* כפתור שמירה */}
                <button
                    onClick={handleSave}
                    disabled={saving || (mode === 'with_pin' && !hasPin && !newPin)}
                    style={{
                        ...styles.saveBtn,
                        opacity: (saving || (mode === 'with_pin' && !hasPin && !newPin)) ? 0.6 : 1,
                        cursor: (saving || (mode === 'with_pin' && !hasPin && !newPin)) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {saving ? '⏳ שומר...' : '💾 שמור הגדרות'}
                </button>

                {/* קו הפרדה + כפתור חזרה */}
                <div style={styles.backRow}>
                    <button onClick={() => navigate(-1)} style={styles.backBtn}>
                        ← חזור
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 60%, #1a2f4f 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '40px 16px',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    loadingBox: {
        color: '#fff',
        fontSize: '1.2rem',
        marginTop: '80px'
    },
    container: {
        background: '#fff',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
        textAlign: 'center',
        marginBottom: '28px'
    },
    headerIcon: {
        fontSize: '3rem',
        marginBottom: '10px'
    },
    title: {
        margin: '0 0 8px',
        fontSize: '1.8rem',
        fontWeight: '800',
        color: '#1e293b'
    },
    subtitle: {
        margin: 0,
        color: '#64748b',
        fontSize: '1rem'
    },
    infoBox: {
        display: 'flex',
        gap: '12px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '28px',
        fontSize: '0.92rem',
        color: '#1e40af',
        lineHeight: '1.7'
    },
    infoIcon: {
        fontSize: '1.3rem',
        flexShrink: 0
    },
    modeGrid: {
        display: 'flex',
        gap: '14px',
        marginBottom: '24px',
        flexWrap: 'wrap'
    },
    modeCard: {
        flex: 1,
        minWidth: '200px',
        padding: '20px 16px',
        borderRadius: '16px',
        border: '2px solid #e2e8f0',
        background: '#f8fafc',
        cursor: 'pointer',
        textAlign: 'right',
        transition: 'all 0.2s',
        outline: 'none'
    },
    modeCardActive: {
        border: '2.5px solid #4f46e5',
        background: '#eef2ff'
    },
    modeCardActiveSec: {
        border: '2.5px solid #0891b2',
        background: '#ecfeff'
    },
    modeEmoji: {
        fontSize: '2rem',
        marginBottom: '8px'
    },
    modeTitle: {
        fontWeight: '700',
        fontSize: '1rem',
        color: '#1e293b',
        marginBottom: '6px'
    },
    modeDesc: {
        color: '#64748b',
        fontSize: '0.85rem',
        lineHeight: '1.5'
    },
    modeCheck: {
        color: '#4f46e5',
        fontWeight: '700',
        marginTop: '10px',
        fontSize: '0.85rem'
    },
    pinSection: {
        background: '#f8fafc',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #e2e8f0'
    },
    pinTitle: {
        margin: '0 0 8px',
        fontSize: '1rem',
        fontWeight: '700',
        color: '#1e293b'
    },
    pinNote: {
        color: '#64748b',
        fontSize: '0.88rem',
        margin: '0 0 16px'
    },
    pinRow: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap'
    },
    pinField: {
        flex: 1,
        minWidth: '120px'
    },
    pinLabel: {
        display: 'block',
        fontWeight: '600',
        fontSize: '0.88rem',
        color: '#334155',
        marginBottom: '8px'
    },
    pinInput: {
        width: '100%',
        padding: '14px 10px',
        borderRadius: '10px',
        border: '1.5px solid #cbd5e1',
        fontSize: '1.8rem',
        letterSpacing: '10px',
        textAlign: 'center',
        background: '#fff',
        boxSizing: 'border-box',
        outline: 'none'
    },
    saveBtn: {
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        border: 'none',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff',
        fontWeight: '700',
        fontSize: '1.1rem',
        transition: 'all 0.2s',
        marginBottom: '20px'
    },
    backRow: {
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        paddingTop: '16px'
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600'
    },
    phoneBox: {
        background: '#f0fdf4',
        border: '1.5px solid #86efac',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
    },
    phoneRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
    },
    phoneLabel: {
        fontSize: '0.88rem',
        color: '#374151',
        fontWeight: '600',
    },
    phoneLink: {
        fontSize: '1.15rem',
        fontWeight: '800',
        color: '#15803d',
        textDecoration: 'none',
        letterSpacing: '0.5px',
        direction: 'ltr',
    },
    callBtn: {
        display: 'block',
        marginTop: '12px',
        padding: '14px',
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        color: '#fff',
        borderRadius: '12px',
        textAlign: 'center',
        fontWeight: '800',
        fontSize: '1.1rem',
        textDecoration: 'none',
        letterSpacing: '0.5px',
        boxShadow: '0 4px 15px rgba(21,128,61,0.3)',
        transition: 'all 0.2s',
    },
    phoneDivider: {
        height: '1px',
        background: '#bbf7d0',
        margin: '8px 0',
    },
    guideBox: {
        background: '#fefce8',
        border: '1.5px solid #fde68a',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '20px',
    },
    guideTitle: {
        fontWeight: '700',
        fontSize: '0.95rem',
        color: '#92400e',
        marginBottom: '14px',
    },
    sectionLabel: {
        fontWeight: '700',
        fontSize: '0.8rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px',
        paddingBottom: '4px',
        borderBottom: '1px solid #fde68a',
    },
    keysGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '14px',
    },
    keyItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    keyBadge: {
        background: '#1e293b',
        color: '#fff',
        borderRadius: '6px',
        width: '28px',
        height: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '800',
        fontSize: '0.9rem',
        flexShrink: 0,
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    keyDesc: {
        fontSize: '0.82rem',
        color: '#374151',
        lineHeight: '1.3',
    },
    guideTip: {
        fontSize: '0.85rem',
        color: '#78350f',
        background: '#fef9c3',
        borderRadius: '8px',
        padding: '8px 12px',
        lineHeight: '1.5',
    },
};

export default IvrSettings;
