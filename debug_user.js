require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

pool.query("SELECT email, full_name, is_email_verified, never_ask_email, is_admin FROM users WHERE phone = '0583229028'")
    .then(res => {
        console.log(JSON.stringify(res.rows[0], null, 2));
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
