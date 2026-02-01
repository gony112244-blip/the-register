import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // הסבר: מצב הצגת סיסמה
    const [message, setMessage] = useState('');
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
                setMessage(data.message || "שגיאה בהתחברות");
                return;
            }

            // שמירת הטוקן והמשתמש
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            const loggedUser = data.user;

            // ניתוב לפי סוג משתמש
            if (loggedUser.is_admin) {
                navigate('/admin');
            } else if (loggedUser.gender && loggedUser.age) {
                navigate('/matches');
            } else {
                navigate('/profile');
            }

        } catch (err) {
            console.error("Login error:", err);
            setMessage("תקלה בתקשורת עם השרת");
        }
    };

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <span style={logoStyle}>📋</span>
                    <h2 style={titleStyle}>התחברות לפנקס</h2>
                    <p style={subtitleStyle}>כניסה לחשבון קיים</p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* מספר טלפון */}
                    <div style={fieldWrapper}>
                        <label style={labelStyle}>מספר טלפון</label>
                        <input
                            type="text"
                            placeholder="05X-XXXXXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* סיסמה עם אפשרות הצגה */}
                    <div style={fieldWrapper}>
                        <label style={labelStyle}>סיסמה</label>
                        <div style={passwordWrapper}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="הכנס סיסמה"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={passwordInputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={showPasswordBtn}
                            >
                                {showPassword ? '🔓' : '🔒'}
                            </button>
                        </div>
                    </div>

                    {message && <p style={messageStyle}>{message}</p>}

                    <button type="submit" style={buttonStyle}>התחבר</button>
                </form>

                <p style={linkStyle}>
                    אין לך חשבון? <span onClick={() => navigate('/register')} style={linkTextStyle}>הירשם כאן</span>
                </p>

                <p style={phoneInfoStyle}>
                    📞 אפשר להתחבר גם בטלפון: <strong>072-XXX-XXXX</strong>
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

const passwordWrapper = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

const passwordInputStyle = {
    ...inputStyle,
    flex: 1
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

const buttonStyle = {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1a1a1a',
    backgroundColor: '#c9a227',
    cursor: 'pointer',
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

export default Login;