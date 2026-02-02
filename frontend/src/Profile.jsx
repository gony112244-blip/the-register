import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Profile() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const savedUser = JSON.parse(localStorage.getItem('user'));
    const { showToast } = useToast();

    // מצב הטופס - כל השדות
    const [user, setUser] = useState({
        // פרטים בסיסיים
        full_name: '', last_name: '', age: '', gender: 'male',
        status: 'single', has_children: false, children_count: 0,

        // 📞 איש קשר לשידוך (מי ליצור עימו קשר?)
        contact_person_type: 'self', // self/parent/other
        contact_person_name: '',
        contact_phone_1: '',
        contact_phone_2: '',

        // רקע משפחתי
        family_background: '', heritage_sector: '', // מגזר עדתי לסינון
        father_occupation: '', mother_occupation: '',
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
        email: '', full_address: '', father_full_name: '', mother_full_name: '', siblings_details: '',
        reference_1_name: '', reference_1_phone: '',
        reference_2_name: '', reference_2_phone: '',
        reference_3_name: '', reference_3_phone: '',
        family_reference_name: '', family_reference_phone: '',
        rabbi_name: '', rabbi_phone: '',
        mechutanim_name: '', mechutanim_phone: '',

        // חלק ג - דרישות (פשוט יותר!)
        search_min_age: '', search_max_age: '',
        search_height_min: '', search_height_max: '',
        search_body_types: '', search_appearances: '',
        search_statuses: '', search_backgrounds: '',
        search_heritage_sectors: '', // מגזרים עדתיים מתאימים
        mixed_heritage_ok: true, search_financial_min: '', search_financial_discuss: false,

        // מצב אישור
        is_approved: false, id_card_image_url: ''
    });

    const [activeSection, setActiveSection] = useState(1); // איזה חלק פתוח
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
            // אם המשתמש כבר מאושר - השינויים צריכים אישור מנהל
            if (user.is_approved) {
                // הצגת אזהרה
                const confirmed = window.confirm(
                    "⚠️ שים לב!\n\n" +
                    "הפרופיל שלך כבר מאושר.\n" +
                    "השינויים יועברו לבדיקת המנהל ויאושרו תוך 28 שעות לכל היותר.\n\n" +
                    "להמשיך?"
                );

                if (!confirmed) return;

                // שליחת בקשה לאישור שינויים
                const res = await fetch('http://localhost:3000/request-profile-update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ changes: user })
                });

                if (res.ok) {
                    const data = await res.json();
                    showToast(`${data.message}\n${data.info}`, "info");
                    // עדכון מצב ממתין
                    setUser(prev => ({ ...prev, is_profile_pending: true }));
                    setTimeout(() => navigate('/my-profile'), 2000);
                } else {
                    const error = await res.json();
                    showToast(error.message, "error");
                }
            } else {
                // משתמש חדש - שמירה ישירה
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
                    showToast("הפרטים נשמרו בהצלחה!", "success");
                } else {
                    showToast("שגיאה בשמירה", "error");
                }
            }
        } catch (err) {
            showToast("שגיאה בתקשורת לשרת", "error");
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
                showToast("תמונת ת.ז. הועלתה!", "success");
            } else {
                showToast(data.message, "error");
            }
        } catch (err) {
            showToast("שגיאה בהעלאה", "error");
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



                {/* סטטוס אישור - מתוקן */}
                <div style={{
                    ...styles.statusBar,
                    background: user.is_approved ? '#d4edda' : '#fff3cd',
                    borderColor: user.is_approved ? '#28a745' : '#ffc107',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '1.5rem', marginLeft: '10px' }}>{user.is_approved ? '✅' : '⏳'}</span>
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

                        {/* 📞 איש קשר לשידוך */}
                        <div style={{ ...styles.card, background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b' }}>
                            <h3 style={styles.cardTitle}>📞 עם מי ליצור קשר לשידוך?</h3>
                            <p style={{ ...styles.hint, color: '#92400e', marginBottom: '15px' }}>
                                💡 אצלנו הורים רבים מתעסקים בשידוכים. הזן את פרטי איש הקשר שהשדכנית תתקשר אליו.
                            </p>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>מי מטפל בשידוך?</label>
                                    <select name="contact_person_type" value={user.contact_person_type || 'self'} onChange={handleChange} style={styles.input}>
                                        <option value="self">המועמד/ת בעצמו</option>
                                        <option value="father">האבא</option>
                                        <option value="mother">האמא</option>
                                        <option value="both_parents">שני ההורים</option>
                                        <option value="sibling">אח/אחות</option>
                                        <option value="other">אחר</option>
                                    </select>
                                </div>
                                {user.contact_person_type && user.contact_person_type !== 'self' && (
                                    <div style={styles.field}>
                                        <label>שם איש הקשר</label>
                                        <input name="contact_person_name" value={user.contact_person_name || ''} onChange={handleChange} placeholder="לדוגמא: יעקב כהן (האבא)" style={styles.input} />
                                    </div>
                                )}
                                <div style={styles.field}>
                                    <label>📱 טלפון ראשי ליצירת קשר</label>
                                    <input name="contact_phone_1" value={user.contact_phone_1 || ''} onChange={handleChange} placeholder="050-1234567" style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>📱 טלפון נוסף (אופציונלי)</label>
                                    <input name="contact_phone_2" value={user.contact_phone_2 || ''} onChange={handleChange} placeholder="טלפון חלופי" style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* רקע משפחתי */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>👨‍👩‍👧‍👦 רקע משפחתי</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>רקע משפחה (דתי)</label>
                                    <select name="family_background" value={user.family_background || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="haredi">חרדי</option>
                                        <option value="dati_leumi">דתי לאומי</option>
                                        <option value="masorti">מסורתי</option>
                                        <option value="baal_teshuva">חוזר בתשובה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>מגזר עדתי (לסינון)</label>
                                    <select name="heritage_sector" value={user.heritage_sector || ''} onChange={handleChange} style={styles.input}>
                                        <option value="">בחר...</option>
                                        <option value="ashkenazi">אשכנזי</option>
                                        <option value="sephardi">ספרדי</option>
                                        <option value="teimani">תימני</option>
                                        <option value="mixed">מעורב</option>
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
                                    <label>עדת האבא (פירוט)</label>
                                    <input name="father_heritage" value={user.father_heritage || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: פולני, מרוקאי, עיראקי..." />
                                </div>
                                <div style={styles.field}>
                                    <label>עדת האמא (פירוט)</label>
                                    <input name="mother_heritage" value={user.mother_heritage || ''} onChange={handleChange} style={styles.input} placeholder="לדוגמא: רומני, טוניסאי, תימני..." />
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
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>אימייל (לקבלת התראות ושחזור סיסמה)</label>
                                    <input name="email" type="email" value={user.email || ''} onChange={handleChange} style={styles.input} placeholder="your@email.com" />
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

                        {/* סטטוס */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💍 סטטוס</h3>
                            <p style={styles.hint}>אילו סטטוסים מתאימים לך? (אם לא תסמן - הכל מתאים)</p>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {[
                                    { value: 'single', label: 'רווק/ה' },
                                    { value: 'divorced', label: 'גרוש/ה' },
                                    { value: 'widower', label: 'אלמן/ה' }
                                ].map(option => (
                                    <label key={option.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        padding: '10px 15px',
                                        background: (user.search_statuses || '').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                        borderRadius: '8px',
                                        fontWeight: (user.search_statuses || '').includes(option.value) ? 'bold' : 'normal'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={(user.search_statuses || '').includes(option.value)}
                                            onChange={(e) => {
                                                const current = user.search_statuses ? user.search_statuses.split(',').filter(x => x) : [];
                                                if (e.target.checked) { current.push(option.value); }
                                                else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                setUser(prev => ({ ...prev, search_statuses: current.join(',') }));
                                            }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* רקע דתי */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🕍 רקע דתי</h3>
                            <p style={styles.hint}>אילו רקעים דתיים מתאימים לך? (אם לא תסמן - הכל מתאים)</p>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {[
                                    { value: 'haredi', label: 'חרדי' },
                                    { value: 'dati_leumi', label: 'דתי לאומי' },
                                    { value: 'masorti', label: 'מסורתי' },
                                    { value: 'baal_teshuva', label: 'חוזר בתשובה' }
                                ].map(option => (
                                    <label key={option.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        padding: '10px 15px',
                                        background: (user.search_backgrounds || '').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                        borderRadius: '8px',
                                        fontWeight: (user.search_backgrounds || '').includes(option.value) ? 'bold' : 'normal'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={(user.search_backgrounds || '').includes(option.value)}
                                            onChange={(e) => {
                                                const current = user.search_backgrounds ? user.search_backgrounds.split(',').filter(x => x) : [];
                                                if (e.target.checked) { current.push(option.value); }
                                                else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                setUser(prev => ({ ...prev, search_backgrounds: current.join(',') }));
                                            }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* מבנה גוף */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🏃 מבנה גוף</h3>
                            <p style={styles.hint}>אילו מבני גוף מתאימים לך? (אם לא תסמן - הכל מתאים)</p>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {[
                                    { value: 'very_thin', label: 'רזה מאוד' },
                                    { value: 'thin', label: 'רזה' },
                                    { value: 'average', label: 'ממוצע' },
                                    { value: 'full', label: 'מלא' }
                                ].map(option => (
                                    <label key={option.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        padding: '10px 15px',
                                        background: (user.search_body_types || '').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                        borderRadius: '8px',
                                        fontWeight: (user.search_body_types || '').includes(option.value) ? 'bold' : 'normal'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={(user.search_body_types || '').includes(option.value)}
                                            onChange={(e) => {
                                                const current = user.search_body_types ? user.search_body_types.split(',').filter(x => x) : [];
                                                if (e.target.checked) { current.push(option.value); }
                                                else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                setUser(prev => ({ ...prev, search_body_types: current.join(',') }));
                                            }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* מראה */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>✨ מראה כללי</h3>
                            <p style={styles.hint}>מה רמת המראה שמתאימה לך? (אם לא תסמן - הכל מתאים)</p>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {[
                                    { value: 'fair', label: 'סביר' },
                                    { value: 'ok', label: 'בסדר גמור' },
                                    { value: 'good', label: 'טוב' },
                                    { value: 'handsome', label: 'נאה' },
                                    { value: 'very_handsome', label: 'נאה מאוד' }
                                ].map(option => (
                                    <label key={option.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        padding: '10px 15px',
                                        background: (user.search_appearances || '').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                        borderRadius: '8px',
                                        fontWeight: (user.search_appearances || '').includes(option.value) ? 'bold' : 'normal'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={(user.search_appearances || '').includes(option.value)}
                                            onChange={(e) => {
                                                const current = user.search_appearances ? user.search_appearances.split(',').filter(x => x) : [];
                                                if (e.target.checked) { current.push(option.value); }
                                                else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                setUser(prev => ({ ...prev, search_appearances: current.join(',') }));
                                            }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* מגזר עדתי */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🌍 מגזר עדתי</h3>
                            <p style={styles.hint}>סמן אילו מגזרים מתאימים לך (אם לא תסמן כלום - הכל מתאים)</p>
                            <div style={{ ...styles.field, marginTop: '15px' }}>
                                <label>מגזרים שמתאימים לי:</label>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    {[
                                        { value: 'ashkenazi', label: 'אשכנזי' },
                                        { value: 'sephardi', label: 'ספרדי' },
                                        { value: 'teimani', label: 'תימני' },
                                        { value: 'mixed', label: 'מעורב' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_heritage_sectors || '').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_heritage_sectors || '').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_heritage_sectors || '').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_heritage_sectors ? user.search_heritage_sectors.split(',').filter(x => x) : [];
                                                    if (e.target.checked) {
                                                        current.push(option.value);
                                                    } else {
                                                        const index = current.indexOf(option.value);
                                                        if (index > -1) current.splice(index, 1);
                                                    }
                                                    setUser(prev => ({ ...prev, search_heritage_sectors: current.join(',') }));
                                                }}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
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

                {/* ==========================================
                    📷 העלאת תמונות פרופיל (עד 3)
                ========================================== */}
                <div style={styles.photoUploadCard}>
                    <h3 style={styles.cardTitle}>📷 תמונות פרופיל</h3>
                    <p style={styles.hint}>
                        אתה יכול להעלות עד 3 תמונות. אחרים יוכלו לראות שיש לך תמונות, אבל לא יראו אותן עד שתאשר.
                    </p>

                    {/* תמונות קיימות */}
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px' }}>
                        {(user.profile_images || []).map((imgUrl, idx) => (
                            <div key={idx} style={{ position: 'relative' }}>
                                <img
                                    src={`http://localhost:3000${imgUrl}`}
                                    alt={`תמונה ${idx + 1}`}
                                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '3px solid #c9a227' }}
                                />
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('למחוק את התמונה?')) return;
                                        try {
                                            const res = await fetch('http://localhost:3000/delete-profile-image', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                body: JSON.stringify({ imageUrl: imgUrl })
                                            });
                                            if (res.ok) {
                                                setUser(prev => ({ ...prev, profile_images: prev.profile_images.filter((_, i) => i !== idx) }));
                                                setMessage('✅ התמונה נמחקה');
                                            }
                                        } catch (err) {
                                            setMessage('❌ שגיאה במחיקה');
                                        }
                                    }}
                                    style={{
                                        position: 'absolute', top: '-8px', right: '-8px',
                                        background: '#ef4444', color: '#fff', border: 'none',
                                        borderRadius: '50%', width: '26px', height: '26px',
                                        cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >✕</button>
                            </div>
                        ))}
                    </div>

                    {/* כפתור העלאה */}
                    {(user.profile_images || []).length < 3 && (
                        <>
                            <input
                                type="file"
                                id="profileImageInput"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    setUploading(true);
                                    setMessage('⏳ מעלה תמונה...');

                                    const formData = new FormData();
                                    formData.append('profileImage', file);

                                    try {
                                        const res = await fetch('http://localhost:3000/upload-profile-image', {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` },
                                            body: formData
                                        });

                                        const data = await res.json();
                                        if (res.ok) {
                                            setMessage('✅ התמונה הועלתה!');
                                            setUser(prev => ({ ...prev, profile_images: [...(prev.profile_images || []), data.imageUrl] }));
                                        } else {
                                            setMessage(`❌ ${data.message}`);
                                        }
                                    } catch (err) {
                                        setMessage('❌ שגיאה בהעלאה');
                                    }
                                    setUploading(false);
                                }}
                            />
                            <button
                                onClick={() => document.getElementById('profileImageInput').click()}
                                disabled={uploading}
                                style={{
                                    ...styles.saveButton,
                                    background: uploading ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)'
                                }}
                            >
                                {uploading ? '⏳ מעלה...' : `📤 הוסף תמונה (${(user.profile_images || []).length}/3)`}
                            </button>
                        </>
                    )}
                </div>

                {/* ==========================================
                    🆔 העלאת תעודת זהות (בסוף הדף)
                ========================================== */}
                <div style={styles.idUploadCard}>
                    <h3 style={styles.cardTitle}>🆔 אימות זהות - תעודת זהות</h3>
                    <p style={styles.hint}>
                        {user.contact_person_type === 'self'
                            ? '📌 העלה צילום של תעודת הזהות שלך (כולל ספח)'
                            : '📌 אפשר להעלות את תעודת הזהות שלך (ההורה) או של המועמד עם ספח'}
                    </p>

                    {user.id_card_image_url && (
                        <div style={{
                            padding: '12px', borderRadius: '8px', marginBottom: '15px',
                            background: user.id_card_verified ? '#d4edda' : '#fff3cd',
                            border: `1px solid ${user.id_card_verified ? '#28a745' : '#ffc107'}`
                        }}>
                            {user.id_card_verified ? '✅ תעודת הזהות אומתה!' : '⏳ ממתינה לאימות'}
                        </div>
                    )}

                    {user.contact_person_type && user.contact_person_type !== 'self' && (
                        <div style={styles.field}>
                            <label>של מי התעודה?</label>
                            <select value={user.id_card_owner_type || 'candidate'} onChange={(e) => setUser(prev => ({ ...prev, id_card_owner_type: e.target.value }))} style={styles.input}>
                                <option value="candidate">של המועמד/ת</option>
                                <option value="parent">שלי (ההורה)</option>
                            </select>
                        </div>
                    )}

                    <input type="file" id="idCardInput" accept="image/*" style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setUploading(true);
                            const formData = new FormData();
                            formData.append('idCard', file);
                            formData.append('idOwner', user.contact_person_type === 'self' ? 'self' : (user.id_card_owner_type || 'candidate'));
                            try {
                                const res = await fetch('http://localhost:3000/upload-id-card', {
                                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
                                });
                                const data = await res.json();
                                if (res.ok) { setMessage('✅ ת"ז הועלתה!'); setUser(prev => ({ ...prev, id_card_image_url: data.imageUrl })); }
                                else { setMessage(`❌ ${data.message}`); }
                            } catch (err) { setMessage('❌ שגיאה'); }
                            setUploading(false);
                        }}
                    />
                    <button onClick={() => document.getElementById('idCardInput').click()} disabled={uploading}
                        style={{ ...styles.saveButton, background: uploading ? '#ccc' : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}>
                        {uploading ? '⏳ מעלה...' : (user.id_card_image_url ? '🔄 להחלפה' : '📤 להעלאת ת"ז')}
                    </button>

                    {user.id_card_image_url && (
                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <img src={`http://localhost:3000${user.id_card_image_url}`} alt="ת.ז" style={{ maxWidth: '180px', borderRadius: '8px', border: '2px solid #e5e7eb' }} />
                        </div>
                    )}
                </div>

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
    photoUploadCard: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '2px solid #f59e0b',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    idUploadCard: {
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        border: '2px solid #22c55e',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '20px',
        textAlign: 'center'
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