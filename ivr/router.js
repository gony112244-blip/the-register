/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession } = require('./auth');
const { textToUrl, numberToHebrew } = require('./tts');
const { getMenuCounts, getMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr } = require('./data');

// ==========================================
// Middleware — אימות token לכל נתיבי /ivr/
// ==========================================
router.use((req, res, next) => {
    const { token } = req.query;
    if (!validateIvrToken(token)) {
        console.warn(`[IVR] ❌ Token לא תקין | IP: ${req.ip} | token: ${token}`);
        return res.status(403).json({ error: 'Forbidden' });
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
// מייצר משפט עברי תקני עם פיסוק נכון
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
        const noun = requests === 1 ? 'בקשת קשר ממתינה לתשובתך' : 'בקשות קשר ממתינות לתשובתך';
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

// phonetic-map נטען פעם אחת
const pm = require('./phonetic-map.json');

// ==========================================
// הצעה — שכבה 1 (חובה): גיל, עיר, מוסד
// ==========================================
function buildMatchText(match) {
    const parts = [];

    if (match.age) parts.push(`גיל ${numberToHebrew(match.age)}`);
    if (match.city) {
        const city = pm.cities_phonetic?.[match.city] || match.city;
        parts.push(`מ${city}`);
    }
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
// הצעה — שכבה 2 (מקש 4): מוצא, רקע, עיסוק, גובה
// ==========================================
function buildMatchDetailText(match) {
    const parts = [];

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

    return parts.length > 0 ? parts.join(', ') + '.' : 'אין פרטים נוספים.';
}

// ==========================================
// הצעה — שכבה 3 (מקש 5): מראה, מבנה גוף, שאיפה, תיאור — כמו באתר
// ==========================================
function buildMatchFullText(match) {
    const parts = [];

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
    if (match.about_me) parts.push(match.about_me);

    return parts.length > 0 ? parts.join('. ') + '.' : 'אין תיאור נוסף.';
}

// ==========================================
// GET /ivr/call — webhook ראשי מימות משיח
// ==========================================
router.get('/call', async (req, res) => {
    const { phone, digits } = req.query;
    const key = digits?.trim() || null; // המקש שנלחץ — זמין בכל מצב

    console.log(`[IVR] 📞 שיחה נכנסת | phone: ${phone} | digits: ${digits || 'none'}`);

    // --- שלב 3: זיהוי משתמש לפי phone ---
    if (!phone) {
        console.warn('[IVR] ⚠️ לא התקבל phone');
        return res.json({ action: 'hangup' });
    }

    let user;
    try {
        user = await getUserByPhone(phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת DB בזיהוי משתמש:', err.message);
        return res.json({ action: 'hangup' });
    }

    // משתמש לא רשום במערכת (לא ידוע המגדר)
    if (!user) {
        console.log(`[IVR] 👤 מספר לא מזוהה: ${phone}`);
        const file = await textToUrl('מספר הטלפון אינו רשום במערכת הפנקס. להרשמה, יש להיכנס לאתר פינקס.', 'static');
        return res.json({ action: 'playback', file });
    }

    // משתמש חסום
    if (user.is_blocked) {
        console.log(`[IVR] 🚫 משתמש חסום: ${user.id}`);
        const text = g(user.gender,
            'החשבון שלך חסום. לפרטים, פנה לצוות התמיכה דרך האתר.',
            'החשבון שלך חסום. לפרטים, פני לצוות התמיכה דרך האתר.'
        );
        const file = await textToUrl(text, 'static');
        return res.json({ action: 'playback', file });
    }

    // משתמש לא מאושר
    if (!user.is_approved) {
        console.log(`[IVR] ⏳ משתמש ממתין לאישור: ${user.id}`);
        const text = g(user.gender,
            'הפרופיל שלך עדיין ממתין לאישור. נעדכן אותך במייל כאשר יאושר.',
            'הפרופיל שלך עדיין ממתינה לאישור. נעדכן אותך במייל כאשר תאושרי.'
        );
        const file = await textToUrl(text, 'static');
        return res.json({ action: 'playback', file });
    }

    // משתמש תקין — ניהול session ו-PIN
    console.log(`[IVR] ✅ משתמש מזוהה: ${user.id} | ${user.full_name}`);
    const firstName = user.full_name?.split(' ')[0] || user.full_name;

    // מזהה ייחודי לשיחה (ימות שולחים EnterID, fallback לפי phone+timestamp)
    const enterId = req.query.EnterID || req.query.enterID || `${phone}_${Date.now()}`;

    let session;
    try {
        session = await getOrCreateSession(enterId, user.id, phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת session:', err.message);
        return res.json({ action: 'hangup' });
    }

    // ==========================================
    // מכונת מצבים — state machine
    // ==========================================

    // --- מצב: init — שיחה חדשה ---
    if (session.state === 'init') {
        // אם אין PIN מוגדר / PIN לא נדרש → ישר לתפריט
        if (!user.ivr_pin || user.allow_ivr_no_pass) {
            await updateSession(enterId, 'menu');
            const welcomeText = g(user.gender,
                `שלום ${firstName}, ברוך הבא לפנקס.`,
                `שלום ${firstName}, ברוכה הבאת לפנקס.`
            );
            const file = await textToUrl(welcomeText, 'dynamic');
            return res.json({ action: 'playback', file });
        }

        // יש PIN → בקש אותו (dynamic כי כולל את שם המשתמש)
        await updateSession(enterId, 'waiting_pin');
        const pinPromptText = g(user.gender,
            `שלום ${firstName}. אנא הזן את קוד הכניסה שלך, ארבע ספרות.`,
            `שלום ${firstName}. אנא הזיני את קוד הכניסה שלך, ארבע ספרות.`
        );
        const file = await textToUrl(pinPromptText, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
    }

    // --- מצב: waiting_pin — ממתין לקוד ---
    if (session.state === 'waiting_pin') {
        if (!digits) {
        // חזרה לבקשת PIN (timeout או לחיצה שגויה)
        const repeatText = g(user.gender, 'הזן את קוד הכניסה שלך, ארבע ספרות.', 'הזיני את קוד הכניסה שלך, ארבע ספרות.');
        const file = await textToUrl(repeatText, 'static');
        return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
        }

        const pinResult = await checkPin(user.id, digits);
        console.log(`[IVR] 🔑 PIN result: ${pinResult} | user: ${user.id}`);

        if (pinResult === 'ok') {
            await updateSession(enterId, 'menu');
            const welcomeText = g(user.gender,
                `קוד נכון. ברוך הבא, ${firstName}.`,
                `קוד נכון. ברוכה הבאת, ${firstName}.`
            );
            const file = await textToUrl(welcomeText, 'dynamic');
            return res.json({ action: 'playback', file });
        }

        if (pinResult === 'blocked') {
            const file = await textToUrl('הגישה חסומה לשלושים דקות, עקב ניסיונות כושלים חוזרים. נסה שוב מאוחר יותר.', 'static');
            return res.json({ action: 'playback', file });
        }

        // PIN שגוי — נסה שוב
        const retryText = g(user.gender, 'קוד שגוי. אנא נסה שוב.', 'קוד שגוי. אנא נסי שוב.');
        const file = await textToUrl(retryText, 'static');
        return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
    }

    // --- מצב: menu — תפריט ראשי ---
    if (session.state === 'menu') {

        // ניתוב לפי מקש שנלחץ
        if (key === '1') {
            await updateSession(enterId, 'matches', { page: 0 });
            const file = await textToUrl('מעבר להצעות חדשות.', 'static');
            return res.json({ action: 'playback', file });
        }
        if (key === '2') {
            await updateSession(enterId, 'requests', { page: 0 });
            const file = await textToUrl('מעבר לפניות שהגיעו אליך.', 'static');
            return res.json({ action: 'playback', file });
        }
        if (key === '3') {
            await updateSession(enterId, 'my_sent');
            const file = await textToUrl('מעבר לסטטוס הפניות שלך.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
        }
        if (key === '4') {
            await updateSession(enterId, 'photos');
            const file = await textToUrl('מעבר לניהול תמונות.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
        }
        if (key === '5') {
            await updateSession(enterId, 'messages');
            const file = await textToUrl('מעבר להודעות חשובות.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
        }
        if (key === '9') {
            await updateSession(enterId, 'settings');
            const file = await textToUrl('מעבר להגדרות.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
        }
        if (key === '0') {
            const file = await textToUrl('לתמיכה ולעזרה, יש להיכנס לאתר פינקס.', 'static');
            return res.json({ action: 'playback', file });
        }

        // הקשה שגויה — חזרה לתפריט
        if (key && !['1','2','3','4','5','9','0','#'].includes(key)) {
            console.warn(`[IVR] ⚠️ מקש לא מוכר בתפריט: ${key}`);
        }

        // כניסה ראשונה לתפריט, חזרה מ-# , או מקש לא מוכר — הצג מבזק + תפריט
        let counts = { matches: 0, requests: 0, photos: 0 };
        try {
            counts = await getMenuCounts(user.id);
        } catch (err) {
            console.error('[IVR] ⚠️ שגיאה בספירת תפריט:', err.message);
        }

        const statusText = buildStatusText(counts);
        const menuText = g(user.gender,
            'להצעות חדשות, הקש אחת. לפניות שהגיעו אליך, הקש שתיים. לסטטוס הפניות שלך, הקש שלוש. לניהול תמונות, הקש ארבע. להודעות חשובות, הקש חמש. להגדרות, הקש תשע. לתמיכה, הקש אפס.',
            'להצעות חדשות, הקשי אחת. לפניות שהגיעו אליך, הקשי שתיים. לסטטוס הפניות שלך, הקשי שלוש. לניהול תמונות, הקשי ארבע. להודעות חשובות, הקשי חמש. להגדרות, הקשי תשע. לתמיכה, הקשי אפס.'
        );

        const fullText = `${statusText} ${menuText}`;
        const file = await textToUrl(fullText, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
    }

    // --- מצב: matches — הצעות חדשות ---
    if (session.state === 'matches') {
        const data    = session.data || {};
        let   offset  = parseInt(data.page  || 0, 10);
        const matchId = data.currentMatchId || null;

        // תגובה על הצעה קיימת (המשתמש לחץ מקש)
        if (key && matchId) {
            if (key === '#') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }

            if (key === '4') {
                // שכבה 2 — מוצא, רקע, עיסוק, גובה
                const more = await getMatchesForIvr(user.id, offset, 1);
                const detailText = more.length > 0
                    ? buildMatchDetailText(more[0])
                    : 'אין פרטים נוספים.';
                const actionsText = g(user.gender,
                    'הקש חמש לתיאור מלא. הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג.',
                    'הקשי חמש לתיאור מלא. הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי.'
                );
                const file = await textToUrl(`${detailText} ${actionsText}`, 'dynamic');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            if (key === '5') {
                // שכבה 3 — מראה, מבנה גוף, שאיפה, תיאור חופשי (כמו באתר)
                const more = await getMatchesForIvr(user.id, offset, 1);
                const fullText = more.length > 0
                    ? buildMatchFullText(more[0])
                    : 'אין תיאור נוסף.';
                const actionsText = g(user.gender,
                    'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג.',
                    'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי.'
                );
                const file = await textToUrl(`${fullText} ${actionsText}`, 'dynamic');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            let responseText = '';
            if (key === '1') {
                try {
                    await sendConnectionFromIvr(user.id, matchId);
                    responseText = g(user.gender,
                        'פנייתך נקלטה בהצלחה. עוברים להצעה הבאה.',
                        'פנייתך נקלטה בהצלחה. עוברים להצעה הבאה.'
                    );
                    console.log(`[IVR] 💌 פנייה נשלחה: ${user.id} → ${matchId}`);
                } catch (e) {
                    console.error('[IVR] ❌ שגיאה בשליחת פנייה:', e.message);
                    responseText = 'אירעה תקלה בשליחת הפנייה. עוברים להצעה הבאה.';
                }
            } else if (key === '2') {
                await hideProfileFromIvr(user.id, matchId);
                responseText = 'הצעה הוסרה. עוברים להצעה הבאה.';
                console.log(`[IVR] 🙈 הסתרה: ${user.id} → ${matchId}`);
            } else if (key === '8') {
                responseText = g(user.gender, 'דולגים להצעה הבאה.', 'דולגות להצעה הבאה.');
            } else {
                // מקש לא מוכר — חזרה על אפשרויות
                const actionsText = g(user.gender,
                    'מקש לא מוכר. הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג.',
                    'מקש לא מוכר. הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי.'
                );
                const file = await textToUrl(actionsText, 'static');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            // עבור להצעה הבאה
            offset++;
            await updateSession(enterId, 'matches', { page: offset });
            const file = await textToUrl(responseText, 'static');
            return res.json({ action: 'playback', file });
        }

        // טעינת ההצעה הבאה (כניסה ראשונה, או callback אחרי פעולה)
        let matches = [];
        try {
            matches = await getMatchesForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת הצעות:', err.message);
        }

        if (matches.length === 0) {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('סיימנו את כל ההצעות החדשות. חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
        }

        const match = matches[0];
        await updateSession(enterId, 'matches', { page: offset, currentMatchId: match.id });

        const matchText  = buildMatchText(match);
        const actionsText = g(user.gender,
            'הקש אחת — מעוניין. הקש שתיים — לא מעוניין. הקש שמונה — דלג. הקש ארבע לפרטים נוספים. הקש חמש לתיאור מלא. הקש סולמית לתפריט הראשי.',
            'הקשי אחת — מעוניינת. הקשי שתיים — לא מעוניינת. הקשי שמונה — דלגי. הקשי ארבע לפרטים נוספים. הקשי חמש לתיאור מלא. הקשי סולמית לתפריט הראשי.'
        );
        const file = await textToUrl(`${matchText} ${actionsText}`, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
    }

    // מצב לא מוכר — ניתוק
    console.warn(`[IVR] ⚠️ session state לא מוכר: ${session.state}`);
    return res.json({ action: 'hangup' });
});

// ==========================================
// GET /ivr/hangup — ניתוק (לוג בלבד כרגע)
// ==========================================
router.get('/hangup', async (req, res) => {
    const { phone } = req.query;
    console.log(`[IVR] 📵 ניתוק | phone: ${phone}`);
    return res.json({ status: 'ok' });
});

module.exports = router;
