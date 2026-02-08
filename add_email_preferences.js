require('dotenv').config();
const pool = require('./db');

async function addEmailPreferences() {
    try {
        console.log('🔧 Adding email preferences column to users table...');

        // הוספת עמודה להעדפות התראות במייל (ברירת מחדל: true)
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
        `);

        console.log('✅ Email preferences column added successfully!');

        // בדיקה
        const result = await pool.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email_notifications_enabled';
        `);

        console.log('📊 Column info:', result.rows[0]);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

addEmailPreferences();
