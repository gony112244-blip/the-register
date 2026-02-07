import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // הסבר: מצב הצגת סיסמה
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "שגיאה בהתחברות", "error");
                return;
            }

            // שמירת הטוקן והמשתמש
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showToast(`ברוך הבא, ${data.user.full_name}! 👋`, "success");

            const loggedUser = data.user;

            // ניתוב לפי סוג משתמש
            setTimeout(() => {
                if (loggedUser.is_admin) {
                    navigate('/admin');
                } else if (loggedUser.gender && loggedUser.age) {
                    navigate('/matches');
                } else {
                    navigate('/profile');
                }
            }, 1000); // השהייה קטנה כדי לראות את ה-toast

        } catch (err) {
            console.error("Login error:", err);
            showToast("תקלה בתקשורת עם השרת", "error");
        }
    };

    return (
        <div style={pageStyle}>
            {/* רקע דקורטיבי עדין מאחור */}
            <div style={glowEffect}></div>

            <div style={containerStyle}>
                <div style={headerStyle}>
                    <span style={logoStyle}>📋</span>
                    <h2 style={titleStyle}>הפנקס</h2>
                    <p style={subtitleStyle}>כניסה למערכת השידוכים</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={fieldWrapper}>
                        <label style={labelStyle}>מספר טלפון</label>
                        <input
                            type="tel"
                            placeholder="05X-XXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={inputStyle}
                            dir="ltr"
                        />
                    </div>

                    <div style={fieldWrapper}>
                        <label style={labelStyle}>סיסמה</label>
                        <div style={passwordWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={passwordInputStyle}
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
                    </div>

                    <button type="submit" style={buttonStyle}>התחברות</button>
                </form>

                <div style={footerStyle}>
                    <p style={linkStyle}>
                        עדיין אין לך כרטיס? <span onClick={() => navigate('/register')} style={linkTextStyle}>יצירת חשבון חדש</span>
                    </p>
                    <p style={forgotPassStyle}>
                        <span onClick={() => navigate('/forgot-password')} style={forgotPassLink}>שכחתי סיסמה</span>
                    </p>
                </div>

            </div>
        </div>
    );
}

// --- עיצוב יוקרתי (Premium Design) ---

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
    // התאמת הזוהר לרקע הבהיר יותר - יותר עדין
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
    background: 'rgba(255, 255, 255, 0.95)', // כמעט אטום לקריאות טובה
    backdropFilter: 'blur(20px)',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: '380px',
    borderTop: '4px solid #c9a227' // פס זהב עדין למעלה
};

const headerStyle = {
    textAlign: 'center',
    marginBottom: '35px'
};

const logoStyle = {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '10px'
};

const iconContainerStyle = {
    background: 'rgba(201, 162, 39, 0.1)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto'
};

const titleStyle = {
    margin: '0 0 8px',
    color: '#1e293b',
    fontSize: '2rem',
    fontWeight: '800',
    letterSpacing: '-.025em'
};

const subtitleStyle = {
    margin: 0,
    color: '#64748b',
    fontSize: '1.05rem',
    fontWeight: '400'
};

const fieldWrapper = {
    marginBottom: '20px'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#334155',
    fontWeight: '600',
    fontSize: '0.9rem'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    fontSize: '1rem',
    transition: 'all 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
};

const passwordWrapper = {
    display: 'flex',
    alignItems: 'center',
    position: 'relative'
};

const passwordInputStyle = {
    ...inputStyle,
    paddingLeft: '50px' // מקום לכפתור העין
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
    color: '#ffffff',
    background: 'linear-gradient(135deg, #c9a227 0%, #b08d1f 100%)', // גרדיאנט זהב
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)',
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
    margin: '0 0 10px 0'
};

const linkTextStyle = {
    color: '#c9a227',
    cursor: 'pointer',
    fontWeight: '700',
    textDecoration: 'none'
};

const forgotPassStyle = {
    margin: 0
};

const forgotPassLink = {
    color: '#94a3b8',
    fontSize: '0.9rem',
    cursor: 'pointer',
    textDecoration: 'underline'
};

const dividerStyle = {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    color: '#cbd5e1',
    margin: '25px 0',
    fontSize: '0.85rem',
    fontWeight: '500',
    gap: '10px'
};

const dividerLine = {
    flex: 1,
    height: '1px',
    background: '#e2e8f0'
};

const supportContainer = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
};

const supportBoxBase = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 15px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    textAlign: 'right'
};

const phoneInfoStyle = {
    ...supportBoxBase,
    background: '#f0f9ff', // Light blue
    border: '1px solid #bae6fd',
    color: '#0369a1'
};

const emailInfoStyle = {
    ...supportBoxBase,
    background: '#fefce8', // Light yellow
    border: '1px solid #fef08a',
    color: '#854d0e'
};

const iconStyle = {
    fontSize: '1.4rem'
};

const infoTitle = {
    display: 'block',
    fontWeight: '700',
    marginBottom: '2px'
};

const infoText = {
    display: 'block',
    opacity: 0.9,
    fontSize: '0.85rem'
};

const phoneNumberStyle = {
    fontWeight: '700',
    fontSize: '1.1rem',
    marginTop: '2px',
    direction: 'ltr',
    display: 'inline-block'
};

const emailLinkStyle = {
    color: '#854d0e',
    fontWeight: '700',
    textDecoration: 'underline',
    direction: 'ltr',
    display: 'block'
};

export default Login;