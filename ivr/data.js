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
 * ספירת הודעות לא-נקראות רלוונטיות לתפריט
 */
async function countUnreadMessages(userId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM messages
         WHERE to_user_id = $1
           AND is_read = FALSE
           AND (
               type = 'admin_message'
               OR (type = 'photo_request')
               OR (type = 'photo_response')
               OR (type = 'system' AND from_user_id != 1)
           )`,
        [userId]
    );
    return result.rows[0].count;
}

async function countPendingSent(userId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM connections
         WHERE sender_id = $1 AND status = 'pending'`,
        [userId]
    );
    return result.rows[0].count;
}

async function countActiveSent(userId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM connections
         WHERE sender_id = $1 AND status IN ('active', 'waiting_for_shadchan')`,
        [userId]
    );
    return result.rows[0].count;
}

/**
 * כל הספירות בקריאה אחת (מקבילית) — כולל הודעות ופניות יוצאות
 */
async function getMenuCounts(userId) {
    const [matches, requests, photos, messages, pendingSent, activeSent] = await Promise.all([
        countNewMatches(userId).catch(() => 0),
        countIncomingRequests(userId).catch(() => 0),
        countPhotoRequests(userId).catch(() => 0),
        countUnreadMessages(userId).catch(() => 0),
        countPendingSent(userId).catch(() => 0),
        countActiveSent(userId).catch(() => 0)
    ]);
    return { matches, requests, photos, messages, pendingSent, activeSent };
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
        `SELECT id, full_name, age, city, study_place, height,
                family_background, heritage_sector, current_occupation,
                body_type, appearance, skin_tone, life_aspiration,
                work_field, about_me, ivr_about, gender, status, head_covering
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
 * כל ההצעות — כמו getMatchesForIvr אך כולל פרופילים שהוסתרו (דולגו).
 * מאפשר עיון מחדש בהצעות שנדחו/דולגו.
 */
async function getAllMatchesForIvr(userId, offset = 0, limit = 1) {
    const userResult = await pool.query(
        `SELECT gender FROM users WHERE id = $1`,
        [userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.gender) return [];

    const targetGender = user.gender === 'male' ? 'female' : 'male';

    const result = await pool.query(
        `SELECT id, full_name, age, city, study_place, height,
                family_background, heritage_sector, current_occupation,
                body_type, appearance, skin_tone, life_aspiration,
                work_field, about_me, ivr_about, gender, status, head_covering
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

// ==========================================
// פניות נכנסות — שליפה עם פגינציה
// ==========================================

async function getIncomingRequestsForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT c.id AS connection_id, c.created_at,
                u.id, u.full_name, u.age, u.city, u.study_place, u.height,
                u.family_background, u.heritage_sector, u.current_occupation,
                u.body_type, u.appearance, u.skin_tone, u.life_aspiration,
                u.work_field, u.about_me, u.ivr_about, u.gender, u.status, u.head_covering
         FROM connections c
         JOIN users u ON c.sender_id = u.id
         WHERE c.receiver_id = $1 AND c.status = 'pending'
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * אישור פנייה — status → 'active'
 * TODO: שליחת מייל לשולח תתווסף בגרסה עתידית
 */
async function approveRequestFromIvr(connectionId, userId) {
    const result = await pool.query(
        `UPDATE connections
         SET status = 'active', updated_at = NOW(), last_action_by = $1
         WHERE id = $2 AND receiver_id = $1 AND status = 'pending'`,
        [userId, connectionId]
    );
    return result.rowCount > 0 ? 'ok' : 'not_found';
}

/**
 * דחיית פנייה — status → 'rejected'
 * TODO: שליחת מייל לשולח תתווסף בגרסה עתידית
 */
async function rejectRequestFromIvr(connectionId, userId) {
    const result = await pool.query(
        `UPDATE connections
         SET status = 'rejected', updated_at = NOW()
         WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
        [connectionId, userId]
    );
    return result.rowCount > 0 ? 'ok' : 'not_found';
}

// ==========================================
// פניות שיצאו ממני — שליפה וביטול
// ==========================================

/**
 * שליפת הפניות שיצאו ממני — סטטוס עדכני.
 * מציג: pending (ממתין), active (פעיל), waiting_for_shadchan (בטיפול).
 */
async function getMySentRequestsForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.full_name, u.age, u.city, u.study_place
         FROM connections c
         JOIN users u ON c.receiver_id = u.id
         WHERE c.sender_id = $1
           AND c.status IN ('pending', 'active', 'waiting_for_shadchan')
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * שליפת הבקשות שיצאו ממני שטרם נענו (pending בלבד).
 */
async function getPendingSentForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.full_name, u.age, u.city, u.study_place
         FROM connections c
         JOIN users u ON c.receiver_id = u.id
         WHERE c.sender_id = $1
           AND c.status = 'pending'
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * שליפת השידוכים הפעילים שלי (active + waiting_for_shadchan).
 */
async function getActiveSentForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                u.id AS user_id, u.full_name, u.age, u.city, u.study_place
         FROM connections c
         JOIN users u ON c.receiver_id = u.id
         WHERE c.sender_id = $1
           AND c.status IN ('active', 'waiting_for_shadchan')
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * ביטול פנייה ממתינה — מחיקת שורת ה-connection.
 * מקביל ל-POST /cancel-request (ללא שליחת מייל — כרגע).
 */
async function cancelSentRequestFromIvr(connectionId, userId) {
    const result = await pool.query(
        `DELETE FROM connections
         WHERE id = $1 AND sender_id = $2 AND status = 'pending'
         RETURNING id`,
        [connectionId, userId]
    );
    return result.rowCount > 0 ? 'ok' : 'not_found';
}

// ==========================================
// ניהול תמונות — בקשות ממתינות לאישור/דחייה
// ==========================================

/**
 * שליפת בקשות תמונה ממתינות — אנשים שרוצים לראות את תמונתי.
 * מקביל ל-GET /pending-photo-requests
 */
async function getPhotoRequestsForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT pa.id AS request_id, pa.requester_id, pa.created_at,
                u.full_name, u.age, u.city, u.gender
         FROM photo_approvals pa
         JOIN users u ON u.id = pa.requester_id
         WHERE pa.target_id = $1 AND pa.status = 'pending'
         ORDER BY pa.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * אישור בקשת תמונה.
 * מקביל ל-POST /respond-photo-request {response:'approve'}.
 * כלל: מי שמאשר — גם רואה את תמונות המבקש (יצירת אישור הפוך).
 * TODO: שליחת מייל למבקש — יתווסף בגרסה עתידית.
 */
async function approvePhotoRequestFromIvr(requesterId, userId) {
    // אשר את הבקשה המקורית
    const result = await pool.query(
        `UPDATE photo_approvals SET status = 'approved', updated_at = NOW()
         WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'
         RETURNING id`,
        [requesterId, userId]
    );
    if (result.rowCount === 0) return 'not_found';

    // צור/עדכן אישור הפוך — גם המאשר יכול לראות
    const reverseExists = await pool.query(
        `SELECT id FROM photo_approvals WHERE requester_id = $1 AND target_id = $2`,
        [userId, requesterId]
    );
    if (reverseExists.rows.length === 0) {
        await pool.query(
            `INSERT INTO photo_approvals (requester_id, target_id, status) VALUES ($1, $2, 'approved')`,
            [userId, requesterId]
        );
    } else {
        await pool.query(
            `UPDATE photo_approvals SET status = 'approved', updated_at = NOW()
             WHERE requester_id = $1 AND target_id = $2`,
            [userId, requesterId]
        );
    }
    return 'ok';
}

/**
 * דחיית בקשת תמונה.
 * מקביל ל-POST /respond-photo-request {response:'reject'}.
 * TODO: שליחת מייל למבקש — יתווסף בגרסה עתידית.
 */
async function rejectPhotoRequestFromIvr(requesterId, userId) {
    const result = await pool.query(
        `UPDATE photo_approvals SET status = 'rejected', updated_at = NOW()
         WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'
         RETURNING id`,
        [requesterId, userId]
    );
    return result.rowCount > 0 ? 'ok' : 'not_found';
}

// ==========================================
// הודעות חשובות — מסוננות לפי האפיון
// ==========================================

/**
 * שליפת הודעות חשובות שלא נקראו — מסוננות:
 *   ✅ admin_message     — הודעה אישית מהשדכנית
 *   ✅ photo_request     — בקשת תמונה (מישהו מבקש לראות)
 *   ✅ photo_response    — תגובה לבקשת תמונה שלי
 *   ✅ system מ-user אמיתי — ביטול פנייה / ביטול חיבור
 *   ❌ system מ-user 1  — ברוכים הבאים, אישור פרופיל, תזכורות
 */
async function getMessagesForIvr(userId, offset = 0, limit = 1) {
    const result = await pool.query(
        `SELECT m.id, m.content, m.type, m.created_at,
                u.full_name AS from_name
         FROM messages m
         LEFT JOIN users u ON u.id = m.from_user_id
         WHERE m.to_user_id = $1
           AND m.is_read = FALSE
           AND (
               m.type IN ('admin_message', 'photo_request', 'photo_response')
               OR (m.type = 'system' AND m.from_user_id IS NOT NULL AND m.from_user_id != 1)
           )
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * סימון הודעה כנקראה אחרי שהמשתמש שמע אותה.
 */
async function markMessageReadFromIvr(messageId, userId) {
    await pool.query(
        `UPDATE messages SET is_read = TRUE
         WHERE id = $1 AND to_user_id = $2`,
        [messageId, userId]
    );
}

/**
 * עדכון tts_last_played — נקרא כשפרופיל מושמע ב-IVR
 */
async function updateTtsLastPlayed(profileUserId) {
    await pool.query(
        'UPDATE users SET tts_last_played = NOW() WHERE id = $1',
        [profileUserId]
    ).catch(() => {});
}

module.exports = {
    getMenuCounts,
    getMatchesForIvr, getAllMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr,
    getIncomingRequestsForIvr, approveRequestFromIvr, rejectRequestFromIvr,
    getMySentRequestsForIvr, cancelSentRequestFromIvr,
    getPendingSentForIvr, getActiveSentForIvr,
    getPhotoRequestsForIvr, approvePhotoRequestFromIvr, rejectPhotoRequestFromIvr,
    getMessagesForIvr, markMessageReadFromIvr,
    updateTtsLastPlayed
};
