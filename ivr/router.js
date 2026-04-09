/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר JSON עם פקודה (playback / read / hangup).
 */

const express = require('express');
const router = express.Router();
const { validateIvrToken } = require('./auth');

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

    // שלב זה — תגובה בסיסית לצורך בדיקת connectivity בלבד
    // בשלב הבא יתווסף: זיהוי משתמש מה-DB, PIN, תפריטים
    return res.json({
        action: 'read',
        file: 'https://pinkas.cloud/ivr-audio/static/test.mp3',
        numDigits: 1,
        timeout: 8
    });
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
