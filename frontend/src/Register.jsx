import API_BASE from './config';
import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Register() {
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState(""); // שדה חדש
    const [emailNotifications, setEmailNotifications] = useState(true); // העדפת התראות במייל
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    // פונקציות בדיקה (Validation)
    const validateName = (name) => {
        const letterCount = (name.match(/[a-zA-Zא-ת]/g) || []).length;
        return letterCount >= 2;
    };

    const validatePhone = (phone) => {
        const phoneRegex = /^0[2-9]\d{7,8}$/;
        return phoneRegex.test(phone.replace(/-/g, ''));
    };

    const validatePassword = (password) => {
        return password.length >= 4;
    };

    const validateEmail = (email) => { // ולידציה למייל
        if (!email) return true; // אופציונלי
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // בדיקה בזמן אמת
    const handleNameChange = (e) => {
        const value = e.target.value;
        setFullName(value);
        if (value && !validateName(value)) {
            setErrors(prev => ({ ...prev, name: "השם חייב להכיל לפחות 2 אותיות" }));
        } else {
            setErrors(prev => ({ ...prev, name: null }));
        }
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        setPhone(value);
        setPhoneAlreadyExists(false);
        if (value && !validatePhone(value)) {
            setErrors(prev => ({ ...prev, phone: "מספר טלפון לא תקין" }));
        } else {
            setErrors(prev => ({ ...prev, phone: null }));
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (value && !validatePassword(value)) {
            setErrors(prev => ({ ...prev, password: "הסיסמה חייבת להכיל לפחות 4 תווים" }));
        } else {
            setErrors(prev => ({ ...prev, password: null }));
        }
        if (confirmPassword && value !== confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: "הסיסמות אינן תואמות" }));
        } else {
            setErrors(prev => ({ ...prev, confirmPassword: null }));
        }
    };

    const handleConfirmPasswordChange = (e) => {
        const value = e.target.value;
        setConfirmPassword(value);
        if (value && value !== password) {
            setErrors(prev => ({ ...prev, confirmPassword: "הסיסמות אינן תואמות" }));
        } else {
            setErrors(prev => ({ ...prev, confirmPassword: null }));
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !validateEmail(value)) {
            setErrors(prev => ({ ...prev, email: "כתובת מייל לא תקינה" }));
        } else {
            setErrors(prev => ({ ...prev, email: null }));
        }
    };

    // האם הטופס תקין?
    const isFormValid = useMemo(() => {
        return validateName(fullName) && validatePhone(phone) && validatePassword(password) && validateEmail(email) && password === confirmPassword;
    }, [fullName, phone, password, confirmPassword, email]);

    const [step, setStep] = useState('register'); // register | verify
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phoneAlreadyExists, setPhoneAlreadyExists] = useState(false);

    const handleRegister = async () => {
        if (!isFormValid || isSubmitting) {
            if (!isSubmitting) showToast("נא למלא את כל השדות כראוי", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    password,
                    full_name: fullName,
                    email,
                    email_notifications_enabled: emailNotifications
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (email) {
                    // יש מייל → נציג שלב אימות
                    setStep('verify');
                } else {
                    showToast("החשבון נוצר בהצלחה! ברוכים הבאים 🎊", "success");
                    navigate('/profile');
                }
            } else if (response.status === 409) {
                setPhoneAlreadyExists(true);
            } else {
                showToast(`שגיאה: ${data.message}`, "error");
            }
        } catch (err) {
            showToast("לא ניתן ליצור קשר עם השרת", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (verificationCode.length !== 6) {
            showToast("נא להזין קוד תקין בן 6 ספרות", "warning");
            return;
        }

        setIsVerifying(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: verificationCode })
            });

            const data = await response.json();

            if (response.ok) {
                showToast("כתובת המייל אומתה בהצלחה! ברוך הבא 🎉", "success");
                sessionStorage.setItem('email_reminder_shown', 'true');
                setTimeout(() => navigate('/profile'), 1500);
            } else {
                showToast(`קוד שגוי: ${data.message}`, "error");
            }
        } catch (err) {
            showToast("שגיאת תקשורת עם השרת", "error");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSkipVerification = async () => {
        setIsSkipping(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/skip-email-verification`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (_) { /* לא קריטי */ }
        // סמן שכבר הוצגה ההודעה בסשן הנוכחי — לא לחזור שוב עם חלון בדף הבא
        sessionStorage.setItem('email_reminder_shown', 'true');
        showToast("דילגת על האימות — ניתן לאמת בכל עת דרך ההגדרות", "info");
        setTimeout(() => navigate('/profile'), 1000);
        setIsSkipping(false);
    };

    const handleResendCode = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/resend-verification`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                showToast("קוד חדש נשלח למייל שלך 📨", "success");
            } else {
                showToast(data.message, "error");
            }
        } catch (err) {
            showToast("שגיאה בשליחת הקוד מחדש", "error");
        }
    };

    // סגנונות
    const getInputStyle = (fieldName) => ({
        ...inputStyle,
        borderColor: errors[fieldName] ? '#dc3545' : '#cbd5e1',
        backgroundColor: errors[fieldName] ? '#fff5f5' : '#fff'
    });

    return (
        <div style={pageStyle}>
            {/* רקע דקורטיבי עדין מאחור */}
            <div style={glowEffect}></div>

            <div style={containerStyle}>
                {step === 'register' ? (
                    <>
                        <div style={headerStyle}>
                            <span style={logoStyle}>📋</span>
                            <h2 style={titleStyle}>הרשמה לפנקס</h2>
                            <p style={subtitleStyle}>יצירת חשבון חדש</p>
                        </div>

                        {/* שם מלא */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>שם מלא</label>
                            <input
                                type="text"
                                placeholder="ישראל ישראלי"
                                value={fullName}
                                onChange={handleNameChange}
                                style={getInputStyle('name')}
                            />
                            {errors.name && <span style={errorStyle}>{errors.name}</span>}
                        </div>

                        {/* מספר טלפון */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>מספר טלפון</label>
                            <input
                                type="tel"
                                placeholder="05X-XXXXXXX"
                                value={phone}
                                onChange={handlePhoneChange}
                                style={getInputStyle('phone')}
                                dir="ltr"
                            />
                            {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
                            {phoneAlreadyExists && (
                                <div style={{ marginTop: '8px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '10px', padding: '10px 14px', direction: 'rtl' }}>
                                    <p style={{ margin: '0 0 8px', color: '#92400e', fontSize: '0.9rem', fontWeight: 600 }}>
                                        מספר זה כבר רשום במערכת.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        style={{ background: '#c9a227', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                                    >
                                        היכנס לחשבון הקיים
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* אימייל */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>כתובת מייל (נדרשת לאימות החשבון)</label>
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={handleEmailChange}
                                style={getInputStyle('email')}
                                dir="ltr"
                            />
                            {errors.email && <span style={errorStyle}>{errors.email}</span>}
                        </div>

                        {/* סיסמה עם כפתור הצגה */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>בחר סיסמה</label>
                            <div style={passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="לפחות 4 תווים"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    style={{ ...getInputStyle('password'), paddingLeft: '50px' }}
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={showPasswordBtn}
                                >
                                    {showPassword ?
                                        <svg width="20" height="20" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg> :
                                        <svg width="20" height="20" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    }
                                </button>
                            </div>
                            {errors.password && <span style={errorStyle}>{errors.password}</span>}
                        </div>

                        {/* אימות סיסמה */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>אימות סיסמה</label>
                            <div style={passwordWrapper}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="הזן שוב את הסיסמה"
                                    value={confirmPassword}
                                    onChange={handleConfirmPasswordChange}
                                    style={{ ...getInputStyle('confirmPassword'), paddingLeft: '50px', borderColor: errors.confirmPassword ? '#ef4444' : (confirmPassword && confirmPassword === password ? '#22c55e' : undefined) }}
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={showPasswordBtn}
                                >
                                    {showConfirmPassword ?
                                        <svg width="20" height="20" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg> :
                                        <svg width="20" height="20" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    }
                                </button>
                            </div>
                            {errors.confirmPassword && <span style={errorStyle}>{errors.confirmPassword}</span>}
                            {confirmPassword && !errors.confirmPassword && confirmPassword === password && (
                                <span style={{ color: '#22c55e', fontSize: '13px', marginTop: '4px', display: 'block' }}>✓ הסיסמות תואמות</span>
                            )}
                        </div>

                        {/* העדפת התראות במייל */}
                        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                color: '#475569',
                                userSelect: 'none'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={emailNotifications}
                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                        accentColor: '#c9a227'
                                    }}
                                />
                                <span>אני מעוניין/ת לקבל התראות במייל על הודעות חדשות ופעילות במערכת</span>
                            </label>
                        </div>

                        {/* כפתור הרשמה */}
                        <button
                            onClick={handleRegister}
                            disabled={!isFormValid || isSubmitting}
                            style={{
                                ...buttonStyle,
                                background: (isFormValid && !isSubmitting) ? 'linear-gradient(135deg, #c9a227 0%, #b08d1f 100%)' : '#cbd5e1',
                                cursor: (isFormValid && !isSubmitting) ? 'pointer' : 'not-allowed',
                                boxShadow: (isFormValid && !isSubmitting) ? '0 4px 15px rgba(201, 162, 39, 0.3)' : 'none',
                                color: (isFormValid && !isSubmitting) ? '#fff' : '#64748b'
                            }}
                        >
                            {isSubmitting ? "יוצר חשבון..." : "הירשם עכשיו"}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '18px', fontSize: '14px', color: '#64748b', direction: 'rtl' }}>
                            <span>כבר רשום? </span>
                            <span onClick={() => navigate('/login')} style={{ color: '#c9a227', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>היכנס כאן</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Header */}
                        <div style={headerStyle}>
                            <span style={logoStyle}>✉️</span>
                            <h2 style={titleStyle}>אימות כתובת המייל</h2>
                            <p style={subtitleStyle}>
                                שלחנו קוד אימות ל־ <b style={{ color: '#1e3a5f' }}>{email}</b>
                            </p>
                        </div>

                        {/* אפשרות א׳ — לחיצת כפתור */}
                        <div style={verifyMethodBox}>
                            <p style={verifyMethodLabel}>🔗 אפשרות א׳ — קל ומהיר</p>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 10px' }}>
                                לחצו על הכפתור <b>במייל שקיבלתם</b> כדי לאמת בלחיצה אחת.
                            </p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px' }}>
                                💡 לא קיבלתם? בדקו בתיקיית ה<b>ספאם / דואר זבל</b>
                            </p>
                            <button onClick={handleResendCode} style={resendBtnStyle}>
                                📨 שלח מחדש את מייל האימות
                            </button>
                        </div>

                        {/* מפריד */}
                        <div style={orDivider}><span>או</span></div>

                        {/* אפשרות ב׳ — הזנת קוד */}
                        <div style={verifyMethodBox}>
                            <p style={verifyMethodLabel}>🔢 אפשרות ב׳ — הזנת קוד ידנית</p>
                            <input
                                type="text"
                                placeholder="_ _ _ _ _ _"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                style={{
                                    ...inputStyle,
                                    textAlign: 'center',
                                    fontSize: '2rem',
                                    letterSpacing: '12px',
                                    fontWeight: '800',
                                    marginBottom: '12px'
                                }}
                                dir="ltr"
                            />
                            <button
                                onClick={handleVerifyEmail}
                                disabled={verificationCode.length !== 6 || isVerifying}
                                style={{
                                    ...buttonStyle,
                                    background: (verificationCode.length === 6 && !isVerifying)
                                        ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%)'
                                        : '#cbd5e1',
                                    color: '#fff',
                                    marginTop: '0',
                                    fontSize: '1rem',
                                    padding: '13px'
                                }}
                            >
                                {isVerifying ? '⏳ בודק...' : '✅ אמת קוד והמשך'}
                            </button>
                        </div>

                        {/* דילוג על אימות */}
                        <div style={skipSection}>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                                לא מצליח/ה לאמת עכשיו? אין בעיה —
                            </p>
                            <button
                                onClick={handleSkipVerification}
                                disabled={isSkipping}
                                style={skipBtnStyle}
                            >
                                {isSkipping ? '⏳ מעביר אותך...' : '⏩ דלג על האימות בינתיים'}
                            </button>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                                תישלח אליך תזכורת לאימות מאוחר יותר דרך הפרופיל
                            </p>
                        </div>

                        {/* חזרה לעריכת מייל */}
                    </>
                )}
            </div>
        </div>
    );
}

// --- עיצוב יוקרתי (Premium Design) ---
// תואם ב-100% לדף ההתחברות

const pageStyle = {
    minHeight: '100vh',
    // רקע כחול מקורי עם הילה עדינה של זהב מלמעלה
    background: '#1e3a5f',
    backgroundImage: `
        radial-gradient(circle at 50% 0%, rgba(201, 162, 39, 0.2) 0%, transparent 60%),
        linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)
    `,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: "'Heebo', sans-serif",
    position: 'relative',
    overflow: 'hidden'
};

const glowEffect = {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    pointerEvents: 'none'
};

const containerStyle = {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: '420px', // קצת רחב יותר בגלל שיש יותר שדות
    borderTop: '4px solid #c9a227'
};

const headerStyle = {
    textAlign: 'center',
    marginBottom: '30px'
};

const logoStyle = {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '10px'
};

const iconContainerStyle = {
    background: 'rgba(201, 162, 39, 0.1)',
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px auto'
};

const titleStyle = {
    margin: '0 0 8px',
    color: '#1e293b',
    fontSize: '1.8rem',
    fontWeight: '800',
    letterSpacing: '-.025em'
};

const subtitleStyle = {
    margin: 0,
    color: '#64748b',
    fontSize: '1rem',
    fontWeight: '400'
};

const fieldWrapper = {
    marginBottom: '18px'
};

const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.9rem'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '1rem',
    transition: 'all 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
};

const errorStyle = {
    color: '#ef4444', // אדום מודרני יותר
    fontSize: '0.85rem',
    marginTop: '6px',
    display: 'block',
    fontWeight: '500'
};

const passwordWrapper = {
    display: 'flex',
    alignItems: 'center',
    position: 'relative'
};

const showPasswordBtn = {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const buttonStyle = {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'transform 0.1s, box-shadow 0.2s',
    marginTop: '10px'
};

const footerStyle = {
    marginTop: '25px',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '20px'
};

const registerFooterRowStyle = {
    ...footerStyle,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
};

const linkStyle = {
    color: '#64748b',
    fontSize: '0.95rem',
    margin: '0'
};

const linkTextStyle = {
    color: '#c9a227',
    cursor: 'pointer',
    fontWeight: '700',
    textDecoration: 'none'
};

const dividerStyle = {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    color: '#cbd5e1',
    margin: '20px 0',
    fontSize: '0.85rem',
    fontWeight: '500',
    gap: '10px',
    before: { content: '""', flex: 1, borderBottom: '1px solid #e2e8f0' },
    after: { content: '""', flex: 1, borderBottom: '1px solid #e2e8f0' }
};

const phoneInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    background: '#eff6ff',
    borderRadius: '12px',
    color: '#1e3a5f',
    fontSize: '0.9rem',
    border: '1px solid #dbeafe'
};

// --- styles לשלב האימות ---

const verifyMethodBox = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px 18px',
    marginBottom: '12px',
    textAlign: 'right'
};

const verifyMethodLabel = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: '8px'
};

const resendBtnStyle = {
    width: '100%',
    padding: '11px',
    borderRadius: '10px',
    border: '1.5px solid #c9a227',
    background: 'transparent',
    color: '#c9a227',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer'
};

const orDivider = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '6px 0',
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'center'
};

const skipSection = {
    marginTop: '20px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
    textAlign: 'center'
};

const skipBtnStyle = {
    padding: '10px 24px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: 'transparent',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer'
};

export default Register;