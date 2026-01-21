import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        age: '', sector: '', height: '', gender: '',
        search_min_age: '', search_max_age: '', search_sector: ''
    });
    const navigate = useNavigate();

    // --- תיקון 1: טעינת הנתונים כשנכנסים לדף ---
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/login');
        } else {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);

            // כאן אנחנו מוודאים שהטופס מתמלא בנתונים הקיימים
            setFormData({
                age: parsedUser.age || '',
                sector: parsedUser.sector || '',
                height: parsedUser.height || '',
                gender: parsedUser.gender || '',
                // הנתונים החדשים של החיפוש:
                search_min_age: parsedUser.search_min_age || '',
                search_max_age: parsedUser.search_max_age || '',
                search_sector: parsedUser.search_sector || ''
            });
        }
    }, [navigate]);

    const handleSave = async () => {
        try {
            const response = await fetch('http://localhost:3000/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: user.phone,
                    fullName: user.full_name,
                    ...formData,
                    // המרה למספרים כדי שהשרת לא יצעק
                    age: parseInt(formData.age) || 0,
                    search_min_age: parseInt(formData.search_min_age) || 0,
                    search_max_age: parseInt(formData.search_max_age) || 0
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert("✅ הפרופיל והעדפות החיפוש עודכנו!");
                // עדכון הזיכרון המקומי עם הנתונים החדשים מהשרת
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (err) {
            console.error("Error updating profile:", err);
        }
    };

    if (!user) return <div>טוען...</div>;

    return (
        <div style={containerStyle}>
            <h2>הפרופיל של {user.full_name}</h2>

            {/* --- כרטיס פרטים אישיים --- */}
            <div style={cardStyle}>
                <h3>פרטים אישיים</h3>
                <label>מגדר:</label>
                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} style={inputStyle}>
                    <option value="">בחר/י</option>
                    <option value="גבר">גבר</option>
                    <option value="אישה">אישה</option>
                </select>

                <label>גיל:</label>
                <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} style={inputStyle} />

                <label>מגזר שלי:</label>
                <select value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} style={inputStyle}>
                    <option value="">בחר מגזר</option>
                    <option value="ליטאי">ליטאי</option>
                    <option value="חסידי">חסידי</option>
                    <option value="ספרדי">ספרדי</option>
                </select>
                <div style={cardStyle}>
                

                    <label>גובה (למשל 1.75):</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.height}
                        onChange={e => setFormData({ ...formData, height: e.target.value })}
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* --- כרטיס העדפות חיפוש --- */}
            <div style={{ ...cardStyle, borderTop: '4px solid #e91e63', marginTop: '20px' }}>
                <h3>מה אני מחפש/ת?</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>מגיל:</label>
                        <input type="number" value={formData.search_min_age} onChange={e => setFormData({ ...formData, search_min_age: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>עד גיל:</label>
                        <input type="number" value={formData.search_max_age} onChange={e => setFormData({ ...formData, search_max_age: e.target.value })} style={inputStyle} />
                    </div>
                </div>

                <label>מגזר רצוי:</label>
                <select value={formData.search_sector} onChange={e => setFormData({ ...formData, search_sector: e.target.value })} style={inputStyle}>
                    <option value="">כל המגזרים</option>
                    <option value="ליטאי">ליטאי</option>
                    <option value="חסידי">חסידי</option>
                    <option value="ספרדי">ספרדי</option>
                </select>
            </div>

            <button onClick={handleSave} style={saveButtonStyle}>שמור את כל הנתונים</button>

            {/* --- תיקון 2: הכפתור החדש מוטמע כאן --- */}
            <button
                onClick={() => navigate('/matches')}
                style={{ ...saveButtonStyle, backgroundColor: '#e91e63', marginTop: '10px' }}
            >
                💘 למציאת שידוכים מתאימים
            </button>
        </div>
    );
}

// --- סגנונות (Styles) ---
const containerStyle = { padding: '20px', direction: 'rtl', fontFamily: 'Arial', backgroundColor: '#f0f2f5', minHeight: '100vh' };
const cardStyle = { maxWidth: '500px', margin: '0 auto', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const inputStyle = { display: 'block', width: '100%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #ddd' };
const saveButtonStyle = { display: 'block', width: '100%', margin: '20px auto 0', padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' };

export default Profile;