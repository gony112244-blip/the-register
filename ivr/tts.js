/**
 * IVR TTS — Google Cloud Text-to-Speech + Cache מקומי
 *
 * ארכיטקטורה:
 * 1. בדיקת Cache (לפי hash של הטקסט)
 * 2. אם קיים → מחזיר URL ישירות (בלי לשלם ל-Google)
 * 3. אם לא → שולח ל-Google TTS → שומר MP3 → מחזיר URL
 *
 * ⚠️  חובה להגדיר ב-.env:
 *     GOOGLE_APPLICATION_CREDENTIALS=/var/www/hapinkas/google-tts-credentials.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// תיקיות שמירת קבצי אודיו
const STATIC_DIR = path.join(__dirname, '..', 'ivr-audio', 'static');
const DYNAMIC_DIR = path.join(__dirname, '..', 'ivr-audio', 'dynamic');

// URL בסיס להגשת הקבצים (ימות משיח מושכים מכאן)
const BASE_URL = process.env.APP_URL || 'https://pinkas.cloud';

// יצירת תיקיות אם לא קיימות
[STATIC_DIR, DYNAMIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==========================================
// יצירת שם קובץ לפי hash של הטקסט
// ==========================================
function getCacheFileName(text) {
    const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
    return `tts_${hash}.mp3`;
}

// ==========================================
// המרת טקסט ל-URL של MP3 (עם Cache)
// ==========================================
async function textToUrl(text, type = 'dynamic') {
    const fileName = getCacheFileName(text);
    const dir = type === 'static' ? STATIC_DIR : DYNAMIC_DIR;
    const filePath = path.join(dir, fileName);
    const fileUrl = `${BASE_URL}/ivr-audio/${type}/${fileName}`;

    // Cache hit — הקובץ כבר קיים
    if (fs.existsSync(filePath)) {
        console.log(`[TTS] ✅ Cache hit: ${fileName}`);
        return fileUrl;
    }

    // Cache miss — ליצור דרך Google TTS
    console.log(`[TTS] 🎙️ יוצר MP3 חדש: "${text.slice(0, 40)}..."`);

    try {
        const textToSpeech = require('@google-cloud/text-to-speech');
        const client = new textToSpeech.TextToSpeechClient();

        // מיפוי טקסט לפי phonetic-map לפני שליחה ל-TTS
        const mappedText = applyPhoneticMap(text);

        const [response] = await client.synthesizeSpeech({
            input: { text: mappedText },
            voice: {
                languageCode: 'he-IL',
                name: 'he-IL-Wavenet-A', // קול נקבה WaveNet — הטוב ביותר הזמין לעברית
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 0.9, // קצת יותר איטי — נוח לשמיעה בטלפון
                pitch: 0.0
            }
        });

        fs.writeFileSync(filePath, response.audioContent, 'binary');
        console.log(`[TTS] 💾 נשמר: ${filePath}`);
        return fileUrl;

    } catch (err) {
        console.error('[TTS] ❌ שגיאת Google TTS:', err.message);
        // Fallback — קובץ שגיאה מוקלט מראש
        return `${BASE_URL}/ivr-audio/static/error.mp3`;
    }
}

// ==========================================
// מיפוי phonetic לפני שליחה ל-TTS
// ==========================================
let phoneticMap = null;

function applyPhoneticMap(text) {
    if (!phoneticMap) {
        try {
            const raw = require('./phonetic-map.json');
            // שטח את כל ה-objects למילון אחד
            phoneticMap = {};
            for (const section of Object.values(raw)) {
                if (typeof section === 'object' && !Array.isArray(section)) {
                    Object.assign(phoneticMap, section);
                }
            }
        } catch {
            phoneticMap = {};
        }
    }

    let result = text;
    for (const [key, value] of Object.entries(phoneticMap)) {
        if (key.startsWith('_')) continue; // _comment
        result = result.replaceAll(key, value);
    }
    return result;
}

// ==========================================
// פונקציות עזר לתפריטים
// ==========================================

// מספר ל-URL של קובץ מספר (0–20)
async function numberToUrl(num) {
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 0 || n > 999) return textToUrl(String(num), 'static');

    // קבצי מספרים נשמרים ב-static (נוצרים פעם אחת)
    return textToUrl(numberToHebrew(n), 'static');
}

// המרת מספר לעברית
function numberToHebrew(n) {
    const units = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר',
                   'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה',
                   'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה', 'עשרים'];
    if (n <= 20) return units[n];
    if (n < 100) return `${units[Math.floor(n/10)*10] || (Math.floor(n/10) + ' עשרות')} ו${units[n%10]}`;
    return String(n); // מעל 100 — נשלח כמספר גולמי
}

// הכנת קבצי מספרים 0–20 בבת אחת (לקריאה בהפעלה ראשונה)
async function preloadNumbers() {
    console.log('[TTS] 🔢 טוען קבצי מספרים 0–20...');
    for (let i = 0; i <= 20; i++) {
        await numberToUrl(i).catch(e => console.warn(`[TTS] preload ${i}:`, e.message));
    }
    console.log('[TTS] ✅ קבצי מספרים מוכנים');
}

module.exports = { textToUrl, numberToUrl, numberToHebrew, preloadNumbers };
