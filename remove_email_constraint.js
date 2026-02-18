require('dotenv').config();
const pool = require('./db');

async function removeEmailConstraint() {
    try {
        console.log('🔓 Removing unique constraint on email column...');

        // Find the constraint name (usually users_email_key)
        const res = await pool.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'users'::regclass 
            AND contype = 'u' 
            AND conname LIKE '%email%'
        `);

        if (res.rows.length > 0) {
            for (const row of res.rows) {
                console.log(`🗑️ Dropping constraint: ${row.conname}`);
                await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${row.conname}`);
            }
            console.log('✅ Unique constraints on email removed.');
        } else {
            console.log('ℹ️ No unique constraints found on email.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

removeEmailConstraint();
