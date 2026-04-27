/**
 * cleanup_id_cards.js
 * מוחק קבצי ת"ז / אמצעי זיהוי מהדיסק ומה-DB עבור כל המשתמשים המאושרים.
 * מריצים פעם אחת: node cleanup_id_cards.js
 */
require('dotenv').config({ override: true });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function run() {
    console.log('🔍 מחפש משתמשים מאושרים עם ת"ז שעדיין במערכת...');

    const result = await pool.query(`
        SELECT id, full_name, id_card_image_url
        FROM users
        WHERE is_approved = TRUE
          AND id_card_image_url IS NOT NULL
          AND id_card_image_url <> ''
        ORDER BY id
    `);

    if (result.rows.length === 0) {
        console.log('✅ אין קבצי ת"ז לניקוי — הכל נקי!');
        await pool.end();
        return;
    }

    console.log(`📋 נמצאו ${result.rows.length} משתמשים לניקוי:\n`);

    let deleted = 0;
    let notFound = 0;
    let errors = 0;

    for (const user of result.rows) {
        const filename = path.basename(String(user.id_card_image_url));
        const filePath = path.join(UPLOADS_DIR, filename);

        process.stdout.write(`  [${user.id}] ${user.full_name} — `);

        // מחיקת הקובץ מהדיסק
        let fileDeleted = false;
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                fileDeleted = true;
                deleted++;
                process.stdout.write('🗑️ קובץ נמחק, ');
            } catch (e) {
                errors++;
                process.stdout.write(`❌ שגיאה במחיקת קובץ (${e.message}), `);
            }
        } else {
            notFound++;
            process.stdout.write('⚠️ קובץ לא נמצא בדיסק, ');
        }

        // עדכון DB — ניקוי השדה + סימון אומת
        try {
            await pool.query(
                'UPDATE users SET id_card_image_url = NULL, identity_verified = TRUE WHERE id = $1',
                [user.id]
            );
            console.log('✅ DB עודכן');
        } catch (e) {
            console.log(`❌ שגיאה בעדכון DB: ${e.message}`);
            errors++;
        }
    }

    console.log('\n📊 סיכום:');
    console.log(`  ✅ קבצים שנמחקו מהדיסק: ${deleted}`);
    console.log(`  ⚠️  קבצים שלא נמצאו (כבר נמחקו): ${notFound}`);
    console.log(`  ❌ שגיאות: ${errors}`);
    console.log(`  📝 DB עודכן לכל ${result.rows.length} משתמשים`);

    await pool.end();
    console.log('\n🎉 הניקוי הסתיים!');
}

run().catch(err => {
    console.error('❌ שגיאה כללית:', err.message);
    pool.end();
    process.exit(1);
});
