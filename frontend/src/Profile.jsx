import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
    const navigate = useNavigate();
    
    // שליפת הטוקן והמשתמש מהזיכרון
    const token = localStorage.getItem('token');
    const savedUser = JSON.parse(localStorage.getItem('user'));

    // 1. אתחול המשתמש
    const [user, setUser] = useState({
        full_name: '', age: '', height: '', sector: '', phone: '', gender: 'male',
        reference_1_name: '', reference_1_phone: '',
        reference_2_name: '', reference_2_phone: '',
        rabbi_name: '', rabbi_phone: '',
        search_min_age: '', search_max_age: '', search_sector: ''
    });
    
    const [images, setImages] = useState([]); 
    const [newImageUrl, setNewImageUrl] = useState(''); 
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!savedUser || !token) {
            navigate('/login');
            return;
        }
setUser(prev => ({ 
            ...prev, 
            ...savedUser,
            gender: savedUser.gender || 'male' 
        }));
                fetchImages(savedUser.id);
    }, [navigate, token]); // תלות בטוקן

    // --- פונקציות לניהול תמונות (מאובטחות) ---
    const fetchImages = async (userId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/user-images/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` } // 🔑 הוספנו מפתח
            });
            if (response.ok) {
                const data = await response.json();
                setImages(data);
            }
        } catch (error) {
            console.error("Error fetching images:", error);
        }
    };

    const handleAddImage = async () => {
        if (!newImageUrl) return;
        try {
            const response = await fetch('http://localhost:3000/api/upload-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 הוספנו מפתח
                },
                body: JSON.stringify({ userId: user.id, imageUrl: newImageUrl }),
            });
            const data = await response.json();
            if (response.ok) {
                setImages([...images, data.image]);
                setNewImageUrl('');
                setMessage("✅ התמונה נוספה!");
                setTimeout(() => setMessage(''), 3000);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error adding image:", error);
        }
    };

    const handleDeleteImage = async (imageId) => {
        if(!window.confirm("למחוק את התמונה?")) return;
        try {
            await fetch(`http://localhost:3000/api/delete-image/${imageId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` } // 🔑 הוספנו מפתח
            });
            setImages(images.filter(img => img.id !== imageId));
        } catch (error) {
            console.error("Error deleting image:", error);
        }
    };

    // --- ניהול פרטים (מאובטח) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const res = await fetch('http://localhost:3000/update-profile', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 הוספנו מפתח
                },
                body: JSON.stringify(user)
            });
            
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                setMessage("✅ הפרופיל וההעדפות נשמרו בהצלחה!");
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage("❌ שגיאה בשמירה");
            }
        } catch (err) {
            setMessage("❌ שגיאה בתקשורת לשרת");
        }
    };

    const isMale = user.gender === 'male';
    const rabbiLabel = isMale ? "שם הרב האישי" : "שם המורה / הרבנית";

    // --- ה-HTML המקורי שלך (ללא שינוי) ---
    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h2 style={styles.title}>הפרופיל שלי 📝</h2>
                {message && <div style={styles.alert}>{message}</div>}

                {/* --- ניהול תמונות --- */}
                <div style={{...styles.section, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
                    <h3>📸 תמונות שלי (עד 3)</h3>
                    <div style={styles.imageGrid}>
                        {images.map((img) => (
                            <div key={img.id} style={styles.imageWrapper}>
                                <img src={img.image_url} style={styles.thumbnail} alt="profile" />
                                <button onClick={() => handleDeleteImage(img.id)} style={styles.deleteImgBtn}>X</button>
                            </div>
                        ))}
                    </div>
                    {images.length < 3 && (
                        <div style={styles.row}>
                            <input 
                                type="text" 
                                placeholder="הדבק קישור לתמונה..." 
                                value={newImageUrl} 
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                style={styles.input}
                            />
                            <button onClick={handleAddImage} style={styles.addBtn}>הוסף</button>
                        </div>
                    )}
                </div>

                {/* --- פרטים אישיים --- */}
                <div style={styles.section}>
                    <h3>👤 פרטים אישיים</h3>
                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label>שם מלא:</label>
                            <input type="text" name="full_name" value={user.full_name || ''} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.field}>
    <label>מגדר:</label>
    <select 
        name="gender" 
        value={user.gender || 'male'} 
        onChange={handleChange} 
        style={styles.input}
    >
        <option value="male">גבר</option>
        <option value="female">אישה</option>
    </select>
</div>
                        <div style={styles.field}>
                            <label>גיל:</label>
                            <input type="number" name="age" value={user.age || ''} onChange={handleChange} style={styles.input} />
                        </div>
                    </div>
                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label>גובה:</label>
                            <input type="number" step="0.01" name="height" value={user.height || ''} onChange={handleChange} style={styles.input} />
                        </div>
                        <div style={styles.field}>
                            <label>מגזר:</label>
                            <select name="sector" value={user.sector || ''} onChange={handleChange} style={styles.input}>
                                <option value="">בחר מגזר...</option>
                                <option value="Chassidish">חסידי</option>
                                <option value="Litvish">ליטאי</option>
                                <option value="Sefardi">ספרדי</option>
                                <option value="Dati">דתי לאומי</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- העדפות --- */}
                <div style={styles.highlightSection}>
                    <h3>❤️ את מי אני מחפש/ת?</h3>
                    <div style={styles.row}>
                        <div style={styles.field}><label>מגיל:</label><input type="number" name="search_min_age" value={user.search_min_age || ''} onChange={handleChange} style={styles.input} /></div>
                        <div style={styles.field}><label>עד גיל:</label><input type="number" name="search_max_age" value={user.search_max_age || ''} onChange={handleChange} style={styles.input} /></div>
                    </div>
                </div>

                {/* --- בירורים --- */}
                <div style={styles.section}>
                    <h3>📞 בירורים</h3>
                    <div style={styles.row}>
                        <div style={styles.field}><label>ממליץ 1:</label><input type="text" name="reference_1_name" value={user.reference_1_name || ''} onChange={handleChange} style={styles.input} /></div>
                        <div style={styles.field}><label>טלפון:</label><input type="text" name="reference_1_phone" value={user.reference_1_phone || ''} onChange={handleChange} style={styles.input} /></div>
                    </div>
                    <div style={styles.row}>
                        <div style={styles.field}><label>{rabbiLabel}:</label><input type="text" name="rabbi_name" value={user.rabbi_name || ''} onChange={handleChange} style={styles.input} /></div>
                        <div style={styles.field}><label>טלפון:</label><input type="text" name="rabbi_phone" value={user.rabbi_phone || ''} onChange={handleChange} style={styles.input} /></div>
                    </div>
                </div>

                <button onClick={handleSave} style={styles.saveBtn}>שמור הכל 💾</button>
            </div>
        </div>
    );
}

// --- העיצוב המקורי שלך (ללא שינוי) ---
const styles = {
    page: { padding: '20px', direction: 'rtl', fontFamily: 'Segoe UI', background: '#f8fafc', minHeight: '100vh' },
    container: { maxWidth: '600px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    title: { textAlign: 'center', color: '#334155', marginBottom: '20px' },
    section: { marginBottom: '25px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' },
    highlightSection: { marginBottom: '25px', padding: '20px', background: '#fdf2f8', borderRadius: '12px', border: '1px solid #fbcfe8' },
    input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '5px' },
    row: { display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-end' },
    field: { flex: 1 },
    saveBtn: { width: '100%', padding: '15px', background: '#db2777', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' },
    alert: { padding: '15px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
    imageGrid: { display: 'flex', gap: '10px', marginBottom: '15px' },
    imageWrapper: { position: 'relative', width: '100px', height: '100px' },
    thumbnail: { width: '100%', height: '100%', objectCover: 'cover', borderRadius: '8px' },
    deleteImgBtn: { position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' },
    addBtn: { padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }
};

export default Profile;