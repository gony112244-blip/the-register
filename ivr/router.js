/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession, updateUserPin } = require('./auth');
const { textToUrl, numberToHebrew } = require('./tts');
const {
    getMenuCounts,
    getMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr,
    getIncomingRequestsForIvr, approveRequestFromIvr, rejectRequestFromIvr,
    getMySentRequestsForIvr, cancelSentRequestFromIvr,
    getPhotoRequestsForIvr, approvePhotoRequestFromIvr, rejectPhotoRequestFromIvr,
    getMessagesForIvr, markMessageReadFromIvr
} = require('./data');

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

    // כיסוי ראש (רלוונטי לנשים)
    if (match.gender === 'female' && match.head_covering) {
        const hc = pm.head_covering?.[match.head_covering] || match.head_covering;
        parts.push(`כיסוי ראש: ${hc}`);
    }

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

    // --- מצב: requests — פניות שהגיעו אליי ---
    if (session.state === 'requests') {
        const data     = session.data || {};
        let   offset   = parseInt(data.page || 0, 10);
        const connId   = data.currentConnectionId || null;

        // תגובה על פנייה קיימת
        if (key && connId) {
            if (key === '#') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }

            if (key === '4') {
                const reqs = await getIncomingRequestsForIvr(user.id, offset, 1);
                const detailText = reqs.length > 0
                    ? buildMatchDetailText(reqs[0])
                    : 'אין פרטים נוספים.';
                const actionsText = g(user.gender,
                    'הקש חמש לתיאור מלא. הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר.',
                    'הקשי חמש לתיאור מלא. הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר.'
                );
                const file = await textToUrl(`${detailText} ${actionsText}`, 'dynamic');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            if (key === '5') {
                const reqs = await getIncomingRequestsForIvr(user.id, offset, 1);
                const fullText = reqs.length > 0
                    ? buildMatchFullText(reqs[0])
                    : 'אין תיאור נוסף.';
                const actionsText = g(user.gender,
                    'הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר.',
                    'הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר.'
                );
                const file = await textToUrl(`${fullText} ${actionsText}`, 'dynamic');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            let responseText = '';
            if (key === '1') {
                const result = await approveRequestFromIvr(connId, user.id).catch(() => 'error');
                responseText = result === 'ok'
                    ? g(user.gender, 'הפנייה אושרה. עוברים לפנייה הבאה.', 'הפנייה אושרה. עוברים לפנייה הבאה.')
                    : 'אירעה תקלה. עוברים לפנייה הבאה.';
                console.log(`[IVR] ✅ פנייה אושרה: connId=${connId} | userId=${user.id}`);
            } else if (key === '2') {
                const result = await rejectRequestFromIvr(connId, user.id).catch(() => 'error');
                responseText = result === 'ok'
                    ? 'הפנייה נדחתה. עוברים לפנייה הבאה.'
                    : 'אירעה תקלה. עוברים לפנייה הבאה.';
                console.log(`[IVR] ❌ פנייה נדחתה: connId=${connId} | userId=${user.id}`);
            } else if (key === '8') {
                responseText = g(user.gender, 'דולגים לפנייה הבאה.', 'דולגות לפנייה הבאה.');
            } else {
                const actionsText = g(user.gender,
                    'מקש לא מוכר. הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר.',
                    'מקש לא מוכר. הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר.'
                );
                const file = await textToUrl(actionsText, 'static');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            offset++;
            await updateSession(enterId, 'requests', { page: offset });
            const file = await textToUrl(responseText, 'static');
            return res.json({ action: 'playback', file });
        }

        // טעינת הפנייה הבאה
        let reqs = [];
        try {
            reqs = await getIncomingRequestsForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת פניות:', err.message);
        }

        if (reqs.length === 0) {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('אין פניות ממתינות לתשובתך. חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
        }

        const req = reqs[0];
        await updateSession(enterId, 'requests', { page: offset, currentConnectionId: req.connection_id });

        const reqText    = buildMatchText(req);
        const actionsText = g(user.gender,
            'הקש אחת — מסכים. הקש שתיים — לא מסכים. הקש שמונה — דחה לאוחר יותר. הקש ארבע לפרטים נוספים. הקש חמש לתיאור מלא. הקש סולמית לתפריט הראשי.',
            'הקשי אחת — מסכימה. הקשי שתיים — לא מסכימה. הקשי שמונה — דחי לאוחר יותר. הקשי ארבע לפרטים נוספים. הקשי חמש לתיאור מלא. הקשי סולמית לתפריט הראשי.'
        );
        const file = await textToUrl(`פנייה שהגיעה אליך. ${reqText} ${actionsText}`, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
    }

    // --- מצב: messages — הודעות חשובות ---
    if (session.state === 'messages') {
        const data      = session.data || {};
        let   offset    = parseInt(data.page || 0, 10);
        const msgId     = data.currentMessageId   || null;
        const msgText   = data.currentMessageText || null;

        // פעולה על הודעה שכבר נטענה
        if (key && msgId) {
            if (key === '#') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }

            // מקש 1 — האזנה חוזרת
            if (key === '1' && msgText) {
                const replayText  = msgText;
                const actionsText = g(user.gender,
                    'הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה. הקש סולמית לתפריט הראשי.',
                    'הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה. הקשי סולמית לתפריט הראשי.'
                );
                const file = await textToUrl(`${replayText} ${actionsText}`, 'dynamic');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            // מקש 8 — הודעה הבאה (סמן כנקראה)
            if (key === '8') {
                await markMessageReadFromIvr(msgId, user.id).catch(() => {});
                offset++;
                await updateSession(enterId, 'messages', { page: offset });
                const file = await textToUrl('עוברים להודעה הבאה.', 'static');
                return res.json({ action: 'playback', file });
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה.',
                'מקש לא מוכר. הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה.'
            );
            const file = await textToUrl(actionsText, 'static');
            return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
        }

        // טעינת ההודעה הבאה
        let messages = [];
        try {
            messages = await getMessagesForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת הודעות:', err.message);
        }

        if (messages.length === 0) {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('אין הודעות חדשות הדורשות תשומת לבך. חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
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
            'הקש אחת להאזנה חוזרת. הקש שמונה להודעה הבאה. הקש סולמית לתפריט הראשי.',
            'הקשי אחת להאזנה חוזרת. הקשי שמונה להודעה הבאה. הקשי סולמית לתפריט הראשי.'
        );
        const file = await textToUrl(`הודעה חדשה: ${cleanContent} ${actionsText}`, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
    }

    // --- מצב: settings — שינוי PIN ---
    if (session.state === 'settings') {
        const data    = session.data || {};
        const step    = data.step   || null;

        // # — חזרה לתפריט בכל שלב
        if (key === '#') {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
        }

        // --- שלב א': כניסה ראשונה — בקש PIN נוכחי ---
        if (!step) {
            await updateSession(enterId, 'settings', { step: 'wait_current', attempts: 0 });
            const text = g(user.gender,
                'להחלפת קוד הכניסה, הקש את הקוד הנוכחי, ארבע ספרות.',
                'להחלפת קוד הכניסה, הקשי את הקוד הנוכחי, ארבע ספרות.'
            );
            const file = await textToUrl(text, 'static');
            return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
        }

        // --- שלב ב': אימות PIN נוכחי ---
        if (step === 'wait_current') {
            if (!key) {
                const text = g(user.gender,
                    'אנא הקש את קוד הכניסה הנוכחי.',
                    'אנא הקשי את קוד הכניסה הנוכחי.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }

            const pinResult = await checkPin(user.id, key).catch(() => 'error');

            if (pinResult === 'ok') {
                await updateSession(enterId, 'settings', { step: 'wait_new' });
                const text = g(user.gender,
                    'קוד נכון. הקש קוד חדש בן ארבע ספרות.',
                    'קוד נכון. הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }

            if (pinResult === 'blocked') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('הכניסה נחסמה זמנית עקב ניסיונות שגויים. נסה שוב מאוחר יותר. חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }

            // PIN שגוי — עד 3 ניסיונות
            const attempts = (data.attempts || 0) + 1;
            if (attempts >= 3) {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('קוד שגוי יותר מדי פעמים. חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }
            await updateSession(enterId, 'settings', { step: 'wait_current', attempts });
            const text = g(user.gender,
                `קוד שגוי. נסה שוב. הקש את קוד הכניסה הנוכחי.`,
                `קוד שגוי. נסי שוב. הקשי את קוד הכניסה הנוכחי.`
            );
            const file = await textToUrl(text, 'static');
            return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
        }

        // --- שלב ג': קבלת PIN חדש ---
        if (step === 'wait_new') {
            if (!key) {
                const text = g(user.gender,
                    'הקש קוד חדש בן ארבע ספרות.',
                    'הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }
            if (!/^\d{4}$/.test(key)) {
                const text = g(user.gender,
                    'קוד לא תקין. הקש ארבע ספרות בדיוק.',
                    'קוד לא תקין. הקשי ארבע ספרות בדיוק.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }
            await updateSession(enterId, 'settings', { step: 'wait_confirm', newPin: key });
            const text = g(user.gender,
                'הקש שוב את הקוד החדש לאישור.',
                'הקשי שוב את הקוד החדש לאישור.'
            );
            const file = await textToUrl(text, 'static');
            return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
        }

        // --- שלב ד': אישור PIN חדש ---
        if (step === 'wait_confirm') {
            if (!key) {
                const text = g(user.gender,
                    'הקש שוב את הקוד החדש לאישור.',
                    'הקשי שוב את הקוד החדש לאישור.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }
            if (key !== data.newPin) {
                await updateSession(enterId, 'settings', { step: 'wait_new' });
                const text = g(user.gender,
                    'הקודים אינם תואמים. הקש קוד חדש בן ארבע ספרות.',
                    'הקודים אינם תואמים. הקשי קוד חדש בן ארבע ספרות.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
            }
            try {
                await updateUserPin(user.id, data.newPin);
                await updateSession(enterId, 'menu');
                const text = g(user.gender,
                    'הקוד עודכן בהצלחה. חוזרים לתפריט הראשי.',
                    'הקוד עודכן בהצלחה. חוזרים לתפריט הראשי.'
                );
                const file = await textToUrl(text, 'static');
                return res.json({ action: 'playback', file });
            } catch (err) {
                console.error('[IVR] ❌ שגיאה בעדכון PIN:', err.message);
                await updateSession(enterId, 'menu');
                const file = await textToUrl('אירעה תקלה בעדכון הקוד. נסה שוב מאוחר יותר. חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }
        }

        // שלב לא מוכר
        await updateSession(enterId, 'menu');
        const file = await textToUrl('אירעה תקלה. חוזרים לתפריט הראשי.', 'static');
        return res.json({ action: 'playback', file });
    }

    // --- מצב: photos — ניהול בקשות תמונה ---
    if (session.state === 'photos') {
        const data        = session.data || {};
        let   offset      = parseInt(data.page || 0, 10);
        const requesterId = data.currentRequesterId || null;

        // תגובה על בקשה שנטענה
        if (key && requesterId) {
            if (key === '#') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
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
                const file = await textToUrl(actionsText, 'static');
                return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
            }

            offset++;
            await updateSession(enterId, 'photos', { page: offset });
            const file = await textToUrl(responseText, 'static');
            return res.json({ action: 'playback', file });
        }

        // טעינת הבקשה הבאה
        let photos = [];
        try {
            photos = await getPhotoRequestsForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת בקשות תמונה:', err.message);
        }

        if (photos.length === 0) {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('אין בקשות תמונה ממתינות. חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
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
            'הקש אחת — הסכם לחשיפה. הקש שתיים — דחה את הבקשה. הקש שמונה — דלג. הקש סולמית לתפריט הראשי.',
            'הקשי אחת — הסכמי לחשיפה. הקשי שתיים — דחי את הבקשה. הקשי שמונה — דלגי. הקשי סולמית לתפריט הראשי.'
        );
        const file = await textToUrl(`${photoText} ${actionsText}`, 'dynamic');
        return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
    }

    // --- מצב: my_sent — סטטוס פניות שיצאו ממני ---
    if (session.state === 'my_sent') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;
        const connStatus = data.currentConnectionStatus || null;

        // תגובה לפנייה שנטענה
        if (key && connId) {
            if (key === '#') {
                await updateSession(enterId, 'menu');
                const file = await textToUrl('חוזרים לתפריט הראשי.', 'static');
                return res.json({ action: 'playback', file });
            }

            // ביטול פנייה ממתינה (רק כשסטטוס pending)
            if (key === '1' && connStatus === 'pending') {
                const result = await cancelSentRequestFromIvr(connId, user.id).catch(() => 'error');
                const responseText = result === 'ok'
                    ? 'הפנייה בוטלה. עוברים לפנייה הבאה.'
                    : 'אירעה תקלה. עוברים לפנייה הבאה.';
                offset++;
                await updateSession(enterId, 'my_sent', { page: offset });
                const file = await textToUrl(responseText, 'static');
                return res.json({ action: 'playback', file });
            }

            // דילוג (key 8) — מתאים לכל סטטוס
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'my_sent', { page: offset });
                const file = await textToUrl('עוברים לפנייה הבאה.', 'static');
                return res.json({ action: 'playback', file });
            }

            // מקש לא מוכר
            const unknownText = connStatus === 'pending'
                ? g(user.gender,
                    'מקש לא מוכר. הקש אחת לביטול. הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                    'מקש לא מוכר. הקשי אחת לביטול. הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.')
                : g(user.gender,
                    'מקש לא מוכר. הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                    'מקש לא מוכר. הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.');
            const file = await textToUrl(unknownText, 'static');
            return res.json({ action: 'read', file, numDigits: 1, timeout: 8 });
        }

        // טעינת הפנייה הבאה
        let sent = [];
        try {
            sent = await getMySentRequestsForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת פניות שיצאו:', err.message);
        }

        if (sent.length === 0) {
            await updateSession(enterId, 'menu');
            const file = await textToUrl('אין פניות פעילות שיצאו ממך. חוזרים לתפריט הראשי.', 'static');
            return res.json({ action: 'playback', file });
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
                'הקש אחת לביטול הפנייה. הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                'הקשי אחת לביטול הפנייה. הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.'
            );
        } else if (conn.status === 'active') {
            connText = `הפנייה עם ${name}${age}${city} פעילה — שניכם הביעו עניין ראשוני.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.'
            );
        } else if (conn.status === 'waiting_for_shadchan') {
            connText = `הפנייה עם ${name}${age}${city} בטיפול השדכנית. אין צורך בפעולה נוספת כרגע.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.'
            );
        } else {
            connText = `פנייה ל${name} — ${conn.status}.`;
            actionsText = g(user.gender,
                'הקש שמונה להמשך. הקש סולמית לתפריט הראשי.',
                'הקשי שמונה להמשך. הקשי סולמית לתפריט הראשי.'
            );
        }

        await updateSession(enterId, 'my_sent', {
            page:                    offset,
            currentConnectionId:     conn.connection_id,
            currentConnectionStatus: conn.status
        });

        const file = await textToUrl(`${connText} ${actionsText}`, 'dynamic');
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
