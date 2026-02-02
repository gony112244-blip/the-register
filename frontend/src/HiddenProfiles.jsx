import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function HiddenProfiles() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    const [hiddenProfiles, setHiddenProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchHiddenProfiles();
    }, [navigate, token]);

    const fetchHiddenProfiles = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/my-hidden-profiles?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setHiddenProfiles(data);
            } else {
                showToast('שגיאה בטעינת הנתונים', 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnhide = async (hiddenUserId) => {
        // הסרה אופטימית מהרשימה
        setHiddenProfiles(prev => prev.filter(p => p.id !== hiddenUserId));

        try {
            await fetch('http://localhost:3000/api/unhide-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, hiddenUserId })
            });
            showToast('הפרופיל שוחזר בהצלחה! 🎉', 'success');
        } catch (err) {
            showToast('שגיאה בשחזור', 'error');
            fetchHiddenProfiles(); // רענון למקרה כשל
        }
    };

    if (loading) return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2>טוען סל מחזור...</h2>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={() => navigate('/matches')} style={styles.backButton}>
                        חזרה לשידוכים ➜
                    </button>
                    <h1 style={styles.title}>🗑️ סל מחזור</h1>
                </div>

                {hiddenProfiles.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>😊</div>
                        <h2>סל המיחזור ריק</h2>
                        <p>כל ההצעות הטובות נמצאות בדף השידוכים</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {hiddenProfiles.map(profile => (
                            <div key={profile.id} style={styles.card}>
                                <img
                                    src={`https://ui-avatars.com/api/?name=${profile.full_name}&background=random&size=100`}
                                    alt={profile.full_name}
                                    style={styles.avatar}
                                />
                                <div style={styles.info}>
                                    <h3 style={styles.name}>{profile.full_name}, {profile.age}</h3>
                                    <p style={styles.details}>{profile.heritage_sector} • {profile.status}</p>
                                </div>
                                <button onClick={() => handleUnhide(profile.id)} style={styles.restoreButton}>
                                    ♻️ שחזר לרשימה
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '20px',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    container: { maxWidth: '800px', margin: '0 auto' },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white'
    },
    spinner: {
        width: '40px', height: '40px',
        border: '4px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        color: 'white'
    },
    title: { margin: 0, fontSize: '2rem' },
    backButton: {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '1rem'
    },
    emptyState: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.7)',
        marginTop: '100px',
        background: 'rgba(0,0,0,0.2)',
        padding: '40px',
        borderRadius: '20px'
    },
    grid: { display: 'flex', flexDirection: 'column', gap: '15px' },
    card: {
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        padding: '15px',
        borderRadius: '15px',
        gap: '15px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    },
    avatar: { width: '60px', height: '60px', borderRadius: '50%' },
    info: { flex: 1 },
    name: { margin: '0 0 5px', fontSize: '1.2rem', color: '#1e3a5f' },
    details: { margin: 0, color: '#64748b', fontSize: '0.9rem' },
    restoreButton: {
        background: '#22c55e',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem'
    }
};

export default HiddenProfiles;
