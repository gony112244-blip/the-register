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

    const phoneNumber = '0772291821';

    return (
        <div style={styles.page}>
            <div style={styles.container}>

                {/* כותרת */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>📞</div>
                    <h1 style={styles.title}>הגדרות מערכת הטלפון</h1>
                    <p style={styles.subtitle}>
                        שלח {phoneNumber} להאזין לפניות, הצעות ועוד — ישירות מהטלפון
                    </p>
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
    }
};

export default IvrSettings;
