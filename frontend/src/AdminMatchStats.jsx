import API_BASE from './config';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTOR_LABELS = {
    ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני',
    haredi: 'חרדי', dati_leumi: 'דתי לאומי', mixed: 'מעורב', other: 'אחר'
};

const ERROR_LABELS = {
    profile_not_approved: 'פרופיל לא מאושר',
    user_not_found: 'לא נמצא בDB',
    profile_not_completed: 'פרופיל לא הושלם',
    no_search_criteria: 'אין קריטריוני חיפוש',
    invalid: 'נתונים חסרים',
};

function AdminMatchStats() {
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | zero | many | error
    const [sortBy, setSortBy] = useState('count_asc'); // count_asc | count_desc | name
    const [expanded, setExpanded] = useState(null); // userId of expanded row
    const [matchesCache, setMatchesCache] = useState({}); // userId -> matches list
    const [loadingUserId, setLoadingUserId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (!token || !user?.is_admin) { navigate('/login'); return; }
        loadStats(token);
    }, [navigate]);

    const loadStats = async (token) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/match-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) setStats(data);
        } catch (err) {
            console.error('match-stats load error', err);
        }
        setLoading(false);
    };

    const handleExpand = async (userId) => {
        if (expanded === userId) {
            setExpanded(null);
            return;
        }
        setExpanded(userId);
        if (matchesCache[userId]) return; // already loaded

        const token = localStorage.getItem('token');
        setLoadingUserId(userId);
        try {
            const res = await fetch(`${API_BASE}/admin/match-stats/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMatchesCache(prev => ({ ...prev, [userId]: data }));
            }
        } catch (err) {
            console.error('match list load error', err);
        }
        setLoadingUserId(null);
    };

    // סינון ומיון
    const filtered = useMemo(() => {
        let arr = [...stats];

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            arr = arr.filter(u =>
                (u.full_name || '').toLowerCase().includes(q) ||
                (u.last_name || '').toLowerCase().includes(q) ||
                String(u.id).includes(q)
            );
        }

        if (filter === 'zero') arr = arr.filter(u => u.matchCount === 0);
        else if (filter === 'many') arr = arr.filter(u => u.matchCount >= 10);
        else if (filter === 'error') arr = arr.filter(u => u.error);

        arr.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.full_name || '').localeCompare(b.full_name || '', 'he');
            }
            const ac = a.matchCount ?? -1;
            const bc = b.matchCount ?? -1;
            return sortBy === 'count_asc' ? ac - bc : bc - ac;
        });

        return arr;
    }, [stats, search, filter, sortBy]);

    // סטטיסטיקות עליונות
    const summary = useMemo(() => {
        const valid = stats.filter(s => s.matchCount != null);
        const zero = valid.filter(s => s.matchCount === 0).length;
        const many = valid.filter(s => s.matchCount >= 10).length;
        const errors = stats.filter(s => s.error).length;
        const avg = valid.length ? Math.round(valid.reduce((a, s) => a + s.matchCount, 0) / valid.length) : 0;
        return { total: stats.length, zero, many, errors, avg };
    }, [stats]);

    if (loading) return (
        <div style={S.loadingPage}>
            <div style={S.spinner} />
            <h2 style={{ color: '#fff' }}>טוען סטטיסטיקות התאמות...</h2>
            <div style={{ color: '#cbd5e1', marginTop: '6px', fontSize: '0.9rem' }}>
                ייתכן שזה ייקח כמה שניות (מריצים את מנוע ההתאמות לכל משתמש)
            </div>
        </div>
    );

    return (
        <div style={S.page}>
            <div style={S.container}>
                <button onClick={() => navigate('/admin')} style={S.backBtn}>← חזרה לדשבורד</button>
                <h1 style={S.title}>📊 סטטיסטיקת התאמות לפי משתמש</h1>
                <p style={S.subtitle}>
                    כמה הצעות כל משתמש רואה כרגע. שורה אדומה = ללא הצעות. לחיצה על שורה — מציגה את הרשימה המלאה.
                </p>

                {/* סיכום */}
                <div style={S.summaryGrid}>
                    <div style={S.summaryCard}>
                        <div style={S.summaryNum}>{summary.total}</div>
                        <div style={S.summaryLabel}>סה״כ משתמשים</div>
                    </div>
                    <div style={{ ...S.summaryCard, borderTop: '4px solid #ef4444' }}>
                        <div style={{ ...S.summaryNum, color: '#dc2626' }}>{summary.zero}</div>
                        <div style={S.summaryLabel}>ללא הצעות</div>
                    </div>
                    <div style={{ ...S.summaryCard, borderTop: '4px solid #10b981' }}>
                        <div style={{ ...S.summaryNum, color: '#059669' }}>{summary.many}</div>
                        <div style={S.summaryLabel}>10 הצעות ויותר</div>
                    </div>
                    <div style={{ ...S.summaryCard, borderTop: '4px solid #f59e0b' }}>
                        <div style={{ ...S.summaryNum, color: '#d97706' }}>{summary.errors}</div>
                        <div style={S.summaryLabel}>בעיות נתונים</div>
                    </div>
                    <div style={{ ...S.summaryCard, borderTop: '4px solid #6366f1' }}>
                        <div style={{ ...S.summaryNum, color: '#4f46e5' }}>{summary.avg}</div>
                        <div style={S.summaryLabel}>ממוצע הצעות</div>
                    </div>
                </div>

                {/* סינונים */}
                <div style={S.controls}>
                    <input
                        type="text"
                        placeholder="🔍 חפש לפי שם או ID"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={S.input}
                    />
                    <select value={filter} onChange={e => setFilter(e.target.value)} style={S.select}>
                        <option value="all">כל המשתמשים</option>
                        <option value="zero">רק ללא הצעות</option>
                        <option value="many">רק עם 10+ הצעות</option>
                        <option value="error">רק עם בעיות נתונים</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={S.select}>
                        <option value="count_asc">מיון: מהפחות הצעות</option>
                        <option value="count_desc">מיון: מהכי הרבה הצעות</option>
                        <option value="name">מיון: לפי שם</option>
                    </select>
                </div>

                {/* טבלה */}
                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>שם</th>
                                <th style={S.th}>מגדר</th>
                                <th style={S.th}>גיל</th>
                                <th style={S.th}>מגזר</th>
                                <th style={S.th}>עיר</th>
                                <th style={S.th}>הצעות</th>
                                <th style={S.th}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#94a3b8' }}>אין תוצאות</td></tr>
                            )}
                            {filtered.map(u => {
                                const isZero = u.matchCount === 0;
                                const hasError = !!u.error;
                                const isOpen = expanded === u.id;
                                const rowBg = isZero ? '#fee2e2' : hasError ? '#fef9c3' : '#fff';
                                return (
                                    <React.Fragment key={u.id}>
                                        <tr style={{ ...S.tr, background: rowBg }}>
                                            <td style={S.td}>
                                                <div style={{ fontWeight: 600 }}>{u.full_name} {u.last_name || ''}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {u.id}</div>
                                            </td>
                                            <td style={S.td}>{u.gender === 'male' ? 'בחור' : u.gender === 'female' ? 'בחורה' : '—'}</td>
                                            <td style={S.td}>{u.age ?? '—'}</td>
                                            <td style={S.td}>{SECTOR_LABELS[u.heritage_sector] || u.heritage_sector || '—'}</td>
                                            <td style={S.td}>{u.city || '—'}</td>
                                            <td style={S.td}>
                                                {hasError ? (
                                                    <span style={S.badgeError}>{ERROR_LABELS[u.error] || u.error}</span>
                                                ) : isZero ? (
                                                    <span style={S.badgeZero}>0 — ללא הצעות</span>
                                                ) : (
                                                    <span style={{ ...S.badgeCount, background: u.matchCount >= 10 ? '#dcfce7' : '#e0e7ff', color: u.matchCount >= 10 ? '#166534' : '#3730a3' }}>
                                                        {u.matchCount}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={S.td}>
                                                {!hasError && u.matchCount > 0 && (
                                                    <button onClick={() => handleExpand(u.id)} style={S.actionBtn}>
                                                        {isOpen ? 'סגור' : 'צפה ברשימה'}
                                                    </button>
                                                )}
                                                <button onClick={() => navigate(`/admin/users?search=${encodeURIComponent(u.full_name)}`)} style={{ ...S.actionBtn, background: '#475569', marginRight: '6px' }}>
                                                    כרטיס
                                                </button>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan={7} style={{ ...S.td, background: '#f8fafc', padding: '14px 18px' }}>
                                                    {loadingUserId === u.id && <div style={{ color: '#64748b' }}>טוען רשימת הצעות...</div>}
                                                    {matchesCache[u.id] && !matchesCache[u.id].valid && (
                                                        <div style={{ color: '#b45309' }}>
                                                            ⚠️ אין הצעות. סיבה: {ERROR_LABELS[matchesCache[u.id].reason] || matchesCache[u.id].reason}
                                                        </div>
                                                    )}
                                                    {matchesCache[u.id]?.matches?.length > 0 && (
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e3a5f' }}>
                                                                {matchesCache[u.id].matches.length} הצעות שהמשתמש רואה כרגע:
                                                            </div>
                                                            <div style={S.matchGrid}>
                                                                {matchesCache[u.id].matches.map(m => (
                                                                    <div
                                                                        key={m.id}
                                                                        style={S.matchChip}
                                                                        onClick={() => navigate(`/admin/match-debug?source=${u.id}&target=${m.id}`)}
                                                                        title="פתח דיבאג ההתאמה"
                                                                    >
                                                                        <strong>{m.full_name} {m.last_name || ''}</strong>
                                                                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginRight: '6px' }}>
                                                                            ({m.age ?? '?'}, {SECTOR_LABELS[m.heritage_sector] || '—'}, {m.city || '—'})
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '30px 20px',
        fontFamily: "'Heebo', sans-serif",
        direction: 'rtl'
    },
    container: { maxWidth: '1200px', margin: '0 auto' },
    backBtn: {
        background: 'rgba(255,255,255,0.15)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
        padding: '8px 16px', cursor: 'pointer', marginBottom: '14px', fontSize: '0.95rem'
    },
    title: { color: '#fff', margin: '0 0 8px', fontSize: '1.8rem' },
    subtitle: { color: '#cbd5e1', margin: '0 0 20px', fontSize: '0.95rem' },
    loadingPage: {
        height: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 100%)'
    },
    spinner: {
        width: '45px', height: '45px',
        border: '5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px'
    },
    summaryGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '20px'
    },
    summaryCard: {
        background: '#fff', borderRadius: '12px', padding: '16px', textAlign: 'center',
        borderTop: '4px solid #1e3a5f', boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
    },
    summaryNum: { fontSize: '2rem', fontWeight: 800, color: '#1e3a5f', lineHeight: 1 },
    summaryLabel: { color: '#64748b', fontSize: '0.85rem', marginTop: '6px' },

    controls: {
        display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap'
    },
    input: {
        flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px',
        border: '1px solid #cbd5e1', fontSize: '0.95rem'
    },
    select: {
        padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
        background: '#fff', fontSize: '0.95rem', cursor: 'pointer'
    },

    tableWrap: {
        background: '#fff', borderRadius: '14px', overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxHeight: '70vh'
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: {
        background: '#1e3a5f', color: '#fff', padding: '12px 14px',
        textAlign: 'right', position: 'sticky', top: 0, fontWeight: 600
    },
    tr: { borderBottom: '1px solid #e2e8f0' },
    td: { padding: '10px 14px', verticalAlign: 'top' },

    badgeZero: {
        background: '#dc2626', color: '#fff', padding: '4px 10px',
        borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
    },
    badgeError: {
        background: '#f59e0b', color: '#fff', padding: '4px 10px',
        borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
    },
    badgeCount: {
        padding: '4px 12px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 'bold'
    },
    actionBtn: {
        background: '#3b82f6', color: '#fff', border: 'none',
        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '0.8rem', fontWeight: 600
    },

    matchGrid: {
        display: 'flex', flexWrap: 'wrap', gap: '8px'
    },
    matchChip: {
        background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
        padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer',
        transition: 'background 0.15s'
    },
};

export default AdminMatchStats;
