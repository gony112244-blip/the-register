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
               type IN ('admin_message', 'photo_response', 'reference_request', 'reference_response')
               OR (type = 'system' AND from_user_id IS NOT NULL AND from_user_id != 1)
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
         WHERE (sender_id = $1 OR receiver_id = $1)
           AND status IN ('active', 'waiting_for_shadchan')`,
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
/**
 * שליפת פרופיל מלא של משתמש יחיד לפי ID — לשמיעת כרטיס מלא בשלב הבירורים.
 */
async function getFullProfileForIvr(targetUserId) {
    const result = await pool.query(
        `SELECT id, full_name, last_name, age, city, study_place, height,
                family_background, heritage_sector, current_occupation,
                body_type, appearance, skin_tone, life_aspiration,
                work_field, ivr_about, gender, status, head_covering,
                yeshiva_name, yeshiva_ketana_name, father_occupation, mother_occupation,
                father_heritage, mother_heritage, siblings_count, sibling_position,
                has_children, children_count, country_of_birth,
                apartment_help, apartment_amount, favorite_study, study_field, home_style
         FROM users WHERE id = $1`,
        [targetUserId]
    );
    return result.rows[0] || null;
}

async function getMatchesForIvr(userId, offset = 0, limit = 1) {
    const userResult = await pool.query(
        `SELECT gender FROM users WHERE id = $1`,
        [userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.gender) return [];

    const targetGender = user.gender === 'male' ? 'female' : 'male';

    const result = await pool.query(
        `SELECT id, full_name, last_name, age, city, study_place, height,
                family_background, heritage_sector, current_occupation,
                body_type, appearance, skin_tone, life_aspiration,
                work_field, ivr_about, gender, status, head_covering,
                yeshiva_name, yeshiva_ketana_name, father_occupation, mother_occupation,
                father_heritage, mother_heritage, siblings_count, sibling_position,
                has_children, children_count, country_of_birth,
                apartment_help, apartment_amount, favorite_study, study_field, home_style
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
        `SELECT id, full_name, last_name, age, city, study_place, height,
                family_background, heritage_sector, current_occupation,
                body_type, appearance, skin_tone, life_aspiration,
                work_field, ivr_about, gender, status, head_covering,
                yeshiva_name, yeshiva_ketana_name, father_occupation, mother_occupation,
                father_heritage, mother_heritage, siblings_count, sibling_position,
                has_children, children_count, country_of_birth,
                apartment_help, apartment_amount, favorite_study, study_field, home_style
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
        `INSERT INTO hidden_profiles (user_id, hidden_user_id)
         VALUES ($1, $2)
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
                u.id, u.full_name, u.last_name, u.age, u.city, u.study_place, u.height,
                u.family_background, u.heritage_sector, u.current_occupation,
                u.body_type, u.appearance, u.skin_tone, u.life_aspiration,
                u.work_field, u.ivr_about, u.gender, u.status, u.head_covering,
                u.yeshiva_name, u.yeshiva_ketana_name, u.father_occupation, u.mother_occupation,
                u.father_heritage, u.mother_heritage, u.siblings_count, u.sibling_position,
                u.has_children, u.children_count, u.country_of_birth,
                u.apartment_help, u.apartment_amount, u.favorite_study, u.study_field, u.home_style
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
                u.id AS user_id, u.full_name, u.last_name, u.age, u.city, u.study_place
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
                u.id AS user_id, u.full_name, u.last_name, u.age, u.city, u.study_place
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
    // מחזיר שידוכים פעילים בין אם המשתמש שלח את הבקשה ובין אם קיבל אותה.
    // u — הצד השני (לא המשתמש הנוכחי).
    const result = await pool.query(
        `SELECT c.id AS connection_id, c.status, c.created_at,
                c.sender_id,
                c.sender_final_approve,
                c.receiver_final_approve,
                c.sender_first_viewed_at,
                c.receiver_first_viewed_at,
                u.id AS user_id, u.full_name, u.last_name, u.age, u.city, u.study_place,
                u.phone,
                u.father_full_name, u.mother_full_name,
                u.reference_1_name, u.reference_1_phone,
                u.reference_2_name, u.reference_2_phone,
                u.rabbi_name, u.rabbi_phone,
                u.full_address
         FROM connections c
         JOIN users u ON u.id = CASE WHEN c.sender_id = $1 THEN c.receiver_id ELSE c.sender_id END
         WHERE (c.sender_id = $1 OR c.receiver_id = $1)
           AND c.status IN ('active', 'waiting_for_shadchan')
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * בודק אם יש שידוכים פעילים שבהם הצד השני אישר התקדמות והמשתמש הנוכחי עדיין לא.
 * משמש לנדנוד בפתיחת השיחה.
 * מחזיר מערך של { connection_id, other_name }
 */
async function getAwaitingMyApproval(userId) {
    const result = await pool.query(
        `SELECT c.id AS connection_id,
                u.full_name, u.last_name
         FROM connections c
         JOIN users u ON u.id = CASE WHEN c.sender_id = $1 THEN c.receiver_id ELSE c.sender_id END
         WHERE (c.sender_id = $1 OR c.receiver_id = $1)
           AND c.status = 'active'
           AND (
               (c.sender_id = $1 AND c.receiver_final_approve = TRUE AND c.sender_final_approve = FALSE)
               OR
               (c.receiver_id = $1 AND c.sender_final_approve = TRUE AND c.receiver_final_approve = FALSE)
           )
         ORDER BY c.created_at DESC`,
        [userId]
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

/**
 * אישור סופי לבירורים — מקביל ל-POST /finalize-connection.
 * מסמן sender_final_approve=TRUE. אם שני הצדדים אישרו → status='waiting_for_shadchan'.
 * מחזיר: 'completed' | 'waiting' | 'error'
 */
async function finalizeConnectionFromIvr(connectionId, userId) {
    const check = await pool.query(
        `SELECT sender_id, receiver_id, sender_final_approve, receiver_final_approve
         FROM connections WHERE id = $1`,
        [connectionId]
    );
    if (check.rowCount === 0) return 'error';
    const conn = check.rows[0];
    if (conn.sender_id !== userId && conn.receiver_id !== userId) return 'error';

    const field = conn.sender_id === userId ? 'sender_final_approve' : 'receiver_final_approve';
    await pool.query(`UPDATE connections SET ${field} = TRUE WHERE id = $1`, [connectionId]);

    const updated = await pool.query(
        `SELECT sender_final_approve, receiver_final_approve FROM connections WHERE id = $1`,
        [connectionId]
    );
    const { sender_final_approve, receiver_final_approve } = updated.rows[0];

    if (sender_final_approve && receiver_final_approve) {
        await pool.query(`UPDATE connections SET status = 'waiting_for_shadchan' WHERE id = $1`, [connectionId]);

        // שליחת הודעת מערכת לשני הצדדים
        const msgText = 'מזל טוב! שני הצדדים אישרו התקדמות. התיק עבר לטיפול השדכנית.';
        await pool.query(
            `INSERT INTO messages (to_user_id, from_user_id, type, content, is_read, created_at)
             VALUES ($1, 1, 'system', $3, FALSE, NOW()),
                    ($2, 1, 'system', $3, FALSE, NOW())`,
            [conn.sender_id, conn.receiver_id, msgText]
        );
        return 'completed';
    }
    return 'waiting';
}

/**
 * סימון צפייה ראשונה בכרטיס הבירורים דרך ה-IVR.
 * מעדכן sender_first_viewed_at או receiver_first_viewed_at לפי תפקיד המשתמש.
 */
async function markConnectionViewedFromIvr(connectionId, userId) {
    const check = await pool.query(
        `SELECT sender_id, receiver_id FROM connections WHERE id = $1`,
        [connectionId]
    );
    if (check.rowCount === 0) return;
    const { sender_id, receiver_id } = check.rows[0];
    if (sender_id !== userId && receiver_id !== userId) return;
    const field = sender_id === userId ? 'sender_first_viewed_at' : 'receiver_first_viewed_at';
    await pool.query(
        `UPDATE connections SET ${field} = NOW() WHERE id = $1 AND ${field} IS NULL`,
        [connectionId]
    );
}

/**
 * ביטול/עצירת התקדמות של שידוך פעיל מתוך ה-IVR.
 * מקביל ל-POST /cancel-active-connection.
 * מחזיר: 'ok' | 'not_found' | 'error'
 */
async function cancelActiveConnectionFromIvr(connectionId, userId, reason = '') {
    const check = await pool.query(
        `SELECT c.*, u1.full_name AS sender_name, u2.full_name AS receiver_name
         FROM connections c
         JOIN users u1 ON c.sender_id = u1.id
         JOIN users u2 ON c.receiver_id = u2.id
         WHERE c.id = $1
           AND (c.sender_id = $2 OR c.receiver_id = $2)
           AND c.status IN ('active', 'waiting_for_shadchan')`,
        [connectionId, userId]
    );
    if (check.rowCount === 0) return 'not_found';

    const conn = check.rows[0];
    const otherUserId = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
    const myName = conn.sender_id === userId ? conn.sender_name : conn.receiver_name;

    await pool.query(`UPDATE connections SET status = 'cancelled' WHERE id = $1`, [connectionId]);
    await pool.query(
        `UPDATE connections
         SET sender_final_approve = FALSE, receiver_final_approve = FALSE
         WHERE id = $1`,
        [connectionId]
    );
    await pool.query(
        `DELETE FROM photo_approvals
         WHERE (requester_id = $1 AND target_id = $2)
            OR (requester_id = $2 AND target_id = $1)`,
        [conn.sender_id, conn.receiver_id]
    );

    const msgContent = reason
        ? `${myName} ביטל/ה את הצעת השידוך.\nסיבה: ${reason}`
        : `${myName} ביטל/ה את הצעת השידוך.`;
    await pool.query(
        `INSERT INTO messages (from_user_id, to_user_id, content, type)
         VALUES ($1, $2, $3, 'system')`,
        [userId, otherUserId, msgContent]
    );

    return 'ok';
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
                u.full_name, u.last_name, u.age, u.city, u.gender,
                u.study_place, u.height, u.family_background, u.heritage_sector,
                u.current_occupation, u.body_type, u.appearance, u.skin_tone,
                u.life_aspiration, u.work_field, u.ivr_about, u.status, u.head_covering,
                u.yeshiva_name, u.yeshiva_ketana_name, u.father_occupation, u.mother_occupation,
                u.father_heritage, u.mother_heritage, u.siblings_count, u.sibling_position,
                u.has_children, u.children_count, u.country_of_birth,
                u.apartment_help, u.apartment_amount, u.favorite_study, u.study_field, u.home_style
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
        `SELECT m.id, m.content, m.type, m.meta, m.created_at,
                u.full_name AS from_name
         FROM messages m
         LEFT JOIN users u ON u.id = m.from_user_id
         WHERE m.to_user_id = $1
           AND m.is_read = FALSE
           AND (
               m.type IN ('admin_message', 'photo_response', 'reference_request', 'reference_response')
               OR (m.type = 'system' AND m.from_user_id IS NOT NULL AND m.from_user_id != 1)
           )
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * תגובה לבקשת ממליץ נוסף מה-IVR
 * response: 'provide' (יגיב דרך האתר) | 'cannot' (לא יכול לספק)
 */
async function respondToReferenceRequestFromIvr(requestId, responderId, response) {
    const reqRow = await pool.query(
        `SELECT rr.requester_id, u_resp.full_name AS responder_name
         FROM reference_requests rr
         JOIN connections c ON c.id = rr.connection_id
         JOIN users u_resp ON u_resp.id = $2
         WHERE rr.id = $1 AND (c.sender_id = $2 OR c.receiver_id = $2)`,
        [requestId, responderId]
    );
    if (reqRow.rowCount === 0) return 'not_found';

    const { requester_id, responder_name } = reqRow.rows[0];
    await pool.query(`UPDATE reference_requests SET status = $1 WHERE id = $2`, [response, requestId]);

    const msg = response === 'provide'
        ? `✅ ${responder_name} אישר/ה שישלח/ת ממליץ נוסף — יצרו קשר ישירות.`
        : `ℹ️ ${responder_name} ציין/נה שלצערם בשלב זה אינם יכולים לספק ממליץ נוסף.`;

    await pool.query(
        `INSERT INTO messages (from_user_id, to_user_id, content, type)
         VALUES ($1, $2, $3, 'reference_response')`,
        [responderId, requester_id, msg]
    );

    return 'ok';
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
 * בקשת ממליץ נוסף מה-IVR — שולח הודעה לצד השני
 * reason קבוע: no_answer (מהטלפון לא ניתן לפרט)
 */
async function requestAdditionalReferenceFromIvr(connectionId, requesterId, count = 1) {
    const connCheck = await pool.query(
        `SELECT c.id, c.sender_id, c.receiver_id,
                u_req.full_name AS requester_name
         FROM connections c
         JOIN users u_req ON u_req.id = $2
         WHERE c.id = $1 AND (c.sender_id = $2 OR c.receiver_id = $2)
           AND c.status IN ('active','waiting_for_shadchan')`,
        [connectionId, requesterId]
    );
    if (connCheck.rowCount === 0) return 'not_found';

    const conn = connCheck.rows[0];
    const otherUserId = conn.sender_id === requesterId ? conn.receiver_id : conn.sender_id;
    const countNum = count === 2 ? 2 : 1;
    const reason = 'no_answer';

    const inserted = await pool.query(
        `INSERT INTO reference_requests (connection_id, requester_id, reason, count)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [connectionId, requesterId, reason, countNum]
    );
    const requestId = inserted.rows[0].id;

    const countText = countNum === 2 ? 'שניים' : 'אחד';
    const msg = `📋 בקשה לממליץ נוסף\n\n${conn.requester_name} מבקש/ת ממך ${countText} איש קשר נוסף לצורך בירורים.\n\nהבקשה הגיעה דרך מערכת הטלפון.`;

    await pool.query(
        `INSERT INTO messages (from_user_id, to_user_id, content, type, meta)
         VALUES ($1, $2, $3, 'reference_request', $4)`,
        [requesterId, otherUserId, msg, JSON.stringify({ requestId, connectionId, count: countNum })]
    );

    return 'ok';
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
    getPendingSentForIvr, getActiveSentForIvr, finalizeConnectionFromIvr, cancelActiveConnectionFromIvr, getAwaitingMyApproval,
    markConnectionViewedFromIvr,
    getFullProfileForIvr,
    getPhotoRequestsForIvr, approvePhotoRequestFromIvr, rejectPhotoRequestFromIvr,
    getMessagesForIvr, markMessageReadFromIvr,
    updateTtsLastPlayed,
    requestAdditionalReferenceFromIvr,
    respondToReferenceRequestFromIvr
};
