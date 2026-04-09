import API_BASE from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const isMobile = () => window.innerWidth < 700;

const STATUS_LABELS = {
    open: { label: 'חדש', color: '#dc2626', bg: '#fef2f2' },
    read: { label: 'נקרא', color: '#d97706', bg: '#fffbeb' },
    replied: { label: 'נענה', color: '#059669', bg: '#f0fdf4' },
    closed: { label: 'סגור', color: '#6b7280', bg: '#f8fafc' }
};

export default function AdminSupport() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // פנייה פתוחה
    const [replies, setReplies] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [mobileView, setMobileView] = useState('list'); // 'list' | 'thread'

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!token || !user.is_admin) { navigate('/login'); return; }
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/support/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setTickets(data);
        } catch {}
        setLoading(false);
    };

    const openTicket = async (ticket) => {
        setSelected(ticket);
        setReplyText('');
        if (isMobile()) setMobileView('thread');
        try {
            const res = await fetch(`${API_BASE}/admin/support/tickets/${ticket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSelected(data.ticket);
                setReplies(data.replies);
                // עדכון סטטוס ברשימה
                setTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, status: data.ticket.status } : t));
            }
        } catch {}
    };

    const sendReply = async () => {
        if (!replyText.trim()) return;
        setReplying(true);
        try {
            const res = await fetch(`${API_BASE}/admin/support/reply/${selected.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: replyText.trim() })
            });
            if (res.ok) {
                setReplies(r => [...r, { sender_type: 'admin', message: replyText.trim(), created_at: new Date().toISOString() }]);
                setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'replied' } : t));
                setSelected(s => ({ ...s, status: 'replied' }));
                setReplyText('');
            }
        } catch {}
        setReplying(false);
    };

    const updateStatus = async (ticketId, status) => {
        try {
            await fetch(`${API_BASE}/admin/support/tickets/${ticketId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            setTickets(ts => ts.map(t => t.id === ticketId ? { ...t, status } : t));
            if (selected?.id === ticketId) setSelected(s => ({ ...s, status }));
        } catch {}
    };

    const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);
    const openCount = tickets.filter(t => t.status === 'open').length;

    const mobile = isMobile();

    return (
        <div style={s.page}>
            <div style={{ ...s.layout, flexDirection: mobile ? 'column' : 'row' }}>
                {/* רשימת פניות */}
                <div style={{ ...s.sidebar, display: mobile && mobileView === 'thread' ? 'none' : 'flex', width: mobile ? '100%' : '320px', minWidth: mobile ? '100%' : '280px', height: mobile ? 'auto' : undefined, flex: mobile ? undefined : undefined }}>
                    <div style={s.sidebarHeader}>
                        <button onClick={() => navigate('/admin')} style={s.backBtn}>← חזרה</button>
                        <h2 style={s.sidebarTitle}>📬 פניות תמיכה</h2>
                        {openCount > 0 && <div style={s.badge}>{openCount} חדשות</div>}
                    </div>

                    {/* סינון סטטוס */}
                    <div style={s.filterRow}>
                        {['all', 'open', 'read', 'replied', 'closed'].map(st => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                style={{ ...s.filterBtn, background: filterStatus === st ? '#1e3a5f' : 'transparent', color: filterStatus === st ? '#fff' : '#64748b' }}
                            >
                                {st === 'all' ? 'הכל' : STATUS_LABELS[st]?.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={s.empty}>טוען...</div>
                    ) : filtered.length === 0 ? (
                        <div style={s.empty}>אין פניות</div>
                    ) : (
                        <div style={s.ticketList}>
                            {filtered.map(t => {
                                const st = STATUS_LABELS[t.status] || STATUS_LABELS.open;
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => openTicket(t)}
                                        style={{
                                            ...s.ticketItem,
                                            background: selected?.id === t.id ? '#f0f6ff' : '#fff',
                                            borderRight: selected?.id === t.id ? '4px solid #1e3a5f' : '4px solid transparent'
                                        }}
                                    >
                                        <div style={s.ticketTop}>
                                            <span style={s.ticketName}>{t.name}</span>
                                            <span style={{ ...s.statusBadge, color: st.color, background: st.bg }}>{st.label}</span>
                                        </div>
                                        <div style={s.ticketSubject}>{t.subject || 'ללא נושא'}</div>
                                        <div style={s.ticketMeta}>
                                            {new Date(t.created_at).toLocaleDateString('he-IL')}
                                            {t.reply_count > 0 && <span> · {t.reply_count} תגובות</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* תוכן פנייה */}
                <div style={{ ...s.main, display: mobile && mobileView === 'list' ? 'none' : undefined }}>
                    {!selected ? (
                        <div style={s.emptyMain}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                            <p style={{ color: '#94a3b8' }}>בחר פנייה מהרשימה</p>
                        </div>
                    ) : (
                        <div style={s.thread}>
                            {/* חזרה לרשימה — מובייל בלבד */}
                            {mobile && (
                                <button
                                    onClick={() => setMobileView('list')}
                                    style={{ background: 'none', border: 'none', color: '#1e3a5f', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', marginBottom: '12px', padding: 0 }}
                                >
                                    ← חזרה לרשימה
                                </button>
                            )}
                            {/* כותרת */}
                            <div style={s.threadHeader}>
                                <div>
                                    <h3 style={s.threadName}>{selected.subject || 'ללא נושא'}</h3>
                                    <div style={s.threadMeta}>
                                        <span>👤 {selected.name}</span>
                                        <span>📧 {selected.email}</span>
                                        {selected.phone && <span>📱 {selected.phone}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>סטטוס:</span>
                                    <select
                                        value={selected.status}
                                        onChange={e => updateStatus(selected.id, e.target.value)}
                                        style={s.statusSelect}
                                    >
                                        <option value="open">חדש</option>
                                        <option value="read">נקרא</option>
                                        <option value="replied">נענה</option>
                                        <option value="closed">סגור</option>
                                    </select>
                                </div>
                            </div>

                            {/* ההודעה המקורית */}
                            <div style={s.bubble_user}>
                                <div style={s.bubbleLabel}>📨 הפנייה המקורית · {new Date(selected.created_at).toLocaleString('he-IL')}</div>
                                <p style={s.bubbleText}>{selected.message}</p>
                            </div>

                            {/* שרשור תגובות */}
                            {replies.map((r, i) => (
                                <div key={i} style={r.sender_type === 'admin' ? s.bubble_admin : s.bubble_user}>
                                    <div style={s.bubbleLabel}>
                                        {r.sender_type === 'admin' ? '🛡️ תשובת מנהל' : '👤 ' + selected.name}
                                        {' · '}{new Date(r.created_at).toLocaleString('he-IL')}
                                    </div>
                                    <p style={s.bubbleText}>{r.message}</p>
                                </div>
                            ))}

                            {/* שדה תשובה */}
                            {selected.status !== 'closed' && (
                                <div style={s.replyBox}>
                                    <textarea
                                        style={s.replyInput}
                                        placeholder="כתוב תשובה... (תישלח למייל המשתמש ותופיע באתר אם הוא מחובר)"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        rows={4}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                        <button
                                            onClick={() => updateStatus(selected.id, 'closed')}
                                            style={s.closeBtn}
                                        >
                                            סגור פנייה
                                        </button>
                                        <button
                                            onClick={sendReply}
                                            disabled={replying || !replyText.trim()}
                                            style={s.sendBtn}
                                        >
                                            {replying ? 'שולח...' : '📤 שלח תשובה'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {selected.status === 'closed' && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '0.9rem' }}>
                                    הפנייה סגורה ·{' '}
                                    <button onClick={() => updateStatus(selected.id, 'open')} style={{ background: 'none', border: 'none', color: '#1e3a5f', cursor: 'pointer', fontWeight: 'bold' }}>
                                        פתח מחדש
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    layout: { display: 'flex', minHeight: '100vh' },

    sidebar: {
        width: '320px', minWidth: '280px',
        background: '#f8fafc', borderLeft: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', overflowY: 'auto'
    },
    sidebarHeader: {
        padding: '18px 16px 10px',
        borderBottom: '1px solid #e2e8f0'
    },
    backBtn: {
        background: 'none', border: 'none', color: '#64748b',
        cursor: 'pointer', fontSize: '0.9rem', padding: '0 0 8px'
    },
    sidebarTitle: { margin: '0 0 4px', color: '#1e3a5f', fontSize: '1.2rem' },
    badge: {
        display: 'inline-block', background: '#dc2626', color: '#fff',
        borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 'bold'
    },

    filterRow: {
        display: 'flex', gap: '4px', padding: '10px 14px',
        borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap'
    },
    filterBtn: {
        border: '1px solid #e2e8f0', borderRadius: '20px',
        padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer'
    },

    ticketList: { overflowY: 'auto', flex: 1 },
    ticketItem: {
        padding: '14px 16px', cursor: 'pointer',
        borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s'
    },
    ticketTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
    ticketName: { fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' },
    statusBadge: { fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '10px' },
    ticketSubject: { color: '#475569', fontSize: '0.85rem', marginBottom: '4px' },
    ticketMeta: { color: '#94a3b8', fontSize: '0.78rem' },
    empty: { textAlign: 'center', padding: '40px', color: '#94a3b8' },

    main: {
        flex: 1, overflowY: 'auto',
        background: '#fff'
    },
    emptyMain: {
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
    },

    thread: { padding: '16px', maxWidth: '700px', width: '100%', boxSizing: 'border-box' },
    threadHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '20px', gap: '10px', flexWrap: 'wrap'
    },
    threadName: { margin: '0 0 6px', color: '#1e3a5f', fontSize: '1.1rem' },
    threadMeta: { display: 'flex', gap: '14px', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' },

    statusSelect: {
        border: '1.5px solid #e2e8f0', borderRadius: '8px',
        padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer',
        fontFamily: "'Heebo', sans-serif"
    },

    bubble_user: {
        background: '#f8fafc', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '14px',
        border: '1px solid #e2e8f0'
    },
    bubble_admin: {
        background: '#eff6ff', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '14px',
        border: '1px solid #bfdbfe'
    },
    bubbleLabel: { fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' },
    bubbleText: { margin: 0, color: '#1e293b', lineHeight: '1.7', whiteSpace: 'pre-wrap' },

    replyBox: {
        marginTop: '20px', padding: '16px',
        background: '#f8fafc', borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    replyInput: {
        width: '100%', border: '1.5px solid #e2e8f0',
        borderRadius: '10px', padding: '12px',
        fontSize: '0.95rem', fontFamily: "'Heebo', sans-serif",
        resize: 'vertical', boxSizing: 'border-box'
    },
    sendBtn: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d5a8f)',
        color: '#fff', border: 'none', borderRadius: '10px',
        padding: '10px 24px', fontWeight: '700', cursor: 'pointer',
        fontSize: '0.95rem'
    },
    closeBtn: {
        background: 'transparent', border: '1.5px solid #e2e8f0',
        color: '#64748b', borderRadius: '10px',
        padding: '10px 20px', cursor: 'pointer', fontSize: '0.9rem'
    }
};
