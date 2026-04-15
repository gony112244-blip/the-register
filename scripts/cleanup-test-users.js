/**
 * מחיקת כל המשתמשים שאינם מנהל (משתמשי ניסיון).
 * הרצה: node scripts/cleanup-test-users.js
 * חובה להריץ מתיקיית הפרויקט (כדי שהטעינה של .env תעבוד).
 */
require('dotenv').config();
const pool = require('../db');

async function cleanup() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ספירה לפני מחיקה
        const countRes = await client.query('SELECT COUNT(*) FROM users WHERE is_admin != TRUE');
        const count = parseInt(countRes.rows[0].count);
        console.log(`נמצאו ${count} משתמשי ניסיון למחיקה...`);

        if (count === 0) {
            console.log('אין משתמשי ניסיון — לא נדרשת מחיקה.');
            await client.query('ROLLBACK');
            return;
        }

        // מחיקת נתונים קשורים
        await client.query('DELETE FROM messages WHERE from_user_id IN (SELECT id FROM users WHERE is_admin != TRUE) OR to_user_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM connections WHERE sender_id IN (SELECT id FROM users WHERE is_admin != TRUE) OR receiver_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM hidden_profiles WHERE user_id IN (SELECT id FROM users WHERE is_admin != TRUE) OR hidden_user_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM photo_approvals WHERE requester_id IN (SELECT id FROM users WHERE is_admin != TRUE) OR target_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM user_blocks WHERE blocker_id IN (SELECT id FROM users WHERE is_admin != TRUE) OR blocked_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM user_images WHERE user_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM activity_log WHERE user_id IN (SELECT id FROM users WHERE is_admin != TRUE)');
        await client.query('DELETE FROM support_tickets WHERE user_id IN (SELECT id FROM users WHERE is_admin != TRUE)');

        // מחיקת המשתמשים עצמם
        await client.query('DELETE FROM users WHERE is_admin != TRUE');

        await client.query('COMMIT');
        console.log(`✅ ${count} משתמשי ניסיון נמחקו בהצלחה!`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ שגיאה:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
