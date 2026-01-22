import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Matches() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            navigate('/login');
            return;
        }

        const currentUser = JSON.parse(savedUser);
        setUser(currentUser);

        const queryParams = new URLSearchParams({
            gender: currentUser.gender,
            search_sector: currentUser.search_sector || '',
            search_min_age: currentUser.search_min_age || 18,
            search_max_age: currentUser.search_max_age || 120,
            myAge: currentUser.age,
            currentPhone: currentUser.phone
        }).toString();

        fetch(`http://localhost:3000/matches?${queryParams}`)
            .then(res => res.json())
            .then(data => {
                setMatches(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching matches:", err);
                setLoading(false);
            });

    }, [navigate]);

    // --- זו הפונקציה החדשה והחכמה! ---
    const handleConnect = async (matchName, matchId) => {
        // הגנה: אם אין משתמש מחובר, עצור
        if (!user || !user.id) return;

        try {
            const response = await fetch('http://localhost:3000/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    myId: user.id,      // אני (השולח)
                    targetId: matchId   // המועמד (המקבל)
                })
            });

            const data = await response.json();

            if (response.ok) {
                // הצלחה! (הודעה ירוקה ושמחה)
                alert(`🎉 ${data.message}`);
            } else {
                // כישלון/חסימה (הודעה מהשרת המסבירה למה)
                alert(`⚠️ שים לב: ${data.message}`);
            }

        } catch (err) {
            console.error("Connection error:", err);
            alert("תקלה בתקשורת עם השרת");
        }
    };
    // --------------------------------

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2 style={{marginTop: '20px', color: '#fff'}}>מחפש התאמות מושלמות...</h2>
        </div>
    );

    return (
        <div style={styles.pageWrapper}>
            <nav style={styles.navbar}>
                <div style={styles.navContent}>
                    <h1 style={styles.logo}>Shiduch.App 💘</h1>
                    <div style={styles.userInfo}>
                        <span>שלום, {user?.full_name}</span>
                        <button onClick={() => navigate('/profile')} style={styles.iconButton}>
                            ⚙ פרופיל
                        </button>
                    </div>
                </div>
            </nav>

            <div style={styles.container}>
                <div style={styles.headerSection}>
                    <h2 style={styles.pageTitle}>ההתאמות שלך להיום</h2>
                    <p style={styles.subTitle}>מצאנו עבורך מועמדים על בסיס ההעדפות שלך</p>
                </div>

                <div style={styles.grid}>
                    {matches.length > 0 ? (
                        matches.map((match, index) => (
                            <div key={index} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={styles.matchBadge}>{match.sector}</div>
                                </div>
                                <div style={styles.imageWrapper}>
                                    <img 
                                        src={`https://ui-avatars.com/api/?name=${match.full_name}&background=fff&color=6366f1&size=128&bold=true`} 
                                        alt={match.full_name} 
                                        style={styles.avatar}
                                    />
                                </div>
                                <div style={styles.cardBody}>
                                    <h3 style={styles.name}>{match.full_name}, {match.age}</h3>
                                    <div style={styles.divider}></div>
                                    <div style={styles.detailsGrid}>
                                        <div style={styles.detailItem}>
                                            <span style={styles.detailLabel}>גובה</span>
                                            <span style={styles.detailValue}>{match.height || '?'} מ'</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.detailLabel}>מגזר</span>
                                            <span style={styles.detailValue}>{match.sector}</span>
                                        </div>
                                    </div>
                                    {/* הכפתור עכשיו שולח גם את השם וגם את ה-ID */}
                                    <button 
                                        onClick={() => handleConnect(match.full_name, match.id)}
                                        style={styles.actionButton}
                                    >
                                        יצירת קשר ✨
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={{fontSize: '50px'}}>🤷‍♂️</div>
                            <h3>עדיין לא מצאנו התאמה מדויקת</h3>
                            <p>נסה להרחיב את טווח הגילאים בפרופיל</p>
                            <button onClick={() => navigate('/profile')} style={styles.outlineButton}>
                                לעריכת העדפות חיפוש
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- אותו עיצוב מודרני בדיוק ---
const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
        fontFamily: "'Segoe UI', sans-serif",
        direction: 'rtl',
        color: '#1f2937'
    },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#6366f1',
        color: 'white'
    },
    navbar: {
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '1rem 0'
    },
    navContent: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    logo: {
        margin: 0,
        fontSize: '1.5rem',
        background: 'linear-gradient(to right, #6366f1, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        fontWeight: '500'
    },
    iconButton: {
        background: '#f3f4f6',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: '0.2s'
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
    },
    headerSection: {
        textAlign: 'center',
        marginBottom: '40px',
        color: 'white'
    },
    pageTitle: {
        fontSize: '2.5rem',
        margin: '0 0 10px 0',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    subTitle: {
        fontSize: '1.2rem',
        opacity: 0.9
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '30px'
    },
    card: {
        background: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
    },
    cardHeader: {
        height: '100px',
        background: 'linear-gradient(to right, #a855f7, #ec4899)',
        position: 'relative'
    },
    matchBadge: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'rgba(255,255,255,0.2)',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        backdropFilter: 'blur(4px)'
    },
    imageWrapper: {
        marginTop: '-50px',
        display: 'flex',
        justifyContent: 'center'
    },
    avatar: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '4px solid white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        objectFit: 'cover'
    },
    cardBody: {
        padding: '20px',
        textAlign: 'center',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    name: {
        margin: '10px 0',
        fontSize: '1.5rem',
        color: '#1f2937'
    },
    divider: {
        height: '1px',
        background: '#e5e7eb',
        margin: '15px 0'
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '20px'
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#f9fafb',
        padding: '10px',
        borderRadius: '10px'
    },
    detailLabel: {
        fontSize: '0.85rem',
        color: '#6b7280',
        marginBottom: '4px'
    },
    detailValue: {
        fontWeight: 'bold',
        color: '#374151'
    },
    actionButton: {
        marginTop: 'auto',
        background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
        color: 'white',
        border: 'none',
        padding: '12px',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(99, 102, 241, 0.3)',
        transition: 'transform 0.1s'
    },
    emptyState: {
        gridColumn: '1 / -1',
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    outlineButton: {
        background: 'transparent',
        border: '2px solid #6366f1',
        color: '#6366f1',
        padding: '10px 20px',
        borderRadius: '10px',
        fontWeight: 'bold',
        marginTop: '15px',
        cursor: 'pointer'
    }
};

export default Matches;