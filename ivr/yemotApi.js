/**
 * Yemot HaMashiach API Manager
 *
 * מנהל התקשרות מול API של ימות המשיח:
 * - Login / Logout (session token)
 * - UploadFile (העלאת MP3 לתיקייה בימות)
 * - FileAction delete (מחיקת קובץ)
 * - CheckIfFileExists
 *
 * API Docs: https://f2.freeivr.co.il/post/75
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const YEMOT_API_BASE = 'https://www.call2all.co.il/ym/api';

let sessionToken = null;
let tokenExpiry = 0;

// ==========================================
// Login — מקבל טוקן סשן (תוקף 30 דקות)
// ==========================================
async function login() {
    const username = process.env.YEMOT_NUMBER;
    const password = process.env.YEMOT_PASSWORD;

    if (!username || !password) {
        throw new Error('[YemotAPI] YEMOT_NUMBER or YEMOT_PASSWORD not set in .env');
    }

    if (sessionToken && Date.now() < tokenExpiry) {
        return sessionToken;
    }

    console.log('[YemotAPI] 🔐 מתחבר לימות המשיח...');
    const { data } = await axios.get(`${YEMOT_API_BASE}/Login`, {
        params: { username, password }
    });

    if (data.responseStatus !== 'OK' || !data.token) {
        throw new Error(`[YemotAPI] Login failed: ${data.message || JSON.stringify(data)}`);
    }

    sessionToken = data.token;
    tokenExpiry = Date.now() + 25 * 60 * 1000; // 25 min (buffer before 30min expiry)
    console.log('[YemotAPI] ✅ התחברות הצליחה');
    return sessionToken;
}

// ==========================================
// getToken — Login אוטומטי אם צריך
// ==========================================
async function getToken() {
    if (sessionToken && Date.now() < tokenExpiry) {
        return sessionToken;
    }
    return login();
}

// ==========================================
// uploadFile — העלאת קובץ MP3 לימות
// path format: ivr2:/שלוחה/שם_קובץ.wav
// convertAudio=1 → ימות ממירים MP3→WAV
// ==========================================
async function uploadFile(localFilePath, yemotPath) {
    const token = await getToken();

    const form = new FormData();
    form.append('token', token);
    form.append('path', yemotPath);
    form.append('convertAudio', '1');
    form.append('file', fs.createReadStream(localFilePath));

    const { data } = await axios.post(`${YEMOT_API_BASE}/UploadFile`, form, {
        headers: form.getHeaders(),
        maxContentLength: 50 * 1024 * 1024,
        timeout: 30000
    });

    if (data.responseStatus !== 'OK') {
        throw new Error(`[YemotAPI] Upload failed: ${data.message || JSON.stringify(data)}`);
    }

    console.log(`[YemotAPI] ✅ הועלה: ${yemotPath}`);
    return data;
}

// ==========================================
// deleteFile — מחיקת קובץ מימות
// ==========================================
async function deleteFile(yemotPath) {
    const token = await getToken();

    const { data } = await axios.get(`${YEMOT_API_BASE}/FileAction`, {
        params: {
            token,
            action: 'delete',
            what: yemotPath
        }
    });

    if (data.responseStatus !== 'OK') {
        console.warn(`[YemotAPI] ⚠️ Delete failed: ${data.message || JSON.stringify(data)}`);
        return false;
    }

    console.log(`[YemotAPI] 🗑️ נמחק: ${yemotPath}`);
    return true;
}

// ==========================================
// checkFileExists — בדיקת קיום קובץ בימות
// ==========================================
async function checkFileExists(yemotPath) {
    const token = await getToken();

    const { data } = await axios.get(`${YEMOT_API_BASE}/CheckIfFileExists`, {
        params: { token, path: yemotPath }
    });

    return data.responseStatus === 'OK' && data.exists === true;
}

// ==========================================
// getSystemInfo — מידע על המערכת (יחידות, מקום)
// ==========================================
async function getSystemInfo() {
    const token = await getToken();

    const { data } = await axios.get(`${YEMOT_API_BASE}/GetSession`, {
        params: { token }
    });

    if (data.responseStatus !== 'OK') {
        throw new Error(`[YemotAPI] GetSession failed: ${data.message}`);
    }

    return {
        name: data.name,
        units: data.units,
        unitsExpireDate: data.unitsExpireDate,
        username: data.username
    };
}

// ==========================================
// runTzintuk — שליחת צ'ינטוק (שיחה קצרה ללא מענה) למספרים נתונים
// phones: מחרוזת מספרים מופרדים בנקודתיים, לדוגמה "0501234567:0507654321"
// callerId: המספר המחייג המאושר (זיהוי יוצא)
// מחזיר: { ok, code, message, raw }
// קודי שגיאה ידועים: 102=אין מספרים תקינים, 103=אין מספיק יחידות,
//                     104=שבת/חג, 120=callerId לא מאושר
// ==========================================
const TZINTUK_ERROR_CODES = {
    101: 'הקמפיין לא מוגדר כראוי (רשימת טלפונים ריקה / אין הודעה תקינה)',
    102: 'אין מספרי טלפון תקינים',
    103: 'אין מספיק יחידות בחשבון ימות',
    104: 'ניסיון הפעלה בשבת או יום טוב',
    105: 'שגיאה כללית — הקמפיין לא יכול להתחיל',
    120: 'המספר המחייג (callerId) אינו מאושר בחשבון'
};

async function runTzintuk(phones, callerId) {
    const token = await getToken();

    const params = { token, phones };
    if (callerId) params.callerId = callerId;

    const { data } = await axios.get(`${YEMOT_API_BASE}/RunTzintuk`, {
        params,
        timeout: 20000
    });

    // ימות מחזירים responseStatus='OK' בהצלחה, או message/responseMessage עם קוד שגיאה
    const ok = data && data.responseStatus === 'OK';
    let code = null;
    const rawMsg = data && (data.message || data.responseMessage || '');
    const codeMatch = String(rawMsg).match(/\b(10[0-9]|120)\b/);
    if (codeMatch) code = parseInt(codeMatch[1], 10);

    if (!ok) {
        const friendly = code && TZINTUK_ERROR_CODES[code] ? TZINTUK_ERROR_CODES[code] : rawMsg;
        console.warn(`[YemotAPI] ⚠️ RunTzintuk נכשל: ${friendly || JSON.stringify(data)}`);
    }

    return { ok, code, message: rawMsg, raw: data };
}

// ==========================================
// getApprovedCallerIds — רשימת זיהויי היוצא המאושרים בחשבון
// משמש לאימות שהמספר השלישי מאושר לפני הפעלה אמיתית
// ==========================================
async function getApprovedCallerIds() {
    const token = await getToken();

    const { data } = await axios.get(`${YEMOT_API_BASE}/GetApprovedCallerIDs`, {
        params: { token },
        timeout: 15000
    });

    return data;
}

module.exports = {
    login,
    getToken,
    uploadFile,
    deleteFile,
    checkFileExists,
    getSystemInfo,
    runTzintuk,
    getApprovedCallerIds
};
