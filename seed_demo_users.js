/**
 * יוצר משתמשי דמו מלאים לבדיקת סינון והתאמות (/matches).
 *
 * הרצה מהשורש של הפרויקט (יש .env עם DB):
 *   node seed_demo_users.js
 *
 * התחברות (כולם אותה סיסמה):
 *   סיסמה: Demo123!
 *   טלפונים: 0599001001–1006 (רחב) + 0599001010 (חיפוש צר)
 *
 * מחיקה חוזרת: הסקריפט מוחק קודם לפי טלפונים אלה ואז מכניס מחדש.
 */
require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

const DEMO_PASSWORD = 'Demo123!';

/** טווחי חיפוש רחבים ודו־כיווניים – כדי שיופיעו התאמות בין הדמו */
const WIDE = {
    search_min_age: 18,
    search_max_age: 55,
    search_height_min: 140,
    search_height_max: 200,
    search_body_types: 'very_thin,thin,average_thin,average,average_full,full',
    search_appearances: 'fair,ok,good,handsome,very_handsome,stunning',
    search_statuses: 'single,divorced,widower',
    search_backgrounds: 'haredi,dati_leumi,masorti,baal_teshuva',
    search_heritage_sectors: 'ashkenazi,sephardi,teimani,mixed',
    search_occupations: 'studying,working,both,fixed_times',
    search_life_aspirations: 'study_only,study_and_work,fixed_times,work_only',
    mixed_heritage_ok: true,
    search_financial_discuss: false,
};

const PHONES = [
    '0599001001',
    '0599001002',
    '0599001003',
    '0599001004',
    '0599001005',
    '0599001006',
    '0599001010',
];

const users = [
    {
        phone: '0599001001',
        full_name: 'דמו בחור א',
        last_name: 'כהן',
        gender: 'male',
        age: 24,
        birth_date: '2001-06-01',
        height: 178,
        city: 'ירושלים',
        status: 'single',
        family_background: 'haredi',
        heritage_sector: 'ashkenazi',
        body_type: 'average',
        skin_tone: 'light',
        appearance: 'good',
        current_occupation: 'studying',
        life_aspiration: 'study_only',
        yeshiva_name: 'ישיבת דמו',
        work_field: '',
        about_me: 'משתמש דמו לבדיקת התאמות.',
    },
    {
        phone: '0599001002',
        full_name: 'דמו בת א',
        last_name: 'לוי',
        gender: 'female',
        age: 22,
        birth_date: '2003-03-15',
        height: 165,
        city: 'בני ברק',
        status: 'single',
        family_background: 'haredi',
        heritage_sector: 'ashkenazi',
        body_type: 'thin',
        skin_tone: 'light',
        appearance: 'ok',
        current_occupation: 'studying',
        life_aspiration: 'study_only',
        yeshiva_name: '',
        study_place: 'סמינר דמו',
        work_field: '',
        about_me: 'משתמשת דמו לבדיקת התאמות.',
    },
    {
        phone: '0599001003',
        full_name: 'דמו בחור ב',
        last_name: 'מזרחי',
        gender: 'male',
        age: 28,
        birth_date: '1997-11-20',
        height: 182,
        city: 'בית שמש',
        status: 'single',
        family_background: 'dati_leumi',
        heritage_sector: 'sephardi',
        body_type: 'average',
        skin_tone: 'medium',
        appearance: 'handsome',
        current_occupation: 'working',
        life_aspiration: 'study_and_work',
        yeshiva_name: '',
        work_field: 'הייטק',
        about_me: 'דמו שני – בודקים סינון.',
    },
    {
        phone: '0599001004',
        full_name: 'דמו בת ב',
        last_name: 'עמר',
        gender: 'female',
        age: 26,
        birth_date: '1999-08-10',
        height: 162,
        city: 'מודיעין',
        status: 'single',
        family_background: 'dati_leumi',
        heritage_sector: 'sephardi',
        body_type: 'average',
        skin_tone: 'medium',
        appearance: 'good',
        current_occupation: 'both',
        life_aspiration: 'study_and_work',
        study_place: 'מכללה',
        work_field: '',
        about_me: 'דמו שני – נקבה.',
    },
    {
        phone: '0599001005',
        full_name: 'דמו בחור ג',
        last_name: 'חדד',
        gender: 'male',
        age: 32,
        birth_date: '1993-01-05',
        height: 170,
        city: 'חיפה',
        status: 'divorced',
        family_background: 'baal_teshuva',
        heritage_sector: 'mixed',
        body_type: 'average',
        skin_tone: 'light',
        appearance: 'ok',
        current_occupation: 'fixed_times',
        life_aspiration: 'fixed_times',
        yeshiva_name: 'כולל דמו',
        work_field: '',
        about_me: 'דמו שלישי – גיל שונה לבדיקת טווח גיל.',
    },
    {
        phone: '0599001006',
        full_name: 'דמו בת ג',
        last_name: 'אברהם',
        gender: 'female',
        age: 29,
        birth_date: '1996-12-01',
        height: 168,
        city: 'נתניה',
        status: 'single',
        family_background: 'masorti',
        heritage_sector: 'teimani',
        body_type: 'full',
        skin_tone: 'tan',
        appearance: 'fair',
        current_occupation: 'working',
        life_aspiration: 'work_only',
        study_place: '',
        work_field: 'חינוך',
        about_me: 'דמו שלישי – נקבה.',
    },
    /** בחור עם חיפוש צר: אמור להתאים רק ל־0599001004 (בת ב׳, גיל 26, גובה 162, ספרדי) */
    {
        phone: '0599001010',
        full_name: 'דמו חיפוש צר',
        last_name: 'מבחן',
        gender: 'male',
        age: 30,
        birth_date: '1995-05-01',
        height: 180,
        city: 'ירושלים',
        status: 'single',
        family_background: 'dati_leumi',
        heritage_sector: 'sephardi',
        body_type: 'average',
        skin_tone: 'medium',
        appearance: 'good',
        current_occupation: 'working',
        life_aspiration: 'study_and_work',
        yeshiva_name: '',
        work_field: 'הייטק',
        about_me: 'חיפוש צר לבדיקה: רק בנות גיל 25–26, גובה 161–163, מגזר ספרדי בלבד (בדמו: רק בת ב׳).',
        search: {
            search_min_age: 25,
            search_max_age: 26,
            search_height_min: 161,
            search_height_max: 163,
            search_body_types: 'thin,average',
            search_appearances: 'ok,good',
            search_statuses: 'single',
            search_backgrounds: 'haredi,dati_leumi,masorti,baal_teshuva',
            search_heritage_sectors: 'sephardi',
            search_occupations: 'studying,working,both,fixed_times',
            search_life_aspirations: 'study_only,study_and_work,fixed_times,work_only',
            mixed_heritage_ok: true,
            search_financial_discuss: false,
        },
    },
];

