/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession } = require('./auth');
const { textToUrl, numberToHebrew } = require('./tts');
const { getMenuCounts } = require('./data');

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

// ==========================================
// GET /ivr/call — webhook ראשי מימות משיח
// ==========================================
router.get('/call', async (req, res) => {
    const { phone, digits } = req.query;

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
        const key = digits?.trim();

        // ניתוב לפי מקש שנלחץ
        if (key === '1') {
            await updateSession(enterId, 'matches', { page: 0 });
            const file = await textToUrl('מעבר להצעות חדשות.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
        }
        if (key === '2') {
            await updateSession(enterId, 'requests');
            const file = await textToUrl('מעבר לבקשות קשר.', 'static');
            return res.json({ action: 'playback', file }); // יתפתח בשלב הבא
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
            'להצעות חדשות, הקש אחת. לבקשות קשר, הקש שתיים. לסטטוס הפניות שלך, הקש שלוש. לניהול תמונות, הקש ארבע. להודעות חשובות, הקש חמש. להגדרות, הקש תשע. לתמיכה, הקש אפס.',
            'להצעות חדשות, הקשי אחת. לבקשות קשר, הקשי שתיים. לסטטוס הפניות שלך, הקשי שלוש. לניהול תמונות, הקשי ארבע. להודעות חשובות, הקשי חמש. להגדרות, הקשי תשע. לתמיכה, הקשי אפס.'
        );

        const fullText = `${statusText} ${menuText}`;
        const file = await textToUrl(fullText, 'dynamic');
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
