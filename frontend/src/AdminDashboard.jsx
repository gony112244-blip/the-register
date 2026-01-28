import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; // תוודא שיש לך קובץ עיצוב או תמחק את השורה

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            // 1. שליפת הטוקן מהזיכרון המקומי
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            // הגנה: אם אין טוקן או שהמשתמש לא אדמין - זרוק אותו החוצה
            if (!token || !user?.is_admin) {
                navigate('/login');
                return;
            }

            try {
                // 2. שליחת הבקשה עם הכותרת הנכונה (Authorization)
                const response = await fetch('http://localhost:3000/admin/users', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // 🔑 ה"כרטיס המגנטי"
                    }
                });

                // אם הטוקן פג תוקף (401 או 403)
                if (response.status === 401 || response.status === 403) {
                    alert("החיבור פג תוקף, נא להתחבר מחדש");
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }

                const data = await response.json();

                // 3. בדיקה שהתקבל מערך (כדי למנוע את השגיאה users.map is not a function)
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    console.error("התקבל מידע לא תקין:", data);
                    setUsers([]); // הגנה מפני קריסה
                }

            } catch (error) {
                console.error("שגיאה בטעינת משתמשים:", error);
            }
        };

        fetchUsers();
    }, [navigate]);

    // פונקציה לאישור משתמש (גם כאן צריך לשלוח טוקן!)
    const handleApprove = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:3000/admin/approve/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}` // חובה לשלוח גם כאן
                }
            });
            
            if (res.ok) {
                // עדכון הרשימה בצד הלקוח (כדי שלא נצטרך לרענן)
                setUsers(users.map(user => 
                    user.id === id ? { ...user, is_approved: true } : user
                ));
            }
        } catch (err) {
            console.error("שגיאה באישור", err);
        }
    };

    return (
        <div className="admin-container">
            <h1>פנל ניהול - אישור משתמשים</h1>
            <div className="users-list">
                {users.length === 0 ? <p>אין משתמשים להצגה או בטעינה...</p> : null}
                
                {users.map(user => (
                    <div key={user.id} className="user-card">
                        <h3>{user.full_name}</h3>
                        <p>טלפון: {user.phone}</p>
                        <p>גיל: {user.age} | מגזר: {user.sector}</p>
                        {user.is_approved ? (
                            <span className="badge approved">✅ מאושר</span>
                        ) : (
                            <button 
                                className="approve-btn"
                                onClick={() => handleApprove(user.id)}
                            >
                                אשר משתמש
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminDashboard;