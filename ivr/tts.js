/**
 * IVR TTS — Google Cloud Text-to-Speech + Yemot Cache
 *
 * ארכיטקטורה:
 * 1. Hash של הטקסט (כולל שם קול)
 * 2. בדיקת אינדקס מקומי (JSON)
 * 3. קיים בימות → מחזיר f-tts_cache/xx/hash
 * 4. לא קיים → Google TTS → MP3 → העלאה לימות → עדכון אינדקס → f-path
 * 5. Fallback: מחזיר t-text (TTS מובנה של ימות)
 *
 * ⚠️  חובה ב-.env:
 *     GOOGLE_APPLICATION_CREDENTIALS=...
 *     YEMOT_NUMBER=...
 *     YEMOT_PASSWORD=...
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadFile } = require('./yemotApi');

// תיקייה זמנית ל-MP3 לפני העלאה
const TEMP_DIR = path.join(__dirname, '..', 'ivr-audio', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// אינדקס מקומי — hash → yemotPath
const INDEX_PATH = path.join(__dirname, '..', 'ivr-audio', 'tts-index.json');
let ttsIndex = {};

// טעינת אינדקס מקומי
function loadIndex() {
    try {
        if (fs.existsSync(INDEX_PATH)) {
            ttsIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
            let migrated = 0;
            for (const [hash, entry] of Object.entries(ttsIndex)) {
                if (entry.yemotPath && !entry.yemotPath.startsWith('/')) {
                    entry.yemotPath = '/' + entry.yemotPath;
                    migrated++;
                }
            }
            if (migrated > 0) {
                saveIndex();
                console.log(`[TTS] 🔄 אינדקס: ${migrated} נתיבים עודכנו עם / מוביל`);
            }
            console.log(`[TTS] 📖 אינדקס נטען: ${Object.keys(ttsIndex).length} רשומות`);
        }
    } catch (err) {
        console.warn('[TTS] ⚠️ שגיאה בטעינת אינדקס:', err.message);
        ttsIndex = {};
    }
}
loadIndex();

function saveIndex() {
    try {
        fs.writeFileSync(INDEX_PATH, JSON.stringify(ttsIndex, null, 2), 'utf8');
    } catch (err) {
        console.error('[TTS] ❌ שגיאה בשמירת אינדקס:', err.message);
    }
}

// קול TTS — גברי
const TTS_VOICE_NAME   = 'he-IL-Wavenet-B';
const TTS_VOICE_GENDER = 'MALE';

// ==========================================
// Hash — כולל שם קול (שינוי קול = cache miss)
// ==========================================
function getHash(text) {
    const input = `${TTS_VOICE_NAME}:${text}`;
    return crypto.createHash('md5').update(input).digest('hex').slice(0, 12);
}

// ==========================================
// Yemot path — תת-תיקייה לפי 2 תווים ראשונים של hash
// מפזר קבצים ל-256 תיקיות (מגבלת 3000/תיקייה)
// ==========================================
function buildYemotPath(hash) {
    const subdir = hash.slice(0, 2);
    return `/tts_cache/${subdir}/${hash}`;
}

function buildUploadPath(hash) {
    const subdir = hash.slice(0, 2);
    return `ivr2:/tts_cache/${subdir}/${hash}.wav`;
}

// ==========================================
// textToYemot — הפונקציה הראשית
// מחזיר segment לשימוש ב-yemotPlayback/yemotRead:
//   f-tts_cache/xx/hash   (אם מועלה לימות)
//   t-text                (fallback)
// ==========================================
async function textToYemot(text) {
    if (!text || text.trim().length === 0) return 't-';

    const hash = getHash(text);

    // 1. בדיקת אינדקס מקומי
    if (ttsIndex[hash]) {
        console.log(`[TTS] ✅ Index hit: ${hash} → ${ttsIndex[hash].yemotPath}`);
        return `f-${ttsIndex[hash].yemotPath}`;
    }

    // 2. יצירה + העלאה
    try {
        const mp3Path = await generateGoogleTts(text, hash);
        const uploadPath = buildUploadPath(hash);

        await uploadFile(mp3Path, uploadPath);

        const yemotPath = buildYemotPath(hash);
        ttsIndex[hash] = {
            yemotPath,
            text: text.slice(0, 100),
            createdAt: new Date().toISOString()
        };
        saveIndex();

        // מחיקת קובץ זמני
        fs.unlink(mp3Path, () => {});

        console.log(`[TTS] ✅ הועלה בהצלחה: f-${yemotPath}`);
        return `f-${yemotPath}`;

    } catch (err) {
        console.error(`[TTS] ❌ שגיאה ביצירה/העלאה: ${err.message}`);
        console.log('[TTS] ↩️ Fallback ל-t- (TTS ימות)');
        return `t-${sanitizeForYemotTts(text)}`;
    }
}

// ==========================================
// Google TTS — יצירת MP3 ושמירה בתיקייה זמנית
// ==========================================
async function generateGoogleTts(text, hash) {
    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();

    const mappedText = applyPhoneticMap(text);

    console.log(`[TTS] 🎙️ Google TTS: "${text.slice(0, 50)}..."`);

    const [response] = await client.synthesizeSpeech({
        input: { text: mappedText },
        voice: {
            languageCode: 'he-IL',
            name: TTS_VOICE_NAME,
            ssmlGender: TTS_VOICE_GENDER
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: 0.0
        }
    });

    const filePath = path.join(TEMP_DIR, `${hash}.mp3`);
    fs.writeFileSync(filePath, response.audioContent, 'binary');
    console.log(`[TTS] 💾 MP3 זמני: ${filePath}`);
    return filePath;
}

// ==========================================
// Phonetic map
// ==========================================
let phoneticMap = null;

function applyPhoneticMap(text) {
    if (!phoneticMap) {
        try {
            const raw = require('./phonetic-map.json');
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
        if (key.startsWith('_')) continue;
        result = result.replaceAll(key, value);
    }
    return result;
}

// ==========================================
// Sanitize for Yemot t- fallback
// ==========================================
function sanitizeForYemotTts(text) {
    return (text || '')
        .replace(/\./g, ',')
        .replace(/-/g, ' ')
        .replace(/["'&|]/g, '');
}

// ==========================================
// מספרים בעברית
// ==========================================
// construct=true → צורת נסמך לפני שם עצם (שתי, שלוש, ...)
// construct=false → צורת עומד (שתיים, שלוש, ...)
// רק 2 שונה: "שתיים" עומד vs "שתי" נסמך
function numberToHebrew(n, construct = false) {
    const units = ['', 'אחת', construct ? 'שתי' : 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר',
                   'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה',
                   'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה', 'עשרים'];
    if (n <= 20) return units[n];
    if (n < 100) {
        const tens = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'];
        const t = tens[Math.floor(n / 10)];
        const u = units[n % 10];
        return u ? `${t} ו${u}` : t;
    }
    if (n < 200) {
        const rest = n - 100;
        return rest === 0 ? 'מאה' : `מאה ${numberToHebrew(rest)}`;
    }
    if (n < 300) {
        const rest = n - 200;
        return rest === 0 ? 'מאתיים' : `מאתיים ${numberToHebrew(rest)}`;
    }
    return String(n);
}

// ==========================================
// Pre-generate — העלאת משפטים סטטיים לימות
// נקרא מ-server.js בעת אתחול
// ==========================================
async function preloadStaticPhrases(phrases) {
    if (!phrases || phrases.length === 0) return;
    console.log(`[TTS] 🔄 מעלה ${phrases.length} משפטים סטטיים לימות...`);

    let uploaded = 0, skipped = 0, failed = 0;

    for (const text of phrases) {
        try {
            const hash = getHash(text);
            if (ttsIndex[hash]) {
                skipped++;
                continue;
            }
            await textToYemot(text);
            uploaded++;
        } catch (err) {
            console.warn(`[TTS] ⚠️ שגיאה במשפט: "${text.slice(0, 40)}": ${err.message}`);
            failed++;
        }
    }

    console.log(`[TTS] ✅ סטטיים: ${uploaded} הועלו, ${skipped} כבר קיימים, ${failed} נכשלו`);
}

// ==========================================
// פרופיל — יצירת MP3 מלא והעלאה לימות
// נקרא כשמשתמש שומר פרופיל באתר
// ==========================================
async function uploadProfileAudio(userId, text, layer = 'L1') {
    const hash = crypto.createHash('md5').update(`profile:${userId}:${layer}:${text}`).digest('hex').slice(0, 12);
    const yemotDir = `tts_profiles/${String(userId).slice(-2)}`;
    const yemotFileName = `${userId}_${layer}`;
    const uploadPath = `ivr2:/${yemotDir}/${yemotFileName}.wav`;
    const yemotPath = `/${yemotDir}/${yemotFileName}`;

    try {
        const mp3Path = await generateGoogleTts(text, hash);
        await uploadFile(mp3Path, uploadPath);
        fs.unlink(mp3Path, () => {});
        console.log(`[TTS] 📋 פרופיל הועלה: f-${yemotPath}`);
        return `f-${yemotPath}`;
    } catch (err) {
        console.error(`[TTS] ❌ שגיאה בהעלאת פרופיל ${userId}/${layer}: ${err.message}`);
        return null;
    }
}

// ==========================================
// ניקוי אינדקס — הסרת רשומות ישנות
// ==========================================
function removeFromIndex(hash) {
    if (ttsIndex[hash]) {
        delete ttsIndex[hash];
        saveIndex();
    }
}

function getIndexStats() {
    return {
        totalEntries: Object.keys(ttsIndex).length,
        indexPath: INDEX_PATH
    };
}

/**
 * פורמט מספר טלפון לקריאת TTS ברורה.
 * מוסיף פסיק ורווח בין כל ספרה — Google TTS עושה הפסקה קצרה בפסיק.
 * לדוגמה: "0541234567" → "0, 5, 4, 1, 2, 3, 4, 5, 6, 7"
 */
function formatPhoneForTts(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '').split('').join(', ');
}

module.exports = {
    textToYemot,
    numberToHebrew,
    formatPhoneForTts,
    preloadStaticPhrases,
    uploadProfileAudio,
    removeFromIndex,
    getIndexStats,
    getHash,
    sanitizeForYemotTts
};
