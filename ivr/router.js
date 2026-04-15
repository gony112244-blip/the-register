/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר טקסט פשוט בפורמט ימות המשיח (id_list_message / read / go_to_folder).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession, updateUserPin } = require('./auth');
const { textToYemot, numberToHebrew } = require('./tts');
const {
    getMenuCounts,
    getMatchesForIvr, getAllMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr,
    getIncomingRequestsForIvr, approveRequestFromIvr, rejectRequestFromIvr,
    getMySentRequestsForIvr, cancelSentRequestFromIvr,
    getPhotoRequestsForIvr, approvePhotoRequestFromIvr, rejectPhotoRequestFromIvr,
    getMessagesForIvr, markMessageReadFromIvr,
    updateTtsLastPlayed
} = require('./data');

// ==========================================
// Middleware — אימות token לכל נתיבי /ivr/
// ==========================================
router.use((req, res, next) => {
    const { token } = req.query;
    if (!validateIvrToken(token)) {
        console.warn(`[IVR] ❌ Token לא תקין | IP: ${req.ip} | token: ${token}`);
        return res.status(403).type('text').send('Forbidden');
    }
    next();
});

// ==========================================
// עזר: פנייה מגדרית — g(gender, זכר, נקבה)
// gender מגיע מ-users.gender: 'male' | 'female'
// ==========================================
function g(gender, maleText, femaleText) {
    return gender === 'female' ? femaleText : maleText;
}

// ==========================================
// מבזק סטטוס — "יש לך X הצעות, Y בקשות..."
// ==========================================
function buildStatusText({ matches, requests, photos }) {
    const parts = [];

    if (matches > 0) {
        const n = numberToHebrew(matches);
        const noun = matches === 1 ? 'הצעה חדשה' : 'הצעות חדשות';
        parts.push(`${n} ${noun}`);
    }
    if (requests > 0) {
        const n = numberToHebrew(requests);
        // "בדיקת התאמה" — מינוח מותאם לציבור החרדי
        const noun = requests === 1 ? 'בדיקת התאמה ממתינה לתשובתך' : 'בדיקות התאמה ממתינות לתשובתך';
        parts.push(`${n} ${noun}`);
    }
    if (photos > 0) {
        const n = numberToHebrew(photos);
        const noun = photos === 1 ? 'בקשת תמונה' : 'בקשות תמונה';
        parts.push(`${n} ${noun}`);
    }

    if (parts.length === 0) return 'אין פעילות חדשה כרגע.';
    if (parts.length === 1) return `יש לך ${parts[0]}.`;
    if (parts.length === 2) return `יש לך ${parts[0]}, ו${parts[1]}.`;
    return `יש לך ${parts[0]}, ${parts[1]}, ו${parts[2]}.`;
}

// ==========================================
// תפריט ראשי — דינמי: מסתיר אפשרויות שאין בהן תוכן
// counts = { matches, requests, photos, messages }
// ==========================================
function buildMenuText(gender, counts = {}) {
    const m = counts.matches  || 0;
    const r = counts.requests || 0;
    const p = counts.photos   || 0;
    const msg = counts.messages || 0;
    const isMale = gender !== 'female';
    const hk  = isMale ? 'הקש'  : 'הקשי';
    const kol = isMale ? 'כולל' : 'כולל';

    const parts = [];

    // 1 — הצעות חדשות (תמיד מוצג)
    parts.push(`להצעות חדשות, ${hk} אחת.`);

    // 2 — בדיקות התאמה (רק אם יש)
    if (r > 0) parts.push(`לבדיקות התאמה שהגיעו אליך, ${hk} שתיים.`);

    // 3 — סטטוס פניות יוצאות (תמיד — המשתמש רוצה לדעת סטטוס)
    const shelcha = isMale ? 'שֶׁלְּךָ' : 'שֶׁלָּך';
    parts.push(`לסטטוס הפניות ${shelcha}, ${hk} שלוש.`);

    // 4 — תמונות (רק אם יש בקשות ממתינות)
    if (p > 0) parts.push(`לניהול תמונות, ${hk} ארבע.`);

    // 5 — הודעות (רק אם יש)
    if (msg > 0) parts.push(`להודעות חשובות, ${hk} חמש.`);

    // 6 — כל ההצעות (תמיד — גישת ארכיון)
    parts.push(`לכל ההצעות ${kol} ישנות, ${hk} שש.`);

    // 9 — הגדרות, 0 — תמיכה (תמיד)
    parts.push(`להגדרות, ${hk} תשע.`);
    parts.push(`לתמיכה, ${hk} אפס.`);

    return parts.join(' ');
}

// ==========================================
// goToMenu — מחזיר ישר לתפריט הראשי עם סטטוס
// מוחלף בכל נקודות החזרה (# ומצבים ריקים)
// ==========================================
async function goToMenu(enterId, userId, gender, res, prefix = '') {
    await updateSession(enterId, 'menu', { timeoutCount: 0 });
    let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
    try { counts = await getMenuCounts(userId); } catch {}
    const statusText = buildStatusText(counts);
    const menuText   = buildMenuText(gender, counts);
    const fullText   = prefix
        ? `${prefix} ${statusText} ${menuText}`
        : `${statusText} ${menuText}`;
    const file = await textToYemot(fullText);
    return yemotRead(res, file, 'digits', 1, 1, 8);
}

// phonetic-map נטען פעם אחת
const pm = require('./phonetic-map.json');

// מעקב אחר הודעות סיום (playback ללא read) כדי לנתק בקריאה החוזרת.
// מפתח: `${phone}:${enterId}` → timestamp
const terminalPending = new Map();
function shouldHangupAfterTerminal(phone, enterId) {
    const k = `${phone}:${enterId}`;
    if (terminalPending.has(k)) {
        terminalPending.delete(k);
        return true;
    }
    terminalPending.set(k, Date.now());
    setTimeout(() => terminalPending.delete(k), 120_000);
    return false;
}

