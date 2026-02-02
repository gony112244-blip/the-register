import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Matches() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');

    // ניסיון לקרוא את המשתמש ולמנוע קריסה אם ה-JSON דפוק
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.error("User JSON error", e);
    }

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        if (!token || !user) {
            navigate('/login');
            return;
        }

        if (!user.is_approved) {
            setLoading(false); // כדי להציג את הודעת ההמתנה
            return;
        }

        fetchMatches();
    }, [navigate, token]);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:3000/matches?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setMatches(data);
            } else {
                showToast("שגיאה בטעינת שידוכים", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("תקלה בתקשורת", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (targetId) => {
        if (!user.gender) {
            showToast("חובה לעדכן מגדר בפרופיל כדי לקבל התאמות!", "error");
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ myId: user.id, targetId })
            });
            const data = await res.json();

            if (res.ok) {
                showToast(`🎉 ${data.message}`, "success");
                // הסרה מהרשימה כי כבר פניתי אליו
                setMatches(prev => prev.filter(m => m.id !== targetId));
            } else {
                showToast(`⚠️ ${data.message}`, "warning");
            }
        } catch (err) {
            showToast("תקלה בתקשורת עם השרת", "error");
        }
    };

    const handleHideProfile = async (hiddenUserId) => {
        if (!window.confirm('להעביר את הפרופיל לסל המיחזור?')) return;

        // הסרה אופטימית מהמסך
        setMatches(prev => prev.filter(m => m.id !== hiddenUserId));

        try {
            await fetch('http://localhost:3000/api/hide-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, hiddenUserId })
            });
            showToast('הפרופיל הועבר לסל המיחזור 🗑️', 'info');
        } catch (err) {
            console.error(err);
            showToast('שגיאה בהסתרה', 'error');
            fetchMatches(); // החזרה במקרה של שגיאה
        }
    };

    // דפדוף
    const indexOfLastMatch = currentPage * itemsPerPage;
    const indexOfFirstMatch = indexOfLastMatch - itemsPerPage;
    const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);
    const totalPages = Math.ceil(matches.length / itemsPerPage);

    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>מחפש שידוכים מתאימים...</h2>
        </div>
    );

    // אם המשתמש לא מאושר
    if (user && !user.is_approved) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
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
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* כפתור למעבר לסל המיחזור */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 10px', display: 'flex', justifyContent: 'flex-end', padding: '0 20px' }}>
                <button
                    onClick={() => navigate('/hidden-profiles')}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '8px 15px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    🗑️ סל מחזור
                </button>
            </div>

            <div style={styles.container}>
                <h1 style={styles.title}>💘 השידוכים שלי</h1>
                <p style={styles.subtitle}>נמצאו {matches.length} התאמות פוטנציאליות</p>

                {matches.length === 0 ? (
                    <div style={styles.emptyState}>
                        <h2>לא נמצאו התאמות כרגע 😕</h2>
                        <p>נסה להרחיב את טווחי החיפוש בפרופיל שלך</p>
                        <button onClick={() => navigate('/profile')} style={styles.editProfileBtn}>
                            לעריכת פרופיל
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={styles.grid}>
                            {currentMatches.map((match) => (
                                <div key={match.id} style={styles.card}>
                                    {/* כפתור הסתרה בפינה */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleHideProfile(match.id);
                                        }}
                                        style={styles.hideButton}
                                        title="הסתר פרופיל"
                                    >
                                        🗑️
                                    </button>

                                    <div style={styles.cardHeader}>
                                        <div style={styles.matchScore}>95% התאמה</div>
                                        <img
                                            src={match.profile_images_count > 0
                                                ? `http://localhost:3000/uploads/${match.id}_1.jpg`
                                                : `https://ui-avatars.com/api/?name=${match.full_name}&background=random&size=200`}
                                            alt={match.full_name}
                                            style={styles.image}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `https://ui-avatars.com/api/?name=${match.full_name}&background=random&size=200`;
                                            }}
                                        />
                                    </div>
                                    <div style={styles.cardBody}>
                                        <h3 style={styles.name}>{match.full_name}, {match.age}</h3>
                                        <p style={styles.detail}>📏 {match.height} ס"מ | {match.current_occupation || 'לא צוין עיסוק'}</p>
                                        <p style={styles.detail}>🛐 {match.heritage_sector} | {match.family_background}</p>

                                        <div style={styles.tags}>
                                            <span style={styles.tag}>{match.body_type}</span>
                                            <span style={styles.tag}>{match.appearance}</span>
                                        </div>

                                        <p style={styles.about}>{match.about_me ? `"${match.about_me.substring(0, 60)}..."` : ''}</p>
                                    </div>
                                    <div style={styles.cardFooter}>
                                        <button onClick={() => handleConnect(match.id)} style={styles.connectBtn}>
                                            💌 שלח הודעה
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button onClick={prevPage} disabled={currentPage === 1} style={styles.pageBtn}>רשימה קודמת</button>
                                <span style={styles.pageInfo}>עמוד {currentPage} מתוך {totalPages}</span>
                                <button onClick={nextPage} disabled={currentPage === totalPages} style={styles.pageBtn}>רשימה הבאה</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        fontFamily: "'Heebo', sans-serif",
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '20px 0',
        direction: 'rtl'
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
    },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        color: 'white'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    title: {
        textAlign: 'center',
        fontSize: '3rem',
        color: '#fff',
        marginBottom: '10px',
        fontWeight: '800',
        textShadow: '0 2px 10px rgba(0,0,0,0.2)'
    },
    subtitle: {
        textAlign: 'center',
        color: '#e2e8f0',
        marginBottom: '40px',
        fontSize: '1.2rem'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '30px',
        paddingBottom: '40px'
    },
    card: {
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: 'default',
        position: 'relative', // בשביל כפתור ההסתרה
        display: 'flex',
        flexDirection: 'column'
    },
    hideButton: {
        position: 'absolute',
        top: '10px',
        right: '10px', // צד ימין כי זה כפתור פעולה משני
        background: 'rgba(255, 255, 255, 0.8)',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        cursor: 'pointer',
        fontSize: '1.2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'all 0.2s',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    cardHeader: {
        position: 'relative',
        height: '220px',
        overflow: 'hidden'
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.5s ease'
    },
    matchScore: {
        position: 'absolute',
        top: '15px',
        left: '15px',
        background: 'rgba(34, 197, 94, 0.9)',
        color: '#fff',
        padding: '6px 14px',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        backdropFilter: 'blur(5px)',
        zIndex: 2
    },
    cardBody: {
        padding: '20px',
        flex: 1
    },
    name: {
        margin: '0 0 10px',
        fontSize: '1.6rem',
        color: '#1e3a5f',
        fontWeight: '700'
    },
    detail: {
        margin: '5px 0',
        color: '#64748b',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    tags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '15px',
        marginBottom: '15px'
    },
    tag: {
        background: '#f1f5f9',
        color: '#475569',
        padding: '5px 12px',
        borderRadius: '15px',
        fontSize: '0.85rem',
        fontWeight: '600'
    },
    about: {
        fontSize: '0.95rem',
        color: '#94a3b8',
        lineHeight: '1.6',
        fontStyle: 'italic',
        marginBottom: '0'
    },
    cardFooter: {
        padding: '20px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center'
    },
    connectBtn: {
        background: 'linear-gradient(135deg, #c9a227 0%, #dda15e 100%)',
        color: '#fff',
        border: 'none',
        padding: '12px 30px',
        borderRadius: '12px',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s',
        boxShadow: '0 4px 15px rgba(201, 162, 39, 0.3)'
    },
    pendingApproval: {
        background: '#fff',
        padding: '50px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '50px auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
    },
    outlineButton: {
        background: 'transparent',
        border: '2px solid #1e3a5f',
        color: '#1e3a5f',
        padding: '10px 25px',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    editProfileBtn: {
        background: '#c9a227',
        color: 'white',
        border: 'none',
        padding: '12px 25px',
        borderRadius: '10px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '15px'
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        marginTop: '40px'
    },
    pageBtn: {
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold'
    },
    pageInfo: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1.1rem'
    },
    emptyState: {
        textAlign: 'center',
        color: 'white',
        marginTop: '50px'
    }
};

export default Matches;