import API_BASE from '../config';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';

// פונקציה שמחשבת את מצב המייל
function getEmailStatus(user) {
    if (!user?.email) return 'none';          // אין מייל
    if (!user?.is_email_verified) return 'unverified'; // יש מייל, לא מאומת
    if (!user?.email_notifications_enabled) return 'off'; // מאומת, התראות כבויות
    return 'active';                          // מאומת + התראות פועלות
}

function getPhoneStatus(user) {
    return user?.phone ? 'active' : 'none';
}

// צבעי נקודת סטטוס
const DOT_COLORS = {
    active: '#22c55e',
    unverified: '#f59e0b',
    off: '#94a3b8',
    none: '#64748b',
};

const DOT_TITLES = {
    email: {
        active: 'מייל מאומת — התראות פועלות',
        unverified: 'מייל לא מאומת',
        off: 'התראות מייל כבויות',
        none: 'לא הוגדר מייל',
    },
    phone: {
        active: 'מספר טלפון מעודכן',
        none: 'לא הוגדר מספר טלפון',
    }
};

export default function NotificationsPanel({ user, onUserUpdate }) {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [open, setOpen] = useState(null); // 'email' | 'phone' | null
    const panelRef = useRef(null);

    // --- Email states ---
    const [emailInput, setEmailInput] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [emailStep, setEmailStep] = useState('main'); // 'main' | 'verify' | 'edit'
    const [loading, setLoading] = useState(false);

    // --- Phone states ---
    const [phoneInput, setPhoneInput] = useState('');
    const [phoneLoading, setPhoneLoading] = useState(false);

    const emailStatus = getEmailStatus(user);
    const phoneStatus = getPhoneStatus(user);

    // סגירה בלחיצה מחוץ לפאנל
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // איפוס state כשפותחים פאנל
    const openPanel = (type) => {
        if (open === type) { setOpen(null); return; }
        setOpen(type);
        setEmailInput(user?.email || '');
        setEmailStep('main');
        setCodeInput('');
        setPhoneInput(user?.phone || '');
    };

    // ========================
    // פעולות מייל
    // ========================

    const handleSendCode = async () => {
        const emailToSend = emailInput.trim();
        if (!emailToSend || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSend)) {
            showToast('נא להזין כתובת מייל תקינה', 'warning');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/update-email-and-send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ email: emailToSend })
            });
            const data = await res.json();
            if (res.ok) {
                const updated = { ...user, email: emailToSend, is_email_verified: false };
                onUserUpdate(updated);
                setEmailStep('verify');
                // דחיית ה-Toast למחזור הבא — מונע קריסת React (removeChild) עם שינוי מצב הדף
                queueMicrotask(() => showToast('קוד אימות נשלח למייל שלך 📨', 'success'));
            } else {
                showToast(data.message || 'שגיאה בשליחת הקוד', 'error');
            }
        } catch { showToast('בעיית תקשורת', 'error'); }
        finally { setLoading(false); }
    };

    const handleVerifyCode = async () => {
        if (codeInput.length !== 6) { showToast('נא להזין קוד בן 6 ספרות', 'warning'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ code: codeInput })
            });
            const data = await res.json();
            if (res.ok) {
                const updated = { ...user, is_email_verified: true, email_notifications_enabled: true };
                onUserUpdate(updated);
                setEmailStep('main');
                setCodeInput('');
                queueMicrotask(() => showToast('המייל אומת בהצלחה! ✅', 'success'));
            } else {
                showToast(data.message || 'קוד שגוי', 'error');
            }
        } catch { showToast('בעיית תקשורת', 'error'); }
        finally { setLoading(false); }
    };

    const handleToggleNotifications = async () => {
        const newVal = !user?.email_notifications_enabled;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/toggle-email-notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ enabled: newVal })
            });
            if (res.ok) {
                showToast(newVal ? 'התראות מייל הופעלו ✅' : 'התראות מייל כובו', newVal ? 'success' : 'info');
                onUserUpdate({ ...user, email_notifications_enabled: newVal });
            }
        } catch { showToast('בעיית תקשורת', 'error'); }
        finally { setLoading(false); }
    };

    // ========================
    // פעולות טלפון
    // ========================

    const handleUpdatePhone = async () => {
        const clean = phoneInput.replace(/\D/g, '').trim();
        if (!clean) { showToast('נא להזין מספר טלפון', 'warning'); return; }
        setPhoneLoading(true);
        try {
            const res = await fetch(`${API_BASE}/update-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ phone: clean })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('מספר הטלפון עודכן ✅', 'success');
                onUserUpdate({ ...user, phone: data.phone || clean });
                setOpen(null);
            } else {
                showToast(data.message || 'שגיאה', 'error');
            }
        } catch { showToast('בעיית תקשורת', 'error'); }
        finally { setPhoneLoading(false); }
    };

    if (!user || user.is_admin) return null;

    return (
        <div ref={panelRef} style={S.wrap}>

            {/* --- כפתורי אייקון --- */}
            <button
                onClick={() => openPanel('email')}
                title={DOT_TITLES.email[emailStatus]}
                style={{ ...S.iconBtn, background: open === 'email' ? 'rgba(201,162,39,0.15)' : 'transparent' }}
            >
                <span style={S.iconChar}>📧</span>
                <span style={{ ...S.dot, background: DOT_COLORS[emailStatus] }} />
            </button>

            <button
                onClick={() => openPanel('phone')}
                title={DOT_TITLES.phone[phoneStatus]}
                style={{ ...S.iconBtn, background: open === 'phone' ? 'rgba(201,162,39,0.15)' : 'transparent' }}
            >
                <span style={S.iconChar}>📱</span>
                <span style={{ ...S.dot, background: DOT_COLORS[phoneStatus] }} />
            </button>

            <button
                onClick={() => navigate('/contact')}
                title="יצירת קשר עם הצוות"
                style={{ ...S.iconBtn, background: 'transparent' }}
            >
                <span style={S.iconChar}>✉️</span>
            </button>

            {/* --- פאנל מייל --- */}
            {open === 'email' && (
                <div style={S.panel}>
                    <div style={S.panelHeader}>
                        <span style={S.panelTitle}>📧 הגדרות מייל</span>
                        <button onClick={() => setOpen(null)} style={S.closeBtn}>✕</button>
                    </div>

                    {/* מצב נוכחי */}
                    <div style={S.statusRow}>
                        <span style={{ ...S.badge, background: emailStatus === 'active' ? '#dcfce7' : emailStatus === 'none' ? '#f1f5f9' : '#fef3c7', color: emailStatus === 'active' ? '#166534' : emailStatus === 'none' ? '#64748b' : '#92400e' }}>
                            {emailStatus === 'active' ? '✓ מאומת ופעיל' : emailStatus === 'unverified' ? '⚠ לא מאומת' : emailStatus === 'off' ? '🔕 כבוי' : '— לא הוגדר'}
                        </span>
                        {user?.email && <span style={S.emailText}>{user.email}</span>}
                    </div>

                    <div key={emailStep} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* toggle התראות (רק אם מאומת) */}
                    {user?.email && user?.is_email_verified && emailStep === 'main' && (
                        <div style={S.toggleRow}>
                            <span style={S.toggleLabel}>קבל התראות במייל</span>
                            <button
                                onClick={handleToggleNotifications}
                                disabled={loading}
                                style={{ ...S.toggle, background: user?.email_notifications_enabled ? '#22c55e' : '#cbd5e1' }}
                            >
                                <span style={{ ...S.toggleThumb, transform: user?.email_notifications_enabled ? 'translateX(-20px)' : 'translateX(0)' }} />
                            </button>
                        </div>
                    )}

                    {/* אימות (אם לא מאומת) */}
                    {user?.email && !user?.is_email_verified && emailStep === 'main' && (
                        <button onClick={handleSendCode} disabled={loading} style={S.actionBtn}>
                            {loading ? 'שולח...' : '📨 שלח קוד אימות'}
                        </button>
                    )}

                    {/* הזנת קוד */}
                    {emailStep === 'verify' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p style={S.hint}>קוד נשלח ל-{user?.email || emailInput}</p>
                            <input
                                type="text"
                                placeholder="_ _ _ _ _ _"
                                value={codeInput}
                                onChange={e => setCodeInput(e.target.value.replace(/\D/g,'').slice(0,6))}
                                style={{ ...S.input, textAlign: 'center', letterSpacing: 8, fontWeight: 800 }}
                                maxLength={6}
                                dir="ltr"
                            />
                            <button onClick={handleVerifyCode} disabled={loading || codeInput.length !== 6} style={S.actionBtn}>
                                {loading ? 'בודק...' : '✅ אמת קוד'}
                            </button>
                            <button onClick={() => setEmailStep('main')} style={S.textLink}>← חזרה</button>
                        </div>
                    )}

                    {/* עריכת מייל */}
                    {emailStep === 'edit' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                style={S.input}
                                dir="ltr"
                            />
                            <button onClick={handleSendCode} disabled={loading} style={S.actionBtn}>
                                {loading ? 'שולח...' : '📨 שלח קוד לאימות'}
                            </button>
                            <button onClick={() => setEmailStep('main')} style={S.textLink}>← ביטול</button>
                        </div>
                    )}

                    {/* קישור עדכון מייל (כשלא עורכים) */}
                    {emailStep === 'main' && (
                        <button onClick={() => { setEmailStep('edit'); setEmailInput(user?.email || ''); }} style={{ ...S.textLink, marginTop: 10 }}>
                            ✏️ {user?.email ? 'עדכן כתובת מייל' : '+ הוסף כתובת מייל'}
                        </button>
                    )}
                    </div>
                </div>
            )}

            {/* --- פאנל טלפון --- */}
            {open === 'phone' && (
                <div style={S.panel}>
                    <div style={S.panelHeader}>
                        <span style={S.panelTitle}>📱 הגדרות טלפון</span>
                        <button onClick={() => setOpen(null)} style={S.closeBtn}>✕</button>
                    </div>

                    <div style={S.statusRow}>
                        <span style={{ ...S.badge, background: phoneStatus === 'active' ? '#dcfce7' : '#f1f5f9', color: phoneStatus === 'active' ? '#166534' : '#64748b' }}>
                            {phoneStatus === 'active' ? '✓ מחובר' : '— לא הוגדר'}
                        </span>
                        {user?.phone && <span style={S.emailText} dir="ltr">{user.phone}</span>}
                    </div>

                    <p style={S.hint}>הטלפון משמש להתחברות ולשחזור סיסמה בשיחה קולית.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        <label style={S.label}>עדכן מספר טלפון</label>
                        <input
                            type="tel"
                            placeholder="0501234567"
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            style={S.input}
                            dir="ltr"
                        />
                        <button onClick={handleUpdatePhone} disabled={phoneLoading || !phoneInput.trim()} style={S.actionBtn}>
                            {phoneLoading ? 'מעדכן...' : '💾 שמור מספר'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    wrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    iconBtn: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 8,
        padding: '6px 8px',
        transition: 'background 0.2s',
    },
    iconChar: {
        fontSize: 16,
        lineHeight: 1,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.6)',
        flexShrink: 0,
    },
    panel: {
        position: 'absolute',
        top: 'calc(100% + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 280,
        maxWidth: '90vw',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
        padding: '16px 18px',
        zIndex: 9999,
        direction: 'rtl',
        border: '1px solid #e2e8f0',
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    panelTitle: {
        fontWeight: 700,
        fontSize: 15,
        color: '#1e3a5f',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        padding: 2,
    },
    statusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    badge: {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
    },
    emailText: {
        fontSize: 12,
        color: '#64748b',
        wordBreak: 'break-all',
    },
    toggleRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        marginBottom: 10,
    },
    toggleLabel: {
        fontSize: 14,
        color: '#334155',
        fontWeight: 500,
    },
    toggle: {
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.2s',
        padding: 0,
        flexShrink: 0,
    },
    toggleThumb: {
        position: 'absolute',
        top: 3,
        right: 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'transform 0.2s',
        display: 'block',
    },
    actionBtn: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d5a8f)',
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '10px 14px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
    },
    input: {
        padding: '9px 12px',
        borderRadius: 9,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        width: '100%',
        boxSizing: 'border-box',
        background: '#f8fafc',
    },
    textLink: {
        background: 'none',
        border: 'none',
        color: '#3b82f6',
        fontSize: 13,
        cursor: 'pointer',
        padding: 0,
        textAlign: 'right',
    },
    hint: {
        fontSize: 12,
        color: '#94a3b8',
        margin: '4px 0',
        lineHeight: 1.5,
    },
    label: {
        fontSize: 13,
        color: '#475569',
        fontWeight: 600,
    },
};
