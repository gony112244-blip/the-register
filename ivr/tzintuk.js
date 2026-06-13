/**
 * Tzintuk Service — מערכת צ'ינטוקים (שיחות התראה קצרות) דרך ימות המשיח.
 *
 * שני סוגי אירועים:
 *   1. new_match       — התאמה חדשה, פעם ראשונה בלבד (job מתוזמן scanNewMatches)
 *   2. אירועי התקדמות  — interest / photo_request / reference_request / shadchan (hooks ב-routes)
 *
 * חיסכון בצ'ינטוקים (batching ערב):
 *   - אירועים לאורך היום לא מחייגים מיד — הם נרשמים כ-'pending' ב-tzintuk_log.
 *   - פעם ביום, בזמן אקראי בין 19:00 ל-21:00, רץ dispatch:
 *       * משתמש שכבר ראה את ההודעה (התחבר אחרי שהאירוע נוצר) — מדלגים (skipped_seen).
 *       * משתמש שעדיין לא ראה — מקבל צ'ינטוק אחד מאוחד (שאר ה-pending שלו = batched).
 *
 * מאחורי מתג כיבוי (TZINTUK_ENABLED) ו-dry-run (TZINTUK_DRY_RUN):
 *   - חיוג אמיתי קורה רק כש-ENABLED=true וגם DRY_RUN=false, ורק בזמן ה-dispatch.
 *   - בכל מצב אחר נרשם בלבד (ללא חיוג).
 *
 * "פעם ראשונה בלבד": לכל זוג (user_id, 'new_match', related_user_id) נרשמת שורה אחת בלבד.
 *   קיום שורה כזו (בכל סטטוס) → דילוג. כך גם אם הצעה ירדה מבירורים וחזרה — לא יישלח שוב.
 *   ה-seen-set נשמר גם במצב dry-run/כבוי, כך שבהפעלה עתידית רק התאמות חדשות יחייגו.
 */

const pool = require('../db');
const { runTzintuk } = require('./yemotApi');
const { buildMatchConditions } = require('../match-engine');

const DEFAULT_CALLER_ID = '0775017539';

function isEnabled() {
    return String(process.env.TZINTUK_ENABLED || '').toLowerCase() === 'true';
}

// ברירת מחדל: dry-run דולק (בטוח). רק TZINTUK_DRY_RUN=false מכבה אותו.
function isDryRun() {
    return String(process.env.TZINTUK_DRY_RUN || 'true').toLowerCase() !== 'false';
}

function getCallerId() {
    return process.env.TZINTUK_CALLER_ID || DEFAULT_CALLER_ID;
}

// חלון הערב לשליחת הצ'ינטוקים (ברירת מחדל 19:00–21:00 שעון ישראל)
// השרת רץ ב-UTC, לכן החלון מחושב במפורש לפי אזור הזמן של ישראל ולא לפי שעון השרת.
function windowStartHour() { return Number(process.env.TZINTUK_WINDOW_START_HOUR) || 19; }
function windowEndHour() { return Number(process.env.TZINTUK_WINDOW_END_HOUR) || 21; }
function dispatchTimeZone() { return process.env.TZINTUK_TZ || 'Asia/Jerusalem'; }

const EVENT_TYPES = new Set(['new_match', 'interest', 'photo_request', 'reference_request', 'shadchan']);

/**
 * נרמול מספר טלפון ישראלי לפורמט שימות מקבל (0XXXXXXXXX).
 * מחזיר null אם לא תקין.
 */
function normalizePhone(raw) {
    if (!raw) return null;
    let p = String(raw).replace(/[^0-9]/g, '');
    if (p.startsWith('972')) p = '0' + p.slice(3);
    if (!p.startsWith('0')) p = '0' + p;
    if (p.length < 9 || p.length > 10) return null;
    return p;
}

