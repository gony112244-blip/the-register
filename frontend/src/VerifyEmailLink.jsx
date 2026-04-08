import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE from './config';

function VerifyEmailLink() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error

    useEffect(() => {
        const code = searchParams.get('code');
        const userId = searchParams.get('userId');

        if (!code || !userId) {
            setStatus('error');
            return;
        }

        fetch(`${API_BASE}/verify-email-link?code=${code}&userId=${userId}`)
            .then(res => {
                if (res.ok) {
                    // עדכון localStorage + הודעה ל-App כדי שלא יקפוץ ה-modal
                    try {
                        const user = JSON.parse(localStorage.getItem('user') || '{}');
                        user.is_email_verified = true;
                        localStorage.setItem('user', JSON.stringify(user));
                        window.dispatchEvent(new CustomEvent('userUpdated', { detail: user }));
                    } catch (_) {}
                    sessionStorage.setItem('email_reminder_shown', 'true');
                    // מעבר ישיר להשלמת פרופיל
                    setStatus('success');
                    setTimeout(() => navigate('/profile'), 1500);
                } else {
                    setStatus('error');
                }
            })
            .catch(() => setStatus('error'));
    }, []);

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                {status === 'loading' && (
                    <>
                        <span style={iconStyle}>⏳</span>
                        <h2 style={titleStyle}>מאמת את המייל...</h2>
                        <p style={textStyle}>נא להמתין</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <span style={iconStyle}>✅</span>
                        <h2 style={titleStyle}>המייל אומת בהצלחה!</h2>
                        <p style={textStyle}>מעבירים אותך להשלמת הפרופיל...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <span style={iconStyle}>❌</span>
                        <h2 style={titleStyle}>הקוד אינו תקין</h2>
                        <p style={textStyle}>הלינק פג תוקף או כבר שומש. ניתן לבקש קוד חדש מדף הפרופיל.</p>
                        <button onClick={() => navigate('/')} style={btnStyle}>
                            חזרה לאתר →
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Heebo', sans-serif",
    direction: 'rtl'
};

const cardStyle = {
    background: '#fff',
    borderRadius: '20px',
    padding: '50px 40px',
    textAlign: 'center',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    borderTop: '4px solid #c9a227'
};

const iconStyle = { fontSize: '3rem', display: 'block', marginBottom: '16px' };
const titleStyle = { color: '#1e3a5f', fontSize: '1.6rem', fontWeight: '800', marginBottom: '12px' };
const textStyle = { color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' };
const btnStyle = {
    background: 'linear-gradient(135deg, #c9a227, #b08d1f)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 30px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer'
};

export default VerifyEmailLink;
