import API_BASE from './config';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── תרגום ערכים ──────────────────────────────────────────────
const HE = {
    // מגדר
    male: 'גבר', female: 'אישה',
    // מגזר
    ashkenazi: 'אשכנזי', sephardi: 'ספרדי', mixed: 'מעורב', teimani: 'תימני',
    // רקע דתי
    haredi: 'חרדי', baal_teshuva: 'בעל תשובה', dati_leumi: 'דתי לאומי', masorti: 'מסורתי',
    // סטטוס
    single: 'רווק/ה', divorced: 'גרוש/ה', widower: 'אלמן/ה',
    // מבנה גוף
    very_thin: 'רזה מאוד', thin: 'רזה', average_thin: 'ממוצע-רזה',
    average: 'ממוצע', average_full: 'ממוצע-מלא', full: 'מלא',
    // מראה
    fair: 'סביר', ok: 'בסדר', good: 'טוב', handsome: 'יפה', very_handsome: 'יפה מאוד', stunning: 'מרהיב',
    // גוון עור
    light: 'בהיר', medium: 'בינוני', olive: 'זית', dark: 'כהה',
    // כיסוי ראש
    none: 'ללא', kipa_knitted: 'כיפה סרוגה', kipa_black: 'כיפה שחורה',
    hat: 'כובע', mitpachat: 'מטפחת', wig: 'פאה', other: 'אחר',
    // עיסוק
    studying: 'לומד/ת', working: 'עובד/ת', fixed_times: 'זמנים קבועים', both: 'לומד ועובד',
    // שאיפה
    study_only: 'לימוד בלבד', study_and_work: 'לימוד ועבודה', work_only: 'עבודה בלבד', fixed_times_aspiration: 'זמנים קבועים',
};

const t = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    return HE[val] ?? val;
};

// תרגום שם שדה (label) מה-checks
const FIELD_HE = {
    'גיל מינ': 'גיל מינימום',
    'גיל מקס': 'גיל מקסימום',
    'גובה מינ': 'גובה מינימום',
    'גובה מקס': 'גובה מקסימום',
    'מבנה גוף': 'מבנה גוף',
    'מבנה': 'מבנה גוף',
    'מראה': 'מראה',
    'רקע': 'רקע דתי',
    'סטטוס': 'סטטוס',
    'מגזר': 'מגזר',
    'עיסוק': 'עיסוק',
    'שאיפה': 'שאיפה',
    'גוון עור': 'גוון עור',
    'כיסוי ראש': 'כיסוי ראש',
    'סיוע כלכלי': 'סיוע כלכלי',
};

// תרגום ה-v (ערך הסבר) לטקסט עברי קריא
function translateCheckValue(field, v, ok) {
    if (v === undefined || v === null) return '';

    const raw = String(v);

    // בדיקות בסיס
    if (field === 'מאושר u1' || field === 'מאושר u2') return ok ? 'מאושר ✓' : 'לא מאושר ✗';
    if (field === 'לא חסום u2') return ok ? 'לא חסום ✓' : 'חסום! ✗';
    if (field === 'מגדר נגדי') {
        const parts = raw.split(' vs ');
        return parts.length === 2 ? `${t(parts[0])} מול ${t(parts[1])}` : raw;
    }
    if (field === 'אין חיבור קיים') return ok ? 'אין חיבור קיים ✓' : 'יש כבר חיבור ✗';
    if (field === 'לא מוסתר') return ok ? 'לא מוסתר ✓' : 'מוסתר ✗';
    if (field === 'לא חסום') return ok ? 'לא חסום ✓' : 'חסום ✗';

    // גיל / גובה — "u2.age=37 >= 19" → "37 ≥ 19"
    const ageHeightMatch = raw.match(/u\d\.\w+=([0-9.]+)\s*(>=|<=)\s*([0-9.]+)/);
    if (ageHeightMatch) {
        const val = parseFloat(ageHeightMatch[1]);
        const op = ageHeightMatch[2] === '>=' ? '≥' : '≤';
        const limit = parseFloat(ageHeightMatch[3]);
        const displayVal = field.includes('גובה') ? `${Math.round(val)} ס"מ` : val;
        const displayLimit = field.includes('גובה') ? `${Math.round(limit)} ס"מ` : limit;
        return `${displayVal} ${op} ${displayLimit}`;
    }

    // רשימת ערכים — "u2=very_thin in [very_thin,thin,...]"
    const listMatch = raw.match(/u\d=([^\s]+)\s+in\s+\[([^\]]+)\]/);
    if (listMatch) {
        const actual = t(listMatch[1]);
        const allowed = listMatch[2].split(',').map(s => t(s.trim())).join(', ');
        return `${actual} ← מתוך: ${allowed}`;
    }

    // mixed_ok
    if (raw.includes('mixed_ok=')) {
        const base = raw.replace(/\s*mixed_ok=\w+/, '').trim();
        const translated = base.replace(/u\d=([^\s]+)\s+in\s+\[([^\]]+)\]/, (_, actual, list) =>
            `${t(actual)} ← מתוך: ${list.split(',').map(s => t(s.trim())).join(', ')}`
        );
        const mixedOk = raw.includes('mixed_ok=true');
        return `${translated} ${mixedOk ? '(מקבל מעורב ✓)' : '(לא מקבל מעורב)'}`;
    }

    // תקין / אין
    if (raw === 'תקין') return ok ? 'תקין ✓' : 'לא תקין ✗';
    if (raw === 'אין') return ok ? 'אין ✓' : 'יש ✗';
    if (raw === 'true') return ok ? 'כן ✓' : 'לא ✗';
    if (raw === 'false') return ok ? 'לא ✓' : 'כן ✗';

    return raw;
}