async function writeLog({ userId, eventType, relatedUserId, phone, status, yemotResponse }) {
    try {
        await pool.query(
            `INSERT INTO tzintuk_log (user_id, event_type, related_user_id, phone, caller_id, status, yemot_response)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                userId,
                eventType,
                relatedUserId || null,
                phone || null,
                getCallerId(),
                status,
                yemotResponse ? JSON.stringify(yemotResponse) : null
            ]
        );
    } catch (err) {
        console.error('[Tzintuk] ❌ שגיאה ברישום tzintuk_log:', err.message);
    }
}

async function setStatus(rowId, status, yemotResponse) {
    try {
        await pool.query(
            `UPDATE tzintuk_log SET status = $2, yemot_response = COALESCE($3, yemot_response) WHERE id = $1`,
            [rowId, status, yemotResponse ? JSON.stringify(yemotResponse) : null]
        );
    } catch (err) {
        console.error('[Tzintuk] ❌ שגיאה בעדכון סטטוס:', err.message);
    }
}

/**
 * notify — נקודת הכניסה לאירועים. *לא מחייג* — מתזה אירוע (pending) שייבדק בערב.
 * @param {number} userId        — מי מקבל את הצ'ינטוק
 * @param {string} eventType     — סוג האירוע (EVENT_TYPES)
 * @param {number} [relatedUserId] — הצד השני (התאמה / מבקש)
 * @returns {Promise<{status: string}>}
 */
async function notify(userId, eventType, relatedUserId = null) {
    if (!userId || !EVENT_TYPES.has(eventType)) {
        return { status: 'skipped_invalid' };
    }

    try {
        // dedup "פעם ראשונה בלבד" — רק ל-new_match (קיום שורה בכל סטטוס → דילוג)
        if (eventType === 'new_match' && relatedUserId) {
            const dup = await pool.query(
                `SELECT 1 FROM tzintuk_log
                 WHERE user_id = $1 AND event_type = 'new_match' AND related_user_id = $2
                 LIMIT 1`,
                [userId, relatedUserId]
            );
            if (dup.rows.length > 0) {
                return { status: 'skipped_duplicate' };
            }
        }

        const ures = await pool.query(
            `SELECT phone, COALESCE(tzintuk_opt_out, FALSE) AS opt_out
             FROM users WHERE id = $1`,
            [userId]
        );
        if (ures.rows.length === 0) {
            return { status: 'skipped_invalid' };
        }
        const { phone: rawPhone, opt_out } = ures.rows[0];

        if (opt_out) {
            await writeLog({ userId, eventType, relatedUserId, phone: null, status: 'skipped_opt_out' });
            return { status: 'skipped_opt_out' };
        }

        const phone = normalizePhone(rawPhone);
        if (!phone) {
            await writeLog({ userId, eventType, relatedUserId, phone: rawPhone, status: 'skipped_no_phone' });
            return { status: 'skipped_no_phone' };
        }

        // מתזה — ההחלטה והחיוג קורים ב-dispatch הערב
        await writeLog({ userId, eventType, relatedUserId, phone, status: 'pending' });
        return { status: 'pending' };

    } catch (err) {
        console.error(`[Tzintuk] ❌ notify(${userId}, ${eventType}) נכשל:`, err.message);
        return { status: 'failed', error: err.message };
    }
}

/**
 * dispatchEveningTzintukim — שליחת הצ'ינטוקים שנצברו במהלך היום.
 * רץ פעם ביום בזמן אקראי בין 19:00 ל-21:00.
 * משתמש שלא ראה את ההודעה עד עכשיו (לא התחבר מאז שהאירוע נוצר) — מקבל צ'ינטוק אחד מאוחד.
 */
async function dispatchEveningTzintukim() {
    const startedAt = Date.now();
    let usersHandled = 0, dialed = 0, seenSkipped = 0;

    try {
        const pend = await pool.query(`
            SELECT t.id, t.user_id, t.event_type, t.related_user_id, t.created_at,
                   u.phone AS user_phone, u.last_login,
                   COALESCE(u.tzintuk_opt_out, FALSE) AS opt_out
            FROM tzintuk_log t
            JOIN users u ON u.id = t.user_id
            WHERE t.status = 'pending'
            ORDER BY t.user_id, t.created_at DESC
        `);

        // קיבוץ לפי משתמש
        const byUser = new Map();
        for (const r of pend.rows) {
            if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
            byUser.get(r.user_id).push(r);
        }

        for (const [, rows] of byUser) {
            usersHandled++;
            const lastLogin = rows[0].last_login;
            const optOut = rows[0].opt_out;

            // חלוקה: נראה (התחבר אחרי האירוע) מול לא-נראה
            const unseen = [];
            for (const r of rows) {
                const seen = lastLogin && new Date(lastLogin) >= new Date(r.created_at);
                if (seen) {
                    await setStatus(r.id, 'skipped_seen');
                    seenSkipped++;
                } else {
                    unseen.push(r);
                }
            }

            if (unseen.length === 0) continue;

            if (optOut) {
                for (const r of unseen) await setStatus(r.id, 'skipped_opt_out');
                continue;
            }

            const phone = normalizePhone(rows[0].user_phone);
            if (!phone) {
                for (const r of unseen) await setStatus(r.id, 'skipped_no_phone');
                continue;
            }

            // צ'ינטוק אחד מאוחד למשתמש: rep = השורה האחרונה; השאר = batched
            const rep = unseen[0];
            const rest = unseen.slice(1);

            if (!isEnabled()) {
                await setStatus(rep.id, 'skipped_disabled');
                for (const r of rest) await setStatus(r.id, 'batched');
                continue;
            }

            if (isDryRun()) {
                await setStatus(rep.id, 'dry_run', { window: true, phone });
                for (const r of rest) await setStatus(r.id, 'batched');
                dialed++;
                continue;
            }

            const result = await runTzintuk(phone, getCallerId());
            await setStatus(rep.id, result.ok ? 'sent' : 'failed', {
                ok: result.ok, code: result.code, message: result.message
            });
            for (const r of rest) await setStatus(r.id, result.ok ? 'batched' : 'failed');
            if (result.ok) dialed++;
        }

        const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`[Tzintuk] 📞 dispatch: ${usersHandled} משתמשים, ${dialed} צ'ינטוקים, ${seenSkipped} דולגו (כבר ראו) — enabled=${isEnabled()}, dryRun=${isDryRun()} (${secs}s)`);
    } catch (err) {
        console.error('[Tzintuk] ❌ dispatch נכשל:', err.message);
    }
}

/**
 * scanNewMatches — job לזיהוי התאמות חדשות (Event Type 1) ותזמונן (pending).
 * עובר על משתמשים פעילים עם טלפון, מחשב התאמות עם buildMatchConditions,
 * וקורא ל-notify('new_match') לכל מועמד שטרם נרשם (notify מטפל ב-dedup).
 */
async function scanNewMatches() {
    const startedAt = Date.now();
    let usersScanned = 0, candidatesChecked = 0, queued = 0;

    try {
        const usersRes = await pool.query(
            `SELECT id FROM users
             WHERE is_approved = TRUE
               AND is_blocked = FALSE
               AND COALESCE(tzintuk_opt_out, FALSE) = FALSE
               AND phone IS NOT NULL AND trim(phone) <> ''
               AND gender IS NOT NULL`
        );

        for (const u of usersRes.rows) {
            usersScanned++;
            try {
                const mc = await buildMatchConditions(u.id, pool, { includePendingSent: true });
                if (!mc.valid) continue;

                const query = `
                    SELECT id FROM users
                    WHERE ${mc.conditions.join(' AND ')}
                    ORDER BY id DESC
                `;
                const matches = await pool.query(query, mc.params);

                for (const m of matches.rows) {
                    candidatesChecked++;
                    const r = await notify(u.id, 'new_match', m.id);
                    if (r.status === 'pending') queued++;
                }
            } catch (perUserErr) {
                console.error(`[Tzintuk] ⚠️ scan נכשל למשתמש ${u.id}:`, perUserErr.message);
            }
        }

        const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`[Tzintuk] 🔎 scanNewMatches: ${usersScanned} משתמשים, ${candidatesChecked} מועמדים, ${queued} התאמות חדשות נרשמו (${secs}s)`);
    } catch (err) {
        console.error('[Tzintuk] ❌ scanNewMatches נכשל:', err.message);
    }
}