async function main() {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const p of PHONES) {
            await client.query('DELETE FROM connections WHERE sender_id IN (SELECT id FROM users WHERE phone = $1) OR receiver_id IN (SELECT id FROM users WHERE phone = $1)', [p]);
            await client.query('DELETE FROM users WHERE phone = $1', [p]);
        }

        for (const u of users) {
            const studyPlace = u.study_place || null;
            const yeshiva = u.yeshiva_name || null;
            const wf = u.work_field || null;
            const S = { ...WIDE, ...(u.search || {}) };

            await client.query(
                `INSERT INTO users (
                    phone, password, email,
                    full_name, last_name, gender, age, birth_date, height, city,
                    status, has_children, children_count,
                    country_of_birth, contact_person_type, contact_phone_1,
                    family_background, heritage_sector, siblings_count,
                    body_type, skin_tone, appearance,
                    apartment_help, current_occupation, yeshiva_name, study_place, work_field,
                    life_aspiration, about_me,
                    full_address, father_full_name, mother_full_name,
                    reference_1_name, reference_1_phone, reference_2_name, reference_2_phone,
                    search_min_age, search_max_age, search_height_min, search_height_max,
                    search_body_types, search_appearances, search_statuses, search_backgrounds,
                    search_heritage_sectors, search_occupations, search_life_aspirations,
                    mixed_heritage_ok, search_financial_discuss,
                    is_approved, is_blocked, is_admin, is_email_verified,
                    profile_images, profile_images_count
                ) VALUES (
                    $1, $2, NULL,
                    $3, $4, $5, $6, $7, $8, $9,
                    $10, FALSE, 0,
                    'israel', 'self', $1,
                    $11, $12, 2,
                    $13, $14, $15,
                    'no', $16, $17, $18, $19,
                    $20, $21,
                    'כתובת דמו 1', 'אבא דמו', 'אמא דמו',
                    'ממליץ א', '0501234567', 'ממליץ ב', '0507654321',
                    $22, $23, $24, $25,
                    $26, $27, $28, $29,
                    $30, $31, $32,
                    $33, $34,
                    TRUE, FALSE, FALSE, TRUE,
                    '{}', 0
                )`,
                [
                    u.phone,
                    hash,
                    u.full_name,
                    u.last_name,
                    u.gender,
                    u.age,
                    u.birth_date,
                    u.height,
                    u.city,
                    u.status,
                    u.family_background,
                    u.heritage_sector,
                    u.body_type,
                    u.skin_tone,
                    u.appearance,
                    u.current_occupation,
                    yeshiva,
                    studyPlace,
                    wf,
                    u.life_aspiration,
                    u.about_me,
                    S.search_min_age,
                    S.search_max_age,
                    S.search_height_min,
                    S.search_height_max,
                    S.search_body_types,
                    S.search_appearances,
                    S.search_statuses,
                    S.search_backgrounds,
                    S.search_heritage_sectors,
                    S.search_occupations,
                    S.search_life_aspirations,
                    S.mixed_heritage_ok,
                    S.search_financial_discuss,
                ]
            );
            const tag = u.search ? '[חיפוש צר]' : '[רחב]';
            console.log('✅ נוצר:', u.phone, u.full_name, `(${u.gender})`, tag);
        }

        await client.query('COMMIT');
        console.log('\n🎉 סיום. סיסמה לכולם:', DEMO_PASSWORD);
        console.log('טלפונים:', PHONES.join(', '));
        console.log('\nהתחברות באתר עם טלפון + סיסמה, ואז /matches (אחרי אישור – כבר is_approved=TRUE).');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ שגיאה:', e.message);
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
