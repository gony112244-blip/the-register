import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Matches() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const token = localStorage.getItem('token');

    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch (e) { }

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [photoStatuses, setPhotoStatuses] = useState({}); // { userId: 'none'|'pending'|'approved' }
    const [requestingPhoto, setRequestingPhoto] = useState(null); // userId being requested
    const itemsPerPage = 6;

    useEffect(() => {
        if (!token || !user) { navigate('/login'); return; }
        if (!user.is_approved) { setLoading(false); return; }
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
                // Check photo access status for all matches
                data.forEach(m => checkPhotoStatus(m.id));
            } else {
                showToast("שגיאה בטעינת שידוכים", "error");
            }
        } catch (err) {
            showToast("תקלה בתקשורת", "error");
        } finally {
            setLoading(false);
        }
    };

    const checkPhotoStatus = async (targetId) => {
        try {
            const res = await fetch(`http://localhost:3000/check-photo-access/${targetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPhotoStatuses(prev => ({ ...prev, [targetId]: data.canView ? 'approved' : (data.status === 'pending' ? 'pending' : 'none') }));
        } catch { }
    };

    const handleRequestPhoto = async (targetId) => {
        setRequestingPhoto(targetId);
        try {
            const res = await fetch('http://localhost:3000/request-photo-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('📷 הבקשה נשלחה! תקבל הודעה כשיאשרו', 'success');
                setPhotoStatuses(prev => ({ ...prev, [targetId]: 'pending' }));
            } else {
                showToast(data.message || 'שגיאה', 'warning');
            }
        } catch {
            showToast('שגיאה בשליחת הבקשה', 'error');
        } finally {
            setRequestingPhoto(null);
        }
    };

    const handleConnect = async (targetId) => {
        try {
            const res = await fetch('http://localhost:3000/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ myId: user.id, targetId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`🎉 ${data.message}`, "success");
                setMatches(prev => prev.filter(m => m.id !== targetId));
            } else {
                showToast(`⚠️ ${data.message}`, "warning");
            }
        } catch {
            showToast("תקלה בתקשורת עם השרת", "error");
        }
    };

    const handleHideProfile = async (hiddenUserId) => {
        if (!window.confirm('להעביר את הפרופיל לסל המיחזור?')) return;
        setMatches(prev => prev.filter(m => m.id !== hiddenUserId));
        try {
            await fetch('http://localhost:3000/api/hide-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user.id, hiddenUserId })
            });
            showToast('הפרופיל הועבר לסל המיחזור 🗑️', 'info');
        } catch {
            showToast('שגיאה בהסתרה', 'error');
            fetchMatches();
        }
    };

    const indexOfLastMatch = currentPage * itemsPerPage;
    const currentMatches = matches.slice(indexOfLastMatch - itemsPerPage, indexOfLastMatch);
    const totalPages = Math.ceil(matches.length / itemsPerPage);

    if (loading) return (
        <div style={styles.page}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={styles.spinner} />
                <h2 style={{ color: '#fff' }}>מחפש שידוכים מתאימים...</h2>
            </div>
        </div>
    );

    if (user && !user.is_approved) return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={{ ...styles.card, textAlign: 'center', padding: '50px', maxWidth: '500px', margin: '50px auto' }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
                    <h2 style={{ color: '#1e3a5f' }}>הפרופיל שלך בבדיקה</h2>
                    <p style={{ color: '#6b7280', lineHeight: '1.8' }}>לאחר שנאמת את הפרטים שלך, תוכל לראות הצעות מתאימות.<br />בדרך כלל התהליך לוקח עד 24 שעות.</p>
                    <button onClick={() => navigate('/profile')} style={{ ...styles.connectBtn, marginTop: '20px' }}>לעדכון פרופיל</button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={styles.page}>
            {/* Top bar */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 10px', display: 'flex', justifyContent: 'flex-end', padding: '0 20px' }}>
                <button onClick={() => navigate('/hidden-profiles')} style={styles.ghostBtn}>🗑️ סל מחזור</button>
            </div>

            <div style={styles.container}>
                <h1 style={styles.title}>✨ הצעות שידוך</h1>
                <p style={styles.subtitle}>נמצאו {matches.length} התאמות פוטנציאליות</p>

                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'white', marginTop: '60px' }}>
                        <h2>לא נמצאו התאמות כרגע 😕</h2>
                        <p>נסה להרחיב את טווחי החיפוש בפרופיל שלך</p>
                        <button onClick={() => navigate('/profile')} style={{ ...styles.connectBtn, display: 'inline-block', width: 'auto', marginTop: '15px' }}>לעריכת פרופיל</button>
                    </div>
                ) : (
                    <>
                        <div style={styles.grid}>
                            {currentMatches.map((match) => {
                                const photoStatus = photoStatuses[match.id] || 'none';
                                const hasPhotos = match.profile_images_count > 0;

                                return (
                                    <div key={match.id} style={styles.card}>
                                        {/* Trash button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleHideProfile(match.id); }}
                                            style={styles.trashBtn}
                                            title="הסתר פרופיל"
                                        >🗑️</button>

                                        {/* Card image header */}
                                        <div style={styles.cardHeader}>
                                            {/* Match score badge */}
                                            <div style={styles.matchScore}>95% התאמה</div>

                                            {/* Avatar placeholder with blur hint */}
                                            <div style={styles.imageWrap}>
                                                {/* Always show avatar (placeholder) */}
                                                <img
                                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(match.full_name)}&background=1e3a5f&color=c9a227&size=300&bold=true&font-size=0.35`}
                                                    alt={match.full_name}
                                                    style={styles.image}
                                                />

                                                {/* Photo count badge — modern blur overlay */}
                                                {hasPhotos && photoStatus !== 'approved' && (
                                                    <div style={styles.photoHintOverlay}>
                                                        <div style={styles.photoBlurBadge}>
                                                            <span style={{ fontSize: '1.4rem' }}>📷</span>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{match.profile_images_count}</span>
                                                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>תמונות</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Approved: show count green */}
                                                {hasPhotos && photoStatus === 'approved' && (
                                                    <div style={{ ...styles.photoHintOverlay, background: 'linear-gradient(to top, rgba(21,128,61,0.7) 0%, transparent 60%)' }}>
                                                        <div style={{ ...styles.photoBlurBadge, background: 'rgba(21,128,61,0.9)', backdropFilter: 'blur(8px)' }}>
                                                            <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{match.profile_images_count} תמונות פתוחות</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card body */}
                                        <div style={styles.cardBody}>
                                            <h3 style={styles.name}>{match.full_name}{match.age ? `, ${match.age}` : ''}</h3>
                                            <p style={styles.detail}>📏 {match.height} ס"מ | {match.current_occupation || 'לא צוין עיסוק'}</p>
                                            <p style={styles.detail}>🛐 {match.heritage_sector} | {match.family_background}</p>

                                            <div style={styles.tags}>
                                                {match.body_type && <span style={styles.tag}>{match.body_type}</span>}
                                                {match.appearance && <span style={styles.tag}>{match.appearance}</span>}
                                            </div>

                                            {match.about_me && (
                                                <p style={styles.about}>"{match.about_me.substring(0, 60)}..."</p>
                                            )}
                                        </div>

                                        {/* Card footer */}
                                        <div style={styles.cardFooter}>
                                            {/* Photo request button */}
                                            {hasPhotos && photoStatus === 'none' && (
                                                <button
                                                    onClick={() => handleRequestPhoto(match.id)}
                                                    disabled={requestingPhoto === match.id}
                                                    style={styles.photoRequestBtn}
                                                >
                                                    {requestingPhoto === match.id ? '⏳ שולח...' : '📷 בקש תמונות'}
                                                </button>
                                            )}
                                            {hasPhotos && photoStatus === 'pending' && (
                                                <div style={styles.pendingPhotoBadge}>⏳ בקשת תמונות ממתינה לאישור</div>
                                            )}
                                            {!hasPhotos && (
                                                <div style={styles.noPhotoBadge}>📷 אין תמונות עדיין</div>
                                            )}

                                            <button onClick={() => handleConnect(match.id)} style={styles.connectBtn}>
                                                שלח פנייה
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={styles.pageBtn}>רשימה קודמת</button>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>עמוד {currentPage} מתוך {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={styles.pageBtn}>רשימה הבאה</button>
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
    container: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px' },
    spinner: {
        width: '50px', height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#c9a227', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    title: {
        textAlign: 'center', fontSize: '2.8rem', color: '#fff',
        marginBottom: '10px', fontWeight: '800',
        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
    },
    subtitle: { textAlign: 'center', color: '#e2e8f0', marginBottom: '40px', fontSize: '1.1rem' },
    ghostBtn: {
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
        color: 'white', padding: '8px 15px', borderRadius: '20px',
        cursor: 'pointer', fontSize: '0.9rem'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '28px', paddingBottom: '40px'
    },
    card: {
        background: '#fff', borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative', display: 'flex', flexDirection: 'column'
    },
    trashBtn: {
        position: 'absolute', top: '10px', right: '10px',
        background: 'rgba(255,255,255,0.85)', border: 'none',
        borderRadius: '50%', width: '34px', height: '34px',
        cursor: 'pointer', fontSize: '1.1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
    },
    cardHeader: { position: 'relative', height: '220px', overflow: 'hidden' },
    imageWrap: { width: '100%', height: '100%', position: 'relative' },
    image: { width: '100%', height: '100%', objectFit: 'cover' },
    photoHintOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(30,58,95,0.75) 0%, transparent 60%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '16px'
    },
    photoBlurBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(201,162,39,0.92)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px', padding: '6px 16px',
        color: '#fff', fontFamily: 'inherit'
    },
    matchScore: {
        position: 'absolute', top: '12px', left: '12px',
        background: 'rgba(34,197,94,0.9)', color: '#fff',
        padding: '5px 12px', borderRadius: '20px',
        fontWeight: 'bold', fontSize: '0.85rem',
        backdropFilter: 'blur(5px)', zIndex: 2
    },
    cardBody: { padding: '18px 20px', flex: 1 },
    name: { margin: '0 0 8px', fontSize: '1.5rem', color: '#1e3a5f', fontWeight: '800' },
    detail: { margin: '4px 0', color: '#64748b', fontSize: '0.95rem' },
    tags: { display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px', marginBottom: '12px' },
    tag: {
        background: '#f1f5f9', color: '#475569',
        padding: '4px 12px', borderRadius: '15px', fontSize: '0.82rem', fontWeight: '600'
    },
    about: { fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', fontStyle: 'italic' },
    cardFooter: {
        padding: '16px 20px',
        background: '#f8fafc', borderTop: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', gap: '10px'
    },
    photoRequestBtn: {
        padding: '10px',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: '#fff', border: 'none', borderRadius: '12px',
        fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem',
        boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        fontFamily: 'inherit'
    },
    pendingPhotoBadge: {
        padding: '10px', background: '#fef9ec',
        border: '1px solid #f59e0b', borderRadius: '12px',
        color: '#92400e', fontSize: '0.85rem',
        textAlign: 'center', fontWeight: '600'
    },
    noPhotoBadge: {
        padding: '8px', background: '#f1f5f9', borderRadius: '10px',
        color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center'
    },
    connectBtn: {
        background: 'linear-gradient(135deg, #c9a227 0%, #dda15e 100%)',
        color: '#fff', border: 'none', padding: '12px 20px',
        borderRadius: '12px', fontSize: '1rem', fontWeight: '700',
        cursor: 'pointer', width: '100%',
        boxShadow: '0 4px 15px rgba(201,162,39,0.3)',
        fontFamily: 'inherit'
    },
    pagination: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: '20px', marginTop: '40px'
    },
    pageBtn: {
        padding: '10px 20px', background: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
        borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'
    }
};

export default Matches;