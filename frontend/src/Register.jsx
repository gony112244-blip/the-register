import { useState, useRef } from 'react';
// 1. ייבוא ה-Hook שמאפשר לנו לנווט בין דפים
import { useNavigate } from 'react-router-dom';

function Register() {
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const passwordRef = useRef();

    // 2. אתחול הניווט - חייב להיות בתוך הפונקציה של הקומפוננטה
    const navigate = useNavigate();

    const handleRegister = async () => {
        const password = passwordRef.current.value;

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await response.json();

            if (response.ok) {
                // 3. רגע הקסם: אם השרת החזיר תשובה חיובית, נעבור לדף הפרופיל
                // אנחנו יכולים גם להעביר את ה-ID שקיבלנו מהשרת כדי להשתמש בו שם
                navigate('/profile');
            } else {
                setMessage(`שגיאה: ${data.message}`);
            }
        } catch (err) {
            setMessage("לא ניתן להתחבר לשרת. וודא שה-Backend רץ");
        }
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>רישום למערכת השידוכים</h3>


            <input
                type="text"
                placeholder="מספר טלפון"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ display: 'block', margin: '10px auto', padding: '8px' }}
            />

            <input
                type="password"
                placeholder="סיסמה"
                ref={passwordRef}
                style={{ display: 'block', margin: '10px auto', padding: '8px' }}
            />

            <button
                onClick={handleRegister}
                disabled={phone.length < 9}
                style={{
                    padding: '10px 20px',
                    backgroundColor: phone.length < 9 ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    cursor: phone.length < 9 ? 'not-allowed' : 'pointer'
                }}
            >
                הירשם והמשך לפרופיל
            </button>

            {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
        </div>
    );
}

export default Register;