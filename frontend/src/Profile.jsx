import { API_BASE, FILE_BASE_URL } from './config';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './components/ToastProvider';

function Profile() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    let savedUser = null;
    try {
        const stored = localStorage.getItem('user');
        if (stored) savedUser = JSON.parse(stored);
    } catch (e) {
        console.error("Error parsing saved user:", e);
    }
    const { showToast } = useToast();

    // מצב הטופס - כל השדות
    const [user, setUser] = useState({
        // פרטים בסיסיים
        full_name: '', last_name: '', age: '', gender: '', country_of_birth: '', city: '',
        status: '', has_children: '', children_count: 0,

        // 📞 איש קשר לשידוך (מי ליצור עימו קשר?)
        contact_person_type: '', // חובה לבחור

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
        apartment_help: '', apartment_amount: '', current_occupation: '', yeshiva_name: '', yeshiva_ketana_name: '', work_field: '',
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

        // חלק ג - דרישות
        search_min_age: '', search_max_age: '',
        search_height_min: '', search_height_max: '',
        search_body_types: '', search_appearances: '',
        search_statuses: '', search_backgrounds: '',
        search_heritage_sectors: '', // מגזרים עדתיים מתאימים
        mixed_heritage_ok: true, search_financial_min: '', search_financial_discuss: false,
        search_occupations: '', search_life_aspirations: '', // שדות חיפוש חדשים

        // מצב אישור
        is_approved: false, id_card_image_url: '', profile_images: [],
        id_card_owner_type: 'candidate',

        // יבוא נתונים שמורים (דורס את הדיפולטים)
        ...savedUser
    });

    const [activeSection, setActiveSection] = useState(1); // איזה חלק פתוח
    const [idUploading, setIdUploading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [errors, setErrors] = useState({}); // שגיאות ולידציה
    const [message, setMessage] = useState('');

    // טעינת פרטי משתמש
    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/my-profile-data`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();

                    // פירמוט נתונים מורכבים (ישיבה קטנה, סכום דירה)
                    if (data.apartment_help && data.apartment_help.startsWith('yes (')) {
                        const match = data.apartment_help.match(/yes \((.*)\)/);
                        if (match) {
                            data.apartment_amount = match[1];
                            data.apartment_help = 'yes';
                        }
                    }
                    if (data.yeshiva_name && data.yeshiva_name.includes(' (קטנה: ')) {
                        const parts = data.yeshiva_name.split(' (קטנה: ');
                        data.yeshiva_name = parts[0];
                        data.yeshiva_ketana_name = parts[1].replace(')', '');
                    }

                    // מיזוג חכם ותיקון פורמטים — שדות ריקים מפורשים כ־'' כדי שהטופס יציג נכון
                    setUser(prev => {
                        const merged = { ...prev };
                        const emptyKeys = ['birth_date', 'country_of_birth', 'skin_tone', 'origin_country', 'aliyah_age'];
                        Object.keys(data).forEach(key => {
                            const val = data[key];
                            if (val !== null && val !== undefined && val !== '') {
                                if (key === 'birth_date') {
                                    try {
                                        merged[key] = new Date(val).toISOString().split('T')[0];
                                    } catch {
                                        merged[key] = val;
                                    }
                                } else {
                                    merged[key] = val;
                                }
                            } else if (emptyKeys.includes(key)) {
                                merged[key] = '';
                            }
                        });
                        return merged;
                    });

                    // עדכון גיל אוטומטי
                    if (data.birth_date) {
                        const birth = new Date(data.birth_date);
                        const today = new Date();
                        let age = today.getFullYear() - birth.getFullYear();
                        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
                            age--;
                        }
                        setUser(prev => ({ ...prev, age }));
                    }
                } else {
                    if (res.status === 401) navigate('/login');
                }
            } catch (err) {
                console.error("Failed to load profile", err);
                // Fallback to local storage if server fails
                // אנחנו כבר משתמשים ב-savedUser כ-state התחלתי, אז לא בטוח שצריך לעשות כאן משהו אקטיבי
            }
        };

        fetchProfile();
    }, [navigate, token]);

    // שמירת שינויים
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUser(prev => {
            const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

            // חישוב גיל אוטומטי אם משנים תאריך לידה
            if (name === 'birth_date') {
                const birth = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                }
                updated.age = age;
            }
            return updated;
        });
    };

    // פונקציית עזר לבחירה מרובה עם "מילוי אמצע" (עבור דרישות מראה)
    const handleMultiRangeChange = (fieldName, optionValue, isChecked, optionsList) => {
        setUser(prev => {
            let current = prev[fieldName] ? prev[fieldName].split(',').filter(x => x) : [];

            if (isChecked) {
                if (!current.includes(optionValue)) current.push(optionValue);

                // מצא את האינדקסים שנבחרו ביחס לרשימה המלאה
                const indices = current.map(val => optionsList.indexOf(val)).filter(idx => idx !== -1);

                if (indices.length >= 2) {
                    const minIdx = Math.min(...indices);
                    const maxIdx = Math.max(...indices);
                    for (let i = minIdx; i <= maxIdx; i++) {
                        if (!current.includes(optionsList[i])) {
                            current.push(optionsList[i]);
                        }
                    }
                }
            } else {
                // הסרה של הערך הספציפי בלבד
                current = current.filter(val => val !== optionValue);
            }

            return { ...prev, [fieldName]: current.join(',') };
        });
    };

    // שמירה אוטומטית ל-localStorage בכל שינוי כדי למנוע איבוד מידע ברענון
    useEffect(() => {
        if (user) {
            // שומרים את המצב הנוכחי, אך נזהרים לא לדרוס מידע קיים אם ال-user הנוכחי ריק חלקית
            const currentStored = JSON.parse(localStorage.getItem('user') || '{}');
            const merged = { ...currentStored, ...user };
            localStorage.setItem('user', JSON.stringify(merged));
        }
    }, [user]);

    // פונקציית מילוי אוטומטי לבדיקות (Magic Fill)
    const fillRandomData = () => {
        const firstNames = ['ישראל', 'אברהם', 'יצחק', 'יעקב', 'משה', 'אהרון', 'שמואל', 'דוד', 'שלמה', 'רחל', 'לאה', 'רבקה', 'שרה', 'חנה', 'מרים'];
        const lastNames = ['כהן', 'לוי', 'מזרחי', 'שפירא', 'פרידמן', 'וייס', 'גולדברג', 'כץ', 'אדלר', 'שור', 'קנייבסקי', 'שטרן'];
        const cities = ['ירושלים', 'בני ברק', 'אלעד', 'מודיעין עילית', 'בית שמש', 'ביתר עילית', 'נתניה', 'אשדוד', 'צפת'];
        const yeshivot = ['חברון', 'פוניבז\'', 'מיר', 'עטרת ישראל', 'בית מתתיהו', 'קול תורה', 'אור ישראל', 'תושיה בתפרח'];
        const occupations = ['חינוך', 'הייטק', 'חשבונאות', 'עבודה סוציאלית', 'אמנות', 'שיווק', 'ייעוץ', 'מנהל'];

        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const isMale = user.gender === 'male' || (user.gender === '' && Math.random() > 0.5);
        const gender = isMale ? 'male' : 'female';

        const randomData = {
            gender: gender,
            full_name: pick(firstNames),
            last_name: pick(lastNames),
            age: randNum(19, 40),
            birth_date: `19${randNum(85, 99)}-0${randNum(1, 9)}-${randNum(10, 28)}`,
            country_of_birth: 'israel',
            city: pick(cities),
            status: 'single',
            has_children: false,
            children_count: 0,
            contact_person_type: 'parent',
            contact_person_name: pick(firstNames) + ' ' + pick(lastNames),
            contact_phone_1: `05${randNum(0, 8)}-${randNum(1000000, 9999999)}`,
            contact_phone_2: `05${randNum(0, 8)}-${randNum(1000000, 9999999)}`,
            family_background: pick(['haredi', 'dati_leumi', 'masorti', 'baal_teshuva']),
            heritage_sector: pick(['ashkenazi', 'sephardi', 'teimani']),
            father_occupation: 'אברך כולל',
            mother_occupation: 'מורה',
            father_heritage: pick(['ashkenazi', 'sephardi']),
            mother_heritage: pick(['ashkenazi', 'sephardi']),
            siblings_count: randNum(3, 10),
            sibling_position: randNum(1, 5),
            height: randNum(155, 190),
            body_type: pick(['very_thin', 'thin', 'average_thin', 'average', 'average_full', 'full']),
            skin_tone: pick(['very_light', 'light', 'light_average', 'medium', 'tan', 'dark']),
            appearance: pick(['fair', 'ok', 'good', 'handsome', 'very_handsome', 'stunning']),
            apartment_help: 'yes',
            apartment_amount: randNum(20, 100) * 10000,
            current_occupation: isMale ? 'studying' : 'working',
            yeshiva_name: isMale ? pick(yeshivot) : '',
            yeshiva_ketana_name: isMale ? 'סלבודקה' : '',
            work_field: isMale ? '' : pick(occupations),
            life_aspiration: isMale ? pick(['study_only', 'study_and_work', 'fixed_times', 'work_only']) : pick(['study_and_work', 'work_only']),
            favorite_study: 'גמרא בעיון',
            study_place: 'ירושלים',
            study_field: 'הלכה',
            occupation_details: 'עובד במשרד גדול.',
            about_me: 'בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.',
            home_style: 'תורני מודרני',
            partner_description: 'בחורה יראת שמיים, בעלת מידות טובות.',
            important_in_life: 'יושר, נאמנות וקביעת עיתים לתורה.',
            full_address: pick(cities) + ', רחוב השומר ' + randNum(1, 100),
            father_full_name: pick(firstNames) + ' ' + pick(lastNames),
            mother_full_name: pick(firstNames) + ' ' + pick(lastNames),
            siblings_details: 'אח בכור נשוי, אחות לומדת בסמינר...',
            reference_1_name: 'הרב ' + pick(lastNames),
            reference_1_phone: '050-1234567',
            reference_2_name: 'מר ' + pick(lastNames),
            reference_2_phone: '052-7654321',
            reference_3_name: 'חבר קרוב',
            reference_3_phone: '054-0000000',
            family_reference_name: 'בן דוד',
            family_reference_phone: '058-1111111',
            rabbi_name: 'הרב שפירא',
            rabbi_phone: '02-1234567',
            mechutanim_name: 'משפחת גולדשטיין',
            mechutanim_phone: '03-9876543',
            search_min_age: randNum(18, 22),
            search_max_age: randNum(25, 30),
            search_height_min: 150,
            search_height_max: 200,
            search_body_types: 'very_thin,thin,average_thin,average,average_full,full',
            search_appearances: 'fair,ok,good,handsome,very_handsome,stunning',
            search_statuses: 'single',
            search_backgrounds: 'haredi,baal_teshuva,dati_leumi',
            search_heritage_sectors: 'ashkenazi,sephardi',
            mixed_heritage_ok: true,
            search_financial_min: 50000,
            search_financial_discuss: true,
            search_occupations: 'studying,working',
            search_life_aspirations: 'study_only,study_and_work,fixed_times,work_only'
            // הוסר: id_card_image_url כדי לא להציג "ממתין לאישור" על תעודת זהות שקרית
        };

        setUser(prev => ({ ...prev, ...randomData }));
        showToast("הפרופיל מולא בנתוני קסם! 🪄✨", "success");
    };

    // שדות שנשמרים מיידית גם אצל משתמש מאושר (לא רגישים)
    const SAFE_FIELDS = new Set([
        'birth_date', 'country_of_birth', 'city',
        'heritage_sector', 'family_background', 'father_occupation', 'mother_occupation',
        'father_heritage', 'mother_heritage', 'siblings_count', 'sibling_position',
        'height', 'body_type', 'skin_tone', 'appearance',
        'apartment_help',
        'current_occupation', 'life_aspiration', 'work_field', 'occupation_details',
        'yeshiva_name', 'study_place', 'study_field', 'favorite_study',
        'about_me', 'home_style', 'partner_description', 'important_in_life',
        'contact_person_type', 'contact_person_name', 'contact_phone_1', 'contact_phone_2',
        'has_children', 'children_count',
        'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max',
        'search_body_types', 'search_appearances', 'search_statuses', 'search_backgrounds',
        'search_heritage_sectors', 'mixed_heritage_ok', 'search_financial_min', 'search_financial_discuss',
        'search_occupations', 'search_life_aspirations',
    ]);

    // שמירה לשרת
    const handleSave = async () => {
        // ולידציה סופית לפני שמירה
        if (!user.id_card_image_url) {
            showToast("חובה להעלות תעודת זהות לפני השליחה לאישור", "error");
            return;
        }

        // הכנת הנתונים לשליחה (פירמוט שדות מורכבים)
        const dataToSend = { ...user };
        if (user.apartment_help === 'yes' && user.apartment_amount) {
            dataToSend.apartment_help = `yes (${user.apartment_amount})`;
        }
        if (user.yeshiva_name && user.yeshiva_ketana_name) {
            dataToSend.yeshiva_name = `${user.yeshiva_name} (קטנה: ${user.yeshiva_ketana_name})`;
        }

        try {
            if (user.is_approved) {
                // שלב א׳: שמירה מיידית לשדות הלא-רגישים (גיל, גוון עור, קריטריוני חיפוש וכו')
                const safeData = {};
                Object.entries(dataToSend).forEach(([key, val]) => {
                    if (SAFE_FIELDS.has(key)) safeData[key] = val;
                });

                const safeRes = await fetch(`${API_BASE}/update-safe-fields`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(safeData)
                });
                if (safeRes.ok) {
                    const safeUpdated = (await safeRes.json()).user;
                    if (safeUpdated) {
                        setUser(prev => ({ ...prev, ...safeUpdated }));
                        localStorage.setItem('user', JSON.stringify({ ...user, ...safeUpdated }));
                    }
                }

                // שלב ב׳: שדות רגישים — דרך אישור המנהל (שם, טלפון, ממליצים, כתובת)
                const sensitiveFields = ['full_name', 'last_name', 'phone', 'status',
                    'full_address', 'father_full_name', 'mother_full_name', 'siblings_details',
                    'reference_1_name', 'reference_1_phone', 'reference_2_name', 'reference_2_phone',
                    'reference_3_name', 'reference_3_phone', 'family_reference_name', 'family_reference_phone',
                    'rabbi_name', 'rabbi_phone', 'mechutanim_name', 'mechutanim_phone'];
                const sensitiveData = {};
                sensitiveFields.forEach(key => { if (dataToSend[key] !== undefined) sensitiveData[key] = dataToSend[key]; });

                const hasSensitiveChanges = Object.keys(sensitiveData).length > 0;
                if (hasSensitiveChanges) {
                    const confirmed = window.confirm(
                        "⚠️ שים לב!\n\n" +
                        "שינויים בשם, טלפון, ממליצים או כתובת דורשים אישור המנהל.\n" +
                        "שדות אחרים כבר נשמרו.\n\n" +
                        "לשלוח לבדיקת המנהל?"
                    );
                    if (confirmed) {
                        await fetch(`${API_BASE}/request-profile-update`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ changes: sensitiveData })
                        });
                        showToast("השדות הרגישים נשלחו לאישור המנהל. שאר הפרטים נשמרו מיידית!", "success");
                    } else {
                        showToast("הפרטים הלא-רגישים נשמרו!", "success");
                    }
                } else {
                    showToast("כל הפרטים נשמרו בהצלחה!", "success");
                }
                navigate('/matches');
            } else {
                // פרופיל חדש או לא מאושר - עדכון רגיל
                const res = await fetch(`${API_BASE}/update-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(dataToSend)
                });

                if (res.ok) {
                    const updatedUser = (await res.json()).user;
                    setUser(prev => ({ ...prev, ...updatedUser }));
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    showToast("הפרופיל עודכן בהצלחה! כעת המתן לאישור המנהל.", "success");
                    navigate('/matches');
                } else {
                    showToast("שגיאה בעדכון הפרופיל", "error");
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

        setIdUploading(true);
        const formData = new FormData();
        formData.append('idCard', file);
        formData.append('idOwner', user.contact_person_type === 'self' ? 'self' : (user.id_card_owner_type || 'candidate'));

        try {
            const res = await fetch(`${API_BASE}/upload-id-card`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error("Server Error (Non-JSON): " + text.slice(0, 100)); // Show start of error
            }

            if (res.ok) {
                setUser(prev => ({ ...prev, id_card_image_url: data.imageUrl }));
                showToast("תמונת ת.ז. הועלתה בהצלחה!", "success");
            } else {
                console.error("Upload error data:", data);
                showToast(data.message || "שגיאה בהעלאת הקובץ", "error");
            }
        } catch (err) {
            console.error("Upload error:", err);
            showToast("שגיאה בתקשורת או בשרת (ראה קונסול)", "error");
        }
        setIdUploading(false);
    };

    const isMale = user.gender === 'male';

    // ולידציה לשלב הנוכחי
    const validateStep = (step) => {
        let required = [];
        if (step === 1) {
            required = ['full_name', 'last_name', 'birth_date', 'gender', 'country_of_birth', 'city', 'status', 'contact_phone_1', 'contact_person_type', 'family_background', 'heritage_sector', 'siblings_count', 'height', 'body_type', 'skin_tone', 'appearance', 'current_occupation', 'has_children'];

            // תנאים מיוחדים
            if (user.country_of_birth === 'abroad') required.push('origin_country', 'aliyah_age');
            if (user.gender === 'male') required.push('yeshiva_name');
            if (['working', 'both', 'fixed_times'].includes(user.current_occupation)) required.push('work_field');
            if (user.apartment_help === 'yes') required.push('apartment_amount');
            if (user.has_children) required.push('children_count');
        } else if (step === 2) {
            required = ['full_address', 'father_full_name', 'mother_full_name', 'reference_1_name', 'reference_1_phone', 'reference_2_name', 'reference_2_phone'];
        } else if (step === 3) {
            // חלק ג - ללא חובה קריטית
            return true;
        }

        const newErrors = {};
        let isValid = true;
        required.forEach(field => {
            if (user[field] === undefined || user[field] === null || user[field] === '') {
                newErrors[field] = true;
                isValid = false;
            }
        });

        setErrors(newErrors);

        if (!isValid) {
            showToast("נא למלא את כל השדות המסומנים באדום", "error");
            // גלילה לשדה הראשון שחסר (אופציונלי, כרגע נסתפק בהודעה וסימון)
        }
        return isValid;
    };

    const nextStep = () => {
        if (validateStep(activeSection)) {
            setActiveSection(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setActiveSection(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* כותרת */}
                <div style={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={styles.title}>📋 הפנקס שלי</h1>
                            <p style={styles.subtitle}>שלב {activeSection} מתוך 4</p>
                        </div>
                        {/* כפתור למילוי אוטומטי לבדיקה */}
                        <button
                            onClick={fillRandomData}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🪄 מילוי קסם (לבדיקה)
                        </button>
                    </div>

                    {/* סרגל התקדמות */}
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '10px' }}>
                        {[1, 2, 3, 4].map(step => (
                            <div key={step} style={{
                                width: '60px', height: '6px', borderRadius: '3px',
                                background: step <= activeSection ? '#c9a227' : '#e2e8f0',
                                transition: 'background 0.3s ease'
                            }}></div>
                        ))}
                    </div>
                </div>

                {/* =========== חלק א' - פרטים לרשימה =========== */}
                {activeSection === 1 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>📝 חלק א' - פרטים לרשימה</h2>
                            <p style={styles.sectionDesc}>פרטים אלו יופיעו ברשימה למציעים.</p>
                        </div>

                        {/* תפריט ניווט מהיר - זהב (sticky) */}
                        <div style={{
                            display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px 10px', marginBottom: '20px',
                            borderBottom: '2px solid #e2e8f0', scrollbarWidth: 'none', msOverflowStyle: 'none',
                            position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '0 0 15px 15px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                            {[
                                { id: 'basic', label: '👤 בסיסי', icon: '👤' },
                                { id: 'contact', label: '📞 קשר', icon: '📞' },
                                { id: 'family', label: '👨‍👩‍👧‍👦 משפחה', icon: '👨‍👩‍👧‍👦' },
                                { id: 'appearance', label: '🪞 מראה', icon: '🪞' },
                                { id: 'economy', label: '💰 כלכלה', icon: '💰' },
                                { id: 'occupation', label: '💼 עיסוק', icon: '💼' },
                                { id: 'about', label: '📝 על עצמי', icon: '📝' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    style={{
                                        background: 'linear-gradient(135deg, #FFD700 0%, #daa520 100%)', // זהב יוקרתי
                                        border: 'none',
                                        borderRadius: '20px',
                                        padding: '8px 15px',
                                        color: '#3e2723', // חום כהה לקונטרסט
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 5px rgba(218, 165, 32, 0.3)',
                                        display: 'flex', alignItems: 'center', gap: '5px'
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* פרטים בסיסיים */}
                        <div style={styles.card} id="basic">
                            <h3 style={styles.cardTitle}>👤 פרטים בסיסיים</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>שם פרטי *</label>
                                    <input name="full_name" value={user.full_name || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.full_name ? 'red' : '#e2e8f0' }} />
                                </div>
                                <div style={styles.field}>
                                    <label>שם משפחה *</label>
                                    <input name="last_name" value={user.last_name || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.last_name ? 'red' : '#e2e8f0' }} />
                                </div>
                                <div style={styles.field}>
                                    <label>תאריך לידה *</label>
                                    <input name="birth_date" type="date" value={user.birth_date || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.birth_date ? 'red' : '#e2e8f0' }} />
                                    {user.age && <span style={{ fontSize: '0.85rem', color: '#666' }}>גיל מחושב: {user.age}</span>}
                                </div>
                                <div style={styles.field}>
                                    <label>מגדר *</label>
                                    <select name="gender" value={user.gender || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.gender ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="male">גבר</option>
                                        <option value="female">אישה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>ארץ לידה *</label>
                                    <select name="country_of_birth" value={user.country_of_birth || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.country_of_birth ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="israel">ישראל</option>
                                        <option value="abroad">חו"ל</option>
                                    </select>
                                </div>
                                {user.country_of_birth === 'abroad' && (
                                    <>
                                        <div style={styles.field}>
                                            <label>ארץ מקור *</label>
                                            <input name="origin_country" value={user.origin_country || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.origin_country ? 'red' : '#e2e8f0' }} />
                                        </div>
                                        <div style={styles.field}>
                                            <label>באיזה גיל עלית לארץ? *</label>
                                            <input name="aliyah_age" type="number" value={user.aliyah_age || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.aliyah_age ? 'red' : '#e2e8f0' }} />
                                        </div>
                                        <div style={styles.field}>
                                            <label>שפות מדוברות</label>
                                            <input name="languages" value={user.languages || ''} onChange={handleChange} style={styles.input} />
                                        </div>
                                    </>
                                )}
                                <div style={styles.field}>
                                    <label>עיר מגורים *</label>
                                    <input name="city" value={user.city || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.city ? 'red' : '#e2e8f0' }} placeholder="לדוגמה: ירושלים" />
                                </div>
                                <div style={styles.field}>
                                    <label>סטטוס *</label>
                                    <select name="status" value={user.status || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.status ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="single">רווק/ה</option>
                                        <option value="divorced">גרוש/ה</option>
                                        <option value="widower">אלמן/ה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>יש ילדים? *</label>
                                    <select name="has_children" value={user.has_children === '' ? '' : (user.has_children ? 'yes' : 'no')} onChange={(e) => setUser(prev => ({ ...prev, has_children: e.target.value === '' ? '' : (e.target.value === 'yes') }))} style={styles.input}>
                                        <option value="">בחר...</option>
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

                        {/* איש קשר */}
                        <div style={styles.card} id="contact">
                            <h3 style={styles.cardTitle}>📞 פרטי קשר</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>טלפון ראשי ליצירת קשר *</label>
                                    <input name="contact_phone_1" value={user.contact_phone_1 || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.contact_phone_1 ? 'red' : '#e2e8f0' }} />
                                </div>
                                <div style={styles.field}>
                                    <label>איש קשר לשידוכים *</label>
                                    <select name="contact_person_type" value={user.contact_person_type || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.contact_person_type ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="self">אני</option>
                                        <option value="parent">הורים</option>
                                        <option value="other">אחר</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* רקע משפחתי */}
                        <div style={styles.card} id="family">
                            <h3 style={styles.cardTitle}>👨‍👩‍👧‍👦 רקע משפחתי</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>רקע דתי *</label>
                                    <select name="family_background" value={user.family_background || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.family_background ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="haredi">חרדי</option>
                                        <option value="dati_leumi">דתי לאומי</option>
                                        <option value="masorti">מסורתי</option>
                                        <option value="baal_teshuva">חוזר בתשובה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>מגזר עדתי *</label>
                                    <select name="heritage_sector" value={user.heritage_sector || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.heritage_sector ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="ashkenazi">אשכנזי</option>
                                        <option value="sephardi">ספרדי</option>
                                        <option value="teimani">תימני</option>
                                        <option value="mixed">מעורב</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>מספר אחים *</label>
                                    <input name="siblings_count" type="number" value={user.siblings_count || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.siblings_count ? 'red' : '#e2e8f0' }} />
                                </div>
                                <div style={styles.field}>
                                    <label>מיקום במשפחה</label>
                                    <input name="sibling_position" type="number" value={user.sibling_position || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עיסוק האבא</label>
                                    <input name="father_occupation" value={user.father_occupation || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עיסוק האמא</label>
                                    <input name="mother_occupation" value={user.mother_occupation || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* מראה חיצוני */}
                        <div style={styles.card} id="appearance">
                            <h3 style={styles.cardTitle}>🪞 מראה</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>גובה (ס"מ) *</label>
                                    <input name="height" type="number" value={user.height || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.height ? 'red' : '#e2e8f0' }} />
                                </div>
                                <div style={styles.field}>
                                    <label>מבנה גוף *</label>
                                    <select name="body_type" value={user.body_type || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.body_type ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="very_thin">רזה מאוד</option>
                                        <option value="thin">רזה</option>
                                        <option value="average_thin">רזה-ממוצע</option>
                                        <option value="average">ממוצע</option>
                                        <option value="average_full">ממוצע-מלא</option>
                                        <option value="full">מלא</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>גוון עור *</label>
                                    <select name="skin_tone" value={user.skin_tone || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.skin_tone ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="very_light">בהיר מאוד</option>
                                        <option value="light">בהיר</option>
                                        <option value="light_average">בהיר-ממוצע</option>
                                        <option value="medium">ממוצע-שזוף</option>
                                        <option value="tan">שחום</option>
                                        <option value="dark">כהה</option>
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label>מראה כללי *</label>
                                    <select name="appearance" value={user.appearance || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.appearance ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="fair">נחמד</option>
                                        <option value="ok">בסדר גמור</option>
                                        <option value="good">טוב</option>
                                        <option value="handsome">נאה</option>
                                        <option value="very_handsome">נאה מאוד</option>
                                        <option value="stunning">מיוחד/מרשים</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* כלכלה */}
                        <div style={styles.card} id="economy">
                            <h3 style={styles.cardTitle}>💰 כלכלה</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>עזרה לדירה</label>
                                    <select name="apartment_help" value={user.apartment_help || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.apartment_help ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="no">לא</option>
                                        <option value="yes">כן (נא לפרט סכום)</option>
                                        <option value="discuss">נדון עם השדכן/ית</option>
                                    </select>
                                </div>
                                {user.apartment_help === 'yes' && (
                                    <div style={styles.field}>
                                        <label>סכום העזרה (משוער) *</label>
                                        <input name="apartment_amount" value={user.apartment_amount || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.apartment_amount ? 'red' : '#e2e8f0' }} placeholder="לדוגמה: 100,000" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* עיסוק ושאיפות */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💼 עיסוק ושאיפות</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>עיסוק כעת *</label>
                                    <select name="current_occupation" value={user.current_occupation || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.current_occupation ? 'red' : '#e2e8f0' }}>
                                        <option value="">בחר...</option>
                                        <option value="studying">לומד/ת</option>
                                        <option value="working">עובד/ת</option>
                                        <option value="both">משלב/ת</option>
                                        {user.gender !== 'female' && <option value="fixed_times">קובע עיתים</option>}
                                    </select>
                                </div>

                                {/* שדות מותאמים לגברים */}
                                {user.gender === 'male' && (
                                    <>
                                        <div style={styles.field}>
                                            <label>{['studying', 'both'].includes(user.current_occupation) ? 'שם הישיבה *' : 'ישיבה אחרונה *'}</label>
                                            <input name="yeshiva_name" value={user.yeshiva_name || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.yeshiva_name ? 'red' : '#e2e8f0' }} />
                                        </div>
                                        <div style={styles.field}>
                                            <label>שם ישיבה קטנה (לא חובה)</label>
                                            <input name="yeshiva_ketana_name" value={user.yeshiva_ketana_name || ''} onChange={handleChange} style={styles.input} />
                                        </div>
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
                                                <option value="none">ללא העדפה</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* שדות מותאמים לנשים */}
                                {/* שדות מותאמים לנשים */}
                                {user.gender === 'female' && (
                                    <>
                                        {/* תמיד להציג סמינר - גם אם היא עובדת היום */}
                                        <div style={styles.field}>
                                            <label>{user.current_occupation === 'working' ? 'סמינר בו למדת' : 'מקום לימודים (סמינר)'}</label>
                                            <input name="study_place" value={user.study_place || ''} onChange={handleChange} style={styles.input} />
                                        </div>

                                        {(user.current_occupation === 'studying' || user.current_occupation === 'both') && (
                                            <div style={styles.field}>
                                                <label>תחום לימודים</label>
                                                <input name="study_field" value={user.study_field || ''} onChange={handleChange} style={styles.input} />
                                            </div>
                                        )}
                                    </>
                                )}

                                {(user.current_occupation === 'working' || user.current_occupation === 'both' || user.current_occupation === 'fixed_times') && (
                                    <div style={styles.field}>
                                        <label>תחום העבודה *</label>
                                        <input name="work_field" value={user.work_field || ''} onChange={handleChange} style={{ ...styles.input, borderColor: errors.work_field ? 'red' : '#e2e8f0' }} />
                                    </div>
                                )}

                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>פירוט עיסוק (אופציונלי)</label>
                                    <textarea name="occupation_details" value={user.occupation_details || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '60px' }} maxLength={400} placeholder="פרט על סדר היום שלך... (עד 400 תווים)" />
                                </div>
                            </div>
                        </div>

                        {/* על עצמי */}
                        <div style={styles.card} id="about">
                            <h3 style={styles.cardTitle}>� קצת על עצמי</h3>
                            <p style={styles.hint}>כדאי מאוד למלא שדות אלו כדי לתת תמונה מלאה ואיכותית עליך!</p>
                            <div style={styles.grid}>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>מעט על עצמי (מי שמתבייש יבקש מאחר שיכתוב)</label>
                                    <textarea name="about_me" value={user.about_me || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} maxLength={400} placeholder="(עד 400 תווים)" />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>סגנון הבית שאני רוצה</label>
                                    <textarea name="home_style" value={user.home_style || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} maxLength={400} placeholder="איך הבית שלנו ייראה מבחינה רוחנית/אווירה? (עד 400 תווים)" />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>השידוך שאני רוצה</label>
                                    <textarea name="partner_description" value={user.partner_description || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} maxLength={400} placeholder="תכונות אופי, סגנון... (עד 400 תווים)" />
                                </div>
                                <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                    <label>מה חשוב לי בחיים ומה אני אוהב לעשות</label>
                                    <textarea name="important_in_life" value={user.important_in_life || ''} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} maxLength={400} placeholder="(עד 400 תווים)" />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', textAlign: 'center' }}>
                            <button onClick={nextStep} style={styles.nextButton}>המשך לשלב הבא ⬅️</button>
                        </div>
                    </div>
                )}

                {/* =========== חלק ב' - פרטים נסתרים =========== */}
                {activeSection === 2 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>🔒 חלק ב' - פרטי ממליצים</h2>
                            <p style={styles.sectionDesc}>פרטים אלו ייחשפו רק למורשים לאחר הסכמה הדדית.</p>
                        </div>

                        {/* פרטי הורים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🏠 פרטי הורים וכתובת</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>כתובת מלאה *</label>
                                    <input name="full_address" value={user.full_address || ''} onChange={handleChange} style={styles.input} placeholder="עיר, רחוב, מספר" />
                                </div>
                                <div style={styles.field}>
                                    <label>שם מלא של האבא *</label>
                                    <input name="father_full_name" value={user.father_full_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>שם מלא של האמא *</label>
                                    <input name="mother_full_name" value={user.mother_full_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* ממליצים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📞 ממליצים (חובה 2)</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>חבר 1 - שם *</label>
                                    <input name="reference_1_name" value={user.reference_1_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 1 - טלפון *</label>
                                    <input name="reference_1_phone" value={user.reference_1_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 2 - שם *</label>
                                    <input name="reference_2_name" value={user.reference_2_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 2 - טלפון *</label>
                                    <input name="reference_2_phone" value={user.reference_2_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* ממליצים נוספים (אופציונלי) */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📞 ממליצים נוספים (אופציונלי)</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>חבר 3 / נוסף - שם</label>
                                    <input name="reference_3_name" value={user.reference_3_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>חבר 3 / נוסף - טלפון</label>
                                    <input name="reference_3_phone" value={user.reference_3_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        {/* בירורים נוספים */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>📜 בירורים נוספים</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>שם רב/דמות רוחנית</label>
                                    <input name="rabbi_name" value={user.rabbi_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>טלפון רב</label>
                                    <input name="rabbi_phone" value={user.rabbi_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>מכיר משפחה/מחותן - שם</label>
                                    <input name="family_reference_name" value={user.family_reference_name || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>טלפון מכיר משפחה</label>
                                    <input name="family_reference_phone" value={user.family_reference_phone || ''} onChange={handleChange} style={styles.input} />
                                </div>

                            </div>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={prevStep} style={styles.backButton}>➡️ חזור</button>
                            <button onClick={nextStep} style={styles.nextButton}>המשך לשלב הבא ⬅️</button>
                        </div>
                    </div>
                )}

                {/* =========== חלק ג' - דרישות =========== */}
                {activeSection === 3 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>🔍 חלק ג' - מה אני מחפש</h2>
                            <p style={styles.sectionDesc}>הגדר את טווח הגילאים והדרישות שלך.</p>
                        </div>

                        {/* הודעת אזהרה ומידע */}
                        <div style={{
                            background: '#e0f2fe', // כחול בהיר ונעים
                            color: '#0c4a6e',
                            padding: '15px',
                            borderRadius: '10px',
                            marginBottom: '20px',
                            border: '1px solid #bae6fd',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'start',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                            <div>
                                <strong>טיפ לחיפוש מוצלח:</strong>
                                <br />
                                • ניתן לבחור <strong>מספר אפשרויות במקביל</strong> בכל קטגוריה (למשל: לסמן גם "לומד" וגם "משלב").
                                <br />
                                • <span style={{ color: '#b45309', fontWeight: 'bold' }}>שים לב:</span> ככל שתוסיף יותר סינונים נוקשים, כך יופיעו פחות הצעות. מומלץ לסמן רק מה שבאמת קריטי לך.
                            </div>
                        </div>

                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>טווח גילאים וגובה</h3>
                            <div style={styles.grid}>
                                <div style={styles.field}>
                                    <label>מגיל</label>
                                    <input name="search_min_age" type="number" value={user.search_min_age || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>עד גיל</label>
                                    <input name="search_max_age" type="number" value={user.search_max_age || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>גובה מינימלי (ס"מ)</label>
                                    <input name="search_height_min" type="number" value={user.search_height_min || ''} onChange={handleChange} style={styles.input} />
                                </div>
                                <div style={styles.field}>
                                    <label>גובה מקסימלי (ס"מ)</label>
                                    <input name="search_height_max" type="number" value={user.search_height_max || ''} onChange={handleChange} style={styles.input} />
                                </div>
                            </div>
                        </div>

                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>✨ מראה חיצוני</h3>
                            <p style={styles.hint}>מה רמת המראה שמתאימה לך? (אם לא תסמן - הכל מתאים)</p>

                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontWeight: 'bold' }}>מראה כללי:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'fair', label: 'נחמד' },
                                        { value: 'ok', label: 'בסדר גמור' },
                                        { value: 'good', label: 'טוב' },
                                        { value: 'handsome', label: 'נאה' },
                                        { value: 'very_handsome', label: 'נאה מאוד' },
                                        { value: 'stunning', label: 'מיוחד/מרשים' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_appearances || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_appearances || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_appearances || '').split(',').includes(option.value)}
                                                onChange={(e) => handleMultiRangeChange('search_appearances', option.value, e.target.checked, ['fair', 'ok', 'good', 'handsome', 'very_handsome', 'stunning'])}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>מבנה גוף:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'very_thin', label: 'רזה מאוד' },
                                        { value: 'thin', label: 'רזה' },
                                        { value: 'average_thin', label: 'רזה-ממוצע' },
                                        { value: 'average', label: 'ממוצע' },
                                        { value: 'average_full', label: 'ממוצע-מלא' },
                                        { value: 'full', label: 'מלא' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_body_types || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_body_types || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_body_types || '').split(',').includes(option.value)}
                                                onChange={(e) => handleMultiRangeChange('search_body_types', option.value, e.target.checked, ['very_thin', 'thin', 'average_thin', 'average', 'average_full', 'full'])}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>גוון עור:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'very_light', label: 'בהיר מאוד' },
                                        { value: 'light', label: 'בהיר' },
                                        { value: 'light_average', label: 'בהיר-ממוצע' },
                                        { value: 'medium', label: 'ממוצע-שזוף' },
                                        { value: 'tan', label: 'שחום' },
                                        { value: 'dark', label: 'כהה' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_skin_tones || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_skin_tones || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_skin_tones || '').split(',').includes(option.value)}
                                                onChange={(e) => handleMultiRangeChange('search_skin_tones', option.value, e.target.checked, ['very_light', 'light', 'light_average', 'medium', 'tan', 'dark'])}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* מאפיינים ומגזר */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🌍 מאפיינים ומגזר</h3>

                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontWeight: 'bold' }}>משפחתי/דתי:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'haredi', label: 'חרדי' },
                                        { value: 'dati_leumi', label: 'דתי לאומי' },
                                        { value: 'masorti', label: 'מסורתי' },
                                        { value: 'baal_teshuva', label: 'חוזר בתשובה' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_backgrounds || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_backgrounds || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_backgrounds || '').split(',').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_backgrounds ? user.search_backgrounds.split(',').filter(x => x) : [];
                                                    if (e.target.checked) { current.push(option.value); }
                                                    else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                    setUser(prev => ({ ...prev, search_backgrounds: current.join(',') }));
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>מגזר עדתי:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'ashkenazi', label: 'אשכנזי' },
                                        { value: 'sephardi', label: 'ספרדי' },
                                        { value: 'teimani', label: 'תימני' },
                                        { value: 'mixed', label: 'מעורב' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_heritage_sectors || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_heritage_sectors || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_heritage_sectors || '').split(',').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_heritage_sectors ? user.search_heritage_sectors.split(',').filter(x => x) : [];
                                                    if (e.target.checked) { current.push(option.value); }
                                                    else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                    setUser(prev => ({ ...prev, search_heritage_sectors: current.join(',') }));
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>סטטוס:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'single', label: 'רווק/ה' },
                                        { value: 'divorced', label: 'גרוש/ה' },
                                        { value: 'widower', label: 'אלמן/ה' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_statuses || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_statuses || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_statuses || '').split(',').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_statuses ? user.search_statuses.split(',').filter(x => x) : [];
                                                    if (e.target.checked) { current.push(option.value); }
                                                    else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                    setUser(prev => ({ ...prev, search_statuses: current.join(',') }));
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* עיסוק ושאיפות */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>💼 עיסוק ושאיפות</h3>
                            <p style={styles.hint}>חלק זה חשוב להתאמה בסגנון אורח החיים.</p>

                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontWeight: 'bold' }}>עיסוק כעת:</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'studying', label: 'לומד/ת' },
                                        { value: 'working', label: 'עובד/ת' },
                                        { value: 'both', label: 'משלב/ת' },
                                        { value: 'fixed_times', label: 'קובע עיתים' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_occupations || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_occupations || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_occupations || '').split(',').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_occupations ? user.search_occupations.split(',').filter(x => x) : [];
                                                    if (e.target.checked) { current.push(option.value); }
                                                    else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                    setUser(prev => ({ ...prev, search_occupations: current.join(',') }));
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </div>


                            <div style={{ marginTop: '20px' }}>
                                <label style={{ fontWeight: 'bold' }}>שאיפה בחיים (של המיועד):</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                    {[
                                        { value: 'study_only', label: 'ללמוד יום שלם' },
                                        { value: 'study_and_work', label: 'ללמוד ולעבוד' },
                                        { value: 'fixed_times', label: 'לקבוע עיתים' },
                                        { value: 'work_only', label: 'רק לעבוד' }
                                    ].map(option => (
                                        <label key={option.value} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                            padding: '10px 15px',
                                            background: (user.search_life_aspirations || '').split(',').includes(option.value) ? '#c9a227' : '#f0f0f0',
                                            borderRadius: '8px',
                                            fontWeight: (user.search_life_aspirations || '').split(',').includes(option.value) ? 'bold' : 'normal'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={(user.search_life_aspirations || '').split(',').includes(option.value)}
                                                onChange={(e) => {
                                                    const current = user.search_life_aspirations ? user.search_life_aspirations.split(',').filter(x => x) : [];
                                                    if (e.target.checked) { current.push(option.value); }
                                                    else { const idx = current.indexOf(option.value); if (idx > -1) current.splice(idx, 1); }
                                                    setUser(prev => ({ ...prev, search_life_aspirations: current.join(',') }));
                                                }}
                                                style={{ display: 'none' }}
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

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={prevStep} style={styles.backButton}>➡️ חזור</button>
                            <button onClick={nextStep} style={styles.nextButton}>המשך להעלאת קבצים ⬅️</button>
                        </div>
                    </div>
                )}

                {/* =========== חלק ד' - העלאת מדיה וסיום =========== */}
                {activeSection === 4 && (
                    <div style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <h2>📸 חלק ד' - תמונות ואימות</h2>
                            <p style={styles.sectionDesc}>לסיום, נעלה תעודת זהות לאימות ותמונות פרופיל (אופציונלי אך מומלץ).</p>
                        </div>

                        {/* תעודת זהות */}
                        <div style={styles.idUploadCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
                                <span style={{ fontSize: '2rem' }}>🆔</span>
                                <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ ...styles.cardTitle, margin: 0 }}>אימות זהות - תעודת זהות</h3>
                                    <p style={{ ...styles.hint, margin: 0 }}>למען ביטחון הקהילה, חובה להעלות זיהוי רשמי (כולל ספח פתוח)</p>
                                </div>
                            </div>

                            {user.id_card_image_url && (
                                <div style={{
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    background: user.is_identity_approved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    border: `1px solid ${user.is_identity_approved ? '#22c55e' : '#f59e0b'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    fontWeight: '600',
                                    color: user.is_identity_approved ? '#166534' : '#92400e'
                                }}>
                                    {user.is_identity_approved ? '✅ תעודת הזהות אומתה בהצלחה' : '⏳ התעודה התקבלה וממתינה לאימות צוות האתר'}
                                </div>
                            )}

                            <div style={{
                                background: '#fff',
                                padding: '20px',
                                borderRadius: '15px',
                                border: '2px dashed #cbd5e1',
                                marginBottom: '20px'
                            }}>
                                <div style={{ marginBottom: '20px' }}>
                                    {user.contact_person_type && user.contact_person_type !== 'self' ? (
                                        <div style={{ ...styles.field, maxWidth: '300px', margin: '0 auto 15px' }}>
                                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b' }}>של מי התעודה המועלית?</label>
                                            <select
                                                value={user.id_card_owner_type || 'candidate'}
                                                onChange={(e) => setUser(prev => ({ ...prev, id_card_owner_type: e.target.value }))}
                                                style={{ ...styles.input, padding: '8px 12px' }}
                                            >
                                                <option value="candidate">של המועמד/ת (הנרשם)</option>
                                                <option value="parent">של ההורה</option>
                                            </select>
                                        </div>
                                    ) : null}

                                    <p style={{ ...styles.hint, marginBottom: '0', fontWeight: '600', color: '#1e293b', textAlign: 'center' }}>
                                        {(user.id_card_owner_type === 'parent')
                                            ? '📌 חובה להעלות צילום ת"ז של ההורה הכולל ספח פתוח שבו מופיע שם המועמד ותאריך הלידה שלו.'
                                            : '📌 העלה צילום תעודת זהות של המועמד/ת (במקרה זה אין חובה להוסיף ספח).'
                                        }
                                    </p>
                                </div>

                                <input
                                    type="file"
                                    id="idCardInput"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleIdCardUpload}
                                />

                                {user.id_card_image_url ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={`${FILE_BASE_URL}${user.id_card_image_url}`}
                                                alt="תצוגת ת.ז"
                                                style={{
                                                    maxWidth: '220px',
                                                    maxHeight: '150px',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '5px',
                                                right: '5px',
                                                background: 'rgba(255,255,255,0.9)',
                                                padding: '2px 8px',
                                                borderRadius: '5px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }}>תצוגה מקדימה</div>
                                        </div>
                                        <button
                                            onClick={() => document.getElementById('idCardInput').click()}
                                            disabled={idUploading}
                                            style={{
                                                padding: '10px 20px',
                                                background: '#f1f5f9',
                                                color: '#475569',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                        >
                                            <span>🔄</span>
                                            {idUploading ? 'מעלה...' : 'החלף תמונה'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => document.getElementById('idCardInput').click()}
                                        disabled={idUploading}
                                        style={{
                                            ...styles.saveButton,
                                            margin: '0 auto',
                                            maxWidth: '300px',
                                            background: idUploading ? '#ccc' : 'linear-gradient(135deg, #1e3a5f, #334155)',
                                            color: '#fff',
                                            boxShadow: '0 4px 12px rgba(30, 58, 95, 0.2)'
                                        }}
                                    >
                                        {idUploading ? '⏳ מעלה...' : '📤 העלה צילום תעודת זהות'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* תמונות פרופיל */}
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
                                            src={`${FILE_BASE_URL}${imgUrl}`}
                                            alt={`תמונה ${idx + 1}`}
                                            style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '3px solid #c9a227' }}
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('למחוק את התמונה?')) return;
                                                try {
                                                    const res = await fetch(`${API_BASE}/delete-profile-image`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                        body: JSON.stringify({ imageUrl: imgUrl })
                                                    });
                                                    if (res.ok) {
                                                        setUser(prev => ({ ...prev, profile_images: prev.profile_images.filter((_, i) => i !== idx) }));
                                                        showToast('✅ התמונה נמחקה', 'success');
                                                    }
                                                } catch (err) {
                                                    showToast('❌ שגיאה במחיקה', 'error');
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

                                            setIdUploading(true);
                                            // showToast('⏳ מעלה תמונה...', 'info');

                                            const formData = new FormData();
                                            formData.append('profileImage', file);

                                            try {
                                                const res = await fetch(`${API_BASE}/upload-profile-image`, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                    body: formData
                                                });

                                                const data = await res.json();
                                                if (res.ok) {
                                                    showToast('✅ התמונה הועלתה!', 'success');
                                                    setUser(prev => ({ ...prev, profile_images: [...(prev.profile_images || []), data.imageUrl] }));
                                                } else {
                                                    showToast(`❌ ${data.message}`, 'error');
                                                }
                                            } catch (err) {
                                                showToast('❌ שגיאה בהעלאה', 'error');
                                            }
                                            setIdUploading(false);
                                        }}
                                    />
                                    <button
                                        onClick={() => document.getElementById('profileImageInput').click()}
                                        disabled={imageUploading}
                                        style={{
                                            ...styles.saveButton,
                                            background: imageUploading ? '#ccc' : 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        }}
                                    >
                                        {imageUploading ? '⏳ מעלה...' : `📤 הוסף תמונה (${(user.profile_images || []).length}/3)`}
                                    </button>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button onClick={prevStep} style={styles.backButton}>➡️ חזור</button>

                            <button
                                onClick={handleSave}
                                style={{
                                    ...styles.nextButton,
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // ירוק חי ומזמין יותר
                                    fontSize: '1.2rem',
                                    padding: '16px 45px',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                                    transform: 'scale(1.02)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                ✅ שמור ושלח לאישור
                            </button>
                        </div>
                    </div>
                )}
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
        marginTop: '20px',
        marginBottom: '20px',
        textAlign: 'center'
    },
    idUploadCard: {
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '25px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
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
    nextButton: {
        padding: '15px 30px',
        background: '#c9a227',
        color: '#1a1a1a',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer'
    },
    backButton: {
        padding: '15px 30px',
        background: 'transparent',
        color: '#1a1a1a',
        border: '2px solid #ccc',
        borderRadius: '10px',
        fontSize: '1.1rem',
        cursor: 'pointer'
    }
};

export default Profile;