// ==========================================
// הצעה — שכבה 1 (חובה): שם, סטטוס, גיל, עיר, מוסד
// ==========================================
function buildMatchText(match) {
    const parts = [];

    // שם
    if (match.full_name) parts.push(match.full_name);

    // סטטוס (רווק/גרוש/אלמן)
    if (match.status) {
        const st = pm.status_personal?.[match.status] || match.status;
        parts.push(st);
    }

    // גיל
    if (match.age) parts.push(`גיל ${numberToHebrew(match.age)}`);

    // עיר
    if (match.city) {
        const city = pm.cities_phonetic?.[match.city] || match.city;
        parts.push(`מ${city}`);
    }

    // מוסד לימודים
    if (match.study_place) {
        const inst = pm.yeshivot_phonetic?.[match.study_place] || match.study_place;
        const label = match.gender === 'female' ? 'בוגרת סמינר' : 'ישיבת';
        parts.push(`${label} ${inst}`);
    }

    return parts.length > 0
        ? `הצעה. ${parts.join(', ')}.`
        : 'הצעה. פרטים לא זמינים.';
}

// ==========================================
// הצעה — כל הפרטים (מקש 4): שכבה 2+3 ברצף
// מוצא, רקע, עיסוק, גובה, מראה, שאיפה, תיאור עצמי
// ==========================================
const ABOUT_ME_MAX = 120; // תווים מקסימום לפני הפניה לאפליקציה

