/**
 * בדיקה לוגית: משתמש "חיפוש צר" 0599001010 — אילו בנות דמו עוברות את הסינון החד־צדדי שלו.
 * (ההתאמה המלאה ב־/matches כוללת גם סינון דו־כיווני — כאן בודקים את החלק ה"צר".)
 *
 *   node verify_narrow_demo.js
 */
require('dotenv').config();
const pool = require('./db');

const NARROW = {
    search_min_age: 25,
    search_max_age: 26,
    search_height_min: 161,
    search_height_max: 163,
    search_heritage_sectors: 'sephardi',
    search_statuses: 'single',
};

function inList(csv, val) {
    if (!csv || !val) return false;
    return csv.split(',').map((s) => s.trim()).filter(Boolean).includes(val);
}

function passesNarrowMaleFilters(row) {
    const age = row.age;
    const h = Number(row.height);
    if (age < NARROW.search_min_age || age > NARROW.search_max_age) return false;
    if (h < NARROW.search_height_min || h > NARROW.search_height_max) return false;
    if (!inList(NARROW.search_heritage_sectors, row.heritage_sector)) return false;
    if (!inList('single', row.status)) return false;
    if (!inList('thin,average', row.body_type)) return false;
    if (!inList('ok,good', row.appearance)) return false;
    return true;
}

async function main() {
    const r = await pool.query(
        `SELECT id, phone, full_name, gender, age, height, heritage_sector, status,
                body_type, appearance, family_background
         FROM users
         WHERE phone = ANY($1::text[]) AND gender = 'female'
         ORDER BY phone`,
        [['0599001002', '0599001004', '0599001006']]
    );

    console.log('=== בדיקת סינון חד־צדדי (מה שהבחור "חיפוש צר" מבקש) ===\n');
    console.log('קריטריון:', JSON.stringify(NARROW, null, 2));
    console.log('');

    for (const row of r.rows) {
        const ok = passesNarrowMaleFilters(row);
        console.log(`${ok ? '✅ עובר' : '❌ לא עובר'} | ${row.phone} | ${row.full_name} | גיל ${row.age} | גובה ${row.height} | ${row.heritage_sector}`);
    }

    const okRows = r.rows.filter(passesNarrowMaleFilters);
    console.log('\n--- סיכום ---');
    if (okRows.length === 1 && okRows[0].phone === '0599001004') {
        console.log('✅ צפוי: רק 0599001004 (בת ב׳) עוברת את החיפוש הצר.');
    } else {
        console.log('⚠️ בדוק ידנית — צפוי רק 0599001004. נמצא:', okRows.map((x) => x.phone).join(', ') || '(אף אחת)');
    }

    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
