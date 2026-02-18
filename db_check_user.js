require('dotenv').config();
const pool = require('./db');

async function checkUser() {
    try {
        const email = 'gony112244@gmail.com';
        console.log(`🔍 Checking status for user: ${email}\n`);

        const result = await pool.query(
            "SELECT id, full_name, email, phone, is_approved, is_blocked, is_profile_pending FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length > 0) {
            console.log(JSON.stringify(result.rows, null, 2));
        } else {
            console.log('❌ User not found');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkUser();
