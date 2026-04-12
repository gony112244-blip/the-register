/**
 * Profile Audio Generator
 *
 * כשמשתמש שומר/מעדכן פרופיל באתר,
 * נוצרים 3 שכבות אודיו (L1, L2, L3) ומועלים לימות.
 *
 * L1 — שם, סטטוס, גיל, עיר, מוסד
 * L2 — מוצא, רקע, עיסוק, גובה, כיסוי ראש
 * L3 — מבנה גוף, מראה, גוון עור, שאיפה, עבודה, תיאור חופשי
 */

const { uploadProfileAudio, numberToHebrew } = require('./tts');

let phoneticMap = null;
function getPm() {
    if (!phoneticMap) {
        try {
            phoneticMap = require('./phonetic-map.json');
        } catch {
            phoneticMap = {};
        }
    }
    return phoneticMap;
}

function lookup(section, key) {
    const pm = getPm();
    return pm[section]?.[key] || key;
}

// ==========================================
// L1 — שכבה בסיסית
// ==========================================
function buildL1Text(user) {
    const parts = [];

    if (user.full_name) parts.push(user.full_name);

    if (user.status) {
        parts.push(lookup('status_personal', user.status));
    }

    if (user.age) parts.push(`גיל ${numberToHebrew(parseInt(user.age))}`);

    if (user.city) {
        const city = lookup('cities_phonetic', user.city) || user.city;
        parts.push(`מ${city}`);
    }

    if (user.study_place) {
        const inst = lookup('yeshivot_phonetic', user.study_place) || user.study_place;
        const label = user.gender === 'female' ? 'בוגרת סמינר' : 'ישיבת';
        parts.push(`${label} ${inst}`);
    }

    return parts.length > 0
        ? `${parts.join(', ')}.`
        : 'פרטים לא זמינים.';
}

// ==========================================
// L2 — שכבה מורחבת
// ==========================================
function buildL2Text(user) {
    const parts = [];

    if (user.heritage_sector) {
        parts.push(`מוצא ${lookup('heritage_sector', user.heritage_sector)}`);
    }
    if (user.family_background) {
        parts.push(`רקע ${lookup('family_background', user.family_background)}`);
    }
    if (user.current_occupation) {
        parts.push(lookup('current_occupation', user.current_occupation));
    }
    if (user.height) {
        parts.push(`גובה ${numberToHebrew(parseInt(user.height))} סנטימטר`);
    }
    if (user.gender === 'female' && user.head_covering) {
        parts.push(`כיסוי ראש: ${lookup('head_covering', user.head_covering)}`);
    }

    return parts.length > 0 ? parts.join(', ') + '.' : 'אין פרטים נוספים.';
}

// ==========================================
// L3 — שכבה מלאה
// ==========================================
function buildL3Text(user) {
    const parts = [];

    if (user.body_type) {
        parts.push(`מבנה גוף ${lookup('body_type', user.body_type)}`);
    }
    if (user.appearance) {
        parts.push(`מראה ${lookup('appearance', user.appearance)}`);
    }
    if (user.skin_tone) {
        parts.push(`גוון עור ${lookup('skin_tone', user.skin_tone)}`);
    }
    if (user.life_aspiration) {
        parts.push(`שאיפה: ${lookup('life_aspiration', user.life_aspiration)}`);
    }
    if (user.work_field) {
        parts.push(`תחום עבודה: ${user.work_field}`);
    }
    if (user.about_me) {
        parts.push(user.about_me);
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'אין תיאור נוסף.';
}

// ==========================================
// generateProfileAudio — Fire & forget
// נקרא אחרי שמירה/עדכון פרופיל מוצלח
// ==========================================
async function generateProfileAudio(user) {
    if (!user || !user.id) return;
    if (!process.env.YEMOT_NUMBER || !process.env.YEMOT_PASSWORD) return;

    const userId = user.id;
    console.log(`[ProfileAudio] 🎙️ מייצר אודיו לפרופיל ${userId}...`);

    const layers = [
        { layer: 'L1', text: buildL1Text(user) },
        { layer: 'L2', text: buildL2Text(user) },
        { layer: 'L3', text: buildL3Text(user) },
    ];

    let success = 0;
    for (const { layer, text } of layers) {
        try {
            const result = await uploadProfileAudio(userId, text, layer);
            if (result) success++;
        } catch (err) {
            console.error(`[ProfileAudio] ❌ שגיאה ב-${layer}: ${err.message}`);
        }
    }

    console.log(`[ProfileAudio] ✅ ${success}/3 שכבות הועלו לפרופיל ${userId}`);
}

module.exports = { generateProfileAudio, buildL1Text, buildL2Text, buildL3Text };