function buildCheckLines(field, v, ok, candidateName = 'הצד השני') {
    if (v === undefined || v === null) return [];

    const raw = String(v);
    const fallback = translateCheckValue(field, v, ok);
    const cleanCandidate = candidateName || 'הצד השני';

    const ageHeightMatch = raw.match(/u\d\.\w+=(null|undefined|[0-9.]+)\s*(>=|<=)\s*([0-9.]+)/);
    if (ageHeightMatch) {
        const actualRaw = ageHeightMatch[1];
        const op = ageHeightMatch[2];
        const limitRaw = parseFloat(ageHeightMatch[3]);
        const isHeight = field.includes('גובה');
        const unit = isHeight ? ' ס"מ' : '';
        const limit = isHeight ? Math.round(limitRaw) : limitRaw;
        const actual = actualRaw === 'null' || actualRaw === 'undefined'
            ? 'לא הוזן'
            : `${isHeight ? Math.round(parseFloat(actualRaw)) : parseFloat(actualRaw)}${unit}`;
        return [
            `מחפש/ת: ${op === '>=' ? 'לפחות' : 'עד'} ${limit}${unit}`,
            `אצל ${cleanCandidate}: ${actual}`,
        ];
    }

    const listMatch = raw.match(/u\d=([^\s]+)\s+in\s+\[([^\]]+)\]/);
    if (listMatch) {
        const actual = listMatch[1] && listMatch[1] !== 'null' ? t(listMatch[1]) : 'לא הוגדר';
        const allowed = listMatch[2].split(',').map(s => t(s.trim())).join(', ');
        const lines = [
            `מחפש/ת: ${allowed}`,
            `אצל ${cleanCandidate}: ${actual}`,
        ];
        if (raw.includes('mixed_ok=')) {
            lines.push(raw.includes('mixed_ok=true') ? 'הערה: מעורב מתקבל' : 'הערה: מעורב לא מתקבל');
        }
        return lines;
    }

    const wantMatch = raw.match(/u\d=([^\s]+)\s+want=([^\s]+)/);
    if (wantMatch) {
        const actual = wantMatch[1] && wantMatch[1] !== 'null' ? t(wantMatch[1]) : 'לא הוגדר';
        const wanted = wantMatch[2] && wantMatch[2] !== 'null' ? t(wantMatch[2]) : 'לא הוגדר';
        return [
            `מחפש/ת: ${wanted}`,
            `אצל ${cleanCandidate}: ${actual}`,
        ];
    }

    if (raw.includes('has no age')) {
        return [
            'מחפש/ת: גיל מוגדר בטווח החיפוש',
            `אצל ${cleanCandidate}: גיל לא הוזן`,
        ];
    }

    return fallback ? [fallback] : [];
}

// שם שדה נקי בעברית
function translateFieldName(field) {
    const clean = field.replace(/^[AB]: /, '').replace(/^u\d רוצה /, '');
    return FIELD_HE[clean] || clean;
}

