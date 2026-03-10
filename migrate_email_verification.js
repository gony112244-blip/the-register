const pool = require('./db');

async function migrate() {
    try {
        console.log('Starting migration: Adding email verification columns...');

        // Add columns if they don't exist
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6);
    `);

        console.log('Migration successful: Columns added to "users" table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
