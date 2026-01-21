import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState(""); // הוספנו שדה לשם מלא
    const [message, setMessage] = useState("");
    const passwordRef = useRef();
    const navigate = useNavigate();

    const handleRegister = async () => {
        const password = passwordRef.current.value;

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone, 
                    password, 
                    full_name: fullName // שליחת השם לשרת
                })
            });

            const data = await response.json();

            if (response.ok) {
                // המושג ללמידה: User Feedback
                // לפני הניווט, אנחנו נותנים למשתמש הוראה ברורה מה הצעד הבא
                alert("נרשמת בהצלחה! כעת המתן לאישור השדכנית כדי שתוכל להיכנס.");
                
                // ניווט לדף הכניסה - המשתמש יצטרך להיכנס רק אחרי אישור
                navigate('/login');
            } else {
                setMessage(`שגיאה: ${data.message}`);
            }
        } catch (err) {
            setMessage("לא ניתן להתחבר לשרת. וודא שה-Backend רץ");
        }
    };

    return (
        <div style={{ padding: '40px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '400px', margin: '0 auto', border: '1px solid #ddd', padding: '20px', borderRadius: '10px' }}>
                <h3>יצירת חשבון חדש</h3>
                
                <input
                    type="text"
                    placeholder="שם מלא"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                />

                <input
                    type="text"
                    placeholder="מספר טלפון"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                />

                <input
                    type="password"
                    placeholder="בחר סיסמה"
                    ref={passwordRef}
                    style={inputStyle}
                />

                {/* המושג ללמידה: Conditional Rendering & Props */}
                <button
                    onClick={handleRegister}
                    disabled={phone.length < 9 || !fullName}
                    style={{
                        ...buttonStyle,
                        backgroundColor: (phone.length < 9 || !fullName) ? '#ccc' : '#28a745',
                        cursor: (phone.length < 9 || !fullName) ? 'not-allowed' : 'pointer'
                    }}
                >
                    הירשם והמתן לאישור
                </button>

                {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
                
                <p style={{ marginTop: '15px', fontSize: '14px' }}>
                    כבר רשום? <span onClick={() => navigate('/login')} style={{ color: '#007bff', cursor: 'pointer' }}>התחבר כאן</span>
                </p>
            </div>
        </div>
    );
}

// עיצוב בסיסי Inline - בראיונות יגידו לך שעדיף CSS נפרד, אבל זה מצוין לבנייה מהירה
const inputStyle = { display: 'block', width: '100%', margin: '10px 0', padding: '10px', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '12px', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '16px' };

export default Register;