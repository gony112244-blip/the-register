import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        
        try {
            // 1. שליחת הבקשה לשרת
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await response.json();

            // 2. בדיקה קריטית: האם השרת אישר את הכניסה?
            if (!response.ok) {
                alert(data.message || "שגיאה בהתחברות");
                return; // עוצרים כאן אם יש שגיאה
            }

            // 3. אם הכל תקין - שומרים את המידע בדפדפן
            localStorage.setItem('token', data.token); // התיקון החשוב: שמירת הטוקן!
            localStorage.setItem('user', JSON.stringify(data.user));

            // 4. לוגיקת הניתוב החכמה שלך (נשמרה במלואה)
            const loggedUser = data.user;

            // א. האם מנהל?
            if (loggedUser.is_admin) {
                console.log("👑 מנהל זוהה - עובר לפאנל ניהול");
                navigate('/admin'); 
                return;
            }

            // ב. האם משתמש רגיל שמילא פרטים?
            // הערה: וידאתי שהשדות תואמים למה שחוזר מהשרת
            if (loggedUser.gender && loggedUser.age) {
                console.log("✅ משתמש מלא - עובר להתאמות");
                navigate('/matches');
            } else {
                // ג. חסרים פרטים
                console.log("📝 חסרים פרטים - עובר לפרופיל");
                navigate('/profile');
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

// --- העיצוב המקורי שלך נשמר ---
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', direction: 'rtl' };
const formStyle = { padding: '20px', border: '1px solid #ccc', borderRadius: '10px', backgroundColor: '#f9f9f9', minWidth: '300px' };
const inputStyle = { display: 'block', width: '100%', padding: '10px', margin: '10px 0', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' };

export default Login;