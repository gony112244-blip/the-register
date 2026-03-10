import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Register() {
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
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
        return validateName(fullName) && validatePhone(phone) && validatePassword(password) && validateEmail(email);
    }, [fullName, phone, password, email]);

    const [step, setStep] = useState('register'); // register or verify
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // מניעת לחיצה כפולה

    const handleRegister = async () => {
        if (!isFormValid || isSubmitting) {
            if (!isSubmitting) showToast("נא למלא את כל השדות כראוי", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    password,
                    full_name: fullName,
                    email, // שליחת המייל לשרת
                    email_notifications_enabled: emailNotifications // העדפת התראות
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                showToast("החשבון נוצר בהצלחה! ברוכים הבאים 🎊", "success");

                // עוברים ישירות לפרופיל (דילוג על אימות)
                navigate('/profile');
            } else {
                showToast(`שגיאה: ${data.message}`, "error");
            }
        } catch (err) {
            showToast("לא ניתן להתחבר לשרת", "error");
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
            const response = await fetch('http://localhost:3000/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: verificationCode })
            });

            const data = await response.json();

            if (response.ok) {
                showToast("המייל אומת בהצלחה! ברוך הבא 🎉", "success");
                // מעבר לדף הפרופיל למילוי פרטים
                setTimeout(() => navigate('/profile'), 1500);
            } else {
                showToast(`שגיאה: ${data.message}`, "error");
            }
        } catch (err) {
            showToast("שגיאת תקשורת עם השרת", "error");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendCode = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/resend-verification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                showToast("קוד חדש נשלח למייל שלך", "success");
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
                        </div>

                        {/* אימייל */}
                        <div style={fieldWrapper}>
                            <label style={labelStyle}>אימייל (חובה לאימות חשבון)</label>
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

                        <div style={footerStyle}>
                            <p style={linkStyle}>
                                כבר רשום? <span onClick={() => navigate('/login')} style={linkTextStyle}>התחבר כאן</span>
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={headerStyle}>
                            <span style={logoStyle}>📧</span>
                            <h2 style={titleStyle}>אימות אימייל</h2>
                            <p style={subtitleStyle}>שלחנו קוד לאימייל: <b>{email}</b></p>
                        </div>

                        <div style={fieldWrapper}>
                            <label style={{ ...labelStyle, textAlign: 'center' }}>הכנס קוד בן 6 ספרות</label>
                            <input
                                type="text"
                                placeholder="------"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                style={{ ...inputStyle, textAlign: 'center', fontSize: '2rem', letterSpacing: '10px', fontWeight: '800' }}
                                dir="ltr"
                            />
                        </div>

                        <button
                            onClick={handleVerifyEmail}
                            disabled={verificationCode.length !== 6 || isVerifying}
                            style={{
                                ...buttonStyle,
                                background: (verificationCode.length === 6 && !isVerifying) ? 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)' : '#cbd5e1',
                                color: '#fff'
                            }}
                        >
                            {isVerifying ? 'בודק...' : 'אמת קוד והמשך'}
                        </button>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <p style={linkStyle}>
                                לא קיבלת קוד? <span onClick={handleResendCode} style={linkTextStyle}>שלח שוב</span>
                            </p>
                            <p style={{ ...linkStyle, marginTop: '10px', fontSize: '0.8rem' }}>
                                <span onClick={() => setStep('register')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>חזור לעדכון כתובת המייל</span>
                            </p>
                        </div>
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

export default Register;