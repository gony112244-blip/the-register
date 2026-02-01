import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const savedUser = JSON.parse(localStorage.getItem('user'));

    // מצב הטופס - כל השדות
    const [user, setUser] = useState({
        // פרטים בסיסיים
        full_name: '', last_name: '', age: '', gender: 'male',
        status: 'single', has_children: false, children_count: 0,

        // רקע משפחתי
        family_background: '', father_occupation: '', mother_occupation: '',
        father_heritage: '', mother_heritage: '', siblings_count: '', sibling_position: '',

        // מראה
        height: '', body_type: '', skin_tone: '', appearance: '',

        // כלכלה ועיסוק
        apartment_help: '', current_occupation: '', yeshiva_name: '', work_field: '',
        life_aspiration: '', favorite_study: '', study_place: '', study_field: '',
        occupation_details: '',

        // על עצמי
        about_me: '', home_style: '', partner_description: '', important_in_life: '',

        // חלק ב - פרטים נסתרים
        full_address: '', father_full_name: '', mother_full_name: '', siblings_details: '',
        reference_1_name: '', reference_1_phone: '',
        reference_2_name: '', reference_2_phone: '',
        reference_3_name: '', reference_3_phone: '',
        family_reference_name: '', family_reference_phone: '',
        rabbi_name: '', rabbi_phone: '',
        mechutanim_name: '', mechutanim_phone: '',

        // חלק ג - דרישות
        search_min_age: '', search_max_age: '',
        search_height_min: '', search_height_max: '',
        search_body_types: '', search_appearances: '', search_skin_tones: '',
        search_statuses: '', search_backgrounds: '', unwanted_heritages: '',
        mixed_heritage_ok: true, search_financial_min: '', search_financial_discuss: false,

        // מצב אישור
        is_approved: false, id_card_image_url: ''
    });

    const [activeSection, setActiveSection] = useState(1); // איזה חלק פתוח
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    // טעינת פרטי משתמש
    useEffect(() => {
        if (!savedUser || !token) {
            navigate('/login');
            return;
        }
        setUser(prev => ({ ...prev, ...savedUser }));
    }, [navigate, token]);

    // שמירת שינויים
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUser(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // שמירה לשרת
    const handleSave = async () => {
        try {
            const res = await fetch('http://localhost:3000/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(user)
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                setMessage("✅ הפרטים נשמרו בהצלחה!");
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage("❌ שגיאה בשמירה");
            }
        } catch (err) {
            setMessage("❌ שגיאה בתקשורת לשרת");
        }
    };

    // העלאת תמונת ת.ז.
    const handleIdCardUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('id_card', file);

        try {
            const res = await fetch('http://localhost:3000/upload-id-card', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setUser(prev => ({ ...prev, id_card_image_url: data.imageUrl }));
                setMessage("✅ תמונת ת.ז. הועלתה!");
            } else {
                setMessage("❌ " + data.message);
            }
        } catch (err) {
            setMessage("❌ שגיאה בהעלאה");
        }
        setUploading(false);
    };

    const isMale = user.gender === 'male';

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* כותרת */}
                <div style={styles.header}>
                    <h1 style={styles.title}>📋 הפנקס שלי</h1>
                    <p style={styles.subtitle}>ככל שתמלא יותר פרטים - כך נוכל להציע לך הצעות מדויקות יותר</p>
                </div>

                {message && <div style={styles.alert}>{message}</div>}

                {/* סטטוס אישור */}
                <div style={{
                    ...styles.statusBar,
                    background: user.is_approved ? '#d4edda' : '#fff3cd',
                    borderColor: user.is_approved ? '#28a745' : '#ffc107'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>{user.is_approved ? '✅' : '⏳'}</span>
                    <div>
                        <strong>{user.is_approved ? 'הפרופיל מאושר!' : 'ממתין לאישור'}</strong>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                            {user.is_approved
                                ? 'אתה יכול לראות הצעות ואחרים רואים אותך ברשימה'
                                : 'נא להעלות תמונת ת.ז. ולמלא את הפרטים'}
                        </p>
                    </div>
                </div>

                {/* טאבים */}
                <div style={styles.tabs}>
                    <button
                        onClick={() => setActiveSection(1)}
                        style={activeSection === 1 ? styles.activeTab : styles.tab}
                    >
                        📝 חלק א' - פרטים לרשימה
                    </button>
                    <button
                        onClick={() => setActiveSection(2)}
                        style={activeSection === 2 ? styles.activeTab : styles.tab}
                    >
                        🔒 חלק ב' - ממליצים
                    </button>
                    <button
                        onClick={() => setActiveSection(3)}
                        style={activeSection === 3 ? styles.activeTab : styles.tab}
                    >
                        🔍 חלק ג' - מה אני מחפש
                    </button>
                </div>

                {/* =========== חלק א' - פרטים לרשימה =========== */}
                {activeSection === 1 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>📝 חלק א' - פרטים לרשימה</h2>
                            <p style={styles.sectionDesc}>
                                הפרטים הבאים יופיעו <strong>ברשימה</strong> ויעזרו למציעים להכיר אותך.
                                מלא בכנות ובאחריות.
                            </p>
                        </div>

                        {/* פרטים בסיסיים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>👤 פרטים בסיסיים</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>שם פרטי</label>
                                    <input name="full_name" value={user.full_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>שם משפחה</label>
                                    <input name="last_name" value={user.last_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>גיל</label>
                                    <input name="age" type="number" value={user.age || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מגדר</label>
                                    <select name="gender" value={user.gender || 'male'} onChange={handleChange} style={styles.input}>
                                        <option value="male">גבר</option>
                                        <option value="female">אישה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>סטטוס</label>
                                    <select name="status" value={user.status || 'single'} onChange={handleChange} style={styles.input}>
                                        <option value="single">רווק/ה</option>
                                        <option value="divorced">גרוש/ה</option>
                                        <option value="widower">אלמן/ה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>יש ילדים?</label>
                                    <select name="has_children" value={user.has_children ? 'yes' : 'no'} onChange={(e) => setUser(prev => ({ ...prev, has_children: e.target.value === 'yes' }))} style={styles.input}>
                                        <option value="no">לא</option>
                                        <option value="yes">כן</option>
                                    </select>
                                </div>
                                {user.has_children && (
                                    <div style={styles.field}>
                                        <label>כמה ילדים?</label>
                                        <input name="children_count" type="number" value={user.children_count || ''} onChange={handleChange} style={styles.input} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* רקע משפחתי */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>👨‍👩‍👧‍👦 רקע משפחתי</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>רקע משפחה</label>
                                    <select name="family_background" value={user.family_background || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="haredi">חרדי</option>
                                        <option value="dati_leumi">דתי לאומי</option>
                                        <option value="masorti">מסורתי</option>
                                        <option value="baal_teshuva">חוזר בתשובה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>עיסוק האבא</label>
                                    <input name="father_occupation" value={user.father_occupation || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עיסוק האמא</label>
                                    <input name="mother_occupation" value={user.mother_occupation || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עדת האבא</label>
                                    <input name="father_heritage" value={user.father_heritage || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: אשכנזי, ספרדי, תימני..." />
                                </div>
                                <div style={styles.field}>
                                    <label>עדת האמא</label>
                                    <input name="mother_heritage" value={user.mother_heritage || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: אשכנזי, ספרדי, תימני..." />
                                </div>
                                <div style={styles.field}>
                                    <label>מספר אחים</label>
                                    <input name="siblings_count" type="number" value={user.siblings_count || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מיקום בין האחים</label>
                                    <input name="sibling_position" type="number" value={user.sibling_position || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: 3 (שלישי)" />
                                </div>
                            </div>
                        </div>

                        {/* מראה חיצוני */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🪞 מראה חיצוני</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>גובה (ס"מ)</label>
                                    <input name="height" type="number" value={user.height || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: 175" />
                                </div>
                                <div style={styles.field}>
                                    <label>מבנה גוף</label>
                                    <select name="body_type" value={user.body_type || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="very_thin">רזה מאוד</option>
                                        <option value="thin">רזה</option>
                                        <option value="average">ממוצע</option>
                                        <option value="full">מלא</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>גוון עור</label>
                                    <select name="skin_tone" value={user.skin_tone || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="very_light">בהיר מאוד</option>
                                        <option value="light">בהיר</option>
                                        <option value="medium">ממוצע</option>
                                        <option value="tan">שזוף</option>
                                        <option value="dark">כהה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>מראה כללי</label>
                                    <select name="appearance" value={user.appearance || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="fair">סביר</option>
                                        <option value="ok">בסדר גמור</option>
                                        <option value="good">טוב</option>
                                        <option value="handsome">נאה</option>
                                        <option value="very_handsome">נאה מאוד</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* כלכלה */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💰 כלכלה</h3>
                            <div style={styles.field}>
                                <label>עזרה לדירה</label>
                                <select name="apartment_help" value={user.apartment_help || ''} onChange={handleChange} style={styles.input}>
                                    <option value="">בחר...</option>
                                    <option value="no">אין</option>
                                    <option value="discuss">נדון בהמשך דרך השדכנית</option>
                                    <option value="partial">עזרה חלקית</option>
                                    <option value="full">דירה מלאה</option>
                                </select>
                            </div>
                        </div>

                        {/* עיסוק - משתנה לפי מגדר */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💼 עיסוק ושאיפות</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>עיסוק כעת</label>
                                    <select name="current_occupation" value={user.current_occupation || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        {isMale ? (
                                            <>
                                                <option value="studying">לומד</option>
                                                <option value="working">עובד</option>
                                                <option value="both">משלב</option>
                                                <option value="fixed_times">קובע עיתים</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="studying">לומדת</option>
                                                <option value="working">עובדת</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {isMale && user.current_occupation === 'studying' && (
                                    <div style={styles.field}>
                                        <label>שם הישיבה</label>
                                        <input name="yeshiva_name" value={user.yeshiva_name || ''} onChange={handleChange} style={styles.input} />
                                    </div>
                                )}

                                {user.current_occupation === 'working' && (
                                    <div style={styles.field}>
                                        <label>תחום העבודה</label>
                                        <input name="work_field" value={user.work_field || ''} onChange={handleChange} style={styles.input} />
                                    </div>
                                )}

                                {isMale && (
                                    <>
                                        <div style={styles.field}>
                                            <label>שאיפה בחיים</label>
                                            <select name="life_aspiration" value={user.life_aspiration || ''} onChange={handleChange} style={styles.input}>
                                                <option value="">בחר...</option>
                                                <option value="study_only">ללמוד יום שלם</option>
                                                <option value="study_and_work">ללמוד ולעבוד</option>
                                                <option value="fixed_times">לקבוע עיתים</option>
                                                <option value="work_only">רק לעבוד</option>
                                            </select>
                                        </div>
                                        <div style={styles.field}>
                                            <label>חלק אהוב בלימוד</label>
                                            <select name="favorite_study" value={user.favorite_study || ''} onChange={handleChange} style={styles.input}>
                                                <option value="">בחר...</option>
                                                <option value="iyun">עיון</option>
                                                <option value="bekiut">בקיאות</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {!isMale && (
                                    <>
                                        <div style={styles.field}>
                                            <label>מקום לימודים</label>
                                            <input name="study_place" value={user.study_place || ''} onChange={handleChange} style={styles.input} />
                                        </div>
                                        <div style={styles.field}>
                                            <label>תחום לימודים</label>
                                            <input name="study_field" value={user.study_field || ''} onChange={handleChange} style={styles.input} />
                                        </div>
                                    </>
                                )}

                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>פירוט נוסף (אופציונלי)</label>
                                    <textarea name="occupation_details" value={user.occupation_details || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} placeholder="מי שרוצה להרחיב על הישגים והתמחות..." />
                                </div>
                            </div>
                        </div>

                        {/* על עצמי */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💭 על עצמי</h3>
                            <p style={styles.hint}>מי שמתבייש יכול לבקש מאחר שיכתוב עליו</p>
                            <div style={styles.grid}>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>מעט על עצמי</label>
                                    <textarea name="about_me" value={user.about_me || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '100px' }} placeholder="ספר/י על עצמך בקצרה..." />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>סגנון הבית שאני רוצה</label>
                                    <textarea name="home_style" value={user.home_style || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} placeholder="איזה אווירה אתה רוצה בבית..." />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>השידוך שאני רוצה</label>
                                    <textarea name="partner_description" value={user.partner_description || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} placeholder="מה חשוב לך בבן/בת הזוג..." />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>מה באמת חשוב לי בחיים ומה אני אוהב לעשות?</label>
                                    <textarea name="important_in_life" value={user.important_in_life || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} placeholder="תחביבים, ערכים, שאיפות..." />
                                </div>
                            </div>
                        </div>

                        {/* העלאת תמונת ת.ז. */}
                        <div style={{ ...styles.card, background: '#fff3cd', borderColor: '#ffc107' }}>
                            <h3 style={styles.cardTitle}>🪪 אימות זהות</h3>
                            <p style={styles.hint}>נדרש להעלות תמונת תעודת זהות לאימות. התמונה תישמר באופן מאובטח ותשמש לאימות בלבד.</p>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleIdCardUpload}
                                disabled={uploading}
                                style={styles.fileInput}
                            />

                            {user.id_card_image_url && (
                                <div style={{ marginTop: '15px' }}>
                                    <p style={{ color: '#28a745' }}>✅ תמונת ת.ז. הועלתה</p>
                                    <img
                                        src={`http://localhost:3000${user.id_card_image_url}`}
                                        alt="ת.ז."
                                        style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* =========== חלק ב' - ממליצים =========== */}
                {activeSection === 2 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>🔒 חלק ב' - פרטי ממליצים</h2>
                            <p style={styles.sectionDesc}>
                                הפרטים הבאים יחשפו <strong>רק לאחר שני הצדדים הסכימו להתקדם</strong>.
                                כך אפשר לעשות ברורים לפני ההחלטה.
                            </p>
                        </div>

                        {/* כתובת ופרטי הורים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📍 פרטים אישיים</h3>
                            <div style={styles.grid}>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>כתובת מלאה</label>
                                    <input name="full_address" value={user.full_address || ''} onChange={handleChange} style={styles.input} placeholder="עיר, רחוב, מספר" />
                                </div>
                                <div style={styles.field}>
                                    <label>שם מלא של האבא</label>
                                    <input name="father_full_name" value={user.father_full_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>שם מלא של האמא</label>
                                    <input name="mother_full_name" value={user.mother_full_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>פרטי אחים (אופציונלי)</label>
                                    <textarea name="siblings_details" value={user.siblings_details || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} placeholder="שמות האחים ועיסוקם..." />
                                </div>
                            </div>
                        </div>

                        {/* ממליצים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📞 ממליצים לברורים (לפחות 2)</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>חבר 1 - שם</label>
                                    <input name="reference_1_name" value={user.reference_1_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 1 - טלפון</label>
                                    <input name="reference_1_phone" value={user.reference_1_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 2 - שם</label>
                                    <input name="reference_2_name" value={user.reference_2_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 2 - טלפון</label>
                                    <input name="reference_2_phone" value={user.reference_2_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 3 - שם (אופציונלי)</label>
                                    <input name="reference_3_name" value={user.reference_3_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 3 - טלפון</label>
                                    <input name="reference_3_phone" value={user.reference_3_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* מכירים נוספים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>👥 מכירים נוספים</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>מכיר משפחה - שם</label>
                                    <input name="family_reference_name" value={user.family_reference_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מכיר משפחה - טלפון</label>
                                    <input name="family_reference_phone" value={user.family_reference_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>רב/רבנית - שם (לא חובה)</label>
                                    <input name="rabbi_name" value={user.rabbi_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>רב/רבנית - טלפון</label>
                                    <input name="rabbi_phone" value={user.rabbi_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מחותנים - שם (לא חובה)</label>
                                    <input name="mechutanim_name" value={user.mechutanim_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מחותנים - טלפון</label>
                                    <input name="mechutanim_phone" value={user.mechutanim_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========== חלק ג' - מה אני מחפש =========== */}
                {activeSection === 3 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>🔍 חלק ג' - מה אני מחפש</h2>
                            <p style={styles.sectionDesc}>
                                <strong>שים לב:</strong> ככל שתהיה יותר ברור - נוכל להציע לך הצעות מדויקות יותר.
                                <br />⚠️ <strong>אבל</strong> - ככל שתגביל יותר, פחות הצעות יראו אותך ברשימה!
                            </p>
                        </div>

                        {/* טווח גילאים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🎂 טווח גילאים</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>מגיל</label>
                                    <input name="search_min_age" type="number" value={user.search_min_age || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עד גיל</label>
                                    <input name="search_max_age" type="number" value={user.search_max_age || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* טווח גובה */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📏 טווח גובה</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>מגובה (ס"מ)</label>
                                    <input name="search_height_min" type="number" value={user.search_height_min || ''} onChange={handleChange} style={styles.input} placeholder="השאר ריק = הכל" />
                                </div>
                                <div style={styles.field}>
                                    <label>עד גובה (ס"מ)</label>
                                    <input name="search_height_max" type="number" value={user.search_height_max || ''} onChange={handleChange} style={styles.input} placeholder="השאר ריק = הכל" />
                                </div>
                            </div>
                        </div>

                        {/* העדפות עדה */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🌍 עדות</h3>
                            <div style={styles.grid}>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>עדות שלא מתאימות (אופציונלי)</label>
                                    <input name="unwanted_heritages" value={user.unwanted_heritages || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: תימני, מרוקאי... (השאר ריק = מתאים הכל)" />
                                </div>
                                <div style={styles.field}>
                                    <label>האם עדה מעורבת מתאימה?</label>
                                    <select name="mixed_heritage_ok" value={user.mixed_heritage_ok ? 'yes' : 'no'} onChange={(e) => setUser(prev => ({ ...prev, mixed_heritage_ok: e.target.value === 'yes' }))} style={styles.input}>
                                        <option value="yes">כן</option>
                                        <option value="no">לא</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* דרישות כלכליות */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💰 דרישות כלכליות</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>דרישה כלכלית מינימלית</label>
                                    <input name="search_financial_min" type="number" value={user.search_financial_min || ''} onChange={handleChange} style={styles.input} placeholder="השאר ריק = אין דרישה" />
                                </div>
                                <div style={styles.field}>
                                    <label>או</label>
                                    <select name="search_financial_discuss" value={user.search_financial_discuss ? 'yes' : 'no'} onChange={(e) => setUser(prev => ({ ...prev, search_financial_discuss: e.target.value === 'yes' }))} style={styles.input}>
                                        <option value="no">יש לי דרישה ספציפית</option>
                                        <option value="yes">נדון בזה בהמשך</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* כפתור שמירה */}
                <button onClick={handleSave} style={styles.saveButton}>
                    💾 שמור את כל הפרטים
                </button>

                <button onClick={() => navigate('/matches')} style={styles.backButton}>
                    → לצפייה ברשימה
                </button>
            </div>
        </div>
    );
}

// עיצוב
const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #1e3a5f 0%, #2d4a6f 40%, #3d5a7f 100%)',
        padding: '20px',
        direction: 'rtl',
        fontFamily: "'Heebo', 'Segoe UI', sans-serif"
    },
    container: {
        maxWidth: '900px',
        margin: '0 auto'
    },
    header: {
        textAlign: 'center',
        color: '#fff',
        marginBottom: '30px'
    },
    title: {
        fontSize: '2.5rem',
        margin: '0 0 10px'
    },
    subtitle: {
        fontSize: '1.1rem',
        opacity: 0.9
    },
    alert: {
        background: '#fff',
        padding: '15px 20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '20px',
        border: '2px solid'
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    },
    tab: {
        flex: 1,
        padding: '15px',
        border: '2px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.1)',
        color: '#fff',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '600',
        minWidth: '200px'
    },
    activeTab: {
        flex: 1,
        padding: '15px',
        border: '2px solid #c9a227',
        background: '#c9a227',
        color: '#1a1a1a',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '700',
        minWidth: '200px'
    },
    section: {
        background: '#fff',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '20px'
    },
    sectionHeader: {
        marginBottom: '25px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e5e7eb'
    },
    sectionDesc: {
        color: '#6b7280',
        lineHeight: 1.6
    },
    card: {
        background: '#f8fafc',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '20px',
        border: '1px solid #e5e7eb'
    },
    cardTitle: {
        margin: '0 0 20px',
        color: '#1e3a5f',
        fontSize: '1.2rem'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    input: {
        padding: '12px 15px',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        fontSize: '1rem',
        transition: 'border-color 0.3s'
    },
    hint: {
        color: '#6b7280',
        fontSize: '0.9rem',
        marginBottom: '15px'
    },
    fileInput: {
        padding: '15px',
        border: '2px dashed #ffc107',
        borderRadius: '10px',
        background: '#fffbeb',
        width: '100%',
        cursor: 'pointer'
    },
    saveButton: {
        width: '100%',
        padding: '18px',
        background: '#c9a227',
        color: '#1a1a1a',
        border: 'none',
        borderRadius: '15px',
        fontSize: '1.2rem',
        fontWeight: '700',
        cursor: 'pointer',
        marginBottom: '15px'
    },
    backButton: {
        width: '100%',
        padding: '15px',
        background: 'transparent',
        color: '#fff',
        border: '2px solid rgba(255,255,255,0.5)',
        borderRadius: '15px',
        fontSize: '1rem',
        cursor: 'pointer'
    }
};

export default Profile;