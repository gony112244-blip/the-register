const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS hidden_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    hidden_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, hidden_user_id)
);
`;

(async () => {
    try {
        await pool.query(createTableQuery);
        console.log("✅ Table 'hidden_profiles' created successfully!");
    } catch (err) {
        console.error("❌ Error creating table:", err);
    } finally {
        pool.end();
    }
})();
