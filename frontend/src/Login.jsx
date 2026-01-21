import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
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

            if (response.ok) {
                const loggedUser = data.user;
                
                // 1. שמירת המשתמש המעודכן בזיכרון של הדפדפן
                localStorage.setItem('user', JSON.stringify(loggedUser));

                // --- כאן נכנס התיקון החדש: סדר עדיפויות ---

                // א. בדיקה ראשונה: האם זה הבוס? (מנהל)
                if (loggedUser.is_admin) {
                    console.log("👑 מנהל זוהה - עובר לפאנל ניהול");
                    navigate('/admin'); 
                    return; // חשוב! עוצר כאן כדי שלא ימשיך לבדיקות האחרות
                }

                // ב. בדיקה שנייה: האם משתמש רגיל כבר מילא את כל הפרטים?
                if (loggedUser.gender && loggedUser.age) {
                    console.log("✅ משתמש מלא - עובר להתאמות");
                    navigate('/matches');
                } else {
                    // ג. ברירת מחדל: חסרים פרטים - לך להשלים פרופיל
                    console.log("📝 חסרים פרטים - עובר לפרופיל");
                    navigate('/profile');
                }
                // ---------------------------------------------

            } else {
                alert(data.message || "שגיאה בהתחברות");
            }
        } catch (err) {
            console.error("Login error:", err);
            alert("תקלה בתקשורת עם השרת");
        }
    };

    return (
        <div style={containerStyle}>
            <form onSubmit={handleLogin} style={formStyle}>
                <h2>כניסה למערכת</h2>
                <input 
                    type="text" 
                    placeholder="מספר טלפון" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    style={inputStyle} 
                />
                <input 
                    type="password" 
                    placeholder="סיסמה" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={inputStyle} 
                />
                <button type="submit" style={buttonStyle}>כניסה</button>
            </form>
        </div>
    );
}

// סגנונות בסיסיים
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', direction: 'rtl' };
const formStyle = { padding: '20px', border: '1px solid #ccc', borderRadius: '10px', backgroundColor: '#f9f9f9' };
const inputStyle = { display: 'block', width: '100%', padding: '10px', margin: '10px 0' };
const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };

export default Login;