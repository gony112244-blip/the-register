import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Register() {
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState(""); // שדה חדש
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

    const handleRegister = async () => {
        if (!isFormValid) {
            showToast("נא למלא את כל השדות כראוי", "warning");
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    password,
                    full_name: fullName,
                    email // שליחת המייל לשרת
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                showToast("נרשמת בהצלחה! ברוך הבא 🎉", "success");

                // מעבר ישיר לדף הפרופיל למילוי פרטים
                setTimeout(() => navigate('/profile'), 1500);
            } else {
                showToast(`שגיאה: ${data.message}`, "error");
            }
        } catch (err) {
            showToast("לא ניתן להתחבר לשרת", "error");
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
            <div style={containerStyle}>
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
                        placeholder="לפחות 2 אותיות"
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
                        type="text"
                        placeholder="05X-XXXXXXX"
                        value={phone}
                        onChange={handlePhoneChange}
                        style={getInputStyle('phone')}
                    />
                    {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
                </div>

                {/* אימייל (אופציונלי) */}
                <div style={fieldWrapper}>
                    <label style={labelStyle}>אימייל (אופציונלי - לשחזור סיסמה)</label>
                    <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={handleEmailChange}
                        style={getInputStyle('email')}
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
                            style={{ ...getInputStyle('password'), flex: 1 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={showPasswordBtn}
                        >
                            {showPassword ? '🔓' : '🔒'}
                        </button>
                    </div>
                    {errors.password && <span style={errorStyle}>{errors.password}</span>}
                </div>

                {/* כפתור הרשמה */}
                <button
                    onClick={handleRegister}
                    disabled={!isFormValid}
                    style={{
                        ...buttonStyle,
                        backgroundColor: isFormValid ? '#c9a227' : '#ccc',
                        cursor: isFormValid ? 'pointer' : 'not-allowed',
                        opacity: isFormValid ? 1 : 0.7
                    }}
                >
                    הירשם והמתן לאישור
                </button>



                <p style={linkStyle}>
                    כבר רשום? <span onClick={() => navigate('/login')} style={linkTextStyle}>התחבר כאן</span>
                </p>

                <p style={phoneInfoStyle}>
                    📞 אפשר להירשם גם בטלפון: <strong>072-XXX-XXXX</strong>
                </p>
            </div>
        </div>
    );
}

// עיצוב מותאם לסגנון הפנקס
const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    direction: 'rtl',
    fontFamily: "'Heebo', 'Segoe UI', sans-serif"
};

const containerStyle = {
    background: '#fff',
    padding: '40px 35px',
    borderRadius: '20px',
    boxShadow: '0 15px 50px rgba(0, 0, 0, 0.2)',
    width: '100%',
    maxWidth: '400px'
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

const titleStyle = {
    margin: '0 0 5px',
    color: '#1e3a5f',
    fontSize: '1.8rem',
    fontWeight: '700'
};

const subtitleStyle = {
    margin: 0,
    color: '#6b7280',
    fontSize: '1rem'
};

const fieldWrapper = {
    marginBottom: '20px'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#374151',
    fontWeight: '600',
    fontSize: '0.95rem'
};

const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '2px solid #cbd5e1',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    outline: 'none'
};

const errorStyle = {
    color: '#dc3545',
    fontSize: '0.85rem',
    marginTop: '6px',
    display: 'block',
    fontWeight: '500'
};

const buttonStyle = {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1a1a1a',
    transition: 'all 0.3s ease',
    marginTop: '10px'
};

const messageStyle = {
    color: '#dc3545',
    textAlign: 'center',
    marginTop: '15px',
    padding: '10px',
    background: '#fff5f5',
    borderRadius: '8px'
};

const linkStyle = {
    textAlign: 'center',
    marginTop: '20px',
    color: '#6b7280',
    fontSize: '0.95rem'
};

const linkTextStyle = {
    color: '#c9a227',
    cursor: 'pointer',
    fontWeight: '600'
};

const phoneInfoStyle = {
    textAlign: 'center',
    marginTop: '25px',
    padding: '15px',
    background: '#f8f5f0',
    borderRadius: '10px',
    color: '#4a4540',
    fontSize: '0.9rem'
};

// הסבר: עיצוב לשורת הסיסמה עם כפתור הצגה
const passwordWrapper = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

const showPasswordBtn = {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '2px solid #cbd5e1',
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: '1.2rem',
    transition: 'all 0.3s ease'
};

export default Register;