// ── כרטיס משתמש ───────────────────────────────────────────────
function UserCard({ user, label }) {
    if (!user) return null;
    const rows = [
        ['מגדר', t(user.gender)],
        ['גיל', user.age ? `${user.age} שנים` : null],
        ['גובה', user.height ? `${Math.round(user.height)} ס"מ` : null],
        ['מגזר', t(user.heritage_sector)],
        ['רקע דתי', t(user.family_background)],
        ['סטטוס', t(user.status)],
        ['מבנה גוף', t(user.body_type)],
        ['מראה', t(user.appearance)],
        ['גוון עור', t(user.skin_tone)],
        ['כיסוי ראש', t(user.head_covering)],
        ['עיסוק', t(user.current_occupation)],
        ['שאיפה', t(user.life_aspiration)],
    ];
    return (
        <div style={S.userCard}>
            <div style={S.userCardHeader}>{label}</div>
            <div style={S.userName}>{user.name}</div>
            {user.hasPendingChanges && (
                <div style={{ background: '#fef9c3', color: '#854d0e', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', marginBottom: '6px', display: 'inline-block' }}>
                    ⏳ הנתונים כוללים שינויים בהמתנה לאישור
                </div>
            )}
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>{user.phone} · מזהה: {user.id}</div>
            <div style={S.userRows}>
                {rows.filter(([, v]) => v && v !== '—').map(([k, v]) => (
                    <div key={k} style={S.userRow}>
                        <span style={S.userRowLabel}>{k}:</span>
                        <span style={S.userRowVal}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── שורת בדיקה ────────────────────────────────────────────────
const BASIC_FIELDS = ['מאושר u1', 'מאושר u2', 'לא חסום u2', 'מגדר נגדי', 'אין חיבור קיים', 'לא מוסתר', 'לא חסום'];

function CheckRow({ check, candidateName }) {
    const isBasic = BASIC_FIELDS.includes(check.field);
    const isA = check.field.startsWith('A:');
    const isB = check.field.startsWith('B:');
    const label = isBasic ? check.field : translateFieldName(check.field);
    const valueLines = buildCheckLines(check.field, check.v, check.ok, candidateName);

    return (
        <div style={{ ...S.checkRow, background: check.ok ? '#f0fdf4' : '#fef2f2', borderRight: `4px solid ${check.ok ? '#22c55e' : '#ef4444'}` }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{check.ok ? '✅' : '❌'}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: check.ok ? '#166534' : '#991b1b', fontSize: '0.88rem' }}>
                    {label}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px', lineHeight: 1.55 }}>
                    {valueLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── דף ראשי ───────────────────────────────────────────────────
export default function AdminMatchDebug() {
    const navigate = useNavigate();
    const [phone1, setPhone1] = useState('');
    const [phone2, setPhone2] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user?.is_admin) { navigate('/login'); return null; }

    const runDebug = async () => {
        if (!phone1 || !phone2) { setError('נא להזין שני מספרי טלפון'); return; }
        setLoading(true); setError(''); setResult(null);
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

    const basicChecks = result?.checks?.filter(c => BASIC_FIELDS.includes(c.field)) || [];
    const aChecks = result?.checks?.filter(c => c.field.startsWith('A:')) || [];
    const bChecks = result?.checks?.filter(c => c.field.startsWith('B:')) || [];
    const isMatch = result?.summary?.startsWith('MATCH');

    return (
        <div style={S.page}>
            <div style={S.container}>
                <div style={S.header}>
                    <button onClick={() => navigate('/admin')} style={S.backBtn}>← חזרה לדשבורד</button>
                    <h2 style={S.title}>🔍 בדיקת התאמה בין משתמשים</h2>
                    <p style={S.subtitle}>הזן שני מספרי טלפון לבדיקה למה שניים לא רואים אחד את השני</p>
                </div>

                {/* טופס */}
                <div style={S.form}>
                    <div style={S.inputGroup}>
                        <label style={S.label}>משתמש א׳ (המחפש)</label>
                        <input style={S.input} placeholder="מספר טלפון" value={phone1}
                            onChange={e => setPhone1(e.target.value)} dir="ltr" />
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#94a3b8', alignSelf: 'flex-end', paddingBottom: '8px' }}>⇄</div>
                    <div style={S.inputGroup}>
                        <label style={S.label}>משתמש ב׳ (המועמד)</label>
                        <input style={S.input} placeholder="מספר טלפון" value={phone2}
                            onChange={e => setPhone2(e.target.value)} dir="ltr" />
                    </div>
                    <button onClick={runDebug} disabled={loading} style={S.btn}>
                        {loading ? '⏳ בודק...' : '🔍 בדוק'}
                    </button>
                </div>
                {error && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}

                {/* תוצאות */}
                {result && (
                    <div>
                        {/* באנר סיכום — מנוע אמיתי גובר על בדיקה ידנית */}
                        {(() => {
                            const re = result.realEngine;
                            // אם יש תוצאת מנוע אמיתי — היא הקובעת
                            const effectiveOk = re && !re.error
                                ? (re.u1SeesU2 && re.u2SeesU1)
                                : isMatch;
                            const manualMismatch = re && !re.error && isMatch && !effectiveOk;
                            const bgColor = effectiveOk ? '#dcfce7' : '#fee2e2';
                            const borderColor = effectiveOk ? '#22c55e' : '#ef4444';
                            const textColor = effectiveOk ? '#166534' : '#991b1b';

                            const blockedDirections = re && !re.error && !effectiveOk ? [
                                !re.u1SeesU2 && `${result.u1?.name} לא רואה את ${result.u2?.name}`,
                                !re.u2SeesU1 && `${result.u2?.name} לא רואה את ${result.u1?.name}`,
                            ].filter(Boolean) : [];

                            return (
                                <div style={{
                                    ...S.summary,
                                    background: bgColor,
                                    border: `2px solid ${borderColor}`,
                                    color: textColor,
                                    flexDirection: 'column',
                                    gap: '6px',
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '2.2rem' }}>{effectiveOk ? '✅' : '❌'}</span>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
                                                {effectiveOk
                                                    ? 'ההתאמה תקינה — שני המשתמשים אמורים לראות אחד את השני'
                                                    : 'אין התאמה — המשתמשים לא יראו אחד את השני'}
                                            </div>
                                            {result.failed?.length > 0 && (
                                                <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                                    <strong>חסימות ידניות ({result.failed.length}):</strong>{' '}
                                                    {result.failed.map(f => translateFieldName(f.field)).join(' · ')}
                                                </div>
                                            )}
                                            {blockedDirections.length > 0 && (
                                                <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                                    <strong>חסום ע"י מנוע אמיתי:</strong>{' '}
                                                    {blockedDirections.join(' · ')}
                                                    {manualMismatch && <span style={{ marginRight: '6px', opacity: 0.85 }}>— ייתכן תנאי כלכלה</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* כרטיסי משתמשים */}
                        <div style={S.userCards}>
                            <UserCard user={result.u1} label={`משתמש א׳ — ${result.u1?.name}`} />
                            <UserCard user={result.u2} label={`משתמש ב׳ — ${result.u2?.name}`} />
                        </div>

                        {/* עמודות בדיקות */}
                        <div style={S.checksGrid}>
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>🔒 בדיקות בסיס</div>
                                <div style={S.checkGroupSub}>אישור, חסימה, מגדר</div>
                                {basicChecks.map((c, i) => <CheckRow key={i} check={c} />)}
                            </div>
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>← מה {result.u1?.name} מחפש/ת</div>
                                <div style={S.checkGroupSub}>והאם {result.u2?.name} מתאים/ה לתנאים האלה</div>
                                {aChecks.length === 0
                                    ? <div style={S.noChecks}>אין פילטרים מוגדרים</div>
                                    : aChecks.map((c, i) => <CheckRow key={i} check={c} candidateName={result.u2?.name} />)}
                            </div>
                            <div style={S.checkGroup}>
                                <div style={S.checkGroupTitle}>→ מה {result.u2?.name} מחפש/ת</div>
                                <div style={S.checkGroupSub}>והאם {result.u1?.name} מתאים/ה לתנאים האלה</div>
                                {bChecks.length === 0
                                    ? <div style={S.noChecks}>אין פילטרים מוגדרים</div>
                                    : bChecks.map((c, i) => <CheckRow key={i} check={c} candidateName={result.u1?.name} />)}
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
    container: { maxWidth: '960px', margin: '0 auto' },
    header: { marginBottom: '24px' },
    backBtn: { background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', padding: '0 0 10px', display: 'block' },
    title: { margin: '0 0 6px', color: '#1e3a5f', fontSize: '1.6rem', fontWeight: 800 },
    subtitle: { margin: 0, color: '#64748b', fontSize: '0.95rem' },
    form: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', background: '#fff', padding: '20px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '20px' },
    inputGroup: { flex: 1, minWidth: '180px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: 700, color: '#374151', fontSize: '0.9rem' },
    input: { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' },
    btn: { padding: '10px 24px', background: 'linear-gradient(135deg, #c9a227, #b08d1f)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' },
    summary: { display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 22px', borderRadius: '14px', marginBottom: '20px' },
    userCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
    userCard: { background: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    userCardHeader: { fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' },
    userName: { fontSize: '1.2rem', fontWeight: 800, color: '#1e3a5f', marginBottom: '4px' },
    userRows: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
    userRow: { background: '#f1f5f9', borderRadius: '6px', padding: '4px 10px', fontSize: '0.83rem' },
    userRowLabel: { color: '#64748b', marginLeft: '4px' },
    userRowVal: { color: '#1e3a5f', fontWeight: 600 },
    checksGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' },
    checkGroup: { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    checkGroupTitle: { fontWeight: 800, color: '#1e3a5f', fontSize: '0.92rem', marginBottom: '2px' },
    checkGroupSub: { color: '#94a3b8', fontSize: '0.78rem', marginBottom: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' },
    checkRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '8px', marginBottom: '6px' },
    noChecks: { color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '12px' },
};
