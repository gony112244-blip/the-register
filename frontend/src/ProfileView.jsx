import { API_BASE, getSecureUrl } from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageLightbox from './components/ImageLightbox';

function ProfileView({ externalUser, readOnly, isAdminView }) {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [user, setUser] = useState(externalUser || null);
    const [loading, setLoading] = useState(!externalUser);
    const [activeTab, setActiveTab] = useState(1);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    useEffect(() => {
        if (externalUser) {
            setUser(externalUser);
            setLoading(false);
            return;
        }
        if (!token) { navigate('/login'); return; }
        fetch(`${API_BASE}/my-profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => { setUser(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [navigate, token, externalUser]);

    if (loading) return (
        <div style={S.page}>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={S.spinner} />
                <h2 style={{ color: '#fff', margin: 0 }}>טוען את הכרטיס...</h2>
            </div>
        </div>
    );

    if (!user) return <div style={S.page}><div style={{ color: '#fff', textAlign: 'center', paddingTop: '100px', fontSize: '1.5rem' }}>❌ שגיאה בטעינה</div></div>;

    // ── Translators ──
    const T = {
        gender: { male: '👨 גבר', female: '👩 אישה' },
        status: { single: 'רווק / רווקה', divorced: 'גרוש / גרושה', widower: 'אלמן / אלמנה' },
        family_background: { haredi: 'חרדי', dati_leumi: 'דתי לאומי', masorti: 'מסורתי', baal_teshuva: 'חוזר בתשובה' },
        heritage_sector: { ashkenazi: 'אשכנזי', sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב' },
        body_type: {
            very_thin: 'רזה מאוד', thin: 'רזה', slim: 'רזה',
            average_thin: 'רזה-ממוצע', average: 'ממוצע',
            average_full: 'ממוצע-מלא', full: 'מלא', athletic: 'ספורטיבי'
        },
        skin_tone: {
            very_light: 'בהיר מאוד', light: 'בהיר', fair: 'בהיר',
            light_average: 'בהיר-ממוצע', medium: 'שזוף', tan: 'שחום',
            olive: 'זית', dark: 'כהה'
        },
        appearance: { fair: 'נחמד', ok: 'בסדר גמור', good: 'טוב', handsome: 'נאה', very_handsome: 'נאה מאוד', stunning: 'מרשים במיוחד' },
        current_occupation: { studying: 'לומד/ת', working: 'עובד/ת', both: 'משלב', fixed_times: 'קובע עיתים' },
        contact_person_type: { self: 'המועמד עצמו', father: 'האב', mother: 'האם', both_parents: 'שני ההורים', sibling: 'אח/אחות', parent: 'הורה', other: 'אחר' },
        apartment_help: { yes: 'יש', no: 'אין', partial: 'חלקי' },
        life_aspiration: {
            learning: 'תלמוד תורה', career: 'קריירה', family: 'בניית בית', both: 'שילוב תורה ועבודה',
            study_only: 'ללמוד יום שלם', study_and_work: 'ללמוד ולעבוד',
            fixed_times: 'לקבוע עיתים', work_only: 'רק לעבוד'
        },
        home_style: { quiet: 'שקטה ורגועה', active: 'פעילה וחברותית', flexible: 'גמיש' },
        country_of_birth: { israel: 'ישראל', abroad: 'חו"ל' },
        favorite_study: { iyun: 'עיון', bekiut: 'בקיאות', none: 'ללא העדפה' },
    };
    const tr = (field, val) => T[field]?.[val] || val || '—';
    const show = (val) => val && val !== '' && val !== '0' && val !== 0 && val !== 'null' && val !== 'undefined';

    /** תמונות פרופיל: תומך במערך Postgres, JSON מחרוזת, או נתיב יחיד */
    const normalizeProfileImages = (raw) => {
        if (raw == null) return [];
        if (Array.isArray(raw)) return raw.filter(Boolean);
        if (typeof raw === 'string') {
            const s = raw.trim();
            if (!s) return [];
            if (s.startsWith('[')) {
                try {
                    const p = JSON.parse(s);
                    return Array.isArray(p) ? p.filter(Boolean) : [];
                } catch {
                    return [];
                }
            }
            return [s];
        }
        return [];
    };

    const images = normalizeProfileImages(user.profile_images);

    const mediaUrl = (p) => getSecureUrl(p);

    const tabs = [
        { id: 1, label: '📝 פרטים' },
        { id: 2, label: '💼 עיסוק' },
        { id: 3, label: '🔒 ממליצים' },
        { id: 4, label: '🔍 דרישות' },
    ];

    return (
        <div style={readOnly ? {...S.page, minHeight: 'auto', padding: 0, background: 'none'} : S.page}>
            {/* Lightbox */}
            {lightboxSrc && (
                <ImageLightbox
                    src={lightboxSrc}
                    alt="תמונת פרופיל"
                    onClose={() => setLightboxSrc(null)}
                />
            )}

            {!readOnly && (
                <div style={S.pageHeader}>
                    <h1 style={S.pageTitle}>📋 הכרטיס שלי</h1>
                    <p style={S.pageSubtitle}>כך נראה הפרופיל שלך למציעים</p>
                </div>
            )}

            <div style={S.card}>
                {/* ── Hero section ── */}
                <div style={S.hero}>
                    {/* Photos or avatar */}
                    <div style={S.heroLeft}>
                        {images.length > 0 ? (
                            <div style={S.photosRow}>
                                {images.slice(0, 3).map((img, i) => (
                                    <img key={i}
                                        src={mediaUrl(img)}
                                        alt={`תמונה ${i + 1}`}
                                        draggable={false}
                                        onContextMenu={e => e.preventDefault()}
                                        onClick={() => setLightboxSrc(mediaUrl(img))}
                                        style={{ ...S.profilePhoto, ...(i === 0 ? S.photoPrimary : S.photoSecondary), cursor: 'zoom-in' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ))}
                                {images.length > 3 && (
                                    <div style={S.morePhotos}>+{images.length - 3}</div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'מ פ')}&background=c9a227&color=fff&size=160&bold=true&font-size=0.35`}
                                alt={user.full_name}
                                style={S.avatarImg}
                            />
                        )}
                        <div style={user.is_approved ? S.badgeGreen : S.badgeOrange}>
                            {user.is_approved ? '✅ מאושר' : '⏳ ממתין'}
                        </div>
                    </div>

                    {/* Basic info */}
                    <div style={S.heroRight}>
                        <h2 style={S.heroName}>{user.full_name} {user.last_name || ''}</h2>
                        <div style={S.heroTags}>
                            {show(user.age) && <span style={S.heroTag}>🎂 {user.age} שנים</span>}
                            {show(user.gender) && <span style={S.heroTag}>{tr('gender', user.gender)}</span>}
                            {show(user.height) && <span style={S.heroTag}>📏 {user.height} ס"מ</span>}
                            {show(user.city) && <span style={S.heroTag}>📍 {user.city}</span>}
                            {show(user.status) && <span style={S.heroTag}>{tr('status', user.status)}</span>}
                            {show(user.heritage_sector) && <span style={S.heroTag}>{tr('heritage_sector', user.heritage_sector)}</span>}
                            {show(user.family_background) && <span style={S.heroTag}>{tr('family_background', user.family_background)}</span>}
                        </div>
                        {user.has_children && <p style={S.heroDetail}>👶 ילדים: {user.children_count || 'כן'}</p>}
                        <p style={S.heroMeta}>📅 תאריך פתיחה: {user.created_at ? new Date(user.created_at).toLocaleDateString('he-IL') : '—'}</p>
                    </div>
                </div>

                {/* ── Contact box ── */}
                <div style={S.contactBox}>
                    <span style={S.contactLabel}>📞 איש קשר לשידוך:</span>
                    <span style={S.contactValue}>{tr('contact_person_type', user.contact_person_type)}</span>
                    {show(user.contact_person_name) && <span style={S.contactValue}>— {user.contact_person_name}</span>}
                    {show(user.contact_phone_1) && <span style={S.contactPhone}>{user.contact_phone_1}</span>}
                    {show(user.contact_phone_2) && <span style={S.contactPhone}>| {user.contact_phone_2}</span>}
                </div>

                {/* ── Admin Info (Only if isAdminView is true) ── */}
                {isAdminView && (
                    <div style={{...S.contactBox, background: '#fff1f2', borderBottom: '2px solid #fda4af', padding: '14px 24px', flexDirection: 'column', alignItems: 'stretch', gap: '12px'}}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{...S.contactLabel, color: '#be123c', marginLeft: '12px'}}>🛡️ פרטי מערכת (מנהל בלבד):</span>
                            {show(user.real_id_number) && <span style={S.contactValue}>🪪 ת.ז: {user.real_id_number}</span>}
                            {show(user.phone) && <span style={S.contactValue}>📞 {user.phone}</span>}
                            {show(user.email) && <span style={S.contactValue}>📧 {user.email}</span>}
                            {show(user.id_card_image_url) && (
                                <a href={mediaUrl(user.id_card_image_url)} target="_blank" rel="noreferrer"
                                   style={{color: '#be123c', fontWeight: 'bold', textDecoration: 'underline'}}>
                                    🖼️ פתח צילום ת.ז בלשונית חדשה
                                </a>
                            )}
                        </div>
                        {show(user.id_card_image_url) && (
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #fecdd3' }}>
                                <div style={{ fontWeight: '800', color: '#9f1239', marginBottom: '10px', fontSize: '0.95rem' }}>🆔 תצוגה מקדימה — תעודת זהות</div>
                                <img
                                    src={mediaUrl(user.id_card_image_url)}
                                    alt="צילום תעודת זהות"
                                    style={{
                                        width: '100%',
                                        maxHeight: isAdminView ? 'min(70vh, 520px)' : '320px',
                                        objectFit: 'contain',
                                        borderRadius: '10px',
                                        border: '2px solid #e5e7eb',
                                        background: '#f8fafc'
                                    }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </div>
                        )}
                        {isAdminView && images.length > 0 && (
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #fecdd3' }}>
                                <div style={{ fontWeight: '800', color: '#9f1239', marginBottom: '10px', fontSize: '0.95rem' }}>📷 כל תמונות הפרופיל ({images.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                                    {images.map((img, i) => (
                                        <a key={i} href={mediaUrl(img)} target="_blank" rel="noreferrer">
                                            <img
                                                src={mediaUrl(img)}
                                                alt={`פרופיל ${i + 1}`}
                                                style={{
                                                    width: '140px',
                                                    height: '170px',
                                                    objectFit: 'cover',
                                                    borderRadius: '12px',
                                                    border: '3px solid #c9a227'
                                                }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* ── Tabs ── */}
                <div style={S.tabsBar}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            style={activeTab === t.id ? S.tabActive : S.tab}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={S.tabContent}>

                    {/* ════ TAB 1 - Details ════ */}
                    {activeTab === 1 && (
                        <div style={S.tabGrid}>

                            {/* Family background */}
                            <Section title="👨‍👩‍👧‍👦 רקע משפחתי" color="#f0fdf4" border="#86efac">
                                <Row label="רקע דתי" val={tr('family_background', user.family_background)} />
                                <Row label="מגזר עדתי" val={tr('heritage_sector', user.heritage_sector)} />
                                <Row label="עדת האב" val={tr('heritage_sector', user.father_heritage)} />
                                <Row label="עדת האם" val={tr('heritage_sector', user.mother_heritage)} />
                                <Row label="עיסוק האב" val={user.father_occupation} />
                                <Row label="עיסוק האם" val={user.mother_occupation} />
                                <Row label="מספר אחים" val={user.siblings_count} />
                                <Row label="מיקום בין האחים" val={user.sibling_position} />
                                <Row label="ארץ לידה" val={tr('country_of_birth', user.country_of_birth)} />
                                {show(user.siblings_details) && <Row label="פרטי אחים" val={user.siblings_details} fullWidth />}
                            </Section>

                            {/* Appearance */}
                            <Section title="🪞 מראה חיצוני" color="#f0f9ff" border="#93c5fd">
                                <Row label="גובה" val={show(user.height) ? `${user.height} ס"מ` : null} />
                                <Row label="מבנה גוף" val={tr('body_type', user.body_type)} />
                                <Row label="גוון עור" val={tr('skin_tone', user.skin_tone)} />
                                <Row label="מראה כללי" val={tr('appearance', user.appearance)} />
                            </Section>

                            {/* About me */}
                            {(show(user.about_me) || show(user.home_style) || show(user.important_in_life)) && (
                                <Section title="💭 על עצמי" color="#f8fafc" border="#94a3b8" fullWidth>
                                    {show(user.about_me) && <FreeText label="על עצמי" text={user.about_me} />}
                                    {show(user.home_style) && <Row label="סגנון בית" val={tr('home_style', user.home_style)} />}
                                    {show(user.important_in_life) && <FreeText label="מה חשוב לי בחיים" text={user.important_in_life} />}
                                </Section>
                            )}

                            {/* Partner description */}
                            {show(user.partner_description) && (
                                <Section title="💎 בן/בת הזוג שאני מחפש" color="#fdf4ff" border="#d8b4fe" fullWidth>
                                    <FreeText text={user.partner_description} />
                                </Section>
                            )}

                            {/* Financial */}
                            <Section title="🏠 דיור ומימון" color="#fef9ec" border="#fcd34d">
                                {(() => {
                                    const ah = user.apartment_help || '';
                                    // Handle format like 'yes (330000)' or just 'yes'
                                    const match = ah.match(/^(yes|no|partial)\s*(?:\((\d+)\))?/);
                                    const helpVal = match ? match[1] : ah;
                                    const amount = match && match[2] ? match[2] : user.apartment_amount;
                                    return (
                                        <>
                                            <Row label="עזרת דירה" val={tr('apartment_help', helpVal)} />
                                            {amount && <Row label="סכום עזרה" val={`₪${Number(amount).toLocaleString()}`} />}
                                        </>
                                    );
                                })()}
                            </Section>
                        </div>
                    )}

                    {/* ════ TAB 2 - Occupation ════ */}
                    {activeTab === 2 && (
                        <div style={S.tabGrid}>
                            <Section title="💼 עיסוק ולימודים" color="#f0f9ff" border="#93c5fd" fullWidth>
                                <Row label="עיסוק כעת" val={tr('current_occupation', user.current_occupation)} />
                                <Row label="שאיפה" val={tr('life_aspiration', user.life_aspiration)} />
                                <Row label="מקצוע" val={user.work_field} />
                                <Row label="פרטי עיסוק" val={user.occupation_details} fullWidth />
                                {user.gender === 'male' && <Row label="ישיבה גדולה" val={user.study_place} />}
                                {user.gender === 'male' && <Row label="ישיבה" val={user.yeshiva_name} />}
                                {user.gender === 'male' && <Row label="ישיבה קטנה" val={user.yeshiva_ketana_name} />}
                                {user.gender === 'female' && <Row label="סמינר/מוסד" val={user.study_place} />}
                                <Row label="תחום לימוד" val={user.study_field} />
                                <Row label="נושא לימוד אהוב" val={tr('favorite_study', user.favorite_study)} />
                            </Section>
                        </div>
                    )}

                    {/* ════ TAB 3 - References ════ */}
                    {activeTab === 3 && (
                        <div>
                            <div style={isAdminView ? { ...S.lockedNote, background: '#ecfdf5', color: '#166534', border: '1px solid #86efac' } : S.lockedNote}>
                                {isAdminView
                                    ? '👁️ צפייה מנהלית — כל הפרטים גלויים לצורך אישור ובדיקה'
                                    : '🔒 פרטים אלה נחשפים רק לאחר הסכמה הדדית'}
                            </div>
                            <div style={S.tabGrid}>

                                <Section title="📍 פרטים מזהים" color="#fef2f2" border="#fca5a5">
                                    <Row label="כתובת" val={user.full_address} fullWidth />
                                    <Row label="שם האב" val={user.father_full_name} />
                                    <Row label="שם האם" val={user.mother_full_name} />
                                </Section>

                                <Section title="📞 ממליצים" color="#f0fdf4" border="#86efac">
                                    {['1', '2', '3'].map(n => user[`reference_${n}_name`] && (
                                        <div key={n} style={S.referenceItem}>
                                            <span style={S.refName}>{user[`reference_${n}_name`]}</span>
                                            <span style={S.refPhone}>{user[`reference_${n}_phone`] || ''}</span>
                                        </div>
                                    ))}
                                </Section>

                                <Section title="👨‍👩‍👧 ממליצים משפחה" color="#fef3c7" border="#fcd34d">
                                    {show(user.family_reference_name) && (
                                        <div style={S.referenceItem}>
                                            <span style={S.refName}>{user.family_reference_name}</span>
                                            <span style={S.refPhone}>{user.family_reference_phone || ''}</span>
                                        </div>
                                    )}
                                    {show(user.rabbi_name) && (
                                        <div style={S.referenceItem}>
                                            <span style={S.refBadge}>רב</span>
                                            <span style={S.refName}>{user.rabbi_name}</span>
                                            <span style={S.refPhone}>{user.rabbi_phone || ''}</span>
                                        </div>
                                    )}
                                    {show(user.mechutanim_name) && (
                                        <div style={S.referenceItem}>
                                            <span style={S.refBadge}>מחותנים</span>
                                            <span style={S.refName}>{user.mechutanim_name}</span>
                                            <span style={S.refPhone}>{user.mechutanim_phone || ''}</span>
                                        </div>
                                    )}
                                </Section>
                            </div>
                        </div>
                    )}

                    {/* ════ TAB 4 - Search criteria ════ */}
                    {activeTab === 4 && (
                        <div style={S.tabGrid}>
                            <Section title="🔍 מה אני מחפש" color="#fef3c7" border="#fcd34d" fullWidth>
                                <Row label="טווח גילאים" val={show(user.search_min_age) ? `${user.search_min_age}–${user.search_max_age}` : null} />
                                <Row label="טווח גובה" val={show(user.search_height_min) ? `${user.search_height_min}–${user.search_height_max} ס"מ` : null} />

                                {show(user.search_heritage_sectors) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>מגזרים עדתיים:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_heritage_sectors.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('heritage_sector', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {show(user.search_statuses) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>סטטוסים:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_statuses.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('status', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {show(user.search_body_types) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>מבנה גוף:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_body_types.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('body_type', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {show(user.search_backgrounds) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>רקע דתי:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_backgrounds.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('family_background', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {show(user.search_occupations) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>עיסוק מבוקש:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_occupations.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('current_occupation', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {show(user.search_life_aspirations) && (
                                    <div style={S.fullRow}>
                                        <span style={S.rowLabel}>שאיפה:</span>
                                        <div style={S.tagCloud}>
                                            {user.search_life_aspirations.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                                <span key={s} style={S.searchTag}>{tr('life_aspiration', s)}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Row label="מעורב עדתי" val={user.mixed_heritage_ok ? 'מתאים לי' : 'מעדיף/ת מגזר זהה'} />
                                {show(user.search_financial_min) && (
                                    <Row label="עזרת דירה מינימלית" val={`₪${Number(user.search_financial_min).toLocaleString()}`} />
                                )}
                                <Row label="ניתן לשיח" val={user.search_financial_discuss ? 'כן' : null} />
                            </Section>
                        </div>
                    )}
                </div>

                {/* ── Actions ── */}
                {!readOnly && (
                    <div style={S.actions}>
                        <button onClick={() => navigate('/profile')} style={S.btnPrimary}>✏️ ערוך פרופיל</button>
                        <button onClick={() => navigate('/matches')} style={S.btnSecondary}>← חזרה לשידוכים</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Helper components ──
function Section({ title, color, border, children, fullWidth }) {
    return (
        <div style={{
            background: color, border: `2px solid ${border}`,
            borderRadius: '14px', padding: '18px',
            gridColumn: fullWidth ? '1 / -1' : undefined,
            marginBottom: '4px'
        }}>
            <h4 style={{ margin: '0 0 14px', color: '#1e3a5f', fontSize: '1rem', fontWeight: '700' }}>{title}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                {children}
            </div>
        </div>
    );
}

function Row({ label, val, fullWidth }) {
    if (val === null || val === undefined || val === '—' || val === '' || val === 'null') return null;
    return (
        <div style={{ display: 'flex', gap: '6px', fontSize: '0.9rem', flexBasis: fullWidth ? '100%' : 'auto' }}>
            <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}:</span>
            <strong style={{ color: '#1e3a5f' }}>{val}</strong>
        </div>
    );
}

function FreeText({ label, text }) {
    if (!text) return null;
    return (
        <div style={{ flexBasis: '100%' }}>
            {label && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>{label}:</div>}
            <p style={{ margin: 0, lineHeight: 1.7, color: '#374151', fontSize: '0.95rem' }}>{text}</p>
        </div>
    );
}

// ── Styles ──
const S = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif",
        direction: 'rtl', padding: '20px'
    },
    spinner: {
        width: '50px', height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#c9a227', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    pageHeader: { textAlign: 'center', color: '#fff', marginBottom: '20px' },
    pageTitle: { fontSize: '2rem', margin: '0 0 6px', fontWeight: '800' },
    pageSubtitle: { margin: 0, opacity: 0.85, fontSize: '1rem' },
    card: {
        maxWidth: '760px', margin: '0 auto',
        background: '#fff', borderRadius: '22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
    },
    hero: {
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '28px', display: 'flex', gap: '24px', alignItems: 'flex-start'
    },
    heroLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 },
    avatarImg: { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #c9a227', objectFit: 'cover' },
    photosRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    profilePhoto: { borderRadius: '12px', objectFit: 'cover', border: '2px solid #c9a227' },
    photoPrimary: { width: '100px', height: '120px' },
    photoSecondary: { width: '62px', height: '78px' },
    morePhotos: {
        width: '62px', height: '78px', borderRadius: '12px',
        background: 'rgba(201,162,39,0.3)', border: '2px solid #c9a227',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#c9a227', fontWeight: '800', fontSize: '1.1rem'
    },
    badgeGreen: { padding: '5px 14px', background: '#22c55e', color: '#fff', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' },
    badgeOrange: { padding: '5px 14px', background: '#f59e0b', color: '#fff', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' },
    heroRight: { flex: 1, color: '#fff' },
    heroName: { margin: '0 0 12px', fontSize: '1.7rem', fontWeight: '800' },
    heroTags: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
    heroTag: { background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(5px)', padding: '5px 13px', borderRadius: '20px', fontSize: '0.88rem', color: '#fff', fontWeight: '500' },
    heroDetail: { margin: '4px 0', fontSize: '0.9rem', opacity: 0.9 },
    heroMeta: { margin: '6px 0 0', fontSize: '0.82rem', opacity: 0.7 },

    contactBox: {
        background: '#fef9ec', borderBottom: '1px solid #fcd34d',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        gap: '8px', flexWrap: 'wrap', fontSize: '0.92rem'
    },
    contactLabel: { color: '#92400e', fontWeight: '700' },
    contactValue: { color: '#1e3a5f', fontWeight: '600' },
    contactPhone: { color: '#3730a3', fontWeight: '700', background: '#e0e7ff', padding: '2px 10px', borderRadius: '12px' },

    tabsBar: { display: 'flex', borderBottom: '2px solid #e5e7eb' },
    tab: {
        flex: 1, padding: '13px 8px', background: '#f8fafc',
        borderTop: 'none', borderRight: 'none', borderLeft: 'none', borderBottom: '3px solid transparent',
        cursor: 'pointer', fontSize: '0.9rem',
        color: '#6b7280', fontFamily: 'inherit', fontWeight: '600',
        transition: 'all 0.15s'
    },
    tabActive: {
        flex: 1, padding: '13px 8px', background: '#fff',
        borderTop: 'none', borderRight: 'none', borderLeft: 'none', borderBottom: '3px solid #c9a227',
        cursor: 'pointer', fontSize: '0.9rem',
        color: '#1e3a5f', fontFamily: 'inherit', fontWeight: '800'
    },
    tabContent: { padding: '22px' },
    tabGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
    },

    lockedNote: {
        textAlign: 'center', padding: '12px 20px',
        background: '#fff7ed', borderRadius: '10px',
        marginBottom: '18px', color: '#c2410c', fontWeight: '700', fontSize: '0.92rem'
    },

    referenceItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexBasis: '100%' },
    refBadge: { background: '#1e3a5f', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700', whiteSpace: 'nowrap' },
    refName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.92rem' },
    refPhone: { color: '#3730a3', fontSize: '0.88rem' },

    fullRow: { flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
    rowLabel: { color: '#64748b', fontSize: '0.9rem', whiteSpace: 'nowrap' },
    rowVal: { color: '#1e3a5f', fontWeight: '700', fontSize: '0.9rem' },
    tagCloud: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
    searchTag: {
        background: '#e0e7ff', color: '#3730a3',
        padding: '3px 12px', borderRadius: '15px',
        fontSize: '0.82rem', fontWeight: '600'
    },

    actions: {
        padding: '18px 22px', borderTop: '1px solid #e5e7eb',
        display: 'flex', gap: '12px'
    },
    btnPrimary: {
        flex: 1, padding: '13px',
        background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
        color: '#1a1a1a', border: 'none', borderRadius: '12px',
        fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
        fontFamily: 'inherit'
    },
    btnSecondary: {
        flex: 1, padding: '13px',
        background: '#f1f5f9', color: '#475569',
        border: '2px solid #e2e8f0', borderRadius: '12px',
        fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
        fontFamily: 'inherit'
    }
};

export default ProfileView;
