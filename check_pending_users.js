require('dotenv').config();
const pool = require('./db');

const PROFILE_FIELDS = [
    'age', 'birth_date', 'gender', 'height', 'city', 'heritage_sector',
    'family_background', 'status', 'about_me', 'home_style',
    'head_covering', 'occupation', 'studies',
    'father_name', 'mother_name', 'siblings_count', 'sibling_position',
    'rabbi_name', 'rabbi_phone',
    'search_min_age', 'search_max_age', 'search_heritage_sectors'
];

const ACTIONS_OF_INTEREST = [
    'registered', 'login', 'profile_updated', 'profile_submitted',
    'photo_uploaded', 'email_verified'
];

async function run() {
    try {
        const colsRes = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
        );
        const existingCols = new Set(colsRes.rows.map(r => r.column_name));
        const fieldsToCheck = PROFILE_FIELDS.filter(f => existingCols.has(f));

        const usersRes = await pool.query(
            `SELECT id, full_name, last_name, phone, email, created_at,
                    is_approved, is_blocked, is_email_verified,
                    is_profile_pending, pending_changes, profile_images_count,
                    age, gender, city, heritage_sector, last_login
             FROM users
             WHERE is_admin = FALSE AND is_approved = FALSE
             ORDER BY created_at DESC`
        );

        if (usersRes.rows.length === 0) {
            console.log('אין משתמשים ממתינים לאישור.');
            process.exit(0);
        }

        console.log(`\nנמצאו ${usersRes.rows.length} משתמשים לא־מאושרים:\n`);
        console.log('='.repeat(80));

        for (const u of usersRes.rows) {
            const fullRes = await pool.query(
                `SELECT ${fieldsToCheck.join(', ')} FROM users WHERE id = $1`,
                [u.id]
            );
            const row = fullRes.rows[0] || {};
            const filled = [];
            const empty = [];
            for (const f of fieldsToCheck) {
                const v = row[f];
                if (v === null || v === undefined || v === '' ||
                    (Array.isArray(v) && v.length === 0)) {
                    empty.push(f);
                } else {
                    filled.push(f);
                }
            }

            const logRes = await pool.query(
                `SELECT action, created_at FROM activity_log
                 WHERE user_id = $1
                 ORDER BY created_at DESC LIMIT 5`,
                [u.id]
            );

            const pendingCount = u.pending_changes
                ? Object.keys(u.pending_changes).length : 0;

            console.log(`\n#${u.id}  ${u.full_name || ''} ${u.last_name || ''}`);
            console.log(`  טלפון: ${u.phone || '—'}    מייל: ${u.email || '—'} ${u.is_email_verified ? '✓ מאומת' : '✗ לא מאומת'}`);
            console.log(`  נרשם:  ${u.created_at?.toISOString?.().slice(0,16).replace('T',' ') || u.created_at}`);
            console.log(`  כניסה אחרונה: ${u.last_login ? u.last_login.toISOString().slice(0,16).replace('T',' ') : 'אף פעם לא חזר'}`);
            console.log(`  שדות פרופיל מולאו: ${filled.length}/${fieldsToCheck.length}`);
            console.log(`    ✓ מולא: ${filled.join(', ') || '—'}`);
            console.log(`    ✗ ריק:  ${empty.join(', ') || '—'}`);
            console.log(`  תמונות: ${u.profile_images_count || 0}`);
            console.log(`  שינויי פרופיל ממתינים (pending_changes): ${pendingCount}`);
            console.log(`  is_profile_pending: ${u.is_profile_pending ? 'כן' : 'לא'}`);
            if (logRes.rows.length > 0) {
                console.log(`  פעילות אחרונה:`);
                for (const a of logRes.rows) {
                    console.log(`    - ${a.created_at.toISOString().slice(0,16).replace('T',' ')}  ${a.action}`);
                }
            } else {
                console.log(`  פעילות אחרונה: אין`);
            }

            let diagnosis;
            if (filled.length <= 2) {
                diagnosis = 'לא השלים את הפרופיל אחרי ההרשמה';
            } else if (!u.is_profile_pending && pendingCount === 0) {
                diagnosis = 'מילא חלק מהשדות אבל לא לחץ "שלח לאישור"';
            } else {
                diagnosis = 'מוכן לאישור — יש שינויי פרופיל ממתינים';
            }
            console.log(`  אבחון: ${diagnosis}`);
        }

        console.log('\n' + '='.repeat(80));
        process.exit(0);
    } catch (err) {
        console.error('שגיאה:', err);
        process.exit(1);
    }
}

run();
