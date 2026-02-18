require('dotenv').config();
const pool = require('./db');

async function listUsers() {
    try {
        console.log('👥 Listing all users in database:\n');
        const res = await pool.query('SELECT id, full_name, phone, email, is_approved FROM users ORDER BY id ASC');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

listUsers();
