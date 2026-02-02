import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Matches() {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const { showToast } = useToast();

    // מצב דפדוף
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    useEffect(() => {
        const savedUser = localStorage.getItem('user');

        // בדיקה כפולה: אם אין משתמש או אין טוקן - החוצה
        if (!savedUser || !token) {
            navigate('/login');
            return;
        }

        const currentUser = JSON.parse(savedUser);
        // setUser(currentUser); // הוסר כי user נקרא כבר למעלה

        // הסבר: בדיקה אם המשתמש מאושר
        // אם הוא עדיין לא אושר - לא נטען התאמות, נציג הודעה
        if (!currentUser.is_approved) {
            setLoading(false);
            return; // לא ממשיכים לטעון התאמות
        }

        // --- הוספתי הגנה קטנה למניעת מסך ריק ---
        if (!currentUser.gender) {
            showToast("חובה לעדכן מגדר בפרופיל כדי לקבל התאמות!", "warning");
            navigate('/profile');
            return;
        }
        // --------------------------------------

        // הסבר: השרת עכשיו עושה את כל הסינון לבד לפי פרטי המשתמש!
        fetch('http://localhost:3000/matches', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // 🔑 הטוקן מזהה את המשתמש
            }
        })
            .then(res => {
                if (res.status === 401) {
                    navigate('/login');
                    return null;
                }
                if (!res.ok) {
                    console.error('Server error:', res.status);
                    return [];
                }
                return res.json();
            })
            .then(data => {
                // הגנה: וודא שזה מערך
                setMatches(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching matches:", err);
                setMatches([]);
                setLoading(false);
            });

    }, [navigate, token]);

    const handleConnect = async (matchName, matchId) => {
        if (!user || !user.id) return;

        try {
            const response = await fetch('http://localhost:3000/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 הוספנו את המפתח גם כאן!
                },
                body: JSON.stringify({
                    myId: user.id,
                    targetId: matchId
                })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`🎉 ${data.message}`, "success");
                // עדכון הרשימה המקומית (אופציונלי - להסיר את מי שעשינו לו לייק)
                // setMatches(matches.filter(m => m.id !== matchId)); 
            } else {
                showToast(`⚠️ שים לב: ${data.message}`, "warning");
            }

        } catch (err) {
            console.error("Connection error:", err);
            showToast("תקלה בתקשורת עם השרת", "error");
        }
    };

    // דפדוף
    const totalPages = Math.ceil(matches.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedMatches = matches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2 style={{ marginTop: '20px', color: '#fff' }}>מחפש התאמות מושלמות...</h2>
        </div>
    );

    return (
        <div style={styles.pageWrapper}>


            <div style={styles.container}>
                {/* הסבר: בדיקה אם המשתמש מאושר - אם לא, מציגים הודעה */}
                {!user?.is_approved ? (
                    <div style={styles.pendingApproval}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
                        <h2 style={{ color: '#1e3a5f', marginBottom: '15px' }}>הפרופיל שלך בבדיקה</h2>
                        <p style={{ color: '#6b7280', lineHeight: '1.8', maxWidth: '400px', margin: '0 auto' }}>
                            לאחר שנאמת את הפרטים שלך, תוכל לראות הצעות מתאימות.
                            <br />
                            בדרך כלל התהליך לוקח עד 24 שעות.
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            style={{ ...styles.outlineButton, marginTop: '25px' }}
                        >
                            לעדכון פרטי הפרופיל
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={styles.headerSection}>
                            <h2 style={styles.pageTitle}>ההתאמות שלך להיום</h2>
                            <p style={styles.subTitle}>
                                מצאנו עבורך {matches.length} מועמדים מתאימים
                                {totalPages > 1 && ` (עמוד ${currentPage} מתוך ${totalPages})`}
                            </p>
                        </div>

                        <div style={styles.grid}>
                            {paginatedMatches.length > 0 ? (
                                paginatedMatches.map((match, index) => (
                                    <div key={match.id || index} style={styles.card}>
                                        <div style={styles.cardHeader}>
                                            <div style={styles.matchBadge}>{match.sector}</div>
                                            {/* תג תמונות */}
                                            {match.profile_images_count > 0 && (
                                                <div style={{
                                                    background: '#c9a227',
                                                    color: '#1a1a1a',
                                                    padding: '4px 10px',
                                                    borderRadius: '15px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    📷 {match.profile_images_count} תמונות
                                                </div>
                                            )}
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
                                                    <span style={styles.detailValue}>{match.height || '?'} ס"מ</span>
                                                </div>
                                                <div style={styles.detailItem}>
                                                    <span style={styles.detailLabel}>מגזר</span>
                                                    <span style={styles.detailValue}>{match.sector}</span>
                                                </div>
                                            </div>

                                            {/* כפתור בקשת תמונות */}
                                            {match.profile_images_count > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch('http://localhost:3000/request-photo-access', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({ targetId: match.id })
                                                            });
                                                            const data = await res.json();
                                                            alert(data.message);
                                                        } catch (err) {
                                                            alert('שגיאה');
                                                        }
                                                    }}
                                                    style={{
                                                        ...styles.secondaryButton,
                                                        marginBottom: '10px'
                                                    }}
                                                >
                                                    👁️ בקשה לראות תמונות
                                                </button>
                                            )}

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
                                    <div style={{ fontSize: '50px' }}>🤷‍♂️</div>
                                    <h3>עדיין לא מצאנו התאמה מדויקת</h3>
                                    <p>נסה להרחיב את טווח הגילאים בפרופיל</p>
                                    <button onClick={() => navigate('/profile')} style={styles.outlineButton}>
                                        לעריכת העדפות חיפוש
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* כפתורי דפדוף */}
                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={currentPage === 1 ? styles.pageButtonDisabled : styles.pageButton}
                                >
                                    → הקודם
                                </button>

                                <div style={styles.pageNumbers}>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            style={page === currentPage ? styles.pageButtonActive : styles.pageButton}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={currentPage === totalPages ? styles.pageButtonDisabled : styles.pageButton}
                                >
                                    הבא ←
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// --- העיצוב המקורי שלך (בדיוק כמו ששלחת) ---
const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif",
        direction: 'rtl',
        color: '#1f2937'
    },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)',
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
        background: 'linear-gradient(to right, #1e3a5f, #c9a227)',
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
        transition: 'transform 0.3s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
    },
    cardHeader: {
        height: '100px',
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        position: 'relative'
    },
    matchBadge: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'rgba(201, 162, 39, 0.3)',
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
        background: 'linear-gradient(to right, #1e3a5f, #2d4a6f)',
        color: 'white',
        border: 'none',
        padding: '12px',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(30, 58, 95, 0.3)',
        transition: 'transform 0.1s',
        width: '100%'
    },
    secondaryButton: {
        background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
        color: '#1a1a1a',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        cursor: 'pointer',
        width: '100%'
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
        border: '2px solid #1e3a5f',
        color: '#1e3a5f',
        padding: '10px 20px',
        borderRadius: '10px',
        fontWeight: 'bold',
        marginTop: '15px',
        cursor: 'pointer'
    },
    pendingApproval: {
        background: 'white',
        padding: '60px 40px',
        borderRadius: '25px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        maxWidth: '500px',
        margin: '40px auto'
    },
    // סגנונות דפדוף
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        marginTop: '40px',
        flexWrap: 'wrap'
    },
    pageNumbers: {
        display: 'flex',
        gap: '8px'
    },
    pageButton: {
        background: 'white',
        color: '#1e3a5f',
        border: '2px solid #1e3a5f',
        padding: '10px 18px',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    pageButtonActive: {
        background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
        color: '#1a1a1a',
        border: 'none',
        padding: '10px 18px',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(201, 162, 39, 0.4)'
    },
    pageButtonDisabled: {
        background: '#e5e7eb',
        color: '#9ca3af',
        border: 'none',
        padding: '10px 18px',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'not-allowed'
    }
};

export default Matches;