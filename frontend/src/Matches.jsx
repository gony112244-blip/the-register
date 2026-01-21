import { useState, useEffect } from 'react';

function Matches() {
    const [matches, setMatches] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            setCurrentUser(user);
            fetchMatches(user);
        }
    }, []);

    const fetchMatches = async (user) => {
        // בדיקה שכל נתוני הסינון קיימים
        if (!user.gender || !user.search_min_age || !user.search_max_age) {
            return; 
        }

        try {
            // הפיכת הנתונים לפרמטרים עבור הכתובת (Query Params)
            const params = new URLSearchParams({
                gender: user.gender,
                search_sector: user.search_sector || '',
                search_min_age: user.search_min_age,
                search_max_age: user.search_max_age,
                myAge: user.age,
                currentPhone: user.phone
            });

            const response = await fetch(`http://localhost:3000/matches?${params}`);
            const data = await response.json();
            setMatches(data);
        } catch (err) {
            console.error("Error fetching matches:", err);
        }
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl' }}>
            <h2 style={{ textAlign: 'center' }}>התאמות בשבילך 💘</h2>
            {matches.length === 0 ? (
                <p style={{ textAlign: 'center' }}>לא נמצאו התאמות כרגע. נסה לעדכן את הפרופיל!</p>
            ) : (
                <div style={gridStyle}>
                    {matches.map((m, i) => (
                        <div key={i} style={cardStyle}>
                            <h3>{m.full_name}</h3>
                            <p>גיל: {m.age}</p>
                            <p>מגזר: {m.sector}</p>
                            <p>גובה: {m.height}</p>
                            <button style={btnStyle}>צפה בפרופיל</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' };
const cardStyle = { border: '1px solid #ddd', padding: '15px', borderRadius: '10px', textAlign: 'center', backgroundColor: '#fff' };
const btnStyle = { backgroundColor: '#e91e63', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' };

export default Matches;