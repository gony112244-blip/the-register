/**
 * IVR Auth — אימות token ומשתמשים
 * token מגיע ב-Query String: ?token=xxx
 */

const pool = require('../db');

// ==========================================
// אימות ה-token של ימות משיח
// ==========================================
function validateIvrToken(token) {
    const expected = process.env.IVR_SERVICE_TOKEN;
    if (!expected) {
        console.error('[IVR] ⚠️ IVR_SERVICE_TOKEN לא מוגדר ב-.env');
        return false;
    }
    return token === expected;
}

// ==========================================
// חיפוש משתמש לפי מספר טלפון
// מספר מגיע בפורמט מקומי: 0541234567
// ==========================================
async function getUserByPhone(phone) {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '').trim();
    const result = await pool.query(
        `SELECT id, full_name, gender, is_approved, is_blocked,
                ivr_pin, allow_ivr_no_pass,
                ivr_failed_attempts, ivr_blocked_until
         FROM users WHERE phone = $1`,
        [clean]
    );
    return result.rows[0] || null;
}

// ==========================================
// בדיקת PIN — מחזיר: 'ok' | 'wrong' | 'blocked'
// ==========================================
async function checkPin(userId, inputPin) {
    const bcrypt = require('bcrypt');

    const result = await pool.query(
        `SELECT ivr_pin, ivr_failed_attempts, ivr_blocked_until
         FROM users WHERE id = $1`,
        [userId]
    );
    const user = result.rows[0];
    if (!user) return 'wrong';

    // בדיקת חסימה זמנית
    if (user.ivr_blocked_until && new Date() < new Date(user.ivr_blocked_until)) {
        return 'blocked';
    }

    // אין PIN מוגדר
    if (!user.ivr_pin) return 'no_pin';

    // בדיקת PIN
    const match = await bcrypt.compare(inputPin, user.ivr_pin);
    if (match) {
        // איפוס ניסיונות כושלים
        await pool.query(
            `UPDATE users SET ivr_failed_attempts = 0, ivr_blocked_until = NULL WHERE id = $1`,
            [userId]
        );
        return 'ok';
    }

    // PIN שגוי — עדכון מונה
    const attempts = (user.ivr_failed_attempts || 0) + 1;
    if (attempts >= 3) {
        // חסימה ל-30 דקות
        const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await pool.query(
            `UPDATE users SET ivr_failed_attempts = $1, ivr_blocked_until = $2 WHERE id = $3`,
            [attempts, blockedUntil, userId]
        );
        return 'blocked';
    }

    await pool.query(
        `UPDATE users SET ivr_failed_attempts = $1 WHERE id = $2`,
        [attempts, userId]
    );
    return 'wrong';
}

module.exports = { validateIvrToken, getUserByPhone, checkPin };
