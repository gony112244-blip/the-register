import { useState, useEffect } from 'react';
import API_BASE from '../config';

/** תוקף ההודעה — 3 חודשים מיום ההשקה */
const EXPIRY_DATE = new Date('2026-07-19');

export default function WelcomeModal({ user }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!user || user.is_admin) return;
        if (new Date() > EXPIRY_DATE) return;
        if (user.welcome_seen) return;  // כבר ראה — DB אומר לא להציג

        const t = setTimeout(() => setShow(true), 1200);
        return () => clearTimeout(t);
    }, [user]);

    const handleClose = () => {
        setShow(false);
        // שמירה בDB — לא תלוי במכשיר/דפדפן
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_BASE}/mark-welcome-seen`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
        }
    };

    if (!show) return null;

    return (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={s.modal}>
                <button onClick={handleClose} style={s.closeX} aria-label="סגור">✕</button>

                <p style={s.bsd}>בסייעתא דשמיא</p>
                <div style={s.sparkles}>✨</div>
                <h2 style={s.title}>ברוכים הבאים ל"פנקס"!</h2>
                <p style={s.subtitle}>שמחים שהצטרפתם — ממש שמחים.</p>

                <div style={s.divider} />

                <div style={s.section}>
                    <span style={s.sectionIcon}>🛠️</span>
                    <div>
                        <strong style={s.sectionTitle}>האתר בימי ההשקה הראשונים</strong>
                        <p style={s.sectionText}>
                            בנינו אותו בלב ובנשמה ועשינו את המיטב כדי שיהיה מדויק ונוח.
                            ייתכן שיצוצו גם תקלות קטנות בדרך —
                            כל הערה ומשוב שתשלחו יעזרו לנו להשתפר.
                        </p>
                    </div>
                </div>

                <div style={s.section}>
                    <span style={s.sectionIcon}>🔒</span>
                    <div>
                        <strong style={s.sectionTitle}>בתחילה תראו מעט הצעות — וזה בסדר גמור</strong>
                        <p style={s.sectionText}>
                            המערכת שומרת על פרטיות מלאה: היא לא מציגה אתכם לכל אחד,
                            אלא רק למי שמתאים ברצינות. בדיוק כפי שאתם לא רואים את כולם —
                            כך גם עליכם שומרים. ככל שיצטרפו יותר אנשים, כך יגדלו גם ההזדמנויות.
                        </p>
                    </div>
                </div>

                <div style={s.section}>
                    <span style={s.sectionIcon}>📢</span>
                    <div>
                        <strong style={s.sectionTitle}>מכירים מישהו שמחפש?</strong>
                        <p style={s.sectionText}>
                            שיתוף הקישור עם חברים ובני משפחה עוזר לכולם — גם לכם.
                            כל הצטרפות חדשה מגדילה את הסיכוי למציאת ההתאמה הנכונה.
                        </p>
                    </div>
                </div>

                <button onClick={handleClose} style={s.primaryBtn}>
                    בואו נתחיל! 🚀
                </button>

                <p style={s.footNote}>
                    יש שאלה או הערה?{' '}
                    <a href="/contact" style={s.footLink} onClick={handleClose}>
                        צרו קשר
                    </a>
                    {' '}— נשמח לשמוע.
                </p>
            </div>
        </div>
    );
}

const s = {
    overlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15,23,42,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10001, backdropFilter: 'blur(6px)',
        direction: 'rtl', padding: '16px',
    },
    modal: {
        backgroundColor: '#fff', borderRadius: '24px',
        width: '100%', maxWidth: '480px',
        padding: '36px 32px 28px',
        position: 'relative', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        maxHeight: '90vh', overflowY: 'auto',
    },
    closeX: {
        position: 'absolute', top: '16px', right: '16px',
        background: '#f1f5f9', border: 'none',
        width: '32px', height: '32px', borderRadius: '50%',
        fontSize: '14px', cursor: 'pointer', color: '#64748b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    bsd: {
        margin: '0 0 8px', fontSize: '13px', fontWeight: '600',
        color: '#a6851d', letterSpacing: '0.05em',
        fontStyle: 'italic',
    },
    sparkles: { fontSize: '44px', lineHeight: 1, marginBottom: '10px' },
    title: {
        margin: '0 0 6px', fontSize: '26px', fontWeight: '800',
        color: '#1e3a5f',
    },
    subtitle: {
        margin: '0 0 20px', fontSize: '16px', color: '#64748b',
    },
    divider: {
        height: '1px', background: '#e2e8f0', margin: '0 0 20px',
    },
    section: {
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        textAlign: 'right', marginBottom: '18px',
    },
    sectionIcon: { fontSize: '22px', flexShrink: 0, marginTop: '2px' },
    sectionTitle: {
        display: 'block', fontSize: '15px', fontWeight: '700',
        color: '#1e3a5f', marginBottom: '4px',
    },
    sectionText: {
        margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6',
    },
    primaryBtn: {
        width: '100%', padding: '14px',
        background: 'linear-gradient(135deg, #c9a227 0%, #a6851d 100%)',
        color: '#fff', border: 'none', borderRadius: '14px',
        fontSize: '17px', fontWeight: '700', cursor: 'pointer',
        marginTop: '8px', marginBottom: '14px',
        boxShadow: '0 4px 15px rgba(201,162,39,0.4)',
    },
    footNote: { margin: 0, fontSize: '13px', color: '#94a3b8' },
    footLink: { color: '#c9a227', fontWeight: '600', textDecoration: 'none' },
};
