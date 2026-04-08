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

module.exports = pool;