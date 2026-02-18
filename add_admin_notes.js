require('dotenv').config();
const pool = require('./db');

async function addAdminNotes() {
    try {
        console.log('🔧 Adding admin_notes column...\n');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        `);

        console.log('✅ admin_notes column added successfully!\n');
        console.log('📝 Restart the server (Ctrl+C then npm start) and refresh browser\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

addAdminNotes();
