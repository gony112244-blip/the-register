/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken, getUserByPhone } = require('./auth');
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

    // משתמש תקין — ברכת כניסה + בקשת הקשה (שלבי PIN ותפריטים בשלב הבא)
    console.log(`[IVR] ✅ משתמש מזוהה: ${user.id} | ${user.full_name}`);
    const firstName = user.full_name?.split(' ')[0] || user.full_name;
    const file = await textToUrl(`שלום ${firstName}. המערכת בפיתוח. נתראה בקרוב.`, 'dynamic');
    return res.json({ action: 'read', file, numDigits: 1, timeout: 5 });
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
