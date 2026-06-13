require('dotenv').config(); // טעינת המשתנים
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // מניעת צבירת חיבורים תחת עומס; ניתן לעקוף ב-.env
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_IDLE_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS) || 5000,
});

// אם ה-Pool מקבל שגיאת אימות (סיסמה שגויה / DB לא קיים) — יוצאים מבוקרת
// כך PM2 מפעיל מחדש אוטומטית עם הסיסמה העדכנית מה-.env
pool.on('error', (err) => {
  const FATAL_CODES = new Set(['28P01', '28000', '3D000', '08006', '08001']);
  if (FATAL_CODES.has(err.code)) {
    console.error(`[DB] שגיאה קריטית (${err.code}): ${err.message} — יוצא לאפשר PM2 restart`);
    process.exit(1);
  }
});

module.exports = pool;