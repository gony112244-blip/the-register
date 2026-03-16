import { useState, useEffect } from 'react';

// ── תרגומים ──
const T = {
    gender: { male: '👨 גבר', female: '👩 אישה' },
    status: { single: 'רווק/ה', divorced: 'גרוש/ה', widower: 'אלמן/ה' },
    family_background: { haredi: 'חרדי', dati_leumi: 'דתי לאומי', masorti: 'מסורתי', baal_teshuva: 'חוזר בתשובה' },
    heritage_sector: { ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב' },
    body_type: { very_thin: 'רזה מאוד', thin: 'רזה', slim: 'רזה', average: 'ממוצע', athletic: 'ספורטיבי', full: 'מלא' },
    skin_tone: { fair: 'בהיר', medium: 'בינוני', olive: 'זית', dark: 'כהה' },
    appearance: { fair: 'סביר', ok: 'בסדר גמור', good: 'טוב', handsome: 'נאה', very_handsome: 'נאה מאוד' },
    current_occupation: { studying: 'לומד/ת', working: 'עובד/ת', both: 'משלב/ת', fixed_times: 'קובע עיתים' },
    contact_person_type: { self: 'המועמד עצמו', father: 'האב', mother: 'האם', both_parents: 'שני ההורים', sibling: 'אח/אחות', parent: 'הורה', other: 'אחר' },
    apartment_help: { yes: 'יש', no: 'אין', partial: 'חלקי' },
    life_aspiration: { learning: 'תלמוד תורה', career: 'קריירה', family: 'בנית בית', both: 'שילוב תורה ועבודה' },
    home_style: { quiet: 'שקטה ורגועה', active: 'פעילה וחברותית', flexible: 'גמיש' },
};
const tr = (field, val) => T[field]?.[val] || val || null;
const show = (val) => val !== null && val !== undefined && val !== '' && val !== '0' && val !== 0 && val !== 'null' && val !== 'undefined';

// ── רכיבי עזר ──
function Section({ title, color, border, children }) {
    const hasContent = Array.isArray(children)
        ? children.some(c => c !== null && c !== undefined && c !== false)
        : children !== null && children !== undefined && children !== false;
    if (!hasContent) return null;
    return (
        <div style={{ background: color, border: `2px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '0.95rem', fontWeight: 700 }}>{title}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                {children}
            </div>
        </div>
    );
}

function Row({ label, val, fullWidth }) {
    if (!show(val)) return null;
    return (
        <div style={{ display: 'flex', gap: 6, fontSize: '0.88rem', flexBasis: fullWidth ? '100%' : 'auto', minWidth: 130 }}>
            <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}:</span>
            <strong style={{ color: '#1e3a5f' }}>{val}</strong>
        </div>
    );
}

function FreeText({ label, text }) {
    if (!show(text)) return null;
    return (
        <div style={{ flexBasis: '100%' }}>
            {label && <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>{label}:</div>}
            <p style={{ margin: 0, lineHeight: 1.7, color: '#374151', fontSize: '0.88rem' }}>{text}</p>
        </div>
    );
}

// ── הקומפוננטה הראשית ──
export default function MatchCardModal({ person, onClose, token: tokenProp, targetId: targetIdProp, isAdmin }) {
    const [activeTab, setActiveTab] = useState(1);
    const [fullData, setFullData] = useState(null);
    const [loadingFull, setLoadingFull] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [photoAccess, setPhotoAccess] = useState(null);
    const [zoomedPhoto, setZoomedPhoto] = useState(null);

    // targetId — ממה שנמסר ישירות, או מהאובייקט
    const targetId = targetIdProp || person?.id || person?.user_id;
    const token = tokenProp || localStorage.getItem('token');

    // טעינת כרטיס מלא מיד עם פתיחה
    useEffect(() => {
        if (!targetId || !token) return;
        setLoadingFull(true);
        // אדמין — משתמש ב-endpoint מלא של מנהל
        const url = isAdmin
            ? `http://localhost:3000/admin/user/${targetId}/full`
            : `http://localhost:3000/match-card/${targetId}`;
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setFullData(data); })
            .catch(() => {})
            .finally(() => setLoadingFull(false));
    }, [targetId, token, isAdmin]);

    // בדיקת גישה לתמונות וטעינתן
    useEffect(() => {
        if (!targetId || !token) return;

        if (isAdmin) {
            // אדמין — גישה ישירה לתמונות ללא בדיקת הרשאות
            fetch(`http://localhost:3000/admin/user-photos/${targetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(r => r.json())
                .then(d => {
                    setPhotos(Array.isArray(d.photos) ? d.photos : []);
                    setPhotoAccess({ canView: true });
                })
                .catch(() => {});
            return;
        }

        fetch(`http://localhost:3000/check-photo-access/${targetId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                setPhotoAccess(data);
                if (data.canView) {
                    fetch(`http://localhost:3000/get-user-photos/${targetId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                        .then(r => r.json())
                        .then(d => setPhotos(Array.isArray(d.photos) ? d.photos : []))
                        .catch(() => {});
                }
            })
            .catch(() => {});
    }, [targetId, token, isAdmin]);

    const p = fullData || person;
    if (!p) return null;

    // החלפת לשוניות (לא צריך יותר loadFull — נטען אוטומטית)
    const handleTab = (id) => setActiveTab(id);

    const hasPhotos = p.profile_images_count > 0;

    // parse apartment_help
    const ah = p.apartment_help || '';
    const ahMatch = ah.match(/^(yes|no|partial)\s*(?:\((\d+)\))?/);
    const ahVal = ahMatch ? ahMatch[1] : ah;
    const ahAmount = (ahMatch && ahMatch[2]) ? ahMatch[2] : p.apartment_amount;

    const tabs = [
        { id: 1, label: '📝 פרטים' },
        { id: 2, label: '💼 עיסוק' },
    ];

    return (
        <>
        {/* lightbox לזום תמונה */}
        {zoomedPhoto && (
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
                onClick={() => setZoomedPhoto(null)}
            >
                <img
                    src={`http://localhost:3000${zoomedPhoto}`}
                    alt="תמונה מוגדלת"
                    style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
                    onClick={e => e.stopPropagation()}
                />
                <button
                    onClick={() => setZoomedPhoto(null)}
                    style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 24, borderRadius: '50%', width: 44, height: 44, cursor: 'pointer' }}
                >✕</button>
            </div>
        )}
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>

                {/* ── Hero ── */}
                <div style={S.hero}>
                    <button onClick={onClose} style={S.closeBtn}>✕</button>
                    <div style={S.heroInner}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'מ פ')}&background=c9a227&color=fff&size=120&bold=true&font-size=0.35`}
                            alt={p.full_name}
                            style={S.avatar}
                        />
                        <div style={S.heroInfo}>
                            <h2 style={S.heroName}>{p.full_name} {p.last_name || ''}</h2>
                            <div style={S.heroTags}>
                                {show(p.age) && <span style={S.tag}>🎂 {p.age} שנים</span>}
                                {show(p.height) && <span style={S.tag}>📏 {p.height} ס"מ</span>}
                                {show(p.city) && <span style={S.tag}>📍 {p.city}</span>}
                                {show(p.status) && <span style={S.tag}>{tr('status', p.status)}</span>}
                                {show(p.heritage_sector) && <span style={S.tag}>{tr('heritage_sector', p.heritage_sector)}</span>}
                                {show(p.family_background) && <span style={S.tag}>{tr('family_background', p.family_background)}</span>}
                                {p.has_children && <span style={S.tag}>👶 ילדים: {p.children_count || 'כן'}</span>}
                            </div>
                        </div>
                    </div>

                    {/* פרטי איש קשר — לא מוצגים בכרטיס הציבורי (נראה רק בשידוך פעיל) */}

                    {/* תמונות */}
                    {photoAccess?.canView && photos.length > 0 ? (
                        <div style={{ padding: '12px 20px 16px' }}>
                            <div style={{ color: '#c9a227', fontWeight: 'bold', marginBottom: 8, fontSize: '0.9rem' }}>
                                📷 תמונות {photoAccess.expiresAt ? `(גלוי עד ${new Date(photoAccess.expiresAt).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })})` : ''}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {photos.map((url, i) => (
                                    <img
                                        key={i}
                                        src={`http://localhost:3000${url}`}
                                        alt={`תמונה ${i + 1}`}
                                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: '2px solid #c9a227' }}
                                        onClick={() => setZoomedPhoto(url)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : hasPhotos ? (
                        <div style={S.photoBadge}>📷 {p.profile_images_count} תמונות — שלח בקשה לצפייה</div>
                    ) : null}
                </div>

                {/* ── Tabs ── */}
                <div style={S.tabsBar}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => handleTab(t.id)}
                            style={activeTab === t.id ? S.tabActive : S.tab}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── תוכן ── */}
                <div style={S.body}>
                    {loadingFull && activeTab === 2 && (
                        <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>טוען...</div>
                    )}

                    {/* ── לשונית 1: פרטים ── */}
                    {activeTab === 1 && (
                        <>
                            <Section title="👨‍👩‍👧‍👦 רקע משפחתי" color="#f0fdf4" border="#86efac">
                                <Row label="רקע דתי" val={tr('family_background', p.family_background)} />
                                <Row label="מגזר עדתי" val={tr('heritage_sector', p.heritage_sector)} />
                                <Row label="עדת האב" val={p.father_heritage} />
                                <Row label="עדת האם" val={p.mother_heritage} />
                                <Row label="עיסוק האב" val={p.father_occupation} />
                                <Row label="עיסוק האם" val={p.mother_occupation} />
                                <Row label="מספר אחים" val={p.siblings_count} />
                                <Row label="מיקום בין האחים" val={p.sibling_position} />
                                <Row label="ארץ לידה" val={p.country_of_birth} />
                            </Section>

                            <Section title="🪞 מראה חיצוני" color="#f0f9ff" border="#93c5fd">
                                <Row label="גובה" val={show(p.height) ? `${p.height} ס"מ` : null} />
                                <Row label="מבנה גוף" val={tr('body_type', p.body_type)} />
                                <Row label="גוון עור" val={tr('skin_tone', p.skin_tone)} />
                                <Row label="מראה כללי" val={tr('appearance', p.appearance)} />
                            </Section>

                            <Section title="🏠 דיור ומימון" color="#fef9ec" border="#fcd34d">
                                <Row label="עזרת דירה" val={tr('apartment_help', ahVal)} />
                                {ahAmount && <Row label="סכום עזרה" val={`₪${Number(ahAmount).toLocaleString()}`} />}
                            </Section>

                            {(show(p.about_me) || show(p.home_style) || show(p.important_in_life)) && (
                                <Section title="💭 על עצמי" color="#f8fafc" border="#94a3b8">
                                    <FreeText label="על עצמי" text={p.about_me} />
                                    <Row label="סגנון בית" val={tr('home_style', p.home_style)} fullWidth />
                                    <FreeText label="מה חשוב לי בחיים" text={p.important_in_life} />
                                </Section>
                            )}

                            {show(p.partner_description) && (
                                <Section title="💎 בן/בת הזוג שאני מחפש" color="#fdf4ff" border="#d8b4fe">
                                    <FreeText text={p.partner_description} />
                                </Section>
                            )}
                        </>
                    )}

                    {/* ── לשונית 2: עיסוק ── */}
                    {activeTab === 2 && !loadingFull && (
                        <Section title="💼 עיסוק ולימודים" color="#f0f9ff" border="#93c5fd">
                            <Row label="עיסוק כעת" val={tr('current_occupation', p.current_occupation)} />
                            <Row label="שאיפה" val={tr('life_aspiration', p.life_aspiration)} />
                            <Row label="מקצוע" val={p.work_field} />
                            <Row label="פרטי עיסוק" val={p.occupation_details} fullWidth />
                            <Row label="ישיבה" val={p.yeshiva_name} />
                            <Row label="ישיבה קטנה" val={p.yeshiva_ketana_name} />
                            <Row label="סמינר/מוסד" val={p.study_place} />
                            <Row label="תחום לימוד" val={p.study_field} />
                            <Row label="נושא לימוד אהוב" val={p.favorite_study} />
                        </Section>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

// ── סגנונות ──
const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.65)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, backdropFilter: 'blur(4px)', direction: 'rtl'
    },
    modal: {
        background: '#fff', borderRadius: 20,
        width: '94%', maxWidth: 620, maxHeight: '90vh',
        overflow: 'auto', position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column'
    },
    hero: {
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '24px', position: 'relative', flexShrink: 0
    },
    closeBtn: {
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(255,255,255,0.15)', border: 'none',
        color: '#fff', borderRadius: '50%', width: 30, height: 30,
        cursor: 'pointer', fontSize: 15, display: 'flex',
        alignItems: 'center', justifyContent: 'center'
    },
    heroInner: { display: 'flex', gap: 18, alignItems: 'flex-start' },
    avatar: { width: 80, height: 80, borderRadius: '50%', border: '3px solid #c9a227', objectFit: 'cover', flexShrink: 0 },
    heroInfo: { flex: 1 },
    heroName: { color: '#fff', margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800 },
    heroTags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    tag: {
        background: 'rgba(255,255,255,0.18)', color: '#fff',
        padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 500
    },
    contactBox: {
        marginTop: 14, background: 'rgba(254,249,236,0.15)',
        border: '1px solid rgba(201,162,39,0.4)',
        borderRadius: 10, padding: '8px 14px',
        display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.85rem', alignItems: 'center'
    },
    contactLabel: { color: '#fcd34d', fontWeight: 700 },
    contactVal: { color: '#fff', fontWeight: 500 },
    contactPhone: {
        background: 'rgba(201,162,39,0.3)', color: '#fcd34d',
        padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem'
    },
    photoBadge: {
        marginTop: 10, display: 'inline-block',
        background: 'rgba(201,162,39,0.2)', color: '#fcd34d',
        fontSize: 12, padding: '4px 12px', borderRadius: 20,
        border: '1px solid rgba(201,162,39,0.4)'
    },
    tabsBar: { display: 'flex', borderBottom: '2px solid #e5e7eb', flexShrink: 0 },
    tab: {
        flex: 1, padding: '12px 8px', background: '#f8fafc',
        border: 'none', borderBottom: '3px solid transparent',
        cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280',
        fontFamily: 'inherit', fontWeight: 600
    },
    tabActive: {
        flex: 1, padding: '12px 8px', background: '#fff',
        border: 'none', borderBottom: '3px solid #c9a227',
        cursor: 'pointer', fontSize: '0.9rem', color: '#1e3a5f',
        fontFamily: 'inherit', fontWeight: 800
    },
    body: { padding: '18px', overflowY: 'auto' },
};
