const { Pool } = require('pg');

// הגדרות החיבור - בדיוק כמו שמילאנו ב-VS Code
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'mysecretpassword',
    port: 5432,
});

// פונקציה לבדיקת החיבור
const testConnection = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ הצלחנו! השרת מחובר לדאטה-בייס בכתובת:', res.rows[0].now);
    } catch (err) {
        console.error('❌ תקלה בחיבור לדאטה-בייס:', err.stack);
    }
};

testConnection();

module.exports = pool;