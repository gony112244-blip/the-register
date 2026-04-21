import API_BASE from './config';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FIELD_LABELS = {
    'מאושר u1': 'מאושר (משתמש 1)',
    'מאושר u2': 'מאושר (משתמש 2)',
    'לא חסום u2': 'לא חסום',
    'מגדר נגדי': 'מגדר נגדי',
    'אין חיבור קיים': 'חיבור קיים',
    'לא מוסתר': 'הסתרה',
    'לא חסום': 'חסימה',
};

function UserCard({ user, label }) {
    if (!user) return null;
    const rows = [
        ['מגדר', user.gender === 'male' ? 'גבר' : 'אישה'],
        ['גיל', user.age],
        ['גובה', user.height ? `${Math.round(user.height)} ס"מ` : '—'],
        ['מגזר', user.heritage_sector],
        ['רקע דתי', user.family_background],
        ['סטטוס', user.status],
        ['מבנה גוף', user.body_type],
        ['מראה', user.appearance],
        ['גוון עור', user.skin_tone],
        ['כיסוי ראש', user.head_covering],
        ['עיסוק', user.current_occupation],
        ['שאיפה', user.life_aspiration],
    ];
    return (
        <div style={S.userCard}>
            <div style={S.userCardHeader}>{label}</div>
            <div style={S.userName}>{user.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>{user.phone} · ID: {user.id}</div>
            <div style={S.userRows}>
                {rows.filter(([, v]) => v != null && v !== '' && v !== 'null').map(([k, v]) => (
                    <div key={k} style={S.userRow}>
                        <span style={S.userRowLabel}>{k}:</span>
                        <span style={S.userRowVal}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CheckRow({ check }) {
    const isBasic = ['מאושר u1', 'מאושר u2', 'לא חסום u2', 'מגדר נגדי', 'אין חיבור קיים', 'לא מוסתר', 'לא חסום'].includes(check.field);
    const isA = check.field.startsWith('A:');
    const isB = check.field.startsWith('B:');
    return (
        <div style={{ ...S.checkRow, background: check.ok ? '#f0fdf4' : '#fef2f2', borderRight: `4px solid ${check.ok ? '#22c55e' : '#ef4444'}` }}>
            <span style={{ fontSize: '1.1rem' }}>{check.ok ? '✅' : '❌'}</span>
            <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: check.ok ? '#166534' : '#991b1b' }}>
                    {isA ? '← ' : isB ? '→ ' : ''}{check.field.replace(/^[AB]: /, '')}
                </span>
                {!isBasic && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                        {check.v}
                    </div>
                )}
            </div>
            {isBasic && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{check.v}</span>}
        </div>
    );
}

export default function AdminMatchDebug() {
    const navigate = useNavigate();
    const [phone1, setPhone1] = useState('');
    const [phone2, setPhone2] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const runDebug = async () => {
        if (!phone1 || !phone2) { setError('נא להזין שני מספרי טלפון'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API_BASE}/matches-debug/${encodeURIComponent(phone2)}?source=${encodeURIComponent(phone1)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();
            if (!res.ok) { setError(data.message || 'שגיאה'); setLoading(false); return; }
            setResult(data);
        } catch {
            setError('שגיאת תקשורת עם השרת');
        }
        setLoading(false);
    };

    const basicChecks = result?.checks?.filter(c =>
        ['מאושר u1', 'מאושר u2', 'לא חסום u2', 'מגדר נגדי', 'אין חיבור קיים', 'לא מוסתר', 'לא חסום'].includes(c.field)
    ) || [];
    const aChecks = result?.checks?.filter(c => c.field.startsWith('A:')) || [];
    const bChecks = result?.checks?.filter(c => c.field.startsWith('B:')) || [];

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user?.is_admin) { navigate('/login'); return null; }

    return (
        <div style={S.page}>
            <div style={S.container}>
                {/* Header */}
                <div style={S.header}>
                    <button onClick={() => navigate('/admin')} style={S.backBtn}>← חזרה לדשבורד</button>
                    <h2 style={S.title}>🔍 בדיקת התאמה בין משתמשים</h2>
                    <p style={S.subtitle}>הזן שני מספרי טלפון לבדיקה למה שניים לא רואים אחד את השני</p>
                </div>

                {/* Input form */}
                <div style={S.form}>
                    <div style={S.inputGroup}>
                        <label style={S.label}>משתמש 1 (מחפש)</label>
                        <input
                            style={S.input}
                            placeholder="מספר טלפון, לדוגמה 0501234567"
                            value={phone1}
                            onChange={e => setPhone1(e.target.value)}
                            dir="ltr"
                        />
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#94a3b8', alignSelf: 'flex-end', paddingBottom: '8px' }}>⇄</div>
                    <div style={S.inputGroup}>
                        <label style={S.label}>משתמש 2 (מועמד)</label>
                        <input
                            style={S.input}
                            placeholder="מספר טלפון, לדוגמה 0507654321"
                            value={phone2}
                            onChange={e => setPhone2(e.target.value)}
                            dir="ltr"
                        />
                    </div>
                    <button onClick={runDebug} disabled={loading} style={S.btn}>
                        {loading ? '⏳ בודק...' : '🔍 בדוק'}
                    </button>
                </div>
                {error && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}

                {/* Results */}
                {result && (
                    <div>
                        {/* Summary banner */}
                        <div style={{
                            ...S.summary,
                            background: result.summary.startsWith('MATCH') ? '#dcfce7' : '#fee2e2',
                            border: `2px solid ${result.summary.startsWith('MATCH') ? '#22c55e' : '#ef4444'}`,
                            color: result.summary.startsWith('MATCH') ? '#166534' : '#991b1b',
                        }}>
                            <span style={{ fontSize: '2rem' }}>{result.summary.startsWith('MATCH') ? '✅' : '❌'}</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                                    {result.summary.startsWith('MATCH') ? 'המשתמשים אמורים לראות אחד את השני' : 'יש חסימה — המשתמשים לא יראו אחד את השני'}
                                </div>
                                {result.failed?.length > 0 && (
                                    <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                        {result.failed.length} תנאים נכשלו: {result.failed.map(f => f.field).join(' | ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User cards */}
                        <div style={S.userCards}>
                            <UserCard user={result.u1} label="משתמש 1 (מחפש)" />
                            <UserCard user={result.u2} label="משתמש 2 (מועמד)" />
                        </div>

                        {/* Checks */}
                        <div style={S.checksGrid}>
                            {/* Basic checks */}
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>🔒 בדיקות בסיס</div>
                                {basicChecks.map((c, i) => <CheckRow key={i} check={c} />)}
                            </div>

                            {/* Direction A */}
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>← העדפות משתמש 1 על מועמד 2</div>
                                {aChecks.length === 0
                                    ? <div style={S.noChecks}>אין פילטרים פעילים</div>
                                    : aChecks.map((c, i) => <CheckRow key={i} check={c} />)
                                }
                            </div>

                            {/* Direction B */}
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>→ העדפות משתמש 2 על מועמד 1</div>
                                {bChecks.length === 0
                                    ? <div style={S.noChecks}>אין פילטרים פעילים</div>
                                    : bChecks.map((c, i) => <CheckRow key={i} check={c} />)
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const S = {
    page: { minHeight: '100vh', background: '#f8fafc', padding: '20px', direction: 'rtl', fontFamily: "'Heebo', sans-serif" },
    container: { maxWidth: '900px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    backBtn: { background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', padding: '0 0 10px', display: 'block' },
    title: { margin: '0 0 6px', color: '#1e3a5f', fontSize: '1.6rem', fontWeight: 800 },
    subtitle: { margin: 0, color: '#64748b', fontSize: '0.95rem' },
    form: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', background: '#fff', padding: '20px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '20px' },
    inputGroup: { flex: 1, minWidth: '180px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: 700, color: '#374151', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' },
    btn: { padding: '10px 24px', background: 'linear-gradient(135deg, #c9a227, #b08d1f)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' },
    summary: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px' },
    userCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
    userCard: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    userCardHeader: { fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' },
    userName: { fontSize: '1.2rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '4px' },
    userRows: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    userRow: { background: '#f1f5f9', borderRadius: '6px', padding: '3px 8px', fontSize: '0.82rem' },
    userRowLabel: { color: '#64748b', marginLeft: '4px' },
    userRowVal: { color: '#1e3a5f', fontWeight: 600 },
    checksGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
    checkGroup: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    checkGroupTitle: { fontWeight: 800, color: '#1e3a5f', marginBottom: '12px', fontSize: '0.9rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' },
    checkRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '8px', marginBottom: '6px', fontSize: '0.85rem' },
    noChecks: { color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '10px' },
};
