/**
 * IVR Router — נתיב /ivr/call
 * ימות משיח שולחים GET לכאן בכל אינטראקציה עם המתקשר.
 * השרת מחזיר טקסט פשוט בפורמט ימות המשיח (id_list_message / read / go_to_folder).
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateIvrToken, getUserByPhone, checkPin, getOrCreateSession, updateSession, updateUserPin } = require('./auth');
const { textToYemot, numberToHebrew, formatPhoneForTts } = require('./tts');
const {
    getMenuCounts,
    countNewMatches, countIncomingRequests, countPhotoRequests, countPendingSent, countActiveSent, countUnreadMessages,
    getMatchesForIvr, getAllMatchesForIvr, sendConnectionFromIvr, hideProfileFromIvr,
    getIncomingRequestsForIvr, approveRequestFromIvr, rejectRequestFromIvr,
    getMySentRequestsForIvr, cancelSentRequestFromIvr,
    getPendingSentForIvr, getActiveSentForIvr, finalizeConnectionFromIvr, cancelActiveConnectionFromIvr, getAwaitingMyApproval,
    requestAdditionalReferenceFromIvr, respondToReferenceRequestFromIvr, getReferenceRequestStatus,
    markConnectionViewedFromIvr,
    getFullProfileForIvr,
    getPhotoRequestsForIvr, approvePhotoRequestFromIvr, rejectPhotoRequestFromIvr,
    getMessagesForIvr, getRecentMessagesForIvr, markMessageReadFromIvr,
    updateTtsLastPlayed
} = require('./data');

// ==========================================
// Middleware — אימות token לכל נתיבי /ivr/
// ==========================================
router.use((req, res, next) => {
    const { token } = req.query;
    if (!validateIvrToken(token)) {
        console.warn(`[IVR] ❌ Token לא תקין | IP: ${req.ip} | token: ${token}`);
        return res.status(403).type('text').send('Forbidden');
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

const ACTIVE_CANCEL_REASONS = [
    'לצערנו, לאחר בירורים נראה שאנחנו פחות מתאימים זה לזה',
    'יש לנו כרגע הצעה אחרת שמתקדמת, אולי בהמשך',
    'כבר נפגשנו בעבר ולא מצאנו לנכון להמשיך',
    'הצעה זו כבר הוצעה לנו בעבר',
    'ממתינים זמן רב מדי לתשובה ואנחנו לא ממשיכים',
    'אחר'
];

// ==========================================
// מבזק סטטוס — "יש לְךָ / לָך X הצעות, Y בקשות..."
// gender-aware כדי למנוע עיוות TTS במילה "לך"
// ==========================================
function buildStatusText(gender, counts) {
    const { matches = 0, requests = 0, photos = 0, messages = 0, pendingSent = 0, activeSent = 0, shadchanSent = 0 } = counts || {};
    const isMale = gender !== 'female';
    const lecha = isMale ? 'לְךָ' : 'לָך';
    const parts = [];

    // הצעות חדשות
    if (matches > 0) {
        const noun = matches === 1 ? 'הצעה חדשה' : `${numberToHebrew(matches, true)} הצעות חדשות`;
        parts.push(noun);
    }
    // בקשות שידוך שהגיעו
    if (requests > 0) {
        const noun = requests === 1 ? 'בקשת שידוך שהגיעה אליך' : `${numberToHebrew(requests, true)} בקשות שידוך שהגיעו אליך`;
        parts.push(noun);
    }
    // בקשות תמונה
    if (photos > 0) {
        const noun = photos === 1 ? 'בקשת תמונה' : `${numberToHebrew(photos, true)} בקשות תמונה`;
        parts.push(noun);
    }
    // הודעות חשובות
    if (messages > 0) {
        const noun = messages === 1 ? 'הודעה חשובה' : `${numberToHebrew(messages, true)} הודעות חשובות`;
        parts.push(noun);
    }
    // שידוך פעיל בשלב בירורים
    if (activeSent > 0) {
        const noun = activeSent === 1
            ? 'שידוך פעיל אחד בשלב בירורים'
            : `${activeSent === 2 ? 'שני' : numberToHebrew(activeSent)} שידוכים פעילים בשלב בירורים`;
        parts.push(noun);
    }
    // הצעות בטיפול שַׁדְּכָנִית
    if (shadchanSent > 0) {
        const noun = shadchanSent === 1
            ? 'הצעה אחת בטיפול שַׁדְּכָנִית'
            : `${shadchanSent === 2 ? 'שתי' : numberToHebrew(shadchanSent, true)} הצעות בטיפול שַׁדְּכָנִית`;
        parts.push(noun);
    }

    if (parts.length === 0) return 'אין פעילות חדשה כרגע.';
    const last = parts.pop();
    if (parts.length === 0) return `יש ${lecha} ${last}.`;
    return `יש ${lecha} ${parts.join(', ')}, ו${last}.`;
}

// ==========================================
// תפריט ראשי — דינמי: מסתיר אפשרויות שאין בהן תוכן
// counts = { matches, requests, photos, messages }
// ==========================================
function buildMenuText(gender, counts = {}) {
    const r           = counts.requests    || 0;
    const p           = counts.photos      || 0;
    const msg         = counts.messages    || 0;
    const pendingSent = counts.pendingSent || 0;
    const activeSent  = counts.activeSent  || 0;
    const shadchanSent = counts.shadchanSent || 0;
    const isMale = gender !== 'female';
    // ניקוד מפורש — TTS יקרא "הָקֵשׁ" (פועל) ולא "הַקֵּשׁ" (שם עצם)
    const hk = isMale ? 'הָקֵשׁ' : 'הָקִישִׁי';

    const parts = [];

    // 1 — הצעות חדשות (רק אם יש — אבל מקש 1 תמיד פעיל)
    // כשאין הצעות לא מכריזים בתפריט, אבל אם ילחץ 1 יקבל הודעה מתאימה
    if (counts.matches > 0) parts.push(`להצעות חדשות, ${hk} אחת.`);

    // 2 — תמונות ממתינות (רק אם יש)
    if (p > 0) parts.push(`לתמונות הממתינות לאישורך, ${hk} שתיים.`);

    // 3 — בקשות שידוך שהגיעו אליך (רק אם יש)
    if (r > 0) parts.push(`לבקשות שידוך שהגיעו אליך, ${hk} שלוש.`);

    // 4 — בקשות ששלחת שטרם נענו (רק אם יש) — מספר אחרי שם העצם (נקבה: אחת/שתי)
    if (pendingSent > 0) {
        const txt = pendingSent === 1
            ? `לבקשה אחת ששלחת ועדיין ממתינה לתשובה, ${hk} ארבע.`
            : pendingSent === 2
                ? `לשתי בקשות ששלחת שעדיין ממתינות, ${hk} ארבע.`
                : `ל${numberToHebrew(pendingSent, true)} בקשות ששלחת שעדיין ממתינות, ${hk} ארבע.`;
        parts.push(txt);
    }

    // 5 — שידוכים פעילים (בירורים + בטיפול שדכנית) — מספר אחרי שם העצם
    const totalActive = activeSent + shadchanSent;
    if (totalActive > 0) {
        let txt;
        if (activeSent > 0 && shadchanSent > 0) {
            txt = `לשידוכים הפעילים שלך, ${hk} חמש.`;
        } else if (activeSent === 1) {
            txt = `לשידוך פעיל אחד, ${hk} חמש.`;
        } else if (activeSent === 2) {
            txt = `לשני שידוכים פעילים, ${hk} חמש.`;
        } else if (activeSent > 2) {
            txt = `ל${numberToHebrew(activeSent)} שידוכים פעילים, ${hk} חמש.`;
        } else if (shadchanSent === 1) {
            txt = `להצעה בטיפול שַׁדְּכָנִית, ${hk} חמש.`;
        } else {
            txt = `ל${numberToHebrew(shadchanSent, true)} הצעות בטיפול שַׁדְּכָנִית, ${hk} חמש.`;
        }
        parts.push(txt);
    }

    // 6 — הודעות חשובות (רק אם יש)
    if (msg > 0) parts.push(`להודעות חשובות, ${hk} שש.`);

    // 7 — כל ההצעות כולל ישנות (תמיד)
    parts.push(`לכל ההצעות כולל ישנות, ${hk} שבע.`);

    // 8 — הודעות אחרונות (תמיד — גם קרואות)
    parts.push(`לשמיעת הודעות אחרונות מהשבוע האחרון, ${hk} שמונה.`);


    // חזרה על התפריט — תמיד בסוף
    parts.push(`לשמיעה חוזרת של התפריט, ${hk} אפס.`);

    return parts.join(' ');
}

// ==========================================
// ניקוי טקסט הודעה לפני TTS
// מסיר אמוג'י, סוגריים עם לוכסן (יכול/ה → יכול), ומפרמט טלפונים
// ==========================================
function cleanMsgForTts(content) {
    return (content || '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
        .replace(/ℹ️|📷|✅|❌|⚠️|📋/g, '')
        .replace(/\/[\u05D0-\u05EA]{1,3}/g, '')
        .replace(/\b(0\d{1,2}[-\s]?\d{7,8})\b/g, (p) => formatPhoneForTts(p))
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ==========================================
// goToMenu — מחזיר ישר לתפריט הראשי עם סטטוס
// מוחלף בכל נקודות החזרה (# ומצבים ריקים)
// ==========================================
async function goToMenu(enterId, userId, gender, res, prefix = '') {
    await updateSession(enterId, 'menu', { timeoutCount: 0 });
    let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
    try { counts = await getMenuCounts(userId); } catch {}
    const statusText = buildStatusText(gender, counts);
    const menuText   = buildMenuText(gender, counts);

    const parts = [];
    if (prefix) parts.push(prefix);

    // נדנוד: הצד השני אישר התקדמות לשדכנית — המשתמש עדיין לא אישר
    let awaitingRows = [];
    try { awaitingRows = await getAwaitingMyApproval(userId); } catch {}
    for (const row of awaitingRows) {
        const otherName = [row.last_name, row.full_name].filter(Boolean).join(' ') || 'הצד השני';
        parts.push(`שים לב: ${otherName} אישר התקדמות לשַׁדְּכָנִית ומחכה לאישורך. לאישור כנס לשידוכים הפעילים.`);
    }

    // הצג status רק אם יש פעילות (כדי למנוע כפילות עם prefix שאומר "אין...")
    const hasActivity = (counts.matches || counts.requests || counts.photos || counts.messages || counts.pendingSent || counts.activeSent);
    if (hasActivity) parts.push(statusText);
    parts.push(menuText);
    const file = await textToYemot(parts.join(' '));
    return yemotRead(res, file, 'digits', 1, 1, 8);
}

// phonetic-map נטען פעם אחת
const pm = require('./phonetic-map.json');

// ==========================================
// הכרזת כמות לפני תחילת שמיעת רשימה
// count    — מספר הפריטים
// singular — ביטוי לפריט יחיד  (למשל "הצעה חדשה")
// plural   — ביטוי לרבים       (למשל "הצעות חדשות")
// first    — ביטוי ל"ראשונה"   (למשל "הצעה ראשונה")
// ==========================================
function buildSectionIntro(count, singular, plural, first) {
    if (count <= 0) return '';
    // הכמות כבר נשמעה בתפריט הראשי — מספיק לציין "ראשון/ה" לפני הפרטים
    return `${first}: `;
}

// מעקב אחר הודעות סיום (playback ללא read) כדי לנתק בקריאה החוזרת.
// מפתח: `${phone}:${enterId}` → timestamp
const terminalPending = new Map();
function shouldHangupAfterTerminal(phone, enterId) {
    const k = `${phone}:${enterId}`;
    if (terminalPending.has(k)) {
        terminalPending.delete(k);
        return true;
    }
    terminalPending.set(k, Date.now());
    setTimeout(() => terminalPending.delete(k), 120_000);
    return false;
}

// ==========================================
// שם מלא — שם פרטי + שם משפחה
// ==========================================
function buildFullName(match) {
    const first = match.full_name || '';
    const last  = match.last_name  || '';
    return last ? `${first} ${last}` : first;
}

// ==========================================
// הקראת פרופיל מלא — כל הפרטים ברצף אחד
// ==========================================
function buildFullProfileText(match) {
    const parts = [];

    // --- פרטים בסיסיים ---
    const isFemale = match.gender === 'female';
    const fullName = buildFullName(match);
    if (fullName) parts.push(fullName);
    if (match.status) {
        // מפה מודעת-מגדר: ניקוד מפורש כדי ש-TTS יבטא נכון
        const statusMap = {
            single:   isFemale ? 'רַוָּקָה' : 'רַוָּק',
            divorced: isFemale ? 'גְּרוּשָׁה'  : 'גָּרוּשׁ',
            widower:  isFemale ? 'אַלְמָנָה'  : 'אַלְמָן',
        };
        const st = statusMap[match.status] || pm.status_personal?.[match.status] || match.status;
        parts.push(st);
    }
    if (match.age) parts.push(`גיל ${numberToHebrew(match.age)}`);
    if (match.city) {
        const city = pm.cities_phonetic?.[match.city] || match.city;
        parts.push(`מ${city}`);
    }
    if (match.country_of_birth) {
        const ylidPrefix = isFemale ? 'יְלִידַת' : 'יְלִיד';
        if (match.country_of_birth === 'abroad' && match.origin_country) {
            parts.push(`${ylidPrefix} ${match.origin_country}`);
            if (match.aliyah_age) {
                const aliyahVerb = isFemale ? 'עָלְתָה' : 'עָלָה';
                parts.push(`${aliyahVerb} לָאָרֶץ בְּגִיל ${numberToHebrew(parseInt(match.aliyah_age, 10))}`);
            }
            if (match.languages) {
                const speakVerb = isFemale ? 'מְדַבֶּרֶת' : 'מְדַבֵּר';
                parts.push(`${speakVerb} ${match.languages}`);
            }
        } else if (match.country_of_birth === 'israel') {
            parts.push(`${ylidPrefix} יִשְׂרָאֵל`);
        }
    }
    if ((match.status === 'divorced' || match.status === 'widower') && match.has_children && match.children_count) {
        const childNum = parseInt(match.children_count, 10);
        const childWord = isNaN(childNum) ? String(match.children_count) : numberToHebrew(childNum);
        parts.push(`${childWord} ילדים`);
    }

    // --- מוצא ורקע ---
    if (match.heritage_sector) {
        const sector = pm.heritage_sector?.[match.heritage_sector] || match.heritage_sector;
        parts.push(`מוצא ${sector}`);
    }
    if (match.family_background) {
        const bg = pm.family_background?.[match.family_background] || match.family_background;
        parts.push(`רקע ${bg}`);
    }
    if (match.father_heritage) parts.push(`עדת האב: ${match.father_heritage}`);
    if (match.mother_heritage) parts.push(`עדת האם: ${match.mother_heritage}`);

    // --- משפחה ---
    // "האב" תקין. "האם" מבולבל עם שאלה — משתמשים ב"אמא" לבהירות ב-TTS
    // מילים שנשמעות זכר אך בהקשר האמא הן נקבה — מוסיפים ניקוד נקבה
    const feminizeOccupation = (occ) => {
        if (!occ) return occ;
        return occ
            .replace(/\bמורה\b/g, 'מוֹרָה')
            .replace(/\bעורכת דין\b/g, 'עוֹרֶכֶת דִּין')
            .replace(/\bרופאה\b/g, 'רוֹפְאָה')
            .replace(/\bאחות\b/g, 'אָחוֹת')
            .replace(/\bגננת\b/g, 'גַּנֶּנֶת')
            .replace(/\bמזכירה\b/g, 'מַזְכִּירָה');
    };
    if (match.father_occupation) parts.push(`האבא עובד כ${match.father_occupation}`);
    if (match.mother_occupation) parts.push(`האמא עובדת כ${feminizeOccupation(match.mother_occupation)}`);
    if (match.siblings_count) {
        const cntNum = parseInt(match.siblings_count, 10);
        const cntWord = isNaN(cntNum) ? String(match.siblings_count) : numberToHebrew(cntNum);
        const heOrShe = isFemale ? 'היא' : 'הוא';
        if (match.sibling_position) {
            const posNum = parseInt(match.sibling_position, 10);
            const ordinalMale   = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני', 'תשיעי', 'עשירי'];
            const ordinalFemale = ['', 'ראשונה', 'שנייה', 'שלישית', 'רביעית', 'חמישית', 'שישית', 'שביעית', 'שמינית', 'תשיעית', 'עשירית'];
            const ordArr = isFemale ? ordinalFemale : ordinalMale;
            const posWord = (!isNaN(posNum) && posNum >= 1 && posNum <= 10)
                ? `ה${ordArr[posNum]}`
                : `מספר ${numberToHebrew(posNum)}`;
            parts.push(`יש ${cntWord} ילדים במשפחה, ${heOrShe} ${posWord}`);
        } else {
            parts.push(`יש ${cntWord} ילדים במשפחה`);
        }
    }

    // --- פרטי אחים ואחיות (אופציונלי, JSONB) ---
    let siblingsArr = match.siblings;
    if (typeof siblingsArr === 'string') {
        try { siblingsArr = JSON.parse(siblingsArr); } catch { siblingsArr = null; }
    }
    if (Array.isArray(siblingsArr) && siblingsArr.length > 0) {
        const validSibs = siblingsArr.filter(s => s && (s.name || s.occupation || s.city || s.mechutanim_family));
        if (validSibs.length > 0) {
            parts.push(`פרטי אחים ואחיות:`);
            validSibs.forEach((sib, idx) => {
                const sub = [];
                if (sib.name) sub.push(sib.name);
                if (sib.married === 'married') sub.push('נשוי או נשואה');
                else if (sib.married === 'single') sub.push('רווק או רווקה');
                if (sib.city) sub.push(`גר בעיר ${sib.city}`);
                if (sib.occupation) sub.push(sib.occupation);
                if (sib.married === 'married' && sib.mechutanim_family) {
                    let m = `המחותנים ${sib.mechutanim_family}`;
                    if (sib.mechutanim_city) m += ` מהעיר ${sib.mechutanim_city}`;
                    sub.push(m);
                }
                if (sub.length > 0) parts.push(`${numberToHebrew(idx + 1)}. ${sub.join(', ')}.`);
            });
            parts.push(`עד כאן פרטי האחים.`);
        }
    }

    // --- לימודים ועיסוק ---
    // ישיבה גדולה: study_place הוא השדה הראשי, yeshiva_name כגיבוי
    const yeshivaGdola = match.study_place || match.yeshiva_name;
    if (yeshivaGdola) {
        const inst = pm.yeshivot_phonetic?.[yeshivaGdola] || yeshivaGdola;
        const label = match.gender === 'female' ? 'סמינר' : 'ישיבת';
        parts.push(`${label} ${inst}`);
    }
    if (!isFemale && match.yeshiva_ketana_name) parts.push(`ישיבה קטנה: ${match.yeshiva_ketana_name}`);
    if (match.current_occupation) {
        const femaleOccMap = {
            studying:    'לומדת',
            working:     'עובדת',
            both:        'לומדת ועובדת',
            fixed_times: 'קובעת עיתים ללימוד'
        };
        const occ = isFemale
            ? (femaleOccMap[match.current_occupation] || pm.current_occupation?.[match.current_occupation] || match.current_occupation)
            : (pm.current_occupation?.[match.current_occupation] || match.current_occupation);
        parts.push(occ);
    }
    if (match.work_field) parts.push(`תחום עבודה: ${match.work_field}`);
    // study_field ו-favorite_study רלוונטיים לגברים בלבד (לימוד תורני)
    if (!isFemale && match.study_field)    parts.push(`תחום לימודים: ${match.study_field}`);
    if (!isFemale && match.favorite_study) {
        const fs = pm.favorite_study?.[match.favorite_study] || match.favorite_study;
        parts.push(`לימוד מועדף: ${fs}`);
    }

    // --- דיור ---
    if (match.apartment_help) {
        const helpMap = {
            full: 'דירה מלאה', partial: 'עזרה חלקית', none: 'ללא עזרה',
            yes: 'כן', no: 'לא', discuss: 'נדון עם השדכן'
        };
        let rawHelp = String(match.apartment_help).trim();
        let embeddedAmount = null;
        const amtMatch = rawHelp.match(/^(\S+)\s*\((\d[\d,]*)\)$/);
        if (amtMatch) {
            rawHelp = amtMatch[1];
            embeddedAmount = parseInt(amtMatch[2].replace(/,/g, ''), 10);
        }
        const helpText = helpMap[rawHelp] || rawHelp;
        const amount = embeddedAmount || (match.apartment_amount ? parseInt(String(match.apartment_amount).replace(/[,\s]/g, ''), 10) : null);
        if (amount && !isNaN(amount)) {
            parts.push(`עזרה בדיור: ${helpText}, סכום ${numberToHebrew(amount)} שקל`);
        } else {
            parts.push(`עזרה בדיור: ${helpText}`);
        }
    }

    // --- מראה ---
    if (match.height) parts.push(`גובה ${numberToHebrew(match.height)} סנטימטר`);
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
        parts.push(`צבע עור ${st}`);
    }
    if (match.gender === 'female' && match.head_covering) {
        const hc = pm.head_covering?.[match.head_covering] || match.head_covering;
        parts.push(`כיסוי ראש: ${hc}`);
    }

    // --- שאיפות ---
    if (match.life_aspiration) {
        const la = pm.life_aspiration?.[match.life_aspiration] || match.life_aspiration;
        // לגבר — שאיפתו שלו. לאישה — שאיפתה לגבי בעלה
        const aspLabel = match.gender === 'female' ? 'שאיפה לגבי הבעל' : 'שאיפה';
        parts.push(`${aspLabel}: ${la}`);
    }

    // --- סגנון בית ---
    if (match.home_style && match.home_style.trim()) {
        parts.push(`סגנון הבית: ${match.home_style.trim()}`);
    }

    // --- תיאור עצמי (IVR) ---
    if (match.ivr_about && match.ivr_about.trim()) {
        parts.push(match.ivr_about.trim());
    }

    return parts.length > 0
        ? `הצעה. ${parts.join('. ')}.`
        : 'הצעה. פרטים לא זמינים.';
}

function formatInlineNumbersForTts(text) {
    if (!text) return '';
    return String(text).replace(/\b(\d{1,6})\b/g, (_, digits) => {
        const n = parseInt(digits, 10);
        return Number.isNaN(n) ? digits : numberToHebrew(n);
    });
}

// תאימות אחורה — פונקציות ישנות מפנות לחדשה
function buildMatchText(match)     { return buildFullProfileText(match); }
function buildMatchDetailText(match) { return buildFullProfileText(match); }
function buildMatchFullText(match)   { return buildFullProfileText(match); }

// ==========================================
// helpers — פורמט תגובה לימות המשיח
// audioSeg = segment מוכן: "f-tts_cache/xx/hash" או "t-text"
// ==========================================
function yemotPlayback(res, audioSeg) {
    console.log(`[IVR] ← playback: ${audioSeg.substring(0, 80)}...`);
    res.type('text').send(`id_list_message=${audioSeg}`);
}
function yemotRead(res, audioSeg, varName = 'digits', maxDigits = 1, minDigits = 1, timeout = 8, blockAsterisk = 'no') {
    console.log(`[IVR] ← read(${varName},${minDigits}-${maxDigits}): ${audioSeg.substring(0, 80)}...`);
    // פורמט ימות (מתוך yemot-router2 — makeTapModeRead):
    // read=<audio>=<valName>,<re_enter_if_exists>,<max>,<min>,<sec_wait>,<playback_mode>,<block_asterisk>,<block_zero>
    // playback_mode='No' = ללא השמעת הלחיצה חזרה (ולא מבקש אישור)
    // blockAsterisk='yes' → מונע מ-* לנווט החוצה (חשוב בהזנת מספרים)
    const opts = [varName, 'no', maxDigits, minDigits, timeout, 'No', blockAsterisk, 'no'].join(',');
    res.type('text').send(`read=${audioSeg}=${opts}`);
}
function yemotHangup(res) {
    console.log('[IVR] ← hangup');
    res.type('text').send('go_to_folder=hangup');
}

// ==========================================
// GET /ivr/call — webhook ראשי מימות משיח
// ==========================================
router.get('/call', async (req, res) => {
    // ימות המשיח שולחים: ApiPhone, ApiCallId, ApiDID, ApiRealDID, ApiExtension, ApiTime
    // ההקשות של המשתמש מגיעות בפרמטר ששמו נקבע ב-read (אנחנו קוראים לו "digits")
    const phone    = req.query.ApiPhone    || req.query.phone;
    const rawDigs  = req.query.digits;
    const enterId  = req.query.ApiCallId   || req.query.ApiYFCallId || req.query.EnterID || req.query.enterId || `${phone}_${Date.now()}`;
    const isHangup = req.query.hangup === 'yes';

    // ימות המשיח מצבר את כל תשובות ה-read בפרמטר digits כמערך.
    // הלחיצה הנוכחית היא תמיד האלמנט האחרון — לוקחים רק אותה.
    let key = null;
    if (rawDigs != null) {
        const last = Array.isArray(rawDigs) ? rawDigs[rawDigs.length - 1] : rawDigs;
        key = last != null ? String(last).trim() || null : null;
    }
    const digits = rawDigs; // שמור להשתמשות ב-waiting_pin (4 ספרות)

    console.log(`[IVR] 📞 שיחה נכנסת | phone: ${phone} | digits: ${rawDigs || 'none'} | enterId: ${enterId}`);
    console.log(`[IVR] 🔍 כל הפרמטרים:`, JSON.stringify(req.query));

    // סיגנל ניתוק — ימות שולחים hangup=yes בסוף שיחה
    if (isHangup) {
        console.log(`[IVR] 📵 Hangup signal | phone: ${phone} | enterId: ${enterId}`);
        // רישום משך שיחה ב-ivr_logs לצורך סטטיסטיקות
        try {
            const sessRow = await pool.query(
                `SELECT user_id, created_at FROM ivr_sessions WHERE enter_id = $1`,
                [enterId]
            );
            if (sessRow.rowCount > 0) {
                const { user_id, created_at } = sessRow.rows[0];
                const durationSec = Math.round((Date.now() - new Date(created_at).getTime()) / 1000);
                await pool.query(
                    `INSERT INTO ivr_logs (user_id, caller_phone, call_duration_seconds, created_at)
                     VALUES ($1, $2, $3, NOW())`,
                    [user_id, phone || null, durationSec > 0 ? durationSec : null]
                );
                console.log(`[IVR] 📊 שיחה נרשמה | userId: ${user_id} | משך: ${durationSec}s`);
            }
        } catch (e) {
            console.error('[IVR hangup log]', e.message);
        }
        return res.type('text').send('ok');
    }

    // --- שלב 3: זיהוי משתמש לפי phone ---
    if (!phone) {
        console.warn('[IVR] ⚠️ לא התקבל phone');
        return yemotHangup(res);
    }

    let user;
    try {
        user = await getUserByPhone(phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת DB בזיהוי משתמש:', err.message);
        return yemotHangup(res);
    }

    // משתמש לא רשום במערכת
    if (!user) {
        console.log(`[IVR] 👤 מספר לא מזוהה: ${phone}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const file = await textToYemot('מִסְפַּר הַטֶּלֶפוֹן אֵינוֹ רָשׁוּם בְּמַעֲרֶכֶת הַפִּינְקָס. לְהַרְשָׁמָה, יֵשׁ לְהִכָּנֵס לְאַתָּר הַפִּינְקָס. כְּתוֹבֶת הָאַתָּר: פִּינְקָס נְקוּדָּה קְלַאוּד.');
        return yemotPlayback(res, file);
    }

    // משתמש חסום
    if (user.is_blocked) {
        console.log(`[IVR] 🚫 משתמש חסום: ${user.id}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const text = g(user.gender,
            'הַחֶשְׁבּוֹן שֶׁלְּךָ חָסוּם. לִפְרָטִים, פְּנֵה לְצוֹות הַתְּמִיכָה דֶּרֶך הָאַתָּר.',
            'הַחֶשְׁבּוֹן שֶׁלָך חָסוּם. לִפְרָטִים, פְּנִי לְצוֹות הַתְּמִיכָה דֶּרֶך הָאַתָּר.'
        );
        const file = await textToYemot(text);
        return yemotPlayback(res, file);
    }

    // משתמש לא מאושר
    if (!user.is_approved) {
        console.log(`[IVR] ⏳ משתמש ממתין לאישור: ${user.id}`);
        if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
        const text = g(user.gender,
            'הַפְּרוֹפִיל שֶׁלְּךָ עֲדַיִן מַמְתִּין לְאִישּׁוּר. נְעַדְכֵּן אוֹתְךָ בְּמֵייל כַּאֲשֶׁר יְאֻשָּׁר.',
            'הַפְּרוֹפִיל שֶׁלָך עֲדַיִן מַמְתִּין לְאִישּׁוּר. נְעַדְכֵּן אוֹתָך בְּמֵייל כַּאֲשֶׁר יְאֻשָּׁר.'
        );
        const file = await textToYemot(text);
        return yemotPlayback(res, file);
    }

    // משתמש תקין — ניהול session ו-PIN
    console.log(`[IVR] ✅ משתמש מזוהה: ${user.id} | ${user.full_name}`);
    const firstName = user.full_name?.split(' ')[0] || user.full_name;


    let session;
    try {
        session = await getOrCreateSession(enterId, user.id, phone);
    } catch (err) {
        console.error('[IVR] ❌ שגיאת session:', err.message);
        return yemotHangup(res);
    }

    // ==========================================
    // מכונת מצבים — state machine
    // ==========================================

    // --- מצב: init — שיחה חדשה ---
    if (session.state === 'init') {
        // אין PIN → עבור ישר לתפריט עם ברכה + סטטוס + אפשרויות (ללא round-trip)
        if (!user.ivr_pin || user.allow_ivr_no_pass) {
            await updateSession(enterId, 'menu');
            let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
            try { counts = await getMenuCounts(user.id); } catch {}
            const statusText = buildStatusText(user.gender, counts);
            const menuOptions = buildMenuText(user.gender, counts);
            const welcomePrefix = g(user.gender,
                `שלום ${firstName}, ברוך הבא לפנקס.`,
                `שלום ${firstName}, ברוכה הבאה לפנקס.`
            );
            const file = await textToYemot(`${welcomePrefix} ${statusText} ${menuOptions}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // יש PIN → בקש אותו (dynamic כי כולל את שם המשתמש)
        await updateSession(enterId, 'waiting_pin');
        const pinPromptText = g(user.gender,
            `שלום ${firstName}. אנא הַזֵּן את קוד הכניסה שֶׁלְּךָ, ארבע ספרות.`,
            `שלום ${firstName}. אנא הַזִּינִי את קוד הכניסה שֶׁלָך, ארבע ספרות.`
        );
        const file = await textToYemot(pinPromptText);
        return yemotRead(res, file, 'digits', 4, 4, 15);
    }

    // --- מצב: waiting_pin — ממתין לקוד ---
    if (session.state === 'waiting_pin') {
        if (!key) {
            const repeatText = g(user.gender,
                'הַזֵּן את קוד הכניסה שֶׁלְּךָ, ארבע ספרות.',
                'הַזִּינִי את קוד הכניסה שֶׁלָך, ארבע ספרות.'
            );
            const file = await textToYemot(repeatText);
            return yemotRead(res, file, 'digits', 4, 4, 15);
        }

        const pinResult = await checkPin(user.id, key);
        console.log(`[IVR] 🔑 PIN result: ${pinResult} | user: ${user.id}`);

        if (pinResult === 'ok') {
            // עבור ישר לתפריט עם ברכה — ללא round-trip נוסף
            const welcomePrefix = g(user.gender,
                `קוד נכון. ברוך הבא, ${firstName}.`,
                `קוד נכון. ברוכה הבאת, ${firstName}.`
            );
            return await goToMenu(enterId, user.id, user.gender, res, welcomePrefix);
        }

        if (pinResult === 'blocked') {
            if (shouldHangupAfterTerminal(phone, enterId)) return yemotHangup(res);
            const file = await textToYemot('הגישה חסומה לשלושים דקות, עקב ניסיונות כושלים חוזרים. נסה שוב מאוחר יותר.');
            return yemotPlayback(res, file);
        }

        // PIN שגוי — נסה שוב
        const retryText = g(user.gender, 'קוד שגוי. אנא נסה שוב.', 'קוד שגוי. אנא נסי שוב.');
        const file = await textToYemot(retryText);
        return yemotRead(res, file, 'digits', 4, 4, 15);
    }

    // --- מצב: menu — תפריט ראשי ---
    if (session.state === 'menu') {

        // timeout: אם אין הקשה — ספירה; אחרי 3 פעמים ניתוק מנומס
        if (!key) {
            const tc = parseInt(session.data?.timeoutCount || 0, 10) + 1;
            if (tc >= 3) {
                const byeFile = await textToYemot('לא נקלטה הקשה. נשמח לראותך שוב. להתראות.');
                return yemotPlayback(res, byeFile);
            }
            // שומרים count ומחזירים תפריט (goToMenu מאפס ל-0, לכן עדכן לאחר מכן)
            let counts = { matches: 0, requests: 0, photos: 0, messages: 0 };
            try { counts = await getMenuCounts(user.id); } catch {}
            await updateSession(enterId, 'menu', { timeoutCount: tc });
            const statusText = buildStatusText(user.gender, counts);
            const menuText   = buildMenuText(user.gender, counts);
            const file = await textToYemot(`${statusText} ${menuText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=1 → הצעות חדשות
        if (key === '1') {
            const [newMatches, totalMatches] = await Promise.all([
                getMatchesForIvr(user.id, 0, 1).catch(() => []),
                countNewMatches(user.id).catch(() => 0)
            ]);
            if (newMatches.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m = newMatches[0];
            await updateSession(enterId, 'matches', { page: 0, currentMatchId: m.id });
            updateTtsLastPlayed(m.id);
            const intro = buildSectionIntro(totalMatches, 'הצעה חדשה', 'הצעות חדשות', 'הצעה ראשונה');
            const mText = buildFullProfileText(m);
            const aText = g(user.gender,
                'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(`${intro}${mText} ${aText}`);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // key=2 → תמונות ממתינות
        if (key === '2') {
            const [photos, totalPhotos] = await Promise.all([
                getPhotoRequestsForIvr(user.id, 0, 1).catch(() => []),
                countPhotoRequests(user.id).catch(() => 0)
            ]);
            if (photos.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות תמונה ממתינות.');
            }
            const photo = photos[0];
            await updateSession(enterId, 'photos', { page: 0, currentRequesterId: photo.requester_id });
            const intro2 = buildSectionIntro(totalPhotos, 'בקשת תמונה', 'בקשות תמונה', 'בקשה ראשונה');
            const pFullName = [photo.last_name, photo.full_name].filter(Boolean).join(' ') || 'ללא שם';
            const pAge   = photo.age  ? `, ${numberToHebrew(photo.age)} שנים` : '';
            const pCity  = photo.city ? `, ${photo.city}` : '';
            const pWord  = photo.gender === 'female' ? 'מבקשת' : 'מבקש';
            const actionsText2 = g(user.gender,
                'הָקֵשׁ אחת לְהַסְכָּמָה. הָקֵשׁ שתיים לִדְחִיָּה. הָקֵשׁ ארבע לפרטים על הַמְּבַקֶּשֶׁת. הָקֵשׁ שמונה לְדִילּוּג. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לְהַסְכָּמָה. הָקִישִׁי שתיים לִדְחִיָּה. הָקִישִׁי ארבע לפרטים על הַמְּבַקֵּשׁ. הָקִישִׁי שמונה לְדִילּוּג. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file2 = await textToYemot(`${intro2}${pFullName}${pAge}${pCity} ${pWord} לראות את תמונתך. ${actionsText2}`);
            return yemotRead(res, file2, 'digits', 1, 1, 8);
        }

        // key=3 → בקשות שידוך שהגיעו אליך
        if (key === '3') {
            const [reqs, totalReqs] = await Promise.all([
                getIncomingRequestsForIvr(user.id, 0, 1).catch(() => []),
                countIncomingRequests(user.id).catch(() => 0)
            ]);
            if (reqs.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות שידוך ממתינות לתשובה.');
            }
            const req = reqs[0];
            await updateSession(enterId, 'requests', { page: 0, currentConnectionId: req.connection_id });
            updateTtsLastPlayed(req.id);
            const intro3  = buildSectionIntro(totalReqs, 'בקשת שידוך', 'בקשות שידוך', 'בקשה ראשונה');
            const reqText = buildFullProfileText(req);
            const actionsText3 = g(user.gender,
                'לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file3 = await textToYemot(`${intro3}${reqText} ${actionsText3}`);
            return yemotRead(res, file3, 'digits', 1, 1, 8);
        }

        // key=4 → בקשות ששלחת שטרם נענו (pending בלבד)
        if (key === '4') {
            const [pending, totalPending] = await Promise.all([
                getPendingSentForIvr(user.id, 0, 1).catch(() => []),
                countPendingSent(user.id).catch(() => 0)
            ]);
            if (pending.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין בקשות ממתינות לתשובה כרגע.');
            }
            const conn4 = pending[0];
            await updateSession(enterId, 'pending_sent', { page: 0, currentConnectionId: conn4.connection_id });
            const intro4 = buildSectionIntro(totalPending, 'פנייה ממתינה לתשובה', 'פניות ממתינות לתשובה', 'פנייה ראשונה');
            const fn4    = [conn4.last_name, conn4.full_name].filter(Boolean).join(' ') || 'ללא שם';
            const age4   = conn4.age  ? `, ${numberToHebrew(conn4.age)} שנים` : '';
            const city4  = conn4.city ? `, ${conn4.city}` : '';
            const actionsText4 = g(user.gender,
                'הָקֵשׁ אחת לביטול הבקשה. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לביטול הבקשה. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file4 = await textToYemot(`${intro4}בקשה ששלחת ל${fn4}${age4}${city4} — טרם נענתה. ${actionsText4}`);
            return yemotRead(res, file4, 'digits', 1, 1, 8);
        }

        // key=5 → שידוכים פעילים — מאתחלים session ומפנים ל-active_sent state (loadNextActive)
        if (key === '5') {
            const totalActive = await countActiveSent(user.id).catch(() => 0);
            await updateSession(enterId, 'active_sent', {
                page: 0,
                totalActive,
                currentConnectionId: null,
                currentConnectionStatus: null,
                currentMyApproved: false,
                inCancelReasonMenu: false
            });
            session.state = 'active_sent';
            session.data  = { page: 0, totalActive };
            // fall through — הקוד שמתחת יטפל
        }

        // key=6 → הודעות חשובות
        if (key === '6') {
            const [messages, totalMsgs] = await Promise.all([
                getMessagesForIvr(user.id, 0, 1).catch(() => []),
                countUnreadMessages(user.id).catch(() => 0)
            ]);
            if (messages.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות חדשות הדורשות תשומת לבך.');
            }
            const msg6 = messages[0];
            const cleanContent6 = cleanMsgForTts(msg6.content);
            const isRefReq6 = msg6.type === 'reference_request';
            let requestId6 = null;
            if (isRefReq6 && msg6.meta) {
                try {
                    const mo = typeof msg6.meta === 'string' ? JSON.parse(msg6.meta) : msg6.meta;
                    requestId6 = mo.requestId || null;
                } catch {}
            }
            await updateSession(enterId, 'messages', {
                page: 0,
                currentMessageId:   msg6.id,
                currentMessageText: cleanContent6,
                currentMessageType: msg6.type || null,
                currentRequestId:   requestId6
            });
            markMessageReadFromIvr(msg6.id, user.id).catch(() => {});
            const intro6 = buildSectionIntro(totalMsgs, 'הודעה חדשה', 'הודעות חדשות', 'הודעה ראשונה');
            const actionsText6 = isRefReq6
                ? g(user.gender,
                    'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק ממליץ. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                    'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק ממליץ. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                )
                : g(user.gender,
                    'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט הראשי.',
                    'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט הראשי.'
                );
            const file6 = await textToYemot(`${intro6}${cleanContent6} ${actionsText6}`);
            return yemotRead(res, file6, 'digits', 1, 1, 8);
        }

        // key=7 → כל ההצעות (כולל ישנות ושדולגו)
        if (key === '7') {
            let allM = [];
            try { allM = await getAllMatchesForIvr(user.id, 0, 1); } catch {}
            if (allM.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הצעות זמינות כרגע.');
            }
            const m7 = allM[0];
            await updateSession(enterId, 'all_matches', { page: 0, currentMatchId: m7.id });
            updateTtsLastPlayed(m7.id);
            const mText7 = buildFullProfileText(m7);
            const aText7 = g(user.gender,
                'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file7 = await textToYemot(`${mText7} ${aText7}`);
            return yemotRead(res, file7, 'digits', 1, 1, 8);
        }

        // key=8 → הודעות אחרונות (7 ימים, קרואות וגם לא)
        if (key === '8') {
            let recentMsgs = [];
            try { recentMsgs = await getRecentMessagesForIvr(user.id, 0, 1); } catch {}
            if (recentMsgs.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות מהשבוע האחרון.');
            }
            const rm = recentMsgs[0];
            const cleanRm = cleanMsgForTts(rm.content);
            let rmRequestId = null;
            if (rm.type === 'reference_request' && rm.meta) {
                try {
                    const metaObj = typeof rm.meta === 'string' ? JSON.parse(rm.meta) : rm.meta;
                    rmRequestId = metaObj.requestId || null;
                } catch {}
            }
            const rmIsRefPending = rm.type === 'reference_request' && rmRequestId
                && (await getReferenceRequestStatus(rmRequestId)) === 'pending';
            await updateSession(enterId, 'recent_messages', {
                page: 0, currentMessageId: rm.id, currentMessageText: cleanRm,
                currentMessageType: rm.type || null,
                currentRequestId: rmIsRefPending ? rmRequestId : null
            });
            const rmAct = rmIsRefPending
                ? g(user.gender,
                    'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                    'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                )
                : g(user.gender,
                    'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                    'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                );
            const rmFile = await textToYemot(`הודעה: ${cleanRm} ${rmAct}`);
            return yemotRead(res, rmFile, 'digits', 1, 1, 8);
        }

        // key=5 שינה את session.state ל-active_sent — נפנה לטיפול בלוק הבא
        if (session.state === 'active_sent') {
            // fall-through לבלוק active_sent שמתחת
        } else if (key && !['1','2','3','4','5','6','7','8','0','#'].includes(key)) {
            return await goToMenu(enterId, user.id, user.gender, res, 'מקש לא מוכר.');
        } else {
            return await goToMenu(enterId, user.id, user.gender, res);
        }
    }

    // ==========================================
    // helper פנימי — טוען הצעה הבאה ומחזיר read
    // prefix = טקסט קצר לפני ההצעה (אישור/דחייה/דילוג)
    // ==========================================
    const loadNextMatch = async (fetchFn, stateName, nextOffset, prefix = '') => {
        let pool = [];
        try { pool = await fetchFn(user.id, nextOffset, 1); } catch {}
        if (pool.length === 0) {
            const endMsg = stateName === 'matches'
                ? (prefix ? `${prefix} סיימת את כל ההצעות החדשות. לעיון בכל ההצעות הָקֵשׁ שבע בתפריט הראשי.` : 'סיימת את כל ההצעות החדשות. לעיון בכל ההצעות הָקֵשׁ שבע בתפריט הראשי.')
                : (prefix || 'סיימת את כל ההצעות הזמינות.');
            return await goToMenu(enterId, user.id, user.gender, res, endMsg);
        }
        const m = pool[0];
        await updateSession(enterId, stateName, { page: nextOffset, currentMatchId: m.id });
        updateTtsLastPlayed(m.id);
        const mText = buildFullProfileText(m);
        const aText = g(user.gender,
            'לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
            'לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
        );
        const fullText = prefix ? `${prefix} ${mText} ${aText}` : `${mText} ${aText}`;
        const file = await textToYemot(fullText);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    };

    // ==========================================
    // helper פנימי — טוען פנייה/בדיקת התאמה הבאה
    // ==========================================
    const loadNextRequest = async (nextOffset, prefix = '') => {
        let pool = [];
        try { pool = await getIncomingRequestsForIvr(user.id, nextOffset, 1); } catch {}
        if (pool.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין עוד בקשות שידוך.');
        }
        const r = pool[0];
        await updateSession(enterId, 'requests', { page: nextOffset, currentConnectionId: r.connection_id });
        updateTtsLastPlayed(r.id);
        const rText = buildFullProfileText(r);
        const aText = g(user.gender,
            'לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
            'לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
        );
        const fullText = prefix ? `${prefix} ${rText} ${aText}` : `בקשת שידוך שהגיעה אליך. ${rText} ${aText}`;
        const file = await textToYemot(fullText);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    };

    // --- מצב: matches — הצעות חדשות ---
    if (session.state === 'matches') {
        const data    = session.data || {};
        let   offset  = parseInt(data.page  || 0, 10);
        const matchId = data.currentMatchId || null;

        // # שולח digits=null — כשיש הצעה מוצגת ו-key ריק → חזרה לתפריט
        if (!key && matchId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה על הצעה קיימת (המשתמש לחץ מקש)
        if (key && matchId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextMatch(getMatchesForIvr, 'matches', offset);

            const nextOffset = offset + 1;
            if (key === '1') {
                let prefix = 'פנייתך נקלטה.';
                try {
                    const r = await sendConnectionFromIvr(user.id, matchId);
                    if (r.status === 'approved_existing') prefix = 'הפנייה אושרה.';
                    console.log(`[IVR] 💌 פנייה/אישור: ${user.id} → ${matchId} (${r.status})`);
                } catch (e) {
                    prefix = 'אירעה תקלה בשליחת הפנייה.';
                    console.error('[IVR] ❌ שגיאה בשליחת פנייה:', e.message);
                }
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, prefix);
            }
            if (key === '8') {
                return await loadNextMatch(getMatchesForIvr, 'matches', nextOffset, '');
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת ההצעה הבאה (כניסה ראשונה)
        return await loadNextMatch(getMatchesForIvr, 'matches', offset);
    }

    // --- מצב: matches_menu — legacy fallback → ישר לתפריט ראשי ---
    if (session.state === 'matches_menu') {
        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // --- מצב: all_matches — כל ההצעות כולל שדולגו ---
    if (session.state === 'all_matches') {
        const data    = session.data || {};
        let   offset  = parseInt(data.page || 0, 10);
        const matchId = data.currentMatchId || null;

        // # / timeout עם הצעה מוצגת → חזרה לתפריט
        if (!key && matchId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && matchId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextMatch(getAllMatchesForIvr, 'all_matches', offset);

            const nextOffset = offset + 1;
            if (key === '1') {
                let prefix = 'פנייתך נקלטה.';
                try {
                    const r = await sendConnectionFromIvr(user.id, matchId);
                    if (r.status === 'approved_existing') prefix = 'הפנייה אושרה.';
                    console.log(`[IVR] 💌 פנייה/אישור (all): ${user.id} → ${matchId} (${r.status})`);
                } catch (e) { prefix = 'אירעה תקלה.'; }
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, prefix);
            }
            if (key === '8') {
                return await loadNextMatch(getAllMatchesForIvr, 'all_matches', nextOffset, '');
            }

            const actionsText = g(user.gender,
                'מקש לא מוכר. לשליחת בקשה הָקֵשׁ אחת. להצעה הבאה הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לשליחת בקשה הָקִישִׁי אחת. להצעה הבאה הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הצעה הבאה (כניסה ראשונה)
        return await loadNextMatch(getAllMatchesForIvr, 'all_matches', offset);
    }

    // --- מצב: requests — בדיקות התאמה שהגיעו אליי ---
    if (session.state === 'requests') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;

        // # / timeout עם פנייה מוצגת → חזרה לתפריט
        if (!key && connId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && connId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            if (key === '9') return await loadNextRequest(offset);

            const nextOffset = offset + 1;
            if (key === '1') {
                const result = await approveRequestFromIvr(connId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הפנייה אושרה.' : 'אירעה תקלה.';
                console.log(`[IVR] ✅ פנייה אושרה: connId=${connId} | userId=${user.id}`);
                return await loadNextRequest(nextOffset, prefix);
            }
            if (key === '2') {
                const result = await rejectRequestFromIvr(connId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הפנייה נדחתה.' : 'אירעה תקלה.';
                console.log(`[IVR] ❌ פנייה נדחתה: connId=${connId} | userId=${user.id}`);
                return await loadNextRequest(nextOffset, prefix);
            }
            if (key === '8') {
                return await loadNextRequest(nextOffset, '');
            }

            const actionsText = g(user.gender,
                'מקש לא מוכר. לאישור הָקֵשׁ אחת. לדחייה הָקֵשׁ שתיים. לדחייה לאחר יותר הָקֵשׁ שמונה. לשמיעה חוזרת הָקֵשׁ תשע. לתפריט הָקֵשׁ אפס.',
                'מקש לא מוכר. לאישור הָקִישִׁי אחת. לדחייה הָקִישִׁי שתיים. לדחייה לאחר יותר הָקִישִׁי שמונה. לשמיעה חוזרת הָקִישִׁי תשע. לתפריט הָקִישִׁי אפס.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הפנייה הבאה (כניסה ראשונה)
        return await loadNextRequest(offset);
    }

    // --- מצב: messages — הודעות חשובות ---
    if (session.state === 'messages') {
        const data      = session.data || {};
        let   offset    = parseInt(data.page || 0, 10);
        const msgId     = data.currentMessageId   || null;
        const msgText   = data.currentMessageText || null;

        // # / timeout עם הודעה מוצגת → חזרה לתפריט
        if (!key && msgId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // פעולה על הודעה שכבר נטענה
        if (key && msgId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            // תגובה לבקשת ממליץ נוסף (מקש 1 = הָקֵשׁ טלפון ממליץ, מקש 2 = לא יכול)
            if (data.currentMessageType === 'reference_request' && data.currentRequestId) {
                if (key === '1') {
                    await updateSession(enterId, 'collecting_ref_phone', {
                        requestId: data.currentRequestId,
                        returnState: 'messages'
                    });
                    const prompt = g(user.gender,
                        'הָקֵשׁ את מספר הטלפון של הממליץ, עשר ספרות.',
                        'הָקִישִׁי את מספר הטלפון של הממליץ, עשר ספרות.'
                    );
                    const promptFile = await textToYemot(prompt);
                    return yemotRead(res, promptFile, 'digits', 11, 9, 5, 'yes');
                }
                if (key === '2') {
                    const result = await respondToReferenceRequestFromIvr(data.currentRequestId, user.id, 'cannot').catch(() => 'error');
                    const pfx = result === 'ok' ? 'תגובתך נשלחה.' : 'אירעה תקלה.';
                    await updateSession(enterId, 'messages', { page: offset + 1, currentMessageType: null, currentRequestId: null });
                    return await goToMenu(enterId, user.id, user.gender, res, pfx);
                }
            }

            // מקש 9 — שמע שוב (מנגן את ההודעה הנוכחית מחדש)
            if (key === '9' && msgText) {
                const isRefReq = data.currentMessageType === 'reference_request';
                const actionsText = isRefReq
                    ? g(user.gender,
                        'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                        'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                    )
                    : g(user.gender,
                        'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט הראשי.',
                        'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט הראשי.'
                    );
                const file = await textToYemot(`${msgText} ${actionsText}`);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            // מקש 8 — הודעה הבאה
            if (key === '8') {
                offset++;
                let nextMsgs = [];
                try { nextMsgs = await getMessagesForIvr(user.id, offset, 1); } catch {}
                if (nextMsgs.length === 0) {
                    return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות נוספות.');
                }
                const nextMsg = nextMsgs[0];
                const nextClean = cleanMsgForTts(nextMsg.content);
                const nextIsRefReq = nextMsg.type === 'reference_request';
                let nextRequestId = null;
                if (nextIsRefReq && nextMsg.meta) {
                    try {
                        const mo = typeof nextMsg.meta === 'string' ? JSON.parse(nextMsg.meta) : nextMsg.meta;
                        nextRequestId = mo.requestId || null;
                    } catch {}
                }
                await updateSession(enterId, 'messages', {
                    page: offset,
                    currentMessageId:   nextMsg.id,
                    currentMessageText: nextClean,
                    currentMessageType: nextMsg.type || null,
                    currentRequestId:   nextRequestId
                });
                markMessageReadFromIvr(nextMsg.id, user.id).catch(() => {});
                const nextAct = nextIsRefReq
                    ? g(user.gender,
                        'הַקֵּשׁ אחת לשליחת מספר הממליץ. הַקֵּשׁ שתיים לציון שאינך יכול לספק. הַקֵּשׁ תשע לשמיעה חוזרת. הַקֵּשׁ שמונה להודעה הבאה. הַקֵּשׁ אפס לתפריט.',
                        'הַקִּישִׁי אחת לשליחת מספר הממליץ. הַקִּישִׁי שתיים לציון שאינך יכולה לספק. הַקִּישִׁי תשע לשמיעה חוזרת. הַקִּישִׁי שמונה להודעה הבאה. הַקִּישִׁי אפס לתפריט.'
                    )
                    : g(user.gender,
                        'הַקֵּשׁ תשע לשמיעה חוזרת. הַקֵּשׁ שמונה להודעה הבאה. הַקֵּשׁ אפס לתפריט הראשי.',
                        'הַקִּישִׁי תשע לשמיעה חוזרת. הַקִּישִׁי שמונה להודעה הבאה. הַקִּישִׁי אפס לתפריט הראשי.'
                    );
                const nextFile = await textToYemot(`הודעה: ${nextClean} ${nextAct}`);
                return yemotRead(res, nextFile, 'digits', 1, 1, 8);
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת ההודעה הבאה
        let messages = [];
        try {
            messages = await getMessagesForIvr(user.id, offset, 1);
        } catch (err) {
            console.error('[IVR] ❌ שגיאה בשליפת הודעות:', err.message);
        }

        if (messages.length === 0) {
            return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות חדשות הדורשות תשומת לבך.');
        }

        const msg = messages[0];

        const cleanContent = cleanMsgForTts(msg.content);

        const isRefReq = msg.type === 'reference_request';
        let requestId = null;
        if (isRefReq && msg.meta) {
            try {
                const metaObj = typeof msg.meta === 'string' ? JSON.parse(msg.meta) : msg.meta;
                requestId = metaObj.requestId || null;
            } catch {}
        }

        await updateSession(enterId, 'messages', {
            page:               offset,
            currentMessageId:   msg.id,
            currentMessageText: cleanContent,
            currentMessageType: msg.type || null,
            currentRequestId:   requestId
        });

        // סמן כנקראה ברגע שהוקראה — לא מחכים ללחיצת 8
        markMessageReadFromIvr(msg.id, user.id).catch(() => {});

        const actionsText = isRefReq
            ? g(user.gender,
                'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק ממליץ. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק ממליץ. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
            )
            : g(user.gender,
                'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט הראשי.',
                'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט הראשי.'
            );
        const file = await textToYemot(`הודעה חדשה: ${cleanContent} ${actionsText}`);
        return yemotRead(res, file, 'digits', 1, 1, 8);
    }

    // --- מצב: photos — ניהול בקשות תמונה ---
    if (session.state === 'photos') {
        const data        = session.data || {};
        let   offset      = parseInt(data.page || 0, 10);
        const requesterId = data.currentRequesterId || null;

        // helper: בנה טקסט בקשת תמונה + אפשרויות
        const buildPhotoText = (ph) => {
            const nm   = buildFullName(ph) || 'ללא שם';
            const ag   = ph.age  ? `, ${numberToHebrew(ph.age)} שנים` : '';
            const ci   = ph.city ? `, ${ph.city}` : '';
            const word = ph.gender === 'female' ? 'מבקשת' : 'מבקש';
            const acts = g(user.gender,
                'הָקֵשׁ אחת לְהַסְכָּמָה. הָקֵשׁ שתיים לִדְחִיָּה. הָקֵשׁ ארבע לפרטים על הַמְּבַקֶּשֶׁת. הָקֵשׁ שמונה לְדִילּוּג. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לְהַסְכָּמָה. הָקִישִׁי שתיים לִדְחִיָּה. הָקִישִׁי ארבע לפרטים על הַמְּבַקֵּשׁ. הָקִישִׁי שמונה לְדִילּוּג. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            return `${nm}${ag}${ci} ${word} לראות את תמונתך. ${acts}`;
        };

        // helper: טעינת הבקשה הבאה ישירות (ללא playback נפרד)
        const loadNextPhoto = async (prefix = '') => {
            let pool2 = [];
            try { pool2 = await getPhotoRequestsForIvr(user.id, offset, 1); } catch {}
            if (pool2.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין עוד בקשות תמונה.');
            }
            const ph = pool2[0];
            await updateSession(enterId, 'photos', { page: offset, currentRequesterId: ph.requester_id });
            const text = (prefix ? prefix + ' ' : '') + buildPhotoText(ph);
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        // # / timeout עם בקשה מוצגת → חזרה לתפריט
        if (!key && requesterId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        // תגובה על בקשה שנטענה
        if (key && requesterId) {
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res);
            }

            // מקש 9 — שמע שוב
            if (key === '9') {
                return await loadNextPhoto();
            }

            // מקש 4 — פרטים על המבקש
            if (key === '4') {
                const photosDetail = await getPhotoRequestsForIvr(user.id, offset, 1).catch(() => []);
                const detailText = photosDetail.length > 0
                    ? buildMatchDetailText(photosDetail[0])
                    : 'אין פרטים נוספים.';
                const actDetail = g(user.gender,
                    'הָקֵשׁ אחת לְהַסְכָּמָה. הָקֵשׁ שתיים לִדְחִיָּה. הָקֵשׁ שמונה לְדִילּוּג. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                    'הָקִישִׁי אחת לְהַסְכָּמָה. הָקִישִׁי שתיים לִדְחִיָּה. הָקִישִׁי שמונה לְדִילּוּג. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
                );
                const fileD = await textToYemot(`${detailText} ${actDetail}`);
                return yemotRead(res, fileD, 'digits', 1, 1, 8);
            }

            if (key === '1') {
                const result = await approvePhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                const prefix = result === 'ok'
                    ? g(user.gender, 'הִסְכַּמְתָּ לְשִׁיתוּף תְּמוּנָתְךָ.', 'הִסְכַּמְתְּ לְשִׁיתוּף תְּמוּנָתֵךְ.')
                    : 'אֵירְעָה תַּקָּלָה.';
                console.log(`[IVR] 📷 תמונה אושרה: requesterId=${requesterId} | userId=${user.id}`);
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto(prefix);
            }
            if (key === '2') {
                const result = await rejectPhotoRequestFromIvr(requesterId, user.id).catch(() => 'error');
                const prefix = result === 'ok' ? 'הַבַּקָּשָׁה נִדְחְתָה.' : 'אֵירְעָה תַּקָּלָה.';
                console.log(`[IVR] 📷 תמונה נדחתה: requesterId=${requesterId} | userId=${user.id}`);
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto(prefix);
            }
            if (key === '8') {
                offset++;
                await updateSession(enterId, 'photos', { page: offset, currentRequesterId: null });
                return await loadNextPhoto();
            }

            // מקש לא מוכר
            const actionsText = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ אחת לְהַסְכָּמָה. הָקֵשׁ שתיים לִדְחִיָּה. הָקֵשׁ ארבע לפרטים. הָקֵשׁ שמונה לְדִילּוּג. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי אחת לְהַסְכָּמָה. הָקִישִׁי שתיים לִדְחִיָּה. הָקִישִׁי ארבע לפרטים. הָקִישִׁי שמונה לְדִילּוּג. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file = await textToYemot(actionsText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        // טעינת הבקשה הראשונה
        return await loadNextPhoto();
    }

    // --- מצב: my_sent — legacy fallback → תפריט ראשי ---
    if (session.state === 'my_sent') {
        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // --- מצב: pending_sent — בקשות ששלחתי שטרם נענו ---
    if (session.state === 'pending_sent') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const connId = data.currentConnectionId || null;

        const loadNextPending = async (prefix = '') => {
            let rows = [];
            try { rows = await getPendingSentForIvr(user.id, offset, 1); } catch {}
            if (rows.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין בקשות ממתינות לתשובה.');
            }
            const c    = rows[0];
            const fn   = [c.last_name, c.full_name].filter(Boolean).join(' ');
            const nameStr = fn || 'ללא שם';
            const ageStr  = c.age  ? `, ${numberToHebrew(c.age)} שנים` : '';
            const cityStr = c.city ? `, ${c.city}` : '';
            await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: c.connection_id });
            const act = g(user.gender,
                'הָקֵשׁ אחת לביטול הבקשה. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'הָקִישִׁי אחת לביטול הבקשה. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const text = `${prefix ? prefix + ' ' : ''}בקשה ששלחת ל${nameStr}${ageStr}${cityStr} — טרם נענתה. ${act}`;
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        if (!key && connId) {
            return await goToMenu(enterId, user.id, user.gender, res);
        }

        if (key && connId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);

            if (key === '9') return await loadNextPending();

            if (key === '1') {
                const result = await cancelSentRequestFromIvr(connId, user.id).catch(() => 'error');
                const pfx = result === 'ok' ? 'הבקשה בוטלה.' : 'אירעה תקלה.';
                offset++;
                await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: null });
                return await loadNextPending(pfx);
            }

            if (key === '8') {
                offset++;
                await updateSession(enterId, 'pending_sent', { page: offset, currentConnectionId: null });
                return await loadNextPending();
            }

            const unknownText = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ אחת לביטול. הָקֵשׁ שמונה להמשך. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי אחת לביטול. הָקִישִׁי שמונה להמשך. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי אפס לתפריט.'
            );
            const file = await textToYemot(unknownText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        return await loadNextPending();
    }

    // --- מצב: active_sent — שידוכים פעילים ---
    if (session.state === 'active_sent') {
        const data       = session.data || {};
        let   offset     = parseInt(data.page || 0, 10);
        const connId     = data.currentConnectionId    || null;
        const connStatus = data.currentConnectionStatus || null;

        const buildBeiurimCard = (c) => {
            const parts = [];
            if (c.father_full_name) parts.push(`שם האב: ${c.father_full_name}`);
            if (c.mother_full_name) parts.push(`שם האם: ${c.mother_full_name}`);
            if (c.reference_1_name) {
                const ph = c.reference_1_phone ? `. טלפון: ${formatPhoneForTts(c.reference_1_phone)}` : '';
                parts.push(`ממליץ ראשון: ${c.reference_1_name}${ph}`);
            }
            if (c.reference_2_name) {
                const ph = c.reference_2_phone ? `. טלפון: ${formatPhoneForTts(c.reference_2_phone)}` : '';
                parts.push(`ממליץ שני: ${c.reference_2_name}${ph}`);
            }
            if (c.rabbi_name) {
                const ph = c.rabbi_phone ? `. טלפון: ${formatPhoneForTts(c.rabbi_phone)}` : '';
                parts.push(`שם הרב או הרבנית: ${c.rabbi_name}${ph}`);
            }
            if (c.full_address) parts.push(`כתובת: ${formatInlineNumbersForTts(c.full_address)}`);
            return parts.length > 0 ? `פרטים לבירורים. ${parts.join('. ')}.` : '';
        };

        const buildCancelReasonPrompt = (approvedAlready) => {
            const ordinals = ['אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש'];
            const hk = g(user.gender, 'הָקֵשׁ', 'הָקִישִׁי');
            const intro = approvedAlready
                ? g(user.gender, 'בחר סיבה לעצירת ההתקדמות.', 'בחרי סיבה לעצירת ההתקדמות.')
                : g(user.gender, 'בחר סיבה לביטול ההצעה.', 'בחרי סיבה לביטול ההצעה.');
            const reasonLines = ACTIVE_CANCEL_REASONS.map((r, i) => `${r}: ${hk} ${ordinals[i]}.`);
            return `${intro} ${reasonLines.join(' ')} לחזרה ${hk} אפס.`;
        };

        const formatViewedDate = (ts) => {
            if (!ts) return null;
            const d = new Date(ts);
            const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
            return `${numberToHebrew(d.getDate())} ב${MONTHS_HE[d.getMonth()]} ${numberToHebrew(d.getFullYear())}`;
        };

        const loadNextActive = async (prefix = '') => {
            let rows = [];
            try { rows = await getActiveSentForIvr(user.id, offset, 1); } catch {}
            if (rows.length === 0) {
                return await goToMenu(enterId, user.id, user.gender, res, prefix || 'אין שידוכים פעילים כרגע.');
            }
            const c    = rows[0];
            // הכרזת כמות רק בכניסה ראשונה לרשימה (offset=0) ואם נשמרה כמות
            if (!prefix && offset === 0 && data.totalActive > 0) {
                prefix = buildSectionIntro(data.totalActive, 'שידוך פעיל', 'שידוכים פעילים', 'שידוך ראשון');
            }
            const fn   = [c.last_name, c.full_name].filter(Boolean).join(' ');
            const nameStr = fn || 'ללא שם';
            const ageStr  = c.age  ? `, ${numberToHebrew(c.age)} שנים` : '';
            const cityStr = c.city ? `, ${c.city}` : '';

            // סימון צפייה ראשונה
            markConnectionViewedFromIvr(c.connection_id, user.id).catch(() => {});

            // חישוב מצב אישורים: מי הנוכחי ומי השני
            const iAmSender  = (c.sender_id === user.id);
            const myApprove    = iAmSender ? c.sender_final_approve   : c.receiver_final_approve;
            const otherApprove = iAmSender ? c.receiver_final_approve : c.sender_final_approve;

            // מגדר הצד השני — לדיוק הגייה
            const otherFemale = c.other_gender === 'female';
            const otherVerb   = (m, f) => otherFemale ? f : m;

            // מתי הצד השני ראה לראשונה
            const otherViewedAt = iAmSender ? c.receiver_first_viewed_at : c.sender_first_viewed_at;
            const otherViewedTxt = otherViewedAt
                ? `${nameStr} ${otherVerb('פתח', 'פתחה')} את פרטי הבירורים לראשונה ב-${formatViewedDate(otherViewedAt)}.`
                : `${nameStr} טרם ${otherVerb('פתח', 'פתחה')} את פרטי הבירורים.`;

            // טקסט סטטוס: שם + גיל + עיר + מצב בירורים
            let statusTxt;
            if (c.status === 'waiting_for_shadchan') {
                statusTxt = `הבירורים עם ${nameStr}${ageStr}${cityStr} בְּטִיפּוּל הַשַּׁדְכָּנִית.`;
            } else {
                // active — מצב אישורים
                let approveTxt;
                if (myApprove && !otherApprove) {
                    approveTxt = g(user.gender,
                        `כְּבָר אִישַּׁרְתָּ הִתְקַדְּמוּת לְשַׁדְכָּנִית. מַחֲכִים לְאִישּׁוּר ${nameStr}.`,
                        `כְּבָר אִישַּׁרְתְּ הִתְקַדְּמוּת לְשַׁדְכָּנִית. מַחֲכִים לְאִישּׁוּר ${nameStr}.`
                    );
                } else if (!myApprove && otherApprove) {
                    approveTxt = `${nameStr} כבר ${otherVerb('אישר', 'אישרה')} התקדמות לשַׁדְּכָנִית ${otherVerb('ומחכה', 'ומחכה')} לאישור שלך.`;
                } else if (myApprove && otherApprove) {
                    approveTxt = `שני הצדדים אישרו — עובר לשַׁדְּכָנִית.`;
                } else {
                    approveTxt = ``;
                }
                statusTxt = [`הגעת לשלב הבירורים עם ${nameStr}${ageStr}${cityStr}.`, approveTxt].filter(Boolean).join(' ');
            }

            await updateSession(enterId, 'active_sent', {
                page: offset,
                currentConnectionId: c.connection_id,
                currentConnectionStatus: c.status,
                currentMyApproved: !!myApprove,
                viewingFullProfile: false,
                inCancelReasonMenu: false
            });

            let text, act;
            if (c.status === 'waiting_for_shadchan') {
                // בטיפול שדכנית — רק הודעת סטטוס + ניווט בסיסי
                act = g(user.gender,
                    'לשמיעה חוזרת הָקֵשׁ תשע. לשידוך הבא הָקֵשׁ שמונה. לתפריט הראשי הָקֵשׁ אפס.',
                    'לשמיעה חוזרת הָקִישִׁי תשע. לשידוך הבא הָקִישִׁי שמונה. לתפריט הראשי הָקִישִׁי אפס.'
                );
                text = [prefix, statusTxt, act].filter(Boolean).join(' ');
            } else {
                // active — מקש 1 רק אם לא אישרתי עדיין
                const canFinalize = !myApprove;
                const cardTxt = [buildBeiurimCard(c), otherViewedTxt].filter(Boolean).join(' ');
                if (canFinalize) {
                    act = g(user.gender,
                        'לאישור ההתקדמות לשלב הַשַּׁדְּכָנִית הָקֵשׁ אחת. לביטול הַפְּנִיָּה הָקֵשׁ שתיים. לבקשת ממליץ נוסף הָקֵשׁ שבע. לשמיעת הפרופיל המלא הָקֵשׁ שש. לשמיעה חוזרת הָקֵשׁ תשע. לשידוך הבא הָקֵשׁ שמונה. לתפריט הראשי הָקֵשׁ אפס.',
                        'לאישור ההתקדמות לשלב הַשַּׁדְּכָנִית הָקִישִׁי אחת. לביטול הַפְּנִיָּה הָקִישִׁי שתיים. לבקשת ממליץ נוסף הָקִישִׁי שבע. לשמיעת הפרופיל המלא הָקִישִׁי שש. לשמיעה חוזרת הָקִישִׁי תשע. לשידוך הבא הָקִישִׁי שמונה. לתפריט הראשי הָקִישִׁי אפס.'
                    );
                } else {
                    // אישרתי כבר — אין מקש 1, יש מקש 2 לעצירה
                    act = g(user.gender,
                        'לבקשת הַפְסָקַת הַהִתְקַדְּמוּת הָקֵשׁ שתיים. לבקשת ממליץ נוסף הָקֵשׁ שבע. לשמיעת הפרופיל המלא הָקֵשׁ שש. לשמיעה חוזרת הָקֵשׁ תשע. לשידוך הבא הָקֵשׁ שמונה. לתפריט הראשי הָקֵשׁ אפס.',
                        'לבקשת הַפְסָקַת הַהִתְקַדְּמוּת הָקִישִׁי שתיים. לבקשת ממליץ נוסף הָקִישִׁי שבע. לשמיעת הפרופיל המלא הָקִישִׁי שש. לשמיעה חוזרת הָקִישִׁי תשע. לשידוך הבא הָקִישִׁי שמונה. לתפריט הראשי הָקִישִׁי אפס.'
                    );
                }
                // פרטי בירורים — רק אם לא אישרתי עדיין
                const shouldPlayCard = !myApprove;
                text = [prefix, statusTxt, shouldPlayCard ? cardTxt : '', act].filter(Boolean).join(' ');
            }
            const file = await textToYemot(text);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        };

        if (!key && connId) return await goToMenu(enterId, user.id, user.gender, res);

        if (key && connId) {
            // תפריט בקשת ממליץ נוסף — בחירת כמות
            if (data.inRefRequestMenu) {
                if (key === '0') {
                    await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: connId, currentConnectionStatus: connStatus, currentMyApproved: !!data.currentMyApproved, inRefRequestMenu: false });
                    return await loadNextActive();
                }

                // בחירת סיבה (count קבוע = 1)
                if (key === '9') {
                    const repeatReason = g(user.gender,
                        'בחר את הסיבה לבקשה. אחת — הממליצים לא ענו. שתיים — הבירורים עם הממליצים טרם הסתיימו. שלוש — מבקש ממליץ שֶׁמַּכִּיר אֶת הַמִּשְׁפָּחָה. לשמיעה חוזרת הָקֵשׁ תשע. לביטול הָקֵשׁ אפס.',
                        'בחרי את הסיבה לבקשה. אחת — הממליצים לא ענו. שתיים — הבירורים עם הממליצים טרם הסתיימו. שלוש — מבקשת ממליץ שֶׁמַּכִּיר אֶת הַמִּשְׁפָּחָה. לשמיעה חוזרת הָקִישִׁי תשע. לביטול הָקִישִׁי אפס.'
                    );
                    const rf = await textToYemot(repeatReason);
                    return yemotRead(res, rf, 'digits', 1, 1, 8);
                }

                const REASON_MAP = { '1': 'no_answer', '2': 'not_enough', '3': 'family_ref' };
                const reason = REASON_MAP[key];
                if (reason) {
                    const result = await requestAdditionalReferenceFromIvr(connId, user.id, 1, reason).catch(() => 'error');
                    const pfx = result === 'ok'
                        ? 'הבקשה לממליץ נוסף נשלחה לצד השני.'
                        : 'אירעה תקלה. אנא נסה שוב מהאתר.';
                    await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: connId, currentConnectionStatus: connStatus, currentMyApproved: !!data.currentMyApproved, inRefRequestMenu: false });
                    return await loadNextActive(pfx);
                }
                const reasonUnknown = g(user.gender,
                    'מקש לא מוכר. אחת — לא ענו. שתיים — הבירורים לא הסתיימו. שלוש — מכר מהמשפחה. לשמיעה חוזרת הָקֵשׁ תשע. לביטול הָקֵשׁ אפס.',
                    'מקש לא מוכר. אחת — לא ענו. שתיים — הבירורים לא הסתיימו. שלוש — מכר מהמשפחה. לשמיעה חוזרת הָקִישִׁי תשע. לביטול הָקִישִׁי אפס.'
                );
                const f = await textToYemot(reasonUnknown);
                return yemotRead(res, f, 'digits', 1, 1, 8);
            }

            if (data.inCancelReasonMenu) {
                if (key === '0') {
                    await updateSession(enterId, 'active_sent', {
                        page: offset,
                        currentConnectionId: connId,
                        currentConnectionStatus: connStatus,
                        currentMyApproved: !!data.currentMyApproved,
                        inCancelReasonMenu: false
                    });
                    return await loadNextActive();
                }
                const reasonIndex = parseInt(key, 10) - 1;
                const reason = ACTIVE_CANCEL_REASONS[reasonIndex];
                if (reason) {
                    const result = await cancelActiveConnectionFromIvr(connId, user.id, reason).catch(() => 'error');
                    const pfx = result === 'ok'
                        ? (data.currentMyApproved
                            ? 'בקשת עצירת ההתקדמות נקלטה ונשלחה לצד השני.'
                            : 'ההצעה בוטלה והודעה נשלחה לצד השני.')
                        : 'אירעה תקלה. אנא נסה שוב מהאתר.';
                    offset++;
                    await updateSession(enterId, 'active_sent', {
                        page: offset,
                        currentConnectionId: null,
                        currentConnectionStatus: null,
                        inCancelReasonMenu: false
                    });
                    return await loadNextActive(pfx);
                }
                const unknownReason = g(user.gender,
                    'מקש לא מוכר. לסיבה הראשונה הָקֵשׁ אחת. לסיבה השנייה הָקֵשׁ שתיים. לסיבה השלישית הָקֵשׁ שלוש. לסיבה הרביעית הָקֵשׁ ארבע. לסיבה החמישית הָקֵשׁ חמש. לאחר הָקֵשׁ שש. לחזרה הָקֵשׁ אפס.',
                    'מקש לא מוכר. לסיבה הראשונה הָקִישִׁי אחת. לסיבה השנייה הָקִישִׁי שתיים. לסיבה השלישית הָקִישִׁי שלוש. לסיבה הרביעית הָקִישִׁי ארבע. לסיבה החמישית הָקִישִׁי חמש. לאחר הָקִישִׁי שש. לחזרה הָקִישִׁי אפס.'
                );
                const file = await textToYemot(unknownReason);
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);
            // מקש 9 — אם היינו בפרופיל המלא, חוזרים לכרטיס הבירורים. אחרת — שמיעה חוזרת
            if (key === '9') {
                await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: connId, currentConnectionStatus: connStatus, viewingFullProfile: false });
                return await loadNextActive();
            }

            // מקש 6 — שמיעת הפרופיל המלא של הצד השני
            if (key === '6') {
                let profileText = '';
                try {
                    const rows = await getActiveSentForIvr(user.id, offset, 1);
                    if (rows.length > 0) {
                        const fullProfile = await getFullProfileForIvr(rows[0].user_id);
                        if (fullProfile) profileText = buildFullProfileText(fullProfile);
                    }
                } catch {}
                if (!profileText) profileText = 'לא נמצא פרופיל מלא.';
                const backAct = g(user.gender,
                    'לשמיעה חוזרת של הפרופיל הָקֵשׁ תשע. לחזרה לפרטי הבירורים הָקֵשׁ אפס.',
                    'לשמיעה חוזרת של הפרופיל הָקִישִׁי תשע. לחזרה לפרטי הבירורים הָקִישִׁי אפס.'
                );
                const file = await textToYemot([profileText, backAct].join(' '));
                await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: connId, currentConnectionStatus: connStatus, viewingFullProfile: true });
                return yemotRead(res, file, 'digits', 1, 1, 10);
            }

            // מקש 1 — אישור התקדמות לשדכנית (רק כשסטטוס active ולא אישרתי עדיין)
            if (key === '1') {
                if (connStatus !== 'active') return await loadNextActive();
                const result = await finalizeConnectionFromIvr(connId, user.id).catch(() => 'error');
                let pfx;
                if (result === 'completed') pfx = g(user.gender,
                    'מעולה. שני הצדדים אישרו — התיק עבר לשַׁדְּכָנִית.',
                    'מעולה. שני הצדדים אישרו — התיק עבר לשַׁדְּכָנִית.'
                );
                else if (result === 'waiting') pfx = g(user.gender,
                    'הָאִישּׁוּר שֶׁלְּךָ נִקְלַט בְּהַצְלָחָה. מַחֲכִים לְאִישּׁוּר שֶׁל הַצַּד הַשֵּׁנִי.',
                    'הָאִישּׁוּר שֶׁלָּךְ נִקְלַט בְּהַצְלָחָה. מַחֲכִים לְאִישּׁוּר שֶׁל הַצַּד הַשֵּׁנִי.'
                );
                else pfx = 'אירעה תקלה. אנא נסה שוב מהאתר.';
                await updateSession(enterId, 'active_sent', {
                    page: offset,
                    currentConnectionId: connId,
                    currentConnectionStatus: connStatus,
                    currentMyApproved: true,
                    inCancelReasonMenu: false
                });
                return await loadNextActive(pfx);
            }

            if (key === '2') {
                const prompt = buildCancelReasonPrompt(!!data.currentMyApproved);
                const file = await textToYemot(prompt);
                await updateSession(enterId, 'active_sent', {
                    page: offset,
                    currentConnectionId: connId,
                    currentConnectionStatus: connStatus,
                    currentMyApproved: !!data.currentMyApproved,
                    inCancelReasonMenu: true
                });
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            // מקש 7 — בקשת ממליץ נוסף (קפיצה ישירה לבחירת סיבה)
            if (key === '7') {
                if (connStatus !== 'active') return await loadNextActive();
                const refPrompt = g(user.gender,
                    'בחר את הסיבה לבקשה. אחת — הממליצים לא ענו. שתיים — הבירורים עם הממליצים טרם הסתיימו. שלוש — מבקש ממליץ שֶׁמַּכִּיר אֶת הַמִּשְׁפָּחָה. לשמיעה חוזרת הָקֵשׁ תשע. לביטול הָקֵשׁ אפס.',
                    'בחרי את הסיבה לבקשה. אחת — הממליצים לא ענו. שתיים — הבירורים עם הממליצים טרם הסתיימו. שלוש — מבקשת ממליץ שֶׁמַּכִּיר אֶת הַמִּשְׁפָּחָה. לשמיעה חוזרת הָקִישִׁי תשע. לביטול הָקִישִׁי אפס.'
                );
                const file = await textToYemot(refPrompt);
                await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: connId, currentConnectionStatus: connStatus, currentMyApproved: !!data.currentMyApproved, inRefRequestMenu: true, refRequestStep: 'reason' });
                return yemotRead(res, file, 'digits', 1, 1, 8);
            }

            if (key === '8') {
                offset++;
                await updateSession(enterId, 'active_sent', { page: offset, currentConnectionId: null });
                return await loadNextActive();
            }
            const unknownText = g(user.gender,
                data.currentMyApproved
                    ? 'מקש לא מוכר. הָקֵשׁ שתיים לבקשת הפסקת ההתקדמות. הָקֵשׁ שבע לממליץ נוסף. הָקֵשׁ שש לפרופיל המלא. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה לשידוך הבא. הָקֵשׁ אפס לתפריט הראשי.'
                    : 'מקש לא מוכר. הָקֵשׁ אחת לאישור ההתקדמות. הָקֵשׁ שתיים לביטול הפנייה. הָקֵשׁ שבע לממליץ נוסף. הָקֵשׁ שש לפרופיל המלא. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה לשידוך הבא. הָקֵשׁ אפס לתפריט הראשי.',
                data.currentMyApproved
                    ? 'מקש לא מוכר. הָקִישִׁי שתיים לבקשת הפסקת ההתקדמות. הָקִישִׁי שבע לממליץ נוסף. הָקִישִׁי שש לפרופיל המלא. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה לשידוך הבא. הָקִישִׁי אפס לתפריט הראשי.'
                    : 'מקש לא מוכר. הָקִישִׁי אחת לאישור ההתקדמות. הָקִישִׁי שתיים לביטול הפנייה. הָקִישִׁי שבע לממליץ נוסף. הָקִישִׁי שש לפרופיל המלא. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה לשידוך הבא. הָקִישִׁי אפס לתפריט הראשי.'
            );
            const file = await textToYemot(unknownText);
            return yemotRead(res, file, 'digits', 1, 1, 8);
        }

        return await loadNextActive();
    }

    // --- מצב: recent_messages — הודעות אחרונות (7 ימים, קרואות וגם לא) ---
    if (session.state === 'recent_messages') {
        const data   = session.data || {};
        let   offset = parseInt(data.page || 0, 10);
        const msgId  = data.currentMessageId   || null;
        const msgTxt = data.currentMessageText || null;

        if (!key && msgId) return await goToMenu(enterId, user.id, user.gender, res);

        if (key && msgId) {
            if (key === '0') return await goToMenu(enterId, user.id, user.gender, res);

            if (data.currentMessageType === 'reference_request' && data.currentRequestId) {
                if (key === '1') {
                    await updateSession(enterId, 'collecting_ref_phone', {
                        requestId: data.currentRequestId,
                        returnState: 'recent_messages'
                    });
                    const prompt = g(user.gender,
                        'הָקֵשׁ את מספר הטלפון של הממליץ, עשר ספרות.',
                        'הָקִישִׁי את מספר הטלפון של הממליץ, עשר ספרות.'
                    );
                    const promptFile = await textToYemot(prompt);
                    return yemotRead(res, promptFile, 'digits', 11, 9, 5, 'yes');
                }
                if (key === '2') {
                    await respondToReferenceRequestFromIvr(data.currentRequestId, user.id, 'cannot').catch(() => {});
                    return await goToMenu(enterId, user.id, user.gender, res, 'תגובתך נשלחה.');
                }
            }

            if (key === '9' && msgTxt) {
                const isRefPending = data.currentMessageType === 'reference_request' && data.currentRequestId
                    && (await getReferenceRequestStatus(data.currentRequestId)) === 'pending';
                const act9 = isRefPending
                    ? g(user.gender,
                        'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                        'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                    )
                    : g(user.gender,
                        'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                        'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                    );
                const f9 = await textToYemot(`${msgTxt} ${act9}`);
                return yemotRead(res, f9, 'digits', 1, 1, 8);
            }

            if (key === '8') {
                offset++;
                let nextMsgs = [];
                try { nextMsgs = await getRecentMessagesForIvr(user.id, offset, 1); } catch {}
                if (nextMsgs.length === 0) return await goToMenu(enterId, user.id, user.gender, res, 'אין הודעות נוספות.');
                const nm = nextMsgs[0];
                const nc = cleanMsgForTts(nm.content);
                let nmRequestId = null;
                if (nm.type === 'reference_request' && nm.meta) {
                    try {
                        const metaObj = typeof nm.meta === 'string' ? JSON.parse(nm.meta) : nm.meta;
                        nmRequestId = metaObj.requestId || null;
                    } catch {}
                }
                const nmIsRefPending = nm.type === 'reference_request' && nmRequestId
                    && (await getReferenceRequestStatus(nmRequestId)) === 'pending';
                await updateSession(enterId, 'recent_messages', {
                    page: offset, currentMessageId: nm.id, currentMessageText: nc,
                    currentMessageType: nm.type || null,
                    currentRequestId: nmIsRefPending ? nmRequestId : null
                });
                const na = nmIsRefPending
                    ? g(user.gender,
                        'הָקֵשׁ אחת לשליחת מספר הממליץ. הָקֵשׁ שתיים לציון שאינך יכול לספק. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                        'הָקִישִׁי אחת לשליחת מספר הממליץ. הָקִישִׁי שתיים לציון שאינך יכולה לספק. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                    )
                    : g(user.gender,
                        'הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                        'הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
                    );
                const nf = await textToYemot(`הודעה: ${nc} ${na}`);
                return yemotRead(res, nf, 'digits', 1, 1, 8);
            }

            const ua = g(user.gender,
                'מקש לא מוכר. הָקֵשׁ תשע לשמיעה חוזרת. הָקֵשׁ שמונה להודעה הבאה. הָקֵשׁ אפס לתפריט.',
                'מקש לא מוכר. הָקִישִׁי תשע לשמיעה חוזרת. הָקִישִׁי שמונה להודעה הבאה. הָקִישִׁי אפס לתפריט.'
            );
            const uf = await textToYemot(ua);
            return yemotRead(res, uf, 'digits', 1, 1, 8);
        }

        return await goToMenu(enterId, user.id, user.gender, res);
    }

    // --- מצב: collecting_ref_phone — קבלת מספר טלפון של ממליץ ---
    if (session.state === 'collecting_ref_phone') {
        const data        = session.data || {};
        const requestId   = data.requestId   || null;
        const returnState = data.returnState  || 'messages';

        if (!requestId) return await goToMenu(enterId, user.id, user.gender, res, 'אירעה תקלה.');

        // ── שלב ב: אישור המספר ──
        // pendingPhone מוגדר → המשתמש כבר הזין מספר ואנחנו מחכים לאישור
        if (data.pendingPhone) {
            const phoneForTts = formatPhoneForTts(data.pendingPhone);

            const confirmText = (base) =>
                `${base} ${phoneForTts}. לאישור הָקֵשׁ אחת. להזנה מחדש הָקֵשׁ שתיים. לביטול הָקֵשׁ אפס.`;
            const confirmTextF = (base) =>
                `${base} ${phoneForTts}. לאישור הָקִישִׁי אחת. להזנה מחדש הָקִישִׁי שתיים. לביטול הָקִישִׁי אפס.`;

            // אישור
            if (key === '1') {
                const result = await respondToReferenceRequestFromIvr(requestId, user.id, 'provide', data.pendingPhone).catch(() => 'error');
                if (result === 'error' || result === 'not_found') {
                    return await goToMenu(enterId, user.id, user.gender, res, 'אירעה תקלה בשמירת התגובה.');
                }
                return await goToMenu(enterId, user.id, user.gender, res,
                    `תגובתך נשלחה. מספר הממליץ שנשמר: ${phoneForTts}.`
                );
            }

            // הזנה מחדש
            if (key === '2') {
                await updateSession(enterId, 'collecting_ref_phone', { requestId, returnState, pendingPhone: null });
                const rePrompt = g(user.gender,
                    'הָקֵשׁ את מספר הטלפון, עשר ספרות.',
                    'הָקִישִׁי את מספר הטלפון, עשר ספרות.'
                );
                const f = await textToYemot(rePrompt);
                return yemotRead(res, f, 'digits', 11, 9, 5, 'yes');
            }

            // ביטול
            if (key === '0') {
                return await goToMenu(enterId, user.id, user.gender, res, 'הפעולה בוטלה.');
            }

            // timeout / מקש לא מוכר → חזור על שאלת האישור
            const unknownPrefix = key ? 'מקש לא מוכר.' : '';
            const repeatConfirm = g(user.gender,
                confirmText(`${unknownPrefix} המספר שהזנת:`),
                confirmTextF(`${unknownPrefix} המספר שהזנת:`)
            );
            const fc = await textToYemot(repeatConfirm);
            return yemotRead(res, fc, 'digits', 1, 1, 10);
        }

        // ── שלב א: קבלת הקלט ──
        if (!key) {
            // timeout — לא התקבל שום קלט
            const prompt = g(user.gender,
                'לא התקבל מספר. הָקֵשׁ את מספר הטלפון של הממליץ, עשר ספרות.',
                'לא התקבל מספר. הָקִישִׁי את מספר הטלפון של הממליץ, עשר ספרות.'
            );
            const f = await textToYemot(prompt);
            return yemotRead(res, f, 'digits', 11, 9, 5, 'yes');
        }

        const digits = key.replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 11 || !digits.startsWith('0')) {
            const errPrompt = g(user.gender,
                'מספר לא תקין. הָקֵשׁ שוב מספר טלפון ישראלי בן עשר ספרות.',
                'מספר לא תקין. הָקִישִׁי שוב מספר טלפון ישראלי בן עשר ספרות.'
            );
            const f = await textToYemot(errPrompt);
            return yemotRead(res, f, 'digits', 11, 9, 5, 'yes');
        }

        // מספר תקין → שמור כ-pending ועבור לאישור
        await updateSession(enterId, 'collecting_ref_phone', { requestId, returnState, pendingPhone: digits });
        const phoneForTts = formatPhoneForTts(digits);
        const confirmPrompt = g(user.gender,
            `המספר שהזנת: ${phoneForTts}. לאישור הָקֵשׁ אחת. להזנה מחדש הָקֵשׁ שתיים. לביטול הָקֵשׁ אפס.`,
            `המספר שהזנת: ${phoneForTts}. לאישור הָקִישִׁי אחת. להזנה מחדש הָקִישִׁי שתיים. לביטול הָקִישִׁי אפס.`
        );
        const fc = await textToYemot(confirmPrompt);
        return yemotRead(res, fc, 'digits', 1, 1, 10);
    }

    // מצב לא מוכר — חזרה לתפריט (בטוח יותר מניתוק)
    console.warn(`[IVR] ⚠️ session state לא מוכר: ${session.state} — מאפס לתפריט`);
    return await goToMenu(enterId, user.id, user.gender, res);
});

// ==========================================
// GET /ivr/hangup — ניתוק (לוג בלבד כרגע)
// ==========================================
router.get('/hangup', async (req, res) => {
    const { phone, enter_id } = req.query;
    console.log(`[IVR] 📵 ניתוק | phone: ${phone}`);
    // לוגינג משך שיחה ב-ivr_logs
    try {
        const sessRow = await pool.query(
            `SELECT user_id, created_at FROM ivr_sessions WHERE enter_id = $1`,
            [enter_id]
        );
        if (sessRow.rowCount > 0) {
            const { user_id, created_at } = sessRow.rows[0];
            const durationSec = Math.round((Date.now() - new Date(created_at).getTime()) / 1000);
            await pool.query(
                `INSERT INTO ivr_logs (user_id, caller_phone, call_duration_seconds, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [user_id, phone || null, durationSec > 0 ? durationSec : null]
            );
        }
    } catch (e) {
        console.error('[IVR hangup log]', e.message);
    }
    return res.type('text').send('ok');
});

module.exports = router;
