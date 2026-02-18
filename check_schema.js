require('dotenv').config();
const pool = require('./db');

async function checkSchema() {
    try {
        console.log('🔍 Checking database schema...\n');

        // Get all columns in users table
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY column_name;
        `);

        console.log(`📊 Users table has ${result.rows.length} columns:\n`);
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Check for all tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log(`\n📋 Database has ${tables.rows.length} tables:\n`);
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkSchema();
