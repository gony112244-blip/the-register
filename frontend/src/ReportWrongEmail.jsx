import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE from './config';

function ReportWrongEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const userId = searchParams.get('userId');
        if (!userId) { setStatus('error'); return; }
        fetch(`${API_BASE}/report-wrong-email?userId=${userId}`)
            .then(res => setStatus(res.ok ? 'success' : 'error'))
            .catch(() => setStatus('error'));
    }, []);

    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                {status === 'loading' && <><span style={iconStyle}>⏳</span><h2 style={titleStyle}>מעבד...</h2></>}
                {status === 'success' && (
                    <>
                        <span style={iconStyle}>✉️</span>
                        <h2 style={titleStyle}>האימייל הוסר מהמערכת</h2>
                        <p style={textStyle}>מצטערים על אי הנוחות. האימייל שלך הוסר ולא תקבל מאיתנו הודעות נוספות.</p>
                        <button onClick={() => navigate('/')} style={btnStyle}>חזרה לאתר</button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <span style={iconStyle}>❌</span>
                        <h2 style={titleStyle}>שגיאה</h2>
                        <p style={textStyle}>לא ניתן לעבד את הבקשה.</p>
                        <button onClick={() => navigate('/')} style={btnStyle}>חזרה לאתר</button>
                    </>
                )}
            </div>
        </div>
    );
}

const pageStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Heebo', sans-serif", direction: 'rtl' };
const cardStyle = { background: '#fff', borderRadius: '20px', padding: '50px 40px', textAlign: 'center', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderTop: '4px solid #c9a227' };
const iconStyle = { fontSize: '3rem', display: 'block', marginBottom: '16px' };
const titleStyle = { color: '#1e3a5f', fontSize: '1.6rem', fontWeight: '800', marginBottom: '12px' };
const textStyle = { color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' };
const btnStyle = { background: 'linear-gradient(135deg, #c9a227, #b08d1f)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 30px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' };

export default ReportWrongEmail;