function buildMatchDetailText(match) {
    const parts = [];

    // שכבה 2: זהות ורקע
    if (match.heritage_sector) {
        const sector = pm.heritage_sector?.[match.heritage_sector] || match.heritage_sector;
        parts.push(`מוצא ${sector}`);
    }
    if (match.family_background) {
        const bg = pm.family_background?.[match.family_background] || match.family_background;
        parts.push(`רקע ${bg}`);
    }
    if (match.current_occupation) {
        const occ = pm.current_occupation?.[match.current_occupation] || match.current_occupation;
        parts.push(occ);
    }
    if (match.height) parts.push(`גובה ${numberToHebrew(match.height)} סנטימטר`);
    if (match.gender === 'female' && match.head_covering) {
        const hc = pm.head_covering?.[match.head_covering] || match.head_covering;
        parts.push(`כיסוי ראש: ${hc}`);
    }

    // שכבה 3: מראה ושאיפות
    if (match.body_type) {
        const bt = pm.body_type?.[match.body_type] || match.body_type;
        parts.push(`מבנה גוף ${bt}`);
    }
    if (match.appearance) {
        const ap = pm.appearance?.[match.appearance] || match.appearance;
        parts.push(`מראה ${ap}`);
    }
    if (match.skin_tone) {
        const st = pm.skin_tone?.[match.skin_tone] || match.skin_tone;
        parts.push(`גוון עור ${st}`);
    }
    if (match.life_aspiration) {
        const la = pm.life_aspiration?.[match.life_aspiration] || match.life_aspiration;
        parts.push(`שאיפה: ${la}`);
    }
    if (match.work_field) parts.push(`תחום עבודה: ${match.work_field}`);

    // תיאור עצמי — אם ארוך, מקצרים ומפנים לאפליקציה
    if (match.about_me) {
        if (match.about_me.length <= ABOUT_ME_MAX) {
            parts.push(match.about_me);
        } else {
            parts.push(match.about_me.substring(0, ABOUT_ME_MAX) + '...');
            parts.push('לתיאור המלא, היכנס לאזור האישי באפליקציה');
        }
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'אין פרטים נוספים.';
}

// buildMatchFullText נשמר לתאימות אחורה אך כבר לא בשימוש
function buildMatchFullText(match) {
    return buildMatchDetailText(match);
}

// ==========================================
// helpers — פורמט תגובה לימות המשיח
// audioSeg = segment מוכן: "f-tts_cache/xx/hash" או "t-text"
// ==========================================
function yemotPlayback(res, audioSeg) {
    console.log(`[IVR] ← playback: ${audioSeg.substring(0, 80)}...`);
    res.type('text').send(`id_list_message=${audioSeg}`);
}
function yemotRead(res, audioSeg, varName = 'digits', maxDigits = 1, minDigits = 1, timeout = 8) {
    console.log(`[IVR] ← read(${varName},${minDigits}-${maxDigits}): ${audioSeg.substring(0, 80)}...`);
    // confirmation=no — הקשה מתקבלת מיד, ללא צורך ב-# לאישור
    res.type('text').send(`read=${audioSeg}=${varName},,${maxDigits},${minDigits},${timeout},NO,no,no`);
}
function yemotHangup(res) {
    console.log('[IVR] ← hangup');
    res.type('text').send('go_to_folder=hangup');
}

// ==========================================
// GET /ivr/call — webhook ראשי מימות משיח
// ==========================================
router.get('/call', async (req, res) => {
    // ימות המשיח שולחים: ApiPhone, ApiCallId, ApiDID, ApiRealDID, ApiExtension, ApiTime
    // ההקשות של המשתמש מגיעות בפרמטר ששמו נקבע ב-read (אנחנו קוראים לו "digits")
    const phone    = req.query.ApiPhone    || req.query.phone;
    const rawDigs  = req.query.digits;
    const enterId  = req.query.ApiCallId   || req.query.ApiYFCallId || req.query.EnterID || req.query.enterId || `${phone}_${Date.now()}`;
    const isHangup = req.query.hangup === 'yes';

    // ימות המשיח מצבר את כל תשובות ה-read בפרמטר digits כמערך.
    // הלחיצה הנוכחית היא תמיד האלמנט האחרון — לוקחים רק אותה.
    let key = null;
    if (rawDigs != null) {
        const last = Array.isArray(rawDigs) ? rawDigs[rawDigs.length - 1] : rawDigs;
        key = last != null ? String(last).trim() || null : null;
    }
    const digits = rawDigs; // שמור להשתמשות ב-waiting_pin (4 ספרות)

    console.log(`[IVR] 📞 שיחה נכנסת | phone: ${phone} | digits: ${rawDigs || 'none'} | enterId: ${enterId}`);
    console.log(`[IVR] 🔍 כל הפרמטרים:`, JSON.stringify(req.query));

    // סיגנל ניתוק — ימות שולחים hangup=yes בסוף שיחה, אין מה להחזיר
    if (isHangup) {
        console.log(`[IVR] 📵 Hangup signal | phone: ${phone} | enterId: ${enterId}`);
        return res.type('text').send('ok');
    }

    // --- שלב 3: זיהוי משתמש לפי phone ---
    if (!phone) {
        console.warn('[IVR] ⚠️ לא התקבל phone');
        return yemotHangup(res);
    }

    let user;
    try {
        user = await getUserByPhone(phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת DB בזיהוי משתמש:', err.message);
        return yemotHangup(res);
    }

    // משתמש לא רשום במערכת
    if (!user) {
        console.log(`[IVR] 👤 מספר לא מזוהה: ${phone}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const file = await textToYemot('מספר הטלפון אינו רשום במערכת הפנקס. להרשמה, יש להיכנס לאתר פינקס.');
        return yemotPlayback(res, file);
    }

    // משתמש חסום
    if (user.is_blocked) {
        console.log(`[IVR] 🚫 משתמש חסום: ${user.id}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const text = g(user.gender,
            'החשבון שלך חסום. לפרטים, פנה לצוות התמיכה דרך האתר.',
            'החשבון שלך חסום. לפרטים, פני לצוות התמיכה דרך האתר.'
        );
        const file = await textToYemot(text);
        return yemotPlayback(res, file);
    }

    // משתמש לא מאושר
    if (!user.is_approved) {
        console.log(`[IVR] ⏳ משתמש ממתין לאישור: ${user.id}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const text = g(user.gender,
            'הפרופיל שלך עדיין ממתין לאישור. נעדכן אותך במייל כאשר יאושר.',
            'הפרופיל שלך עדיין ממתינה לאישור. נעדכן אותך במייל כאשר תאושרי.'
        );
        const file = await textToYemot(text);
        return yemotPlayback(res, file);
    }

    // משתמש תקין — ניהול session ו-PIN
    console.log(`[IVR] ✅ משתמש מזוהה: ${user.id} | ${user.full_name}`);
    const firstName = user.full_name?.split(' ')[0] || user.full_name;


    let session;
    try {
        session = await getOrCreateSession(enterId, user.id, phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת session:', err.message);
        return yemotHangup(res);
    }

    // ==========================================
    // מכונת מצבים — state machine
    // ==========================================

    // --- מצב: init — שיחה חדשה ---
    if (session.state === 'init') {
        // אין PIN → עבור ישר לתפריט עם ברכה + סטטוס + אפשרויות (ללא round-trip)
        if (!user.ivr_pin || user.allow_ivr_no_pass) {
            await updateSession(enterId, 'menu');
            let counts = { matches: 0, requests: 0, photos: 0 };
            try { counts = await getMenuCounts(user.id); } catch {}
            const statusText = buildStatusText(counts);
            const menuOptions = buildMenuText(user.gender);
            const welcomePrefix = g(user.gender,
                `שלום ${firstName}, ברוך הבא לפנקס.`,
                `שלום ${firstName}, ברוכה הבאת לפנקס.`
            );
            const file = await textToYemot(`${welcomePrefix} ${statusText} ${menuOptions}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // יש PIN → בקש אותו (dynamic כי כולל את שם המשתמש)
        await updateSession(enterId, 'waiting_pin');
        const pinPromptText = g(user.gender,
            `שלום ${firstName}. אנא הזן את קוד הכניסה שֶׁלְּךָ, ארבע ספרות.`,
            `שלום ${firstName}. אנא הזיני את קוד הכניסה שֶׁלָּך, ארבע ספרות.`
        );
        const file = await textToYemot(pinPromptText);
        return yemotRead(res, file, 'digits', 4, 4, 15);
    }

    // --- מצב: waiting_pin — ממתין לקוד ---
    if (session.state === 'waiting_pin') {
        if (!key) {
            const repeatText = g(user.gender,
                'הזן את קוד הכניסה שֶׁלְּךָ, ארבע ספרות.',
                'הזיני את קוד הכניסה שֶׁלָּך, ארבע ספרות.'
            );
            const file = await textToYemot(repeatText);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        const pinResult = await checkPin(user.id, key);
        console.log(`[IVR] 🔑 PIN result: ${pinResult} | user: ${user.id}`);

        if (pinResult === 'ok') {
            // עבור ישר לתפריט עם ברכה — ללא round-trip נוסף
            const welcomePrefix = g(user.gender,
                `קוד נכון. ברוך הבא, ${firstName}.`,
                `קוד נכון. ברוכה הבאת, ${firstName}.`
            );
            return await goToMenu(enterId, user.id, user.gender, res, welcomePrefix);
        }

        if (pinResult === 'blocked') {
            if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
            const file = await textToYemot('הגישה חסומה לשלושים דקות, עקב ניסיונות כושלים חוזרים. נסה שוב מאוחר יותר.');
            return yemotPlayback(res, file);
        }

        // PIN שגוי — נסה שוב
        const retryText = g(user.gender, 'קוד שגוי. אנא נסה שוב.', 'קוד שגוי. אנא נסי שוב.');
        const file = await textToYemot(retryText);
        return yemotRead(res, file, 'digits', 4, 4, 15);
    }

    // --- מצב: menu — תפריט ראשי ---
    if (session.state === 'menu') {

        // timeout: אם אין הקשה — ספירה; אחרי 3 פעמים ניתוק מנומס
        if (!key) {
            const tc = parseInt(session.data?.timeoutCount || 0, 10) + 1;
            if (tc >= 3) {
                const byeFile = await textToYemot('לא נקלטה הקשה. נשמח לראותך שוב. להתראות.');
                return yemotPlayback(res, byeFile);
            }
            // שומרים count ומחזירים תפריט (goToMenu מאפס ל-0, לכן עדכן לאחר מכן)
            let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
            try { counts = await getMenuCounts(user.id); } catch {}
            await updateSession(enterId, 'menu', { timeoutCount: tc });
            const statusText = buildStatusText(counts);
            const menuText   = buildMenuText(user.gender, counts);
            const file = await textToYemot(`${statusText} ${menuText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=1 → הצעות חדשות — טוען ישר
        if (key === '1') {
            let newMatches = [];
            try { newMatches = await getMatchesForIvr(user.id, 0, 1); } catch {}
            if (newMatches.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m = newMatches[0];
            await updateSession(enterId, 'matches', { page: 0, currentMatchId: m.id });
            updateTtsLastPlayed(m.id);
            const mText = buildMatchText(m);
            const aText = g(user.gender,
                'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש ארבע לפרטים נוספים. הקש אפס לתפריט הראשי.',
                'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי ארבע לפרטים נוספים. הקשי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(`${mText} ${aText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=6 → כל ההצעות (כולל ישנות ושדולגו) — טוען ישר
        if (key === '6') {
            let allM = [];
            try { allM = await getAllMatchesForIvr(user.id, 0, 1); } catch {}
            if (allM.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m = allM[0];
            await updateSession(enterId, 'all_matches', { page: 0, currentMatchId: m.id });
            updateTtsLastPlayed(m.id);
            const mText = buildMatchText(m);
            const aText = g(user.gender,
                'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש ארבע לפרטים נוספים. הקש אפס לתפריט הראשי.',
                'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי ארבע לפרטים נוספים. הקשי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(`${mText} ${aText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=2 → בדיקות התאמה — טוען ישר ללא playback מעבר
        if (key === '2') {
            let reqs = [];
            try { reqs = await getIncomingRequestsForIvr(user.id, 0, 1); } catch {}
            if (reqs.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בדיקות התאמה ממתינות לתשובתך.');
            }
            const req = reqs[0];
            await updateSession(enterId, 'requests', { page: 0, currentConnectionId: req.connection_id });
            updateTtsLastPlayed(req.id);
            const reqText     = buildMatchText(req);
            const actionsText = g(user.gender,
                'הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר. הקש ארבע לפרטים נוספים. הקש אפס לתפריט הראשי.',
                'הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר. הקשי ארבע לפרטים נוספים. הקשי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(`בדיקת התאמה שהגיעה אליך. ${reqText} ${actionsText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=3 → סטטוס פניות שיצאו — טוען ישר
        if (key === '3') {
            let sent = [];
            try { sent = await getMySentRequestsForIvr(user.id, 0, 1); } catch {}
            if (sent.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין פניות פעילות שיצאו ממך.');
            }
            const conn = sent[0];
            await updateSession(enterId, 'my_sent', {
                page: 0,
                currentConnectionId:     conn.connection_id,
                currentConnectionStatus: conn.status
            });
            const name     = conn.full_name || 'ללא שם';
            const ageStr   = conn.age  ? `, ${numberToHebrew(conn.age)} שנים` : '';
            const cityStr  = conn.city ? `, ${conn.city}` : '';
            let connText = '', actText = '';
            if (conn.status === 'pending') {
                connText = `פנייתך ל${name}${ageStr}${cityStr} — טרם נענתה.`;
                actText  = g(user.gender, 'הקש אחת לביטול הפנייה. הקש שמונה להמשך. הקש אפס לתפריט הראשי.', 'הקשי אחת לביטול הפנייה. הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.');
            } else if (conn.status === 'active') {
                connText = `הפנייה עם ${name}${ageStr}${cityStr} פעילה — שניכם הביעו עניין ראשוני.`;
                actText  = g(user.gender, 'הקש שמונה להמשך. הקש אפס לתפריט הראשי.', 'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.');
            } else if (conn.status === 'waiting_for_shadchan') {
                connText = `הפנייה עם ${name}${ageStr}${cityStr} בטיפול השדכנית, וצפויה להתעדכן בימים הקרובים.`;
                actText  = g(user.gender, 'הקש שמונה להמשך. הקש אפס לתפריט הראשי.', 'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.');
            } else {
                connText = `פנייה ל${name} — ${conn.status}.`;
                actText  = g(user.gender, 'הקש שמונה להמשך. הקש אפס לתפריט הראשי.', 'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.');
            }
            const file = await textToYemot(`${connText} ${actText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=4 → תמונות — טוען ישר
        if (key === '4') {
            let photos = [];
            try { photos = await getPhotoRequestsForIvr(user.id, 0, 1); } catch {}
            if (photos.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות תמונה ממתינות.');
            }
            const photo = photos[0];
            await updateSession(enterId, 'photos', { page: 0, currentRequesterId: photo.requester_id });
            const pName  = photo.full_name || 'ללא שם';
            const pAge   = photo.age  ? `, ${numberToHebrew(photo.age)} שנים` : '';
            const pCity  = photo.city ? `, ${photo.city}` : '';
            const pWord  = photo.gender === 'female' ? 'מבקשת' : 'מבקש';
            const actionsText = g(user.gender,
                'הקש אחת — הסכם לחשיפה. הקש שתיים — דחה את הבקשה. הקש שמונה — דלג. הקש אפס לתפריט הראשי.',
                'הקשי אחת — הסכמי לחשיפה. הקשי שתיים — דחי את הבקשה. הקשי שמונה — דלגי. הקשי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(`${pName}${pAge}${pCity} ${pWord} לראות את תמונתך. ${actionsText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=5 → הודעות — טוען ישר
        if (key === '5') {
            let messages = [];
            try { messages = await getMessagesForIvr(user.id, 0, 1); } catch {}
            if (messages.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות חדשות הדורשות תשומת לבך.');
            }
            const msg = messages[0];
            const cleanContent = (msg.content || '')
                .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}]/gu, '')
                .replace(/ℹ️|📷|✅|❌|⚠️/g, '')
                .trim();
            await updateSession(enterId, 'messages', { page: 0, currentMessageId: msg.id, currentMessageText: cleanContent });
            const actionsText = g(user.gender,
                'הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
                'הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(`הודעה חדשה: ${cleanContent} ${actionsText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=9 → הגדרות — מתחיל ישר ללא playback מעבר
        if (key === '9') {
            await updateSession(enterId, 'settings', { step: 'wait_current', attempts: 0 });
            const text = g(user.gender,
                'להחלפת קוד הכניסה, הקש את הקוד הנוכחי, ארבע ספרות.',
                'להחלפת קוד הכניסה, הקשי את הקוד הנוכחי, ארבע ספרות.'
            );
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        if (key === '0') {
            if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
            const file = await textToYemot('לתמיכה ולעזרה, יש להיכנס לאתר פינקס.');
            return yemotPlayback(res, file);
        }

        if (key && !['1','2','3','4','5','6','9','0','#'].includes(key)) {
            console.warn(`[IVR] ⚠️ מקש לא מוכר בתפריט: ${key}`);
        }

        // כניסה ראשונה לתפריט, חזרה מ-#, או מקש לא מוכר
        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // ==========================================
    // helper פנימי — טוען הצעה הבאה ומחזיר read
    // prefix = טקסט קצר לפני ההצעה (אישור/דחייה/דילוג)
    // ==========================================
    const loadNextMatch = async (fetchFn, stateName, nextOffset, prefix = '') => {
        let pool = [];
        try { pool = await fetchFn(user.id, nextOffset, 1); } catch {}
        if (pool.length === 0) {
            const endMsg = stateName === 'matches'
                ? (prefix ? `${prefix} סיימת את כל ההצעות החדשות. לעיון בכל ההצעות לחץ שש בתפריט הראשי.` : 'סיימת את כל ההצעות החדשות. לעיון בכל ההצעות לחץ שש בתפריט הראשי.')
                : (prefix || 'סיימת את כל ההצעות הזמינות.');
            return await goToMenu(enterId, user.id, user.gender, res, endMsg);
        }
        const m = pool[0];
        await updateSession(enterId, stateName, { page: nextOffset, currentMatchId: m.id });
        updateTtsLastPlayed(m.id);
        const mText   = buildMatchText(m);
        const aText   = g(user.gender,
            'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש ארבע לפרטים נוספים. הקש אפס לתפריט הראשי.',
            'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי ארבע לפרטים נוספים. הקשי אפס לתפריט הראשי.'
        );
        const fullText = prefix ? `${prefix} ${mText} ${aText}` : `${mText} ${aText}`;
        const file = await textToYemot(fullText);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    };

    // ==========================================
    // helper פנימי — טוען פנייה/בדיקת התאמה הבאה
    // ==========================================
    const loadNextRequest = async (nextOffset, prefix = '') => {
        let pool = [];
        try { pool = await getIncomingRequestsForIvr(user.id, nextOffset, 1); } catch {}
        if (pool.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין עוד בדיקות התאמה.');
        }
        const r = pool[0];
        await updateSession(enterId, 'requests', { page: nextOffset, currentConnectionId: r.connection_id });
        updateTtsLastPlayed(r.id);
        const rText = buildMatchText(r);
        const aText = g(user.gender,
            'הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר. הקש ארבע לפרטים. הקש אפס לתפריט הראשי.',
            'הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר. הקשי ארבע לפרטים. הקשי אפס לתפריט הראשי.'
        );
        const fullText = prefix ? `${prefix} ${rText} ${aText}` : `בדיקת התאמה שהגיעה אליך. ${rText} ${aText}`;
        const file = await textToYemot(fullText);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    };

    // --- מצב: matches — הצעות חדשות ---
    if (session.state === 'matches') {
        const data    = session.data || {};
        let   offset  = parseInt(data.page  || 0, 10);
        const matchId = data.currentMatchId || null;

        // # שולח digits=null — כשיש הצעה מוצגת ו-key ריק → חזרה לתפריט
        if (!key && matchId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה על הצעה קיימת (המשתמש לחץ מקש)
        if (key && matchId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            if (key === '4') {
                // מקש 4 = כל הפרטים (שכבה 2+3 מאוחדת)
                const more = await getMatchesForIvr(user.id, offset, 1);
                const detailText = more.length > 0 ? buildMatchDetailText(more[0]) : 'אין פרטים נוספים.';
                const actionsText = g(user.gender,
                    'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש אפס לתפריט.',
                    'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי אפס לתפריט.'
                );
                const file = await textToYemot(`${detailText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            const nextOffset = offset + 1;
            if (key === '1') {
                let prefix = 'פנייתך נקלטה.';
                try {
                    await sendConnectionFromIvr(user.id, matchId);
                    console.log(`[IVR] 💌 פנייה נשלחה: ${user.id} → ${matchId}`);
                } catch (e) {
                    prefix = 'אירעה תקלה בשליחת הפנייה.';
                    console.error('[IVR] ❌ שגיאה בשליחת פנייה:', e.message);
                }
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, prefix);
            }
            if (key === '2') {
                await hideProfileFromIvr(user.id, matchId);
                console.log(`[IVR] 🙈 הסתרה: ${user.id} → ${matchId}`);
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, 'הצעה הוסרה.');
            }
            if (key === '8') {
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, '');
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש ארבע לפרטים. הקש אפס לתפריט.',
                'מקש לא מוכר. הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי ארבע לפרטים. הקשי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת ההצעה הבאה (כניסה ראשונה, או callback אחרי פעולה)
        return await loadNextMatch(getMatchesForIvr, 'matches', offset);
    }

    // --- מצב: matches_menu — legacy fallback → ישר לתפריט ראשי ---
    if (session.state === 'matches_menu') {
        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // --- מצב: all_matches — כל ההצעות כולל שדולגו ---
    if (session.state === 'all_matches') {
        const data    = session.data || {};
        let   offset  = parseInt(data.page || 0, 10);
        const matchId = data.currentMatchId || null;

        // # / timeout עם הצעה מוצגת → חזרה לתפריט
        if (!key && matchId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && matchId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }
            if (key === '4') {
                // מקש 4 = כל הפרטים (שכבה 2+3 מאוחדת)
                const more = await getAllMatchesForIvr(user.id, offset, 1);
                const detailText = more.length > 0 ? buildMatchDetailText(more[0]) : 'אין פרטים נוספים.';
                const actionsText = g(user.gender,
                    'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש אפס לתפריט.',
                    'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי אפס לתפריט.'
                );
                const file = await textToYemot(`${detailText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            const nextOffset = offset + 1;
            if (key === '1') {
                let prefix = 'פנייתך נקלטה.';
                try {
                    await sendConnectionFromIvr(user.id, matchId);
                    console.log(`[IVR] 💌 פנייה (all): ${user.id} → ${matchId}`);
                } catch (e) { prefix = 'אירעה תקלה.'; }
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, prefix);
            }
            if (key === '2') {
                await hideProfileFromIvr(user.id, matchId);
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, 'הצעה הוסרה.');
            }
            if (key === '8') {
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, '');
            }

            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש אפס לתפריט.',
                'מקש לא מוכר. הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הצעה הבאה (כניסה ראשונה)
        return await loadNextMatch(getAllMatchesForIvr, 'all_matches', offset);
    }

    // --- מצב: requests — בדיקות התאמה שהגיעו אליי ---
    if (session.state === 'requests') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;

        // # / timeout עם פנייה מוצגת → חזרה לתפריט
        if (!key && connId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && connId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            if (key === '4') {
                // מקש 4 = כל הפרטים (שכבה 2+3 מאוחדת)
                const reqs = await getIncomingRequestsForIvr(user.id, offset, 1);
                const detailText = reqs.length > 0 ? buildMatchDetailText(reqs[0]) : 'אין פרטים נוספים.';
                const actionsText = g(user.gender,
                    'הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה. הקש אפס לתפריט.',
                    'הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי. הקשי אפס לתפריט.'
                );
                const file = await textToYemot(`${detailText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            const nextOffset = offset + 1;
            if (key === '1') {
                const result = await approveRequestFromIvr(connId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הפנייה אושרה.' : 'אירעה תקלה.';
                console.log(`[IVR] ✅ פנייה אושרה: connId=${connId} | userId=${user.id}`);
                return await loadNextRequest(nextOffset, prefix);
            }
            if (key === '2') {
                const result = await rejectRequestFromIvr(connId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הפנייה נדחתה.' : 'אירעה תקלה.';
                console.log(`[IVR] ❌ פנייה נדחתה: connId=${connId} | userId=${user.id}`);
                return await loadNextRequest(nextOffset, prefix);
            }
            if (key === '8') {
                return await loadNextRequest(nextOffset, '');
            }

            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה. הקש אפס לתפריט.',
                'מקש לא מוכר. הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי. הקשי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הפנייה הבאה (כניסה ראשונה)
        return await loadNextRequest(offset);
    }

    // --- מצב: messages — הודעות חשובות ---
    if (session.state === 'messages') {
        const data      = session.data || {};
        let   offset    = parseInt(data.page || 0, 10);
        const msgId     = data.currentMessageId   || null;
        const msgText   = data.currentMessageText || null;

        // # / timeout עם הודעה מוצגת → חזרה לתפריט
        if (!key && msgId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // פעולה על הודעה שכבר נטענה
        if (key && msgId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            // מקש 1 — האזנה חוזרת
            if (key === '1' && msgText) {
                const replayText  = msgText;
                const actionsText = g(user.gender,
                    'הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
                    'הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
                );
                const file = await textToYemot(`${replayText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            // מקש 8 — הודעה הבאה (סמן כנקראה)
            if (key === '8') {
                await markMessageReadFromIvr(msgId, user.id).catch(() => {});
                offset++;
                await updateSession(enterId, 'messages', { page: offset });
                const file = await textToYemot('עוברים להודעה הבאה.');
                return yemotPlayback(res, file);
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה.',
                'מקש לא מוכר. הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת ההודעה הבאה
        let messages = [];
        try {
            messages = await getMessagesForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת הודעות:', err.message);
        }

        if (messages.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות חדשות הדורשות תשומת לבך.');
        }

        const msg = messages[0];

        // ניקוי אמוג'י והכנת הטקסט לקריאה
        const cleanContent = (msg.content || '')
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}]/gu, '')
            .replace(/ℹ️|📷|✅|❌|⚠️/g, '')
            .trim();

        await updateSession(enterId, 'messages', {
            page:               offset,
            currentMessageId:   msg.id,
            currentMessageText: cleanContent
        });

        const actionsText = g(user.gender,
            'הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
            'הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
        );
        const file = await textToYemot(`הודעה חדשה: ${cleanContent} ${actionsText}`);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    }

    // --- מצב: settings — שינוי PIN ---
    if (session.state === 'settings') {
        const data    = session.data || {};
        const step    = data.step   || null;

        // # — חזרה לתפריט בכל שלב
        if (key === '#') {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // --- שלב א': כניסה ראשונה — בקש PIN נוכחי ---
        if (!step) {
            await updateSession(enterId, 'settings', { step: 'wait_current', attempts: 0 });
            const text = g(user.gender,
                'להחלפת קוד הכניסה, הקש את הקוד הנוכחי, ארבע ספרות.',
                'להחלפת קוד הכניסה, הקשי את הקוד הנוכחי, ארבע ספרות.'
            );
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        // --- שלב ב': אימות PIN נוכחי ---
        if (step === 'wait_current') {
            if (!key) {
                const text = g(user.gender,
                    'אנא הקש את קוד הכניסה הנוכחי.',
                    'אנא הקשי את קוד הכניסה הנוכחי.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }

            const pinResult = await checkPin(user.id, key).catch(() => 'error');

            if (pinResult === 'ok') {
                await updateSession(enterId, 'settings', { step: 'wait_new' });
                const text = g(user.gender,
                    'קוד נכון. הקש קוד חדש בן ארבע ספרות.',
                    'קוד נכון. הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }

            if (pinResult === 'blocked') {
                return await goToMenu(enterId, user.id, user.gender, res, 'הכניסה נחסמה זמנית עקב ניסיונות שגויים. נסה שוב מאוחר יותר.');
            }

            // PIN שגוי — עד 3 ניסיונות
            const attempts = (data.attempts || 0) + 1;
            if (attempts >= 3) {
                return await goToMenu(enterId, user.id, user.gender, res, 'קוד שגוי יותר מדי פעמים.');
            }
            await updateSession(enterId, 'settings', { step: 'wait_current', attempts });
            const text = g(user.gender,
                `קוד שגוי. נסה שוב. הקש את קוד הכניסה הנוכחי.`,
                `קוד שגוי. נסי שוב. הקשי את קוד הכניסה הנוכחי.`
            );
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        // --- שלב ג': קבלת PIN חדש ---
        if (step === 'wait_new') {
            if (!key) {
                const text = g(user.gender,
                    'הקש קוד חדש בן ארבע ספרות.',
                    'הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }
            if (!/^\d{4}$/.test(key)) {
                const text = g(user.gender,
                    'קוד לא תקין. הקש ארבע ספרות בדיוק.',
                    'קוד לא תקין. הקשי ארבע ספרות בדיוק.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }
            await updateSession(enterId, 'settings', { step: 'wait_confirm', newPin: key });
            const text = g(user.gender,
                'הקש שוב את הקוד החדש לאישור.',
                'הקשי שוב את הקוד החדש לאישור.'
            );
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        // --- שלב ד': אישור PIN חדש ---
        if (step === 'wait_confirm') {
            if (!key) {
                const text = g(user.gender,
                    'הקש שוב את הקוד החדש לאישור.',
                    'הקשי שוב את הקוד החדש לאישור.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }
            if (key !== data.newPin) {
                await updateSession(enterId, 'settings', { step: 'wait_new' });
                const text = g(user.gender,
                    'הקודים אינם תואמים. הקש קוד חדש בן ארבע ספרות.',
                    'הקודים אינם תואמים. הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToYemot(text);
                return yemotRead(res, file, 'digits', 4, 4, 15);
            }
            try {
                await updateUserPin(user.id, data.newPin);
                return await goToMenu(enterId, user.id, user.gender, res, 'הקוד עודכן בהצלחה.');
            } catch (err) {
                console.error('[IVR] ❌ שגיאה בעדכון PIN:', err.message);
                return await goToMenu(enterId, user.id, user.gender, res, 'אירעה תקלה בעדכון הקוד. נסה שוב מאוחר יותר.');
            }
        }

        // שלב לא מוכר
        return await goToMenu(enterId, user.id, user.gender, res, 'אירעה תקלה.');
    }

    // --- מצב: photos — ניהול בקשות תמונה ---
    if (session.state === 'photos') {
        const data        = session.data || {};
        let   offset      = parseInt(data.page || 0, 10);
        const requesterId = data.currentRequesterId || null;

        // # / timeout עם בקשה מוצגת → חזרה לתפריט
        if (!key && requesterId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה על בקשה שנטענה
        if (key && requesterId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            let responseText = '';
            if (key === '1') {
                const result = await approvePhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                responseText = result === 'ok'
                    ? 'הסכמת לחשיפת תמונתך. עוברים לבקשה הבאה.'
                    : 'אירעה תקלה. עוברים לבקשה הבאה.';
                console.log(`[IVR] 📷 תמונה אושרה: requesterId=${requesterId} | userId=${user.id}`);
            } else if (key === '2') {
                const result = await rejectPhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                responseText = result === 'ok'
                    ? 'הבקשה נדחתה. עוברים לבקשה הבאה.'
                    : 'אירעה תקלה. עוברים לבקשה הבאה.';
                console.log(`[IVR] 📷 תמונה נדחתה: requesterId=${requesterId} | userId=${user.id}`);
            } else if (key === '8') {
                responseText = 'עוברים לבקשה הבאה.';
            } else {
                const actionsText = g(user.gender,
                    'מקש לא מוכר. הקש אחת — הסכמה. הקש שתיים — דחייה. הקש שמונה — דלג.',
                    'מקש לא מוכר. הקשי אחת — הסכמה. הקשי שתיים — דחייה. הקשי שמונה — דלגי.'
                );
                const file = await textToYemot(actionsText);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            offset++;
            await updateSession(enterId, 'photos', { page: offset });
            const file = await textToYemot(responseText);
            return yemotPlayback(res, file);
        }

        // טעינת הבקשה הבאה
        let photos = [];
        try {
            photos = await getPhotoRequestsForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת בקשות תמונה:', err.message);
        }

        if (photos.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות תמונה ממתינות.');
        }

        const photo    = photos[0];
        const name     = photo.full_name || 'ללא שם';
        const age      = photo.age  ? `, ${numberToHebrew(photo.age)} שנים` : '';
        const city     = photo.city ? `, ${photo.city}` : '';
        const genderWord = photo.gender === 'female'
            ? 'מבקשת'
            : 'מבקש';

        await updateSession(enterId, 'photos', { page: offset, currentRequesterId: photo.requester_id });

        const photoText   = `${name}${age}${city} ${genderWord} לראות את תמונתך.`;
        const actionsText = g(user.gender,
            'הקש אחת — הסכם לחשיפה. הקש שתיים — דחה את הבקשה. הקש שמונה — דלג. הקש אפס לתפריט הראשי.',
            'הקשי אחת — הסכמי לחשיפה. הקשי שתיים — דחי את הבקשה. הקשי שמונה — דלגי. הקשי אפס לתפריט הראשי.'
        );
        const file = await textToYemot(`${photoText} ${actionsText}`);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    }

    // --- מצב: my_sent — סטטוס פניות שיצאו ממני ---
    if (session.state === 'my_sent') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;
        const connStatus = data.currentConnectionStatus || null;

        // # / timeout עם פנייה מוצגת → חזרה לתפריט
        if (!key && connId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה לפנייה שנטענה
        if (key && connId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            // ביטול פנייה ממתינה (רק כשסטטוס pending)
            if (key === '1' && connStatus === 'pending') {
                const result = await cancelSentRequestFromIvr(connId, user.id).catch(() => 'error');
                const responseText = result === 'ok'
                    ? 'הפנייה בוטלה. עוברים לפנייה הבאה.'
                    : 'אירעה תקלה. עוברים לפנייה הבאה.';
                offset++;
                await updateSession(enterId, 'my_sent', { page: offset });
                const file = await textToYemot(responseText);
                return yemotPlayback(res, file);
            }

            // דילוג (key 8) — מתאים לכל סטטוס
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'my_sent', { page: offset });
                const file = await textToYemot('עוברים לפנייה הבאה.');
                return yemotPlayback(res, file);
            }

            // מקש לא מוכר
            const unknownText = connStatus === 'pending'
                ? g(user.gender,
                    'מקש לא מוכר. הקש אחת לביטול. הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                    'מקש לא מוכר. הקשי אחת לביטול. הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.')
                : g(user.gender,
                    'מקש לא מוכר. הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                    'מקש לא מוכר. הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.');
            const file = await textToYemot(unknownText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הפנייה הבאה
        let sent = [];
        try {
            sent = await getMySentRequestsForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת פניות שיצאו:', err.message);
        }

        if (sent.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, 'אין פניות פעילות שיצאו ממך.');
        }

        const conn = sent[0];
        const name = conn.full_name || 'ללא שם';
        const age  = conn.age ? `, ${numberToHebrew(conn.age)} שנים` : '';
        const city = conn.city ? `, ${conn.city}` : '';

        let connText = '';
        let actionsText = '';

        if (conn.status === 'pending') {
            connText = `פנייתך ל${name}${age}${city} — טרם נענתה.`;
            actionsText = g(user.gender,
                'הקש אחת לביטול הפנייה. הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                'הקשי אחת לביטול הפנייה. הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.'
            );
        } else if (conn.status === 'active') {
            connText = `הפנייה עם ${name}${age}${city} פעילה — שניכם הביעו עניין ראשוני.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.'
            );
        } else if (conn.status === 'waiting_for_shadchan') {
            connText = `הפנייה עם ${name}${age}${city} בטיפול השדכנית. אין צורך בפעולה נוספת כרגע.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.'
            );
        } else {
            connText = `פנייה ל${name} — ${conn.status}.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש אפס לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי אפס לתפריט הראשי.'
            );
        }

        await updateSession(enterId, 'my_sent', {
            page:                    offset,
            currentConnectionId:     conn.connection_id,
            currentConnectionStatus: conn.status
        });

        const file = await textToYemot(`${connText} ${actionsText}`);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    }

    // מצב לא מוכר — חזרה לתפריט (בטוח יותר מניתוק)
    console.warn(`[IVR] ⚠️ session state לא מוכר: ${session.state} — מאפס לתפריט`);
    return await goToMenu(enterId, user.id, user.gender, res);
});

// ==========================================
// GET /ivr/hangup — ניתוק (לוג בלבד כרגע)
// ==========================================
router.get('/hangup', async (req, res) => {
    const { phone } = req.query;
    console.log(`[IVR] 📵 ניתוק | phone: ${phone}`);
    return res.type('text').send('ok');
});

module.exports = router;