// ==========================================
// תזמון
// ==========================================
const SCAN_INTERVAL_MS = Number(process.env.TZINTUK_SCAN_INTERVAL_MS) || 15 * 60 * 1000;
let scanTimer = null;
let dispatchTimer = null;

// היסט אזור הזמן (ms) של tz נתון ברגע מסוים, ביחס ל-UTC (לישראל בקיץ = +3 שעות)
function tzOffsetMs(date, timeZone) {
    // hourCycle:'h23' חיוני — אחרת ICU מחזיר "24" בחצות ומקדם את התאריך ביום (באג ידוע)
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const map = {};
    for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    return asUTC - date.getTime();
}

// רכיבי התאריך (שנה/חודש/יום) של "עכשיו" בשעון ישראל
function wallDateParts(date, timeZone) {
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const map = {};
    for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
    return { y: Number(map.year), m: Number(map.month), d: Number(map.day) };
}

// timestamp (UTC ms) של שעת-קיר נתונה באזור הזמן של ישראל
function israelWallToUtcMs(y, m, d, hour, minute, timeZone) {
    const guess = Date.UTC(y, m - 1, d, hour, minute, 0);
    const offset = tzOffsetMs(new Date(guess), timeZone);
    return guess - offset;
}

// חישוב ה-delay עד זמן אקראי בין START ל-END בשעון ישראל (היום או מחר אם החלון עבר)
function nextDispatchDelayMs() {
    const tz = dispatchTimeZone();
    const now = Date.now();
    const startH = windowStartHour(), endH = windowEndHour();

    const buildTarget = (dayShift) => {
        const base = new Date(now + dayShift * 24 * 60 * 60 * 1000);
        const { y, m, d } = wallDateParts(base, tz);
        const startMs = israelWallToUtcMs(y, m, d, startH, 0, tz);
        const endMs = israelWallToUtcMs(y, m, d, endH, 0, tz);
        return startMs + Math.random() * (endMs - startMs);
    };

    let target = buildTarget(0);
    if (target <= now) target = buildTarget(1);
    return target - now;
}

