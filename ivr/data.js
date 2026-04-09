/**
 * IVR Data — שאילתות DB לתפריט הראשי
 *
 * עיקרון: הספירות כאן הן קצרות ויעילות.
 * הלוגיקה העסקית המלאה נמצאת ב-server.js — IVR לא משכפל אותה.
 */

const pool = require('../db');

// ==========================================
// ספירות לתפריט הראשי
// ==========================================

/**
 * בקשות קשר נכנסות — אנשים ששלחו אליי פנייה וממתינים לתשובתי.
 * מקביל ל-GET /my-requests
 */
async function countIncomingRequests(userId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM connections
         WHERE receiver_id = $1 AND status = 'pending'`,
        [userId]
    );
    return result.rows[0].count;
}

/**
 * בקשות תמונה ממתינות — אנשים שביקשו לראות את תמונתי.
 * מקביל ל-GET /pending-photo-requests
 */
async function countPhotoRequests(userId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM photo_approvals
         WHERE target_id = $1 AND status = 'pending'`,
        [userId]
    );
    return result.rows[0].count;
}

/**
 * הצעות חדשות ממנוע ההתאמות — פרופילים מגדר נגדי שטרם יצרתי איתם קשר.
 * ספירה מהירה עם הסינון הבסיסי של אלגוריתם ההתאמות.
 * (הספירה המדויקת בוצעת דרך GET /matches שכולל ניקוד — כאן קירוב יעיל)
 */
async function countNewMatches(userId) {
    const userResult = await pool.query(
        `SELECT gender FROM users WHERE id = $1`,
        [userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.gender) return 0;

    const targetGender = user.gender === 'male' ? 'female' : 'male';

    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM users u
         WHERE u.gender       = $1
           AND u.is_approved  = TRUE
           AND u.is_blocked   = FALSE
           AND u.id          != $2
           AND u.id NOT IN (
               SELECT receiver_id FROM connections
               WHERE sender_id = $2 AND status IN ('active','waiting_for_shadchan','pending')
           )
           AND u.id NOT IN (
               SELECT sender_id FROM connections
               WHERE receiver_id = $2 AND status IN ('active','waiting_for_shadchan')
           )
           AND u.id NOT IN (
               SELECT hidden_user_id FROM hidden_profiles WHERE user_id = $2
           )`,
        [targetGender, userId]
    );
    return result.rows[0].count;
}

/**
 * כל הספירות בקריאה אחת (מקבילית)
 */
async function getMenuCounts(userId) {
    const [matches, requests, photos] = await Promise.all([
        countNewMatches(userId).catch(() => 0),
        countIncomingRequests(userId).catch(() => 0),
        countPhotoRequests(userId).catch(() => 0)
    ]);
    return { matches, requests, photos };
}

// ==========================================
// הצעות חדשות — שליפה עם פגינציה
// ==========================================

/**
 * שליפת הצעות לפי offset — ממירור שאילתת /matches בגרסה IVR.
 * מחזירה רק את השדות הנדרשים להקראה.
 */
async function getMatchesForIvr(userId, offset = 0, limit = 1) {
    const userResult = await pool.query(
        `SELECT gender FROM users WHERE id = $1`,
        [userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.gender) return [];

    const targetGender = user.gender === 'male' ? 'female' : 'male';

    const result = await pool.query(
        `SELECT id, full_name, age, city, study_place,
                family_background, heritage_sector, current_occupation, about_me, gender
         FROM users
         WHERE gender       = $1
           AND is_approved  = TRUE
           AND is_blocked   = FALSE
           AND id          != $2
           AND id NOT IN (
               SELECT receiver_id FROM connections
               WHERE sender_id = $2 AND status IN ('active','waiting_for_shadchan','pending')
           )
           AND id NOT IN (
               SELECT sender_id FROM connections
               WHERE receiver_id = $2 AND status IN ('active','waiting_for_shadchan')
           )
           AND id NOT IN (
               SELECT hidden_user_id FROM hidden_profiles WHERE user_id = $2
           )
           AND id NOT IN (
               SELECT blocker_id FROM user_blocks WHERE blocked_id = $2
           )
           AND id NOT IN (
               SELECT blocked_id FROM user_blocks WHERE blocker_id = $2
           )
         ORDER BY id
         LIMIT $3 OFFSET $4`,
        [targetGender, userId, limit, offset]
    );
    return result.rows;
}

/**
 * שליחת פנייה מהמערכת הטלפונית
 */
async function sendConnectionFromIvr(senderId, receiverId) {
    // בדיקה שלא קיים חיבור
    const existing = await pool.query(
        `SELECT id FROM connections WHERE sender_id = $1 AND receiver_id = $2`,
        [senderId, receiverId]
    );
    if (existing.rows.length > 0) return { status: 'exists' };

    await pool.query(
        `INSERT INTO connections (sender_id, receiver_id) VALUES ($1, $2)`,
        [senderId, receiverId]
    );
    return { status: 'sent' };
}

/**
 * הסתרת הצעה (לא מעוניין)
 */
async function hideProfileFromIvr(userId, targetId) {
    await pool.query(
        `INSERT INTO hidden_profiles (user_id, hidden_user_id, reason)
         VALUES ($1, $2, 'ivr_not_interested')
         ON CONFLICT (user_id, hidden_user_id) DO NOTHING`,
        [userId, targetId]
    );
}

module.exports = { getMenuCounts, getMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr };
