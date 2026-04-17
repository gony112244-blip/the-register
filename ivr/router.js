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
    getPendingSentForIvr, getActiveSentForIvr,
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
// מבזק סטטוס — "יש לְךָ / לָך X הצעות, Y בקשות..."
// gender-aware כדי למנוע עיוות TTS במילה "לך"
// ==========================================
function buildStatusText(gender, counts) {
    const { matches = 0, requests = 0, photos = 0, messages = 0, pendingSent = 0, activeSent = 0 } = counts;
    const isMale = gender !== 'female';
    const lecha = isMale ? 'לְךָ' : 'לָך';
    const parts = [];

    // הצעות חדשות
    if (matches > 0) {
        const noun = matches === 1 ? 'הצעה חדשה' : `${numberToHebrew(matches, true)} הצעות חדשות`;
        parts.push(noun);
    }
    // בקשות שידוך שהגיעו
    if (requests > 0) {
        const noun = requests === 1 ? 'בקשת שידוך שהגיעה אליך' : `${numberToHebrew(requests, true)} בקשות שידוך שהגיעו אליך`;
        parts.push(noun);
    }
    // בקשות תמונה
    if (photos > 0) {
        const noun = photos === 1 ? 'בקשת תמונה' : `${numberToHebrew(photos, true)} בקשות תמונה`;
        parts.push(noun);
    }
    // הודעות חשובות
    if (messages > 0) {
        const noun = messages === 1 ? 'הודעה חשובה' : `${numberToHebrew(messages, true)} הודעות חשובות`;
        parts.push(noun);
    }
    // שידוך פעיל — מספר אחרי שם העצם (זכר: אחד/שני)
    if (activeSent > 0) {
        const noun = activeSent === 1
            ? 'שידוך פעיל אחד'
            : `${activeSent === 2 ? 'שני' : numberToHebrew(activeSent)} שידוכים פעילים`;
        parts.push(noun);
    }

    if (parts.length === 0) return 'אין פעילות חדשה כרגע.';
    const last = parts.pop();
    if (parts.length === 0) return `יש ${lecha} ${last}.`;
    return `יש ${lecha} ${parts.join(', ')}, ו${last}.`;
}

// ==========================================
// תפריט ראשי — דינמי: מסתיר אפשרויות שאין בהן תוכן
// counts = { matches, requests, photos, messages }
// ==========================================
function buildMenuText(gender, counts = {}) {
    const r           = counts.requests    || 0;
    const p           = counts.photos      || 0;
    const msg         = counts.messages    || 0;
    const pendingSent = counts.pendingSent || 0;
    const activeSent  = counts.activeSent  || 0;
    const isMale = gender !== 'female';
    // ניקוד מפורש — TTS יקרא "הָקֵשׁ" (פועל) ולא "הַקֵּשׁ" (שם עצם)
    const hk = isMale ? 'הָקֵשׁ' : 'הָקִישִׁי';

    const parts = [];

    // 1 — הצעות חדשות (רק אם יש — אבל מקש 1 תמיד פעיל)
    // כשאין הצעות לא מכריזים בתפריט, אבל אם ילחץ 1 יקבל הודעה מתאימה
    if (counts.matches > 0) parts.push(`להצעות חדשות, ${hk} אחת.`);

    // 2 — תמונות ממתינות (רק אם יש)
    if (p > 0) parts.push(`לתמונות הממתינות לאישורך, ${hk} שתיים.`);

    // 3 — בקשות שידוך שהגיעו אליך (רק אם יש)
    if (r > 0) parts.push(`לבקשות שידוך שהגיעו אליך, ${hk} שלוש.`);

    // 4 — בקשות שנשלחו שטרם נענו (רק אם יש) — מספר אחרי שם העצם (נקבה: אחת/שתי)
    if (pendingSent > 0) {
        const noun = pendingSent === 1
            ? `לבקשה אחת שנשלחה ועדיין ממתינה לתשובה, ${hk} ארבע.`
            : `לשתי בקשות שנשלחו שעדיין ממתינות, ${hk} ארבע.`;
        // 3+: "לשלוש בקשות..." וכו'
        const txt = pendingSent <= 2 ? noun
            : `ל${numberToHebrew(pendingSent, true)} בקשות שנשלחו שעדיין ממתינות, ${hk} ארבע.`;
        parts.push(txt);
    }

    // 5 — שידוכים פעילים (רק אם יש) — מספר אחרי שם העצם (זכר: אחד/שני)
    if (activeSent > 0) {
        const txt = activeSent === 1
            ? `לשידוך פעיל אחד, ${hk} חמש.`
            : activeSent === 2
                ? `לשני שידוכים פעילים, ${hk} חמש.`
                : `ל${numberToHebrew(activeSent)} שידוכים פעילים, ${hk} חמש.`;
        parts.push(txt);
    }

    // 6 — הודעות חשובות (רק אם יש)
    if (msg > 0) parts.push(`להודעות חשובות, ${hk} שש.`);

    // 7 — כל ההצעות כולל ישנות (תמיד)
    parts.push(`לכל ההצעות כולל ישנות, ${hk} שבע.`);

    // חזרה על התפריט — תמיד בסוף
    parts.push(`לשמיעה חוזרת של התפריט, ${hk} אפס.`);

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
    const statusText = buildStatusText(gender, counts);
    const menuText   = buildMenuText(gender, counts);
    // כשיש prefix (למשל "סיימת את כל ההצעות") — לא חוזרים על "אין פעילות חדשה"
    const parts = [];
    if (prefix) parts.push(prefix);
    // הצג status רק אם יש פעילות (כדי למנוע כפילות עם prefix שאומר "אין...")
    const hasActivity = (counts.matches || counts.requests || counts.photos || counts.messages || counts.pendingSent || counts.activeSent);
    if (hasActivity) parts.push(statusText);
    parts.push(menuText);
    const file = await textToYemot(parts.join(' '));
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
// שם מלא — שם פרטי + שם משפחה
// ==========================================
function buildFullName(match) {
    const first = match.full_name || '';
    const last  = match.last_name  || '';
    return last ? `${first} ${last}` : first;
}

// ==========================================
// הקראת פרופיל מלא — כל הפרטים ברצף אחד
// ==========================================
function buildFullProfileText(match) {
    const parts = [];

    // --- פרטים בסיסיים ---
    const isFemale = match.gender === 'female';
    const fullName = buildFullName(match);
    if (fullName) parts.push(fullName);
    if (match.status) {
        // מפה מודעת-מגדר: ניקוד מפורש כדי ש-TTS יבטא נכון
        const statusMap = {
            single:   isFemale ? 'רַוָּקָה' : 'רַוָּק',
            divorced: isFemale ? 'גְּרוּשָׁה'  : 'גָּרוּשׁ',
            widower:  isFemale ? 'אַלְמָנָה'  : 'אַלְמָן',
        };
        const st = statusMap[match.status] || pm.status_personal?.[match.status] || match.status;
        parts.push(st);
    }
    if (match.age) parts.push(`גיל ${numberToHebrew(match.age)}`);
    if (match.city) {
        const city = pm.cities_phonetic?.[match.city] || match.city;
        parts.push(`מ${city}`);
    }
    if (match.country_of_birth) {
        const ylidPrefix = isFemale ? 'יְלִידַת' : 'יְלִיד';
        parts.push(`${ylidPrefix} ${match.country_of_birth}`);
    }
    if ((match.status === 'divorced' || match.status === 'widower') && match.has_children === 'yes' && match.children_count) {
        parts.push(`${match.children_count} ילדים`);
    }

    // --- מוצא ורקע ---
    if (match.heritage_sector) {
        const sector = pm.heritage_sector?.[match.heritage_sector] || match.heritage_sector;
        parts.push(`מוצא ${sector}`);
    }
    if (match.family_background) {
        const bg = pm.family_background?.[match.family_background] || match.family_background;
        parts.push(`רקע ${bg}`);
    }
    if (match.father_heritage) parts.push(`עדת האב: ${match.father_heritage}`);
    if (match.mother_heritage) parts.push(`עדת האם: ${match.mother_heritage}`);

    // --- משפחה ---
    // "האב" תקין. "האם" מבולבל עם שאלה — משתמשים ב"אמא" לבהירות ב-TTS
    if (match.father_occupation) parts.push(`האבא עובד כ${match.father_occupation}`);
    if (match.mother_occupation) parts.push(`האמא עובדת כ${match.mother_occupation}`);
    if (match.siblings_count) {
        const cnt = match.siblings_count;
        if (match.sibling_position) {
            // "יש לו שישה אחים, הוא מספר שלוש"
            const heOrShe = isFemale ? 'היא' : 'הוא';
            parts.push(`${cnt} אחים, ${heOrShe} מספר ${match.sibling_position} בין האחים`);
        } else {
            parts.push(`${cnt} אחים`);
        }
    }

    // --- לימודים ועיסוק ---
    if (match.study_place) {
        const inst = pm.yeshivot_phonetic?.[match.study_place] || match.study_place;
        const label = match.gender === 'female' ? 'סמינר' : 'ישיבת';
        parts.push(`${label} ${inst}`);
    }
    if (!isFemale && match.yeshiva_name) parts.push(`ישיבת ${match.yeshiva_name}`);
    if (!isFemale && match.yeshiva_ketana_name) parts.push(`ישיבה קטנה: ${match.yeshiva_ketana_name}`);
    if (match.current_occupation) {
        const femaleOccMap = {
            studying:    'לומדת',
            working:     'עובדת',
            both:        'לומדת ועובדת',
            fixed_times: 'קובעת עיתים ללימוד'
        };
        const occ = isFemale
            ? (femaleOccMap[match.current_occupation] || pm.current_occupation?.[match.current_occupation] || match.current_occupation)
            : (pm.current_occupation?.[match.current_occupation] || match.current_occupation);
        parts.push(occ);
    }
    if (match.work_field) parts.push(`תחום עבודה: ${match.work_field}`);
    // study_field ו-favorite_study רלוונטיים לגברים בלבד (לימוד תורני)
    if (!isFemale && match.study_field)    parts.push(`תחום לימודים: ${match.study_field}`);
    if (!isFemale && match.favorite_study) {
        const fs = pm.favorite_study?.[match.favorite_study] || match.favorite_study;
        parts.push(`לימוד מועדף: ${fs}`);
    }

    // --- דיור ---
    if (match.apartment_help) {
        const helpMap = { full: 'דירה מלאה', partial: 'עזרה חלקית', none: 'ללא עזרה' };
        const helpText = helpMap[match.apartment_help] || match.apartment_help;
        // apartment_amount הוא טקסט חופשי — לא מוקרא כדי להימנע מבלבול ב-TTS
        parts.push(`עזרה בדיור: ${helpText}`);
    }

    // --- מראה ---
    if (match.height) parts.push(`גובה ${numberToHebrew(match.height)} סנטימטר`);
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
        parts.push(`צבע עור ${st}`);
    }
    if (match.gender === 'female' && match.head_covering) {
        const hc = pm.head_covering?.[match.head_covering] || match.head_covering;
        parts.push(`כיסוי ראש: ${hc}`);
    }

    // --- שאיפות ---
    if (match.life_aspiration) {
        const la = pm.life_aspiration?.[match.life_aspiration] || match.life_aspiration;
        parts.push(`שאיפה: ${la}`);
    }

    // --- תיאור עצמי (IVR) ---
    if (match.ivr_about && match.ivr_about.trim()) {
        parts.push(match.ivr_about.trim());
    }

    return parts.length > 0
        ? `הצעה. ${parts.join('. ')}.`
        : 'הצעה. פרטים לא זמינים.';
}

// תאימות אחורה — פונקציות ישנות מפנות לחדשה
function buildMatchText(match)     { return buildFullProfileText(match); }
function buildMatchDetailText(match) { return buildFullProfileText(match); }
function buildMatchFullText(match)   { return buildFullProfileText(match); }

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
    // פורמט ימות (מתוך yemot-router2 — makeTapModeRead):
    // read=<audio>=<valName>,<re_enter_if_exists>,<max>,<min>,<sec_wait>,<playback_mode>,<block_asterisk>,<block_zero>
    // playback_mode='No' = ללא השמעת הלחיצה חזרה (ולא מבקש אישור)
    const opts = [varName, 'no', maxDigits, minDigits, timeout, 'No', 'no', 'no'].join(',');
    res.type('text').send(`read=${audioSeg}=${opts}`);
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
            let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
            try { counts = await getMenuCounts(user.id); } catch {}
            const statusText = buildStatusText(user.gender, counts);
            const menuOptions = buildMenuText(user.gender, counts);
            const welcomePrefix = g(user.gender,
                `שלום ${firstName}, ברוך הבא לפנקס.`,
                `שלום ${firstName}, ברוכה הבאה לפנקס.`
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
            const statusText = buildStatusText(user.gender, counts);
            const menuText   = buildMenuText(user.gender, counts);
            const file = await textToYemot(`${statusText} ${menuText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=1 → הצעות חדשות
        if (key === '1') {
            let newMatches = [];
            try { newMatches = await getMatchesForIvr(user.id, 0, 1); } catch {}
            if (newMatches.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m = newMatches[0];
            await updateSession(enterId, 'matches', { page: 0, currentMatchId: m.id });
            updateTtsLastPlayed(m.id);
            const mText = buildFullProfileText(m);
            const aText = g(user.gender,
                'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(`${mText} ${aText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=2 → תמונות ממתינות
        if (key === '2') {
            let photos = [];
            try { photos = await getPhotoRequestsForIvr(user.id, 0, 1); } catch {}
            if (photos.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות תמונה ממתינות.');
            }
            const photo = photos[0];
            await updateSession(enterId, 'photos', { page: 0, currentRequesterId: photo.requester_id });
            const pFullName = [photo.last_name, photo.full_name].filter(Boolean).join(' ') || 'ללא שם';
            const pAge   = photo.age  ? `, ${numberToHebrew(photo.age)} שנים` : '';
            const pCity  = photo.city ? `, ${photo.city}` : '';
            const pWord  = photo.gender === 'female' ? 'מבקשת' : 'מבקש';
            const actionsText2 = g(user.gender,
                'הָקֵשׁ אחת — הסכם. הָקֵשׁ שתיים — דחה. הָקֵשׁ ארבע לפרטים על המבקש. הָקֵשׁ שמונה — דלג. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת — הסכמי. הָקִישִׁי שתיים — דחי. הָקִישִׁי ארבע לפרטים על המבקשת. הָקִישִׁי שמונה — דלגי. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file2 = await textToYemot(`${pFullName}${pAge}${pCity} ${pWord} לראות את תמונתך. ${actionsText2}`);
            return yemotRead(res, file2, 'digits', 1, 1, 8);
        }

        // key=3 → בקשות שידוך שהגיעו אליך
        if (key === '3') {
            let reqs = [];
            try { reqs = await getIncomingRequestsForIvr(user.id, 0, 1); } catch {}
            if (reqs.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות שידוך ממתינות לתשובה.');
            }
            const req = reqs[0];
            await updateSession(enterId, 'requests', { page: 0, currentConnectionId: req.connection_id });
            updateTtsLastPlayed(req.id);
            const reqText     = buildFullProfileText(req);
            const actionsText3 = g(user.gender,
                'לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file3 = await textToYemot(`בקשת שידוך שהגיעה אליך. ${reqText} ${actionsText3}`);
            return yemotRead(res, file3, 'digits', 1, 1, 8);
        }

        // key=4 → בקשות ששלחת שטרם נענו (pending בלבד)
        if (key === '4') {
            let pending = [];
            try { pending = await getPendingSentForIvr(user.id, 0, 1); } catch {}
            if (pending.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות ממתינות לתשובה כרגע.');
            }
            const conn4 = pending[0];
            await updateSession(enterId, 'pending_sent', { page: 0, currentConnectionId: conn4.connection_id });
            const fn4   = [conn4.last_name, conn4.full_name].filter(Boolean).join(' ') || 'ללא שם';
            const age4  = conn4.age  ? `, ${numberToHebrew(conn4.age)} שנים` : '';
            const city4 = conn4.city ? `, ${conn4.city}` : '';
            const actionsText4 = g(user.gender,
                'הָקֵשׁ אחת לביטול הבקשה. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לביטול הבקשה. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file4 = await textToYemot(`בקשה שנשלחה ל${fn4}${age4}${city4} — טרם נענתה. ${actionsText4}`);
            return yemotRead(res, file4, 'digits', 1, 1, 8);
        }

        // key=5 → שידוכים פעילים (active + waiting_for_shadchan)
        if (key === '5') {
            let active = [];
            try { active = await getActiveSentForIvr(user.id, 0, 1); } catch {}
            if (active.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין שידוכים פעילים כרגע.');
            }
            const conn5 = active[0];
            await updateSession(enterId, 'active_sent', { page: 0, currentConnectionId: conn5.connection_id, currentConnectionStatus: conn5.status });
            const fn5   = [conn5.last_name, conn5.full_name].filter(Boolean).join(' ') || 'ללא שם';
            const age5  = conn5.age  ? `, ${numberToHebrew(conn5.age)} שנים` : '';
            const city5 = conn5.city ? `, ${conn5.city}` : '';
            const connText5 = conn5.status === 'active'
                ? `הקשר עם ${fn5}${age5}${city5} פעיל — שניכם הביעו עניין ראשוני.`
                : `הקשר עם ${fn5}${age5}${city5} בטיפול השדכנית.`;
            const actionsText5 = g(user.gender,
                'הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט הראשי.',
                'הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט הראשי.'
            );
            const file5 = await textToYemot(`${connText5} ${actionsText5}`);
            return yemotRead(res, file5, 'digits', 1, 1, 8);
        }

        // key=6 → הודעות חשובות
        if (key === '6') {
            let messages = [];
            try { messages = await getMessagesForIvr(user.id, 0, 1); } catch {}
            if (messages.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות חדשות הדורשות תשומת לבך.');
            }
            const msg6 = messages[0];
            const cleanContent6 = (msg6.content || '')
                .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}]/gu, '')
                .replace(/ℹ️|📷|✅|❌|⚠️/g, '')
                .trim();
            await updateSession(enterId, 'messages', { page: 0, currentMessageId: msg6.id, currentMessageText: cleanContent6 });
            const actionsText6 = g(user.gender,
                'הקש תשע לשמיעה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
                'הקשי תשע לשמיעה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
            );
            const file6 = await textToYemot(`הודעה חדשה: ${cleanContent6} ${actionsText6}`);
            return yemotRead(res, file6, 'digits', 1, 1, 8);
        }

        // key=7 → כל ההצעות (כולל ישנות ושדולגו)
        if (key === '7') {
            let allM = [];
            try { allM = await getAllMatchesForIvr(user.id, 0, 1); } catch {}
            if (allM.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m7 = allM[0];
            await updateSession(enterId, 'all_matches', { page: 0, currentMatchId: m7.id });
            updateTtsLastPlayed(m7.id);
            const mText7 = buildFullProfileText(m7);
            const aText7 = g(user.gender,
                'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file7 = await textToYemot(`${mText7} ${aText7}`);
            return yemotRead(res, file7, 'digits', 1, 1, 8);
        }

        if (key && !['1','2','3','4','5','6','7','0','#'].includes(key)) {
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
                ? (prefix ? `${prefix} סיימת את כל ההצעות החדשות. לעיון בכל ההצעות לחץ שבע בתפריט הראשי.` : 'סיימת את כל ההצעות החדשות. לעיון בכל ההצעות לחץ שבע בתפריט הראשי.')
                : (prefix || 'סיימת את כל ההצעות הזמינות.');
            return await goToMenu(enterId, user.id, user.gender, res, endMsg);
        }
        const m = pool[0];
        await updateSession(enterId, stateName, { page: nextOffset, currentMatchId: m.id });
        updateTtsLastPlayed(m.id);
        const mText = buildFullProfileText(m);
        const aText = g(user.gender,
            'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
            'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
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
            return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין עוד בקשות שידוך.');
        }
        const r = pool[0];
        await updateSession(enterId, 'requests', { page: nextOffset, currentConnectionId: r.connection_id });
        updateTtsLastPlayed(r.id);
        const rText = buildFullProfileText(r);
        const aText = g(user.gender,
            'לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
            'לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
        );
        const fullText = prefix ? `${prefix} ${rText} ${aText}` : `בקשת שידוך שהגיעה אליך. ${rText} ${aText}`;
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
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextMatch(getMatchesForIvr, 'matches', offset);

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
            if (key === '8') {
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, '');
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת ההצעה הבאה (כניסה ראשונה)
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
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextMatch(getAllMatchesForIvr, 'all_matches', offset);

            const nextOffset = offset + 1;
            if (key === '1') {
                let prefix = 'פנייתך נקלטה.';
                try {
                    await sendConnectionFromIvr(user.id, matchId);
                    console.log(`[IVR] 💌 פנייה (all): ${user.id} → ${matchId}`);
                } catch (e) { prefix = 'אירעה תקלה.'; }
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, prefix);
            }
            if (key === '8') {
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, '');
            }

            const actionsText = g(user.gender,
                'מקש לא מוכר. לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
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
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextRequest(offset);

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
                'מקש לא מוכר. לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
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

            // מקש 9 — שמע שוב (מנגן את ההודעה הנוכחית מחדש)
            if (key === '9' && msgText) {
                const actionsText = g(user.gender,
                    'הקש תשע לשמיעה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
                    'הקשי תשע לשמיעה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
                );
                const file = await textToYemot(`${msgText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            // מקש 8 — הודעה הבאה (ההודעה כבר סומנה כנקראה בטעינה)
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'messages', { page: offset });
                // טוען הודעה הבאה ישירות — לא yemotPlayback שמנתק
                let nextMsgs = [];
                try { nextMsgs = await getMessagesForIvr(user.id, offset, 1); } catch {}
                if (nextMsgs.length === 0) {
                    return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות נוספות.');
                }
                const nextMsg = nextMsgs[0];
                const nextClean = (nextMsg.content || '')
                    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}]/gu, '')
                    .replace(/ℹ️|📷|✅|❌|⚠️/g, '')
                    .trim();
                await updateSession(enterId, 'messages', { page: offset, currentMessageId: nextMsg.id, currentMessageText: nextClean });
                markMessageReadFromIvr(nextMsg.id, user.id).catch(() => {});
                const nextAct = g(user.gender,
                    'הַקֵּשׁ תשע לשמיעה חוזרת. הַקֵּשׁ שמונה להודעה הבאה. הַקֵּשׁ אפס לתפריט הראשי.',
                    'הַקִּישִׁי תשע לשמיעה חוזרת. הַקִּישִׁי שמונה להודעה הבאה. הַקִּישִׁי אפס לתפריט הראשי.'
                );
                const nextFile = await textToYemot(`הודעה חדשה: ${nextClean} ${nextAct}`);
                return yemotRead(res, nextFile, 'digits', 1, 1, 8);
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש תשע לשמיעה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט.',
                'מקש לא מוכר. הקשי תשע לשמיעה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט.'
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

        // סמן כנקראה ברגע שהוקראה — לא מחכים ללחיצת 8
        markMessageReadFromIvr(msg.id, user.id).catch(() => {});

        const actionsText = g(user.gender,
            'הקש תשע לשמיעה חוזרת. הקש שמונה להודעה הבאה. הקש אפס לתפריט הראשי.',
            'הקשי תשע לשמיעה חוזרת. הקשי שמונה להודעה הבאה. הקשי אפס לתפריט הראשי.'
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

        // helper: בנה טקסט בקשת תמונה + אפשרויות
        const buildPhotoText = (ph) => {
            const nm   = buildFullName(ph) || 'ללא שם';
            const ag   = ph.age  ? `, ${numberToHebrew(ph.age)} שנים` : '';
            const ci   = ph.city ? `, ${ph.city}` : '';
            const word = ph.gender === 'female' ? 'מבקשת' : 'מבקש';
            const acts = g(user.gender,
                'הקש אחת — הסכם לחשיפה. הקש שתיים — דחה. הקש ארבע לפרטים על המבקש. הקש שמונה — דלג. הקש תשע לשמיעה חוזרת. הקש אפס לתפריט.',
                'הקשי אחת — הסכמי לחשיפה. הקשי שתיים — דחי. הקשי ארבע לפרטים על המבקשת. הקשי שמונה — דלגי. הקשי תשע לשמיעה חוזרת. הקשי אפס לתפריט.'
            );
            return `${nm}${ag}${ci} ${word} לראות את תמונתך. ${acts}`;
        };

        // helper: טעינת הבקשה הבאה ישירות (ללא playback נפרד)
        const loadNextPhoto = async (prefix = '') => {
            let pool2 = [];
            try { pool2 = await getPhotoRequestsForIvr(user.id, offset, 1); } catch {}
            if (pool2.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין עוד בקשות תמונה.');
            }
            const ph = pool2[0];
            await updateSession(enterId, 'photos', { page: offset, currentRequesterId: ph.requester_id });
            const text = (prefix ? prefix + ' ' : '') + buildPhotoText(ph);
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        // # / timeout עם בקשה מוצגת → חזרה לתפריט
        if (!key && requesterId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה על בקשה שנטענה
        if (key && requesterId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            // מקש 9 — שמע שוב
            if (key === '9') {
                return await loadNextPhoto();
            }

            // מקש 4 — פרטים על המבקש
            if (key === '4') {
                const photosDetail = await getPhotoRequestsForIvr(user.id, offset, 1).catch(() => []);
                const detailText = photosDetail.length > 0
                    ? buildMatchDetailText(photosDetail[0])
                    : 'אין פרטים נוספים.';
                const actDetail = g(user.gender,
                    'הקש אחת — הסכם לחשיפה. הקש שתיים — דחה. הקש שמונה — דלג. הקש תשע לשמיעה חוזרת. הקש אפס לתפריט.',
                    'הקשי אחת — הסכמי לחשיפה. הקשי שתיים — דחי. הקשי שמונה — דלגי. הקשי תשע לשמיעה חוזרת. הקשי אפס לתפריט.'
                );
                const fileD = await textToYemot(`${detailText} ${actDetail}`);
                return yemotRead(res, fileD, 'digits', 1, 1, 8);
            }

            if (key === '1') {
                const result = await approvePhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הסכמת לחשיפת תמונתך.' : 'אירעה תקלה.';
                console.log(`[IVR] 📷 תמונה אושרה: requesterId=${requesterId} | userId=${user.id}`);
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto(prefix);
            }
            if (key === '2') {
                const result = await rejectPhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הבקשה נדחתה.' : 'אירעה תקלה.';
                console.log(`[IVR] 📷 תמונה נדחתה: requesterId=${requesterId} | userId=${user.id}`);
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto(prefix);
            }
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto();
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת — הסכמה. הקש שתיים — דחייה. הקש ארבע לפרטים. הקש שמונה — דלג. הקש תשע לשמיעה חוזרת. הקש אפס לתפריט.',
                'מקש לא מוכר. הקשי אחת — הסכמה. הקשי שתיים — דחייה. הקשי ארבע לפרטים. הקשי שמונה — דלגי. הקשי תשע לשמיעה חוזרת. הקשי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הבקשה הראשונה
        return await loadNextPhoto();
    }

    // --- מצב: my_sent — legacy fallback → תפריט ראשי ---
    if (session.state === 'my_sent') {
        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // --- מצב: pending_sent — בקשות ששלחתי שטרם נענו ---
    if (session.state === 'pending_sent') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;

        const loadNextPending = async (prefix = '') => {
            let rows = [];
            try { rows = await getPendingSentForIvr(user.id, offset, 1); } catch {}
            if (rows.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין בקשות ממתינות לתשובה.');
            }
            const c    = rows[0];
            const fn   = [c.last_name, c.full_name].filter(Boolean).join(' ');
            const nameStr = fn || 'ללא שם';
            const ageStr  = c.age  ? `, ${numberToHebrew(c.age)} שנים` : '';
            const cityStr = c.city ? `, ${c.city}` : '';
            await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: c.connection_id });
            const act = g(user.gender,
                'הָקֵשׁ אחת לביטול הבקשה. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לביטול הבקשה. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const text = `${prefix ? prefix + ' ' : ''}בקשה שנשלחה ל${nameStr}${ageStr}${cityStr} — טרם נענתה. ${act}`;
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        if (!key && connId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && connId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);

            if (key === '9') return await loadNextPending();

            if (key === '1') {
                const result = await cancelSentRequestFromIvr(connId, user.id).catch(() => 'error');
                const pfx = result === 'ok' ? 'הבקשה בוטלה.' : 'אירעה תקלה.';
                offset++;
                await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: null });
                return await loadNextPending(pfx);
            }

            if (key === '8') {
                offset++;
                await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: null });
                return await loadNextPending();
            }

            const unknownText = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ אחת לביטול. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי אחת לביטול. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file = await textToYemot(unknownText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        return await loadNextPending();
    }

    // --- מצב: active_sent — שידוכים פעילים ---
    if (session.state === 'active_sent') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;

        const loadNextActive = async (prefix = '') => {
            let rows = [];
            try { rows = await getActiveSentForIvr(user.id, offset, 1); } catch {}
            if (rows.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין שידוכים פעילים כרגע.');
            }
            const c    = rows[0];
            const fn   = [c.last_name, c.full_name].filter(Boolean).join(' ');
            const nameStr = fn || 'ללא שם';
            const ageStr  = c.age  ? `, ${numberToHebrew(c.age)} שנים` : '';
            const cityStr = c.city ? `, ${c.city}` : '';
            const statusTxt = c.status === 'active'
                ? `הקשר עם ${nameStr}${ageStr}${cityStr} פעיל — שניכם הביעו עניין ראשוני.`
                : `הקשר עם ${nameStr}${ageStr}${cityStr} בטיפול השדכנית.`;
            await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: c.connection_id, currentConnectionStatus: c.status });
            const act = g(user.gender,
                'הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט הראשי.',
                'הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט הראשי.'
            );
            const text = `${prefix ? prefix + ' ' : ''}${statusTxt} ${act}`;
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        if (!key && connId) return await goToMenu(enterId, user.id, user.gender, res);

        if (key && connId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextActive();
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: null });
                return await loadNextActive();
            }
            const unknownText = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file = await textToYemot(unknownText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        return await loadNextActive();
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
