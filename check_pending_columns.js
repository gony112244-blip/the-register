require('dotenv').config();
const pool = require('./db');

async function checkPendingColumn() {
    try {
        console.log('🔍 Checking for is_profile_pending column...\n');

        // Check if column exists
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'is_profile_pending';
        `);

        if (result.rows.length === 0) {
            console.log('❌ Column is_profile_pending does NOT exist!');
            console.log('📝 Adding it now...\n');

            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS is_profile_pending BOOLEAN DEFAULT FALSE;
            `);

            console.log('✅ Column is_profile_pending added!\n');
        } else {
            console.log('✅ Column is_profile_pending already exists!\n');
        }

        // Also check for pending_changes
        const result2 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'pending_changes';
        `);

        if (result2.rows.length === 0) {
            console.log('❌ Column pending_changes does NOT exist!');
            console.log('📝 Adding it now...\n');

            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS pending_changes JSONB;
            `);

            console.log('✅ Column pending_changes added!\n');
        } else {
            console.log('✅ Column pending_changes already exists!\n');
        }

        // Also check for pending_changes_at
        const result3 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'pending_changes_at';
        `);

        if (result3.rows.length === 0) {
            console.log('❌ Column pending_changes_at does NOT exist!');
            console.log('📝 Adding it now...\n');

            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS pending_changes_at TIMESTAMP;
            `);

            console.log('✅ Column pending_changes_at added!\n');
        } else {
            console.log('✅ Column pending_changes_at already exists!\n');
        }

        console.log('🎉 All checks complete! Restart the server.\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkPendingColumn();
