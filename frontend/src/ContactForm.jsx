import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactForm() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

    const [form, setForm] = useState({
        name: storedUser.full_name || '',
        email: storedUser.email || '',
        phone: storedUser.phone || '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            setError('נא למלא שם, מייל והודעה');
            return;
        }
        setLoading(true);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}/support/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (res.ok) {
                setSent(true);
            } else {
                setError(data.message || 'שגיאה בשליחה');
            }
        } catch {
            setError('בעיית תקשורת, נסה שוב');
        }
        setLoading(false);
    };

    if (sent) {
        return (
            <div style={s.page}>
                <div style={s.card}>
                    <div style={s.successIcon}>✅</div>
                    <h2 style={s.successTitle}>הפנייה נשלחה בהצלחה!</h2>
                    <p style={s.successText}>תודה שפנית אלינו. פנייתך נשמרה במערכת.</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setSent(false)} style={s.btnSecondary}>שלח פנייה נוספת</button>
                        {token && <button onClick={() => navigate(-1)} style={s.btnPrimary}>חזרה</button>}
                        {!token && <button onClick={() => navigate('/')} style={s.btnPrimary}>לדף הבית</button>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <div style={s.card}>
                <button onClick={() => navigate(-1)} style={s.back}>← חזרה</button>
                <h1 style={s.title}>📬 יצירת קשר</h1>
                <p style={s.subtitle}>
                    תקלה באתר, שאלה על השימוש או הצעה לשיפור.<br />
                    מלא את הפרטים ושלח — נחזור אליך בהקדם.
                </p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.row}>
                        <div style={s.field}>
                            <label style={s.label}>שם מלא *</label>
                            <input
                                style={s.input}
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="ישראל ישראלי"
                                required
                            />
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>כתובת מייל *</label>
                            <input
                                style={s.input}
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="example@gmail.com"
                                dir="ltr"
                                required
                            />
                        </div>
                    </div>

                    <div style={s.row}>
                        <div style={s.field}>
                            <label style={s.label}>טלפון</label>
                            <input
                                style={s.input}
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="050-0000000"
                                dir="ltr"
                            />
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>סוג פנייה</label>
                            <select
                                style={s.input}
                                name="subject"
                                value={form.subject}
                                onChange={handleChange}
                            >
                                <option value="">בחר סוג פנייה...</option>
                                <option value="תקלה טכנית">🔧 תקלה טכנית</option>
                                <option value="שאלה על האתר">❓ שאלה על האתר</option>
                                <option value="רעיון / שיפור">💡 רעיון או שיפור</option>
                                <option value="אחר">📝 אחר</option>
                            </select>
                        </div>
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>הודעה *</label>
                        <textarea
                            style={{ ...s.input, minHeight: '140px', resize: 'vertical' }}
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            placeholder="כתוב את פנייתך כאן..."
                            required
                        />
                    </div>

                    {error && <div style={s.error}>{error}</div>}

                    <button type="submit" disabled={loading} style={s.btnPrimary}>
                        {loading ? 'שולח...' : '📨 שלח פנייה'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '30px 20px',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    card: {
        maxWidth: '680px', margin: '0 auto',
        background: '#fff', borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
    },
    back: {
        background: 'none', border: 'none', color: '#64748b',
        cursor: 'pointer', fontSize: '0.95rem', marginBottom: '16px',
        padding: 0
    },
    title: { color: '#1e3a5f', fontSize: '1.8rem', margin: '0 0 6px' },
    subtitle: { color: '#64748b', margin: '0 0 28px', fontSize: '0.95rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { color: '#374151', fontWeight: '600', fontSize: '0.9rem' },
    input: {
        border: '1.5px solid #e2e8f0', borderRadius: '10px',
        padding: '11px 14px', fontSize: '0.95rem', outline: 'none',
        fontFamily: "'Heebo', sans-serif", width: '100%', boxSizing: 'border-box',
        color: '#1e293b'
    },
    error: {
        background: '#fef2f2', border: '1px solid #fecaca',
        color: '#dc2626', borderRadius: '8px',
        padding: '12px 16px', fontSize: '0.9rem'
    },
    btnPrimary: {
        background: 'linear-gradient(135deg, #c9a227, #b08d1f)',
        color: '#fff', border: 'none', borderRadius: '12px',
        padding: '14px 28px', fontSize: '1rem', fontWeight: '700',
        cursor: 'pointer', alignSelf: 'flex-start'
    },
    btnSecondary: {
        background: 'transparent', border: '2px solid #1e3a5f',
        color: '#1e3a5f', borderRadius: '12px',
        padding: '12px 24px', fontSize: '1rem', fontWeight: '600',
        cursor: 'pointer'
    },
    successIcon: { fontSize: '4rem', textAlign: 'center', marginBottom: '16px' },
    successTitle: { color: '#1e3a5f', textAlign: 'center', fontSize: '1.6rem', margin: '0 0 12px' },
    successText: { color: '#64748b', textAlign: 'center', margin: '0 0 28px', lineHeight: '1.7' }
};
