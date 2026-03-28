import API_BASE from './config';
import { useState } from 'react';

const ACTION_LABELS = {
    registered:              { icon: '📝', text: 'נרשם לאתר' },
    email_verified:          { icon: '✅', text: 'אימת כתובת מייל' },
    profile_approved:        { icon: '🎉', text: 'פרופיל אושר' },
    connection_sent:         { icon: '📩', text: 'שלח פנייה ל' },
    connection_approved:     { icon: '✅', text: 'אישר פנייה של' },
    connection_got_approved: { icon: '🎉', text: 'הפנייה שלו/ה אושרה ע"י' },
    connection_rejected:     { icon: '❌', text: 'דחה פנייה של' },
    connection_cancelled:    { icon: '↩️', text: 'ביטל פנייה / שידוך' },
    photo_requested:         { icon: '📷', text: 'ביקש תמונות מ' },
    photo_approved:          { icon: '📷✅', text: 'אישר תמונות ל' },
    photo_rejected:          { icon: '📷❌', text: 'דחה בקשת תמונות של' },
    match_sent_to_shadchan:  { icon: '💍', text: 'כרטיסיות נשלחו לשדכנית' },
    inquiry_ended:           { icon: '📋', text: 'בירור הסתיים' },
    match_hidden:            { icon: '🗑️', text: 'הסתיר הצעה —' },
    match_restored:          { icon: '♻️', text: 'שחזר הצעה של' },
    user_blocked:            { icon: '🚫', text: 'חסם משתמש:' },
    user_unblocked:          { icon: '🔓', text: 'ביטל חסימה של' },
    admin_blocked_user:      { icon: '🔒', text: 'מנהל חסם חשבון' },
    admin_unblocked_user:    { icon: '🔓', text: 'מנהל שחרר חשבון' },
    admin_deleted_user:      { icon: '🗑️', text: 'מנהל מחק משתמש' },
};

const fmtDate = (d) =>
    new Date(d).toLocaleString('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

export default function AdminUserHistory({ userId, userName, onClose, inline = false }) {
    const token = localStorage.getItem('token');
    const [events, setEvents] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const fetchHistory = async () => {
        if (loaded) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/user-activity/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setEvents(Array.isArray(data) ? data : []);
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
            setLoaded(true);
        }
    };

    if (!loaded && !loading) fetchHistory();

    const containerStyle = inline
        ? { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', direction: 'rtl', fontFamily: "'Heebo','Segoe UI',sans-serif" }
        : s.overlay;
    const innerStyle = inline ? { width: '100%' } : s.panel;

    const content = (
        <div style={innerStyle} onClick={inline ? undefined : e => e.stopPropagation()}>
            <div style={s.header}>
                <div>
                    <h2 style={s.title}>📋 לוג פעילות</h2>
                    {!inline && <p style={s.sub}>{userName}</p>}
                </div>
                {!inline && <button onClick={onClose} style={s.closeBtn}>✕</button>}
            </div>

                {loading && (
                    <div style={s.center}>
                        <div style={s.spinner} />
                        <p style={{ color: '#64748b', marginTop: 12 }}>טוען...</p>
                    </div>
                )}

                {!loading && events && events.length === 0 && (
                    <div style={s.center}>
                        <p style={{ color: '#9ca3af', fontSize: '1rem' }}>אין פעילות מתועדת עדיין</p>
                    </div>
                )}

                {!loading && events && events.length > 0 && (
                    <div style={s.timeline}>
                        {events.map((ev) => {
                            const lbl = ACTION_LABELS[ev.action] || { icon: '•', text: ev.action };
                            const hasTarget = ev.target_name;
                            const hasNote = ev.note;
                            const hasActor = ev.actor_name;

                            return (
                                <div key={ev.id} style={s.row}>
                                    <div style={s.iconCol}>
                                        <span style={s.icon}>{lbl.icon}</span>
                                        <div style={s.line} />
                                    </div>
                                    <div style={s.content}>
                                        <div style={s.actionText}>
                                            {lbl.text}
                                            {hasTarget && <strong style={{ marginRight: 4 }}>{ev.target_name}</strong>}
                                            {hasNote && <span style={s.note}> — {ev.note}</span>}
                                        </div>
                                        <div style={s.meta}>
                                            {fmtDate(ev.created_at)}
                                            {hasActor && <span style={s.actor}> · על ידי {ev.actor_name}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );

    if (inline) return <div style={containerStyle}>{content}</div>;
    return <div style={s.overlay} onClick={onClose}>{content}</div>;
}

const s = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 3000, padding: '30px 16px', overflowY: 'auto'
    },
    panel: {
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560,
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', direction: 'rtl',
        fontFamily: "'Heebo','Segoe UI',sans-serif", maxHeight: '80vh',
        display: 'flex', flexDirection: 'column'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '22px 24px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0
    },
    title: { color: '#1e3a5f', margin: 0, fontSize: '1.25rem', fontWeight: 800 },
    sub: { color: '#64748b', margin: '4px 0 0', fontSize: '0.9rem' },
    closeBtn: {
        background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 12px',
        cursor: 'pointer', fontSize: '1rem', color: '#64748b', fontFamily: 'inherit'
    },
    center: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px'
    },
    spinner: {
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f',
        animation: 'spin 0.8s linear infinite'
    },
    timeline: { padding: '12px 24px 24px', overflowY: 'auto', flex: 1 },
    row: { display: 'flex', gap: 14, marginBottom: 4 },
    iconCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
    icon: { fontSize: '1.2rem', lineHeight: 1, marginBottom: 4 },
    line: { width: 2, flex: 1, background: '#e2e8f0', minHeight: 16 },
    content: { paddingBottom: 16, flex: 1 },
    actionText: { color: '#1e3a5f', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 },
    note: { color: '#6b7280', fontWeight: 400 },
    meta: { color: '#9ca3af', fontSize: '0.78rem', marginTop: 2 },
    actor: { color: '#c9a227' }
};
