require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function main() {
    try {
        const phone = '0500000000';
        const password = '123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Delete if exists
        await pool.query('DELETE FROM users WHERE phone = $1', [phone]);
        
        // Insert
        await pool.query(`
            INSERT INTO users (
                full_name, phone, password, gender, birth_date, 
                is_approved, is_email_verified, never_ask_email,
                age, city, is_admin
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
        `, ['יוסף', phone, hashedPassword, 'male', '1995-01-01', true, false, false, 30, 'ירושלים']);
        
        console.log('✅ User created successfully: 0500000000 / 123');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();
