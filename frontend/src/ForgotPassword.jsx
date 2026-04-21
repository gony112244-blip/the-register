import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

async function parseResponseJson(res) {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

function ForgotPassword() {
    const [step, setStep] = useState(1); // 1=phone+email, 2=enter code, 3=new password
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { setMessage(''); }, [step]);

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!phone) { setMessage('נא להזין מספר טלפון'); return; }
        if (!email) { setMessage('נא להזין כתובת מייל'); return; }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, method: 'email', email })
            });
            const data = await parseResponseJson(res);

            if (res.ok) {
                setStep(2);
            } else {
                setMessage(data.message || 'שגיאה בשליחת הקוד');
            }
        } catch (err) {
            setMessage('שגיאה בתקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        if (!code) {
            setMessage('נא להזין את הקוד');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/verify-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code })
            });
            const data = await parseResponseJson(res);

            if (res.ok) {
                setStep(3);
            } else {
                setMessage(data.message || 'קוד שגוי');
            }
        } catch (err) {
            setMessage('שגיאה בתקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setMessage('נא למלא את כל השדות');
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage('הסיסמות אינן תואמות');
            return;
        }
        if (newPassword.length < 6) {
            setMessage('הסיסמה חייבת להכיל לפחות 6 תווים');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code, newPassword })
            });
            const data = await parseResponseJson(res);

            if (res.ok) {
                setStep(4); // שלב הצלחה - מסך נפרד
            } else {
                setMessage(data.message || 'שגיאה באיפוס הסיסמה');
            }
        } catch (err) {
            setMessage('שגיאה בתקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <span style={styles.icon}>🔐</span>
                    <h2 style={styles.title}>שכחתי סיסמה</h2>
                    <p style={styles.subtitle}>
                        {step === 1 && 'הזן את מספר הטלפון וכתובת המייל שלך'}
                        {step === 2 && 'הזן את קוד האימות שקיבלת במייל'}
                        {step === 3 && 'בחר סיסמה חדשה'}
                        {step === 4 && 'הסיסמה שונתה בהצלחה'}
                    </p>
                </div>

                {/* Progress Bar */}
                <div style={styles.progressBar}>
                    <div style={{ ...styles.progress, width: `${Math.min((step / 3) * 100, 100)}%` }}></div>
                </div>

                {/* Steps — key={step} forces full remount on step change, preventing DOM reconciliation errors */}
                <div key={step}>
                    {step === 1 && (
                        <form onSubmit={handleSendCode}>
                            <div style={styles.field}>
                                <label style={styles.label}>📱 מספר טלפון</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="05X-XXXXXXX"
                                    style={styles.input}
                                    dir="ltr"
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>📧 כתובת מייל לשחזור</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    style={styles.input}
                                    dir="ltr"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !phone || !email}
                                style={(!phone || !email) ? styles.buttonDisabled : styles.button}
                            >
                                {loading ? '⏳ שולח...' : '📤 שלח קוד אימות'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyCode}>
                            <div style={styles.infoBox}>
                                <p>📧 שלחנו קוד אימות ל-{email}</p>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>🔢 קוד אימות (6 ספרות)</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="הזן את הקוד"
                                    style={styles.codeInput}
                                    maxLength={6}
                                />
                            </div>
                            <button type="submit" disabled={loading} style={styles.button}>
                                {loading ? '⏳ בודק...' : '✅ אמת קוד'}
                            </button>
                            <button type="button" onClick={() => setStep(1)} style={styles.secondaryBtn}>
                                ← לא קיבלתי, נסה שוב
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <div style={styles.field}>
                                <label style={styles.label}>🔑 סיסמה חדשה</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="לפחות 6 תווים"
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>🔑 אימות סיסמה</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="הזן שוב את הסיסמה"
                                    style={styles.input}
                                />
                            </div>
                            <button type="submit" disabled={loading} style={styles.button}>
                                {loading ? '⏳ משנה...' : '🔐 שנה סיסמה'}
                            </button>
                        </form>
                    )}

                    {step === 4 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
                            <h3 style={{ color: '#22c55e', marginBottom: '8px' }}>הסיסמה שונתה בהצלחה!</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>כעת תוכל להיכנס עם הסיסמה החדשה שלך.</p>
                            <button onClick={() => navigate('/login')} style={styles.button}>
                                🔑 כניסה לחשבון
                            </button>
                        </div>
                    )}
                </div>

                {message && (
                    <p style={message.includes('✅') ? styles.successMsg : styles.errorMsg}>
                        {message}
                    </p>
                )}

                <p style={styles.linkText}>
                    <span onClick={() => navigate('/login')} style={styles.link}>
                        ← חזרה להתחברות
                    </span>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        direction: 'rtl',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: {
        background: '#fff',
        padding: '40px 35px',
        borderRadius: '20px',
        boxShadow: '0 15px 50px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '450px'
    },
    header: { textAlign: 'center', marginBottom: '25px' },
    icon: { fontSize: '3rem', display: 'block', marginBottom: '10px' },
    title: { margin: '0 0 5px', color: '#1e3a5f', fontSize: '1.8rem', fontWeight: '700' },
    subtitle: { margin: 0, color: '#6b7280', fontSize: '1rem' },
    progressBar: {
        height: '6px',
        background: '#e5e7eb',
        borderRadius: '10px',
        marginBottom: '25px',
        overflow: 'hidden'
    },
    progress: {
        height: '100%',
        background: 'linear-gradient(to right, #c9a227, #f59e0b)',
        borderRadius: '10px',
        transition: 'width 0.3s ease'
    },
    field: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '600' },
    input: {
        width: '100%',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '2px solid #cbd5e1',
        fontSize: '1rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.3s'
    },
    codeInput: {
        width: '100%',
        padding: '18px 16px',
        borderRadius: '10px',
        border: '2px solid #cbd5e1',
        fontSize: '1.5rem',
        textAlign: 'center',
        letterSpacing: '8px',
        boxSizing: 'border-box',
        fontWeight: 'bold'
    },
    infoBox: {
        background: '#f0f9ff',
        border: '2px solid #1e3a5f',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center',
        color: '#1e3a5f'
    },
    button: {
        width: '100%',
        padding: '15px',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1a1a1a',
        background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        marginBottom: '10px'
    },
    buttonDisabled: {
        width: '100%',
        padding: '15px',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#9ca3af',
        background: '#e5e7eb',
        cursor: 'not-allowed',
        marginBottom: '10px'
    },
    secondaryBtn: {
        width: '100%',
        padding: '12px',
        border: '2px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#6b7280',
        background: '#fff',
        cursor: 'pointer'
    },
    errorMsg: {
        color: '#dc3545',
        textAlign: 'center',
        marginTop: '15px',
        padding: '10px',
        background: '#fff5f5',
        borderRadius: '8px'
    },
    successMsg: {
        color: '#22c55e',
        textAlign: 'center',
        marginTop: '15px',
        padding: '10px',
        background: '#f0fdf4',
        borderRadius: '8px'
    },
    linkText: { textAlign: 'center', marginTop: '20px', color: '#6b7280' },
    link: { color: '#c9a227', cursor: 'pointer', fontWeight: '600' }
};

export default ForgotPassword;
