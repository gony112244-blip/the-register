/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession } = require('./auth');
const { textToUrl } = require('./tts');

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

    // משתמש לא רשום במערכת
    if (!user) {
        console.log(`[IVR] 👤 מספר לא מזוהה: ${phone}`);
        const file = await textToUrl('מספר הטלפון שלך אינו רשום במערכת הפנקס. להרשמה היכנס לאתר.', 'static');
        return res.json({ action: 'playback', file });
    }

    // משתמש חסום
    if (user.is_blocked) {
        console.log(`[IVR] 🚫 משתמש חסום: ${user.id}`);
        const file = await textToUrl('החשבון שלך חסום. לפרטים פנה לצוות התמיכה דרך האתר.', 'static');
        return res.json({ action: 'playback', file });
    }

    // משתמש לא מאושר
    if (!user.is_approved) {
        console.log(`[IVR] ⏳ משתמש ממתין לאישור: ${user.id}`);
        const file = await textToUrl('הפרופיל שלך עדיין ממתין לאישור. נעדכן אותך במייל כשיאושר.', 'static');
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
            const file = await textToUrl(`שלום ${firstName}, ברוכים הבאים לפנקס. המערכת בפיתוח. נתראה בקרוב.`, 'dynamic');
            return res.json({ action: 'playback', file });
        }

        // יש PIN → בקש אותו
        await updateSession(enterId, 'waiting_pin');
        const file = await textToUrl(`שלום ${firstName}. הזן את קוד הכניסה שלך.`, 'static');
        return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
    }

    // --- מצב: waiting_pin — ממתין לקוד ---
    if (session.state === 'waiting_pin') {
        if (!digits) {
            // חזרה לבקשת PIN (timeout או לחיצה שגויה)
            const file = await textToUrl('הזן את קוד הכניסה שלך, ארבע ספרות.', 'static');
            return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
        }

        const pinResult = await checkPin(user.id, digits);
        console.log(`[IVR] 🔑 PIN result: ${pinResult} | user: ${user.id}`);

        if (pinResult === 'ok') {
            await updateSession(enterId, 'menu');
            const file = await textToUrl(`קוד נכון. ברוכים הבאים ${firstName}.`, 'dynamic');
            return res.json({ action: 'playback', file });
        }

        if (pinResult === 'blocked') {
            const file = await textToUrl('החשבון חסום לאחר מספר ניסיונות כושלים. נסה שוב עוד שלושים דקות.', 'static');
            return res.json({ action: 'playback', file });
        }

        // PIN שגוי — נסה שוב
        const file = await textToUrl('קוד שגוי. נסה שוב.', 'static');
        return res.json({ action: 'read', file, numDigits: 4, timeout: 15 });
    }

    // --- מצב: menu — מאומת, תפריט ראשי (יתווסף בשלב הבא) ---
    if (session.state === 'menu') {
        const file = await textToUrl('ברוכים הבאים לפנקס. המערכת בפיתוח.', 'static');
        return res.json({ action: 'playback', file });
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
