import API_BASE from '../config';
import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';

export default function EmailReminderModal({ user, onUpdateUser }) {
    const [show, setShow] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [step, setStep] = useState('input'); // input | verify
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const hasShownThisSession = sessionStorage.getItem('email_reminder_shown');
        // קריאה מ-localStorage כדי לקבל ערך מעודכן (אחרי אימות מלינק)
        let storedUser = user;
        try {
            const parsed = JSON.parse(localStorage.getItem('user') || '{}');
            if (parsed && Object.keys(parsed).length) storedUser = parsed;
        } catch (_) {}
        const isVerified = storedUser?.is_email_verified === true;
        const shouldShow = storedUser && 
                          !storedUser.is_admin && 
                          !isVerified && 
                          storedUser.never_ask_email !== true &&
                          !hasShownThisSession;
        if (shouldShow) {
            const timer = setTimeout(() => {
                setShow(true);
                sessionStorage.setItem('email_reminder_shown', 'true');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleClose = () => {
        setShow(false);
        sessionStorage.setItem('email_reminder_shown', 'true');
    };

    if (!show) return null;

    const handleSendCode = async () => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast("נא להזין כתובת מייל תקינה", "warning");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/update-email-and-send-code`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("קוד אימות נשלח למייל שלך 📨", "success");
                setStep('verify');
            } else {
                showToast(data.message || "שגיאה בשליחת הקוד", "error");
            }
        } catch (err) {
            showToast("בעדת תקשורת", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
            showToast("נא להזין קוד בן 6 ספרות", "warning");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/verify-email`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("המייל אומת בהצלחה! 🎉", "success");
                // עדכון המשתמש ב-App
                const updatedUser = { ...user, email, is_email_verified: true };
                onUpdateUser(updatedUser);
                setShow(false);
            } else {
                showToast(data.message || "קוד שגוי", "error");
            }
        } catch (err) {
            showToast("בעיית תקשורת", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleNeverAsk = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/never-ask-email`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const updatedUser = { ...user, never_ask_email: true };
            onUpdateUser(updatedUser);
            setShow(false);
            showToast("הבנו, לא נשאל אותך יותר על מייל.", "info");
        } catch (err) {
            setShow(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button onClick={handleClose} style={styles.closeX}>✕</button>
                <div style={styles.icon}>📧</div>
                <h2 style={styles.title}>אימות כתובת מייל</h2>
                <p style={styles.text}>
                    מומלץ לאמת כתובת מייל כדי לקבל התראות על הודעות חדשות ושידוכים מתאימים בזמן אמת.
                </p>

                {step === 'input' ? (
                    <div style={styles.content}>
                        <input 
                            type="email" 
                            placeholder="הזן כתובת מייל..." 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                        />
                        <button onClick={handleSendCode} disabled={loading} style={styles.primaryBtn}>
                            {loading ? 'שולח...' : 'שלח קוד אימות'}
                        </button>
                    </div>
                ) : (
                    <div style={styles.content}>
                        <p style={styles.subText}>קוד נשלח ל-{email}</p>
                        <input 
                            type="text" 
                            placeholder="הזן קוד בן 6 ספרות..." 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            style={styles.input}
                            maxLength={6}
                        />
                        <button onClick={handleVerify} disabled={loading} style={styles.primaryBtn}>
                            {loading ? 'מאמת...' : 'אמת מייל'}
                        </button>
                        <button onClick={() => setStep('input')} style={styles.textBtn}>שינוי כתובת מייל</button>
                    </div>
                )}

                <div style={styles.footer}>
                    <button onClick={handleClose} style={styles.secondaryBtn}>אולי מאוחר יותר</button>
                    <button onClick={handleNeverAsk} style={styles.neverBtn}>לא מעוניין לעדכן מייל</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, backdropFilter: 'blur(4px)',
        direction: 'rtl'
    },
    modal: {
        backgroundColor: '#fff', padding: '30px', borderRadius: '20px',
        width: '90%', maxWidth: '450px', position: 'relative',
        textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
    },
    closeX: {
        position: 'absolute', top: '15px', right: '15px',
        background: 'none', border: 'none', fontSize: '20px',
        cursor: 'pointer', color: '#94a3b8'
    },
    icon: { fontSize: '50px', marginBottom: '15px' },
    title: { color: '#1e3a5f', margin: '0 0 10px', fontSize: '24px' },
    text: { color: '#64748b', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' },
    content: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
    input: {
        padding: '12px 15px', borderRadius: '10px',
        border: '1px solid #cbd5e1', fontSize: '16px', textAlign: 'center'
    },
    primaryBtn: {
        background: 'linear-gradient(135deg, #c9a227 0%, #a6851d 100%)',
        color: '#fff', border: 'none', padding: '12px',
        borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer',
        fontSize: '16px'
    },
    secondaryBtn: {
        background: '#f1f5f9', color: '#475569', border: 'none',
        padding: '10px 15px', borderRadius: '8px', cursor: 'pointer'
    },
    neverBtn: {
        background: 'transparent', color: '#94a3b8', border: 'none',
        fontSize: '13px', cursor: 'pointer', textDecoration: 'underline'
    },
    textBtn: {
        background: 'transparent', color: '#3b82f6', border: 'none',
        cursor: 'pointer', fontSize: '14px'
    },
    subText: { fontSize: '13px', color: '#94a3b8', margin: '-10px 0 0' },
    footer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }
};