function scheduleNextDispatch() {
    const delay = nextDispatchDelayMs();
    const when = new Date(Date.now() + delay);
    const whenIL = when.toLocaleString('he-IL', { timeZone: dispatchTimeZone() });
    console.log(`[Tzintuk] 📞 dispatch הבא: ${whenIL} (שעון ישראל, חלון ${windowStartHour()}:00–${windowEndHour()}:00)`);
    dispatchTimer = setTimeout(async () => {
        try { await dispatchEveningTzintukim(); }
        catch (e) { console.error('[Tzintuk] ❌ dispatch run:', e.message); }
        scheduleNextDispatch(); // תזמון מחדש למחר עם זמן אקראי חדש
    }, delay);
}

function startTzintukScheduler() {
    console.log(`[Tzintuk] ⏰ הופעל — scan כל ${(SCAN_INTERVAL_MS / 60000).toFixed(0)} דק', dispatch אקראי ${windowStartHour()}:00–${windowEndHour()}:00 (${dispatchTimeZone()}) (enabled=${isEnabled()}, dryRun=${isDryRun()}, callerId=${getCallerId()})`);

    // סריקת התאמות — ריצה ראשונה אחרי 3 דקות, ואז כל SCAN_INTERVAL_MS
    setTimeout(() => {
        scanNewMatches().catch(err => console.error('[Tzintuk] ❌ initial scan:', err.message));
    }, 3 * 60 * 1000);
    scanTimer = setInterval(() => {
        scanNewMatches().catch(err => console.error('[Tzintuk] ❌ scheduled scan:', err.message));
    }, SCAN_INTERVAL_MS);

    // תזמון ה-dispatch הערב
    scheduleNextDispatch();
}

function stopTzintukScheduler() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (dispatchTimer) { clearTimeout(dispatchTimer); dispatchTimer = null; }
}

module.exports = {
    notify,
    scanNewMatches,
    dispatchEveningTzintukim,
    startTzintukScheduler,
    stopTzintukScheduler,
    normalizePhone,
    isEnabled,
    isDryRun,
    getCallerId,
    windowStartHour,
    windowEndHour
};
