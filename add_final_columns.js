require('dotenv').config();
const pool = require('./db');

async function addFinalColumns() {
    try {
        console.log('🔧 Adding final missing columns...\n');

        // Add blocked_at column
        console.log('📝 Adding blocked_at column...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
        `);
        console.log('✅ blocked_at column added\n');

        // Add sector column
        console.log('📝 Adding sector column...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS sector TEXT;
        `);
        console.log('✅ sector column added\n');

        console.log('🎉 All columns added successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Restart the server (Ctrl+C then npm start)');
        console.log('   2. Refresh the browser\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

addFinalColumns();
