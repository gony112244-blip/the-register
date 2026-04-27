// בודק אם משתמש שמע על שגיאה בשמירה הצליח לשמור משהו בפועל.
// שימוש: node check_failed_user.js <user_id_or_phone>
require('dotenv').config();
const pool = require('./db');

async function run() {
    const arg = process.argv[2];
    if (!arg) {
        console.log('שימוש: node check_failed_user.js <user_id_או_טלפון>');
        process.exit(1);
    }
    try {
        const isNumericId = /^\d+$/.test(arg) && arg.length < 6;
        const where = isNumericId ? 'id = $1' : 'phone = $1';
        const userRes = await pool.query(
            `SELECT id, full_name, last_name, phone, email, created_at,
                    is_approved, is_profile_pending, profile_images_count,
                    age, height, gender, city, heritage_sector, family_background,
                    body_type, skin_tone, appearance, head_covering,
                    current_occupation, life_aspiration, work_field,
                    about_me, home_style,
                    search_min_age, search_max_age, search_height_min, search_height_max,
                    full_address, father_full_name, mother_full_name,
                    reference_1_name, reference_1_phone,
                    reference_2_name, reference_2_phone,
                    siblings_count, sibling_position
             FROM users WHERE ${where}`,
            [arg]
        );
        if (userRes.rows.length === 0) {
            console.log('המשתמש לא נמצא.');
            process.exit(0);
        }
        const u = userRes.rows[0];
        console.log(`\n#${u.id}  ${u.full_name || ''} ${u.last_name || ''}  (${u.phone})`);
        console.log(`is_approved=${u.is_approved}  is_profile_pending=${u.is_profile_pending}\n`);
        console.log('שדות בפרופיל:');
        const entries = Object.entries(u).filter(([k]) => !['id', 'full_name', 'last_name', 'phone', 'email', 'created_at', 'is_approved', 'is_profile_pending'].includes(k));
        for (const [k, v] of entries) {
            const filled = v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
            console.log(`  ${filled ? '✓' : '✗'}  ${k}: ${filled ? JSON.stringify(v) : '— ריק —'}`);
        }
        const logRes = await pool.query(
            `SELECT action, created_at, note FROM activity_log
             WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [u.id]
        );
        console.log(`\nפעילות אחרונה (${logRes.rows.length} רשומות):`);
        for (const a of logRes.rows) {
            console.log(`  ${a.created_at.toISOString().slice(0, 19).replace('T', ' ')}  ${a.action}${a.note ? '  ' + a.note : ''}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('שגיאה:', err);
        process.exit(1);
    }
}

run();
