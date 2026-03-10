require('dotenv').config();
const pool = require('./db');

async function fixConstraints() {
    try {
        // 1. הצגת כל ה-UNIQUE constraints הקיימים
        const constraints = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
        `);
        console.log('Existing UNIQUE constraints:', JSON.stringify(constraints.rows));

        // 2. הסרת constraint על phone אם קיים
        for (const row of constraints.rows) {
            const name = row.constraint_name;
            if (name.includes('phone') || name.includes('email') || name.includes('full_name') || name.includes('last_name')) {
                await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${name}"`);
                console.log('Dropped constraint:', name);
            }
        }

        // 3. הסרה ישירה של כל סוג UNIQUE שיכול להיות على השדות האלו
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key`);
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`);
        await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_full_name_key`);

        console.log('✅ Done! Multiple users can now share phone/email/name.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

fixConstraints();
