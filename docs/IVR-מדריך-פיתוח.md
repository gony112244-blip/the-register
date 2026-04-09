# מדריך פיתוח IVR — כל מה שצריך לפני שמתחילים

**מסמך זה מכיל:** ידע טכני, עלויות, מה קיים ומה צריך לבנות, סדר עדיפויות.  
**קרא לפני כל שיחה עם ספק חיצוני ולפני כל שורת קוד.**

---

## חלק א׳ — ספקים חיצוניים ועלויות

---

### 1. ימות המשיח (ספק ה-IVR)

**אתר:** [www.call2all.co.il](https://www.call2all.co.il)  
**טלפון:** 072-3972927  
**מיועד ל:** קהל חרדי, תאימות לקווים כשרים.

#### מה הם נותנים
- **מספר טלפון ייעודי** (חיוג נכנס בלבד)
- **API JSON מלא** — Webhooks דו-כיווניים (GET מהם → JSON מאיתנו)
- **ניהול שיחה:** timeout, קלט DTMF (הקשות), ניתוק

---

#### IP Whitelist — חובה בשרת ✅ (מאושר מימות משיח)

יש לאפשר ב-`pinkas.cloud` (port 443) בקשות נכנסות **רק** מהכתובות:

| כתובת IP |
|----------|
| `10.168.9.41` |
| `91.108.232.128` |
| `10.168.1.102` |
| `82.210.17.149` |

**הגדרה ב-Nginx** (לחסום כל IP אחר לנתיב `/ivr/`):
```nginx
location /ivr/ {
    allow 10.168.9.41;
    allow 91.108.232.128;
    allow 10.168.1.102;
    allow 82.210.17.149;
    deny all;
    proxy_pass http://localhost:3000;
}
```

---

#### פרוטוקול תקשורת — מאושר סופית ✅

| פרט | ערך מאושר |
|-----|-----------|
| מודל | Routing V2 — JSON API, שימוש עצמי (חינמי) |
| כתובת callback | `https://pinkas.cloud/ivr/call` |
| זיהוי מתקשר | `req.query.phone` — פורמט מקומי `0541234567` (תואם ל-DB, אין המרה) |
| token | `req.query.token` — Query String בלבד (ימות משיח **לא** תומכים ב-Custom Headers) |
| timeout מומלץ | **פחות מ-5 שניות** לחוויה חלקה |
| timeout מקסימלי | **20 שניות** — אחריו: `timeout_goto` → שלוחת שגיאה מוקלטת |
| Fallback | הגדרת `timeout_goto` **בצד ימות משיח** → קובץ שגיאה מוקלט מראש |
| Barge-in | **נתמך** דרך פקודת `read` — משתמש יכול להקיש `5` לדלג |
| השמעת MP3 | ימות משיח **מושכים ישירות** מ-URL שלנו (HTTPS) |

---

#### כיצד הממשק עובד טכנית

```
[משתמש מחייג למספר הפנקס]
      ↓
[ימות משיח מקבלים שיחה]
      ↓
[GET → https://pinkas.cloud/ivr/call?phone=054XXXXXXX&token=<ivr_service_token>]
      ↓
[שרת מחזיר JSON — מומלץ תוך 2 שניות, מותר עד 20]
      ↓
[ימות משיח מושכים MP3 מה-URL שלנו ומנגנים]
      ↓
[הקשה → GET חדש עם digits=X]
```

---

#### פורמט תגובות JSON ✅

**השמעת קובץ בלבד:**
```json
{ "action": "playback", "file": "https://pinkas.cloud/ivr-audio/static/welcome.mp3" }
```

**השמעת קובץ + קבלת הקשה (עם barge-in):**
```json
{
  "action": "read",
  "file": "https://pinkas.cloud/ivr-audio/dynamic/menu_main_123.mp3",
  "numDigits": 1,
  "timeout": 8
}
```

**ניתוק:**
```json
{ "action": "hangup" }
```

> **barge-in:** בגלל ש-`read` נתמך תוך כדי השמעה — מקש `5` יכול לקצר הקראת פרופיל ארוך.  
> השרת מקבל `digits=5` ומדלג ישר לתפריט הפעולות.

---

#### עלויות — מאושר ✅

| פריט | מצב |
|------|-----|
| **API (Routing V2)** | **חינם** — שימוש עצמי |
| קו ודקות שיחה | **בירור מנהלתי בפתיחת חשבון** |

---

### 2. Google Cloud Text-to-Speech (TTS)

**אתר:** [cloud.google.com/text-to-speech](https://cloud.google.com/text-to-speech)

> ⚠️ **החלטה קריטית — לא לשנות:**  
> **לא** משתמשים ב-TTS הפנימי של ימות משיח — הוא יקר ואיכותו נמוכה.  
> **הארכיטקטורה:** השרת שלנו מייצר MP3 דרך Google TTS → שומר ב-Cache → שולח URL ב-JSON לימות משיח → ימות משיח **רק מנגנים** את הקובץ.  
> זה חוסך עלויות משמעותיות לעומת TTS של הספק.

#### מה זה ולמה אנחנו צריכים
הקראה של טקסט עברי בקול אנושי-נוירלי. ימות משיח **לא** מספקים TTS בעברית ברמה טובה.

#### עלויות

| סוג | מחיר (2026) |
|-----|------------|
| **Standard voices** | $4 לכל מיליון תווים |
| **Neural2 / WaveNet** | $16 לכל מיליון תווים |
| **Free tier** | **מיליון תווים ראשונים לחודש — חינם** (Standard) / 1M Neural — חינם |

#### חישוב עלות ריאלית למערכת שלנו
- פרופיל ממוצע = ~200 תווים
- 1,000 שיחות/חודש × ~10 הקראות = 10,000 × 200 = **2M תווים**
- בניכוי Cache (>80% hit rate): ~400K תווים בפועל
- **עלות: $0–$6/חודש** (פחות מ-25 ₪)

#### הגדרה

1. **צור חשבון Google Cloud:** [console.cloud.google.com](https://console.cloud.google.com)
2. פתח Project חדש: `hapinkas-ivr`
3. הפעל את API: `Cloud Text-to-Speech API`
4. צור **Service Account** → הורד `credentials.json`
5. קבע משתנה סביבה בשרת: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json`

#### ספריית Node.js

```bash
npm install @google-cloud/text-to-speech
```

#### קוד דוגמה

```javascript
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();

async function generateAudio(text, outputFile) {
  const request = {
    input: { text },
    voice: { languageCode: 'he-IL', ssmlGender: 'FEMALE', name: 'he-IL-Neural2-A' },
    audioConfig: { audioEncoding: 'MP3' },
  };
  const [response] = await client.synthesizeSpeech(request);
  require('fs').writeFileSync(outputFile, response.audioContent, 'binary');
}
```

#### קולות עבריים זמינים (2026)

| שם | מין | סגנון |
|----|-----|-------|
| `he-IL-Neural2-A` | נקבה | טבעי, מומלץ |
| `he-IL-Neural2-B` | זכר | טבעי |
| `he-IL-Standard-A` | נקבה | בסיסי, זול יותר |

---

### 3. תשתית שרת (כבר קיים)

| רכיב | מצב |
|------|-----|
| Ubuntu 24.04 @ `pinkas.cloud` (187.124.168.26) | ✅ קיים |
| Node.js + PM2 (`hapinkas`) | ✅ קיים |
| PostgreSQL | ✅ קיים |
| `https://pinkas.cloud` | ✅ (לבדוק שיש SSL — ימות משיח דורשים HTTPS) |

---

## חלק ב׳ — מה כבר קיים בקוד

---

### API Endpoints קיימים שה-IVR ישתמש בהם

כל ה-endpoints הבאים **כבר קיימים ב-`server.js`** ועובדים:

| פעולה | Endpoint | הערות |
|-------|----------|-------|
| שליפת הצעות | `GET /matches` | מחזיר רשימת משתמשים תואמים |
| שליחת פנייה | `POST /connect` | |
| ביטול פנייה pending | `POST /cancel-request` | |
| בקשות נכנסות | `GET /my-requests` | `status=pending, receiver=אני` |
| אישור בקשה | `POST /approve-request` | |
| דחיית בקשה | `POST /reject-request` | |
| פניות שיצאו | `GET /my-sent-requests` + `GET /my-connections` | |
| אישור סופי | `POST /finalize-connection` | |
| ביטול חיבור פעיל | `POST /cancel-active-connection` | |
| בקשות תמונה | `GET /pending-photo-requests` | |
| אישור/דחיית תמונה | `POST /respond-photo-request` | |
| שליחת בקשת תמונה | `POST /request-photo-access` | |
| הסתרת הצעה | `POST /api/hide-profile` | |
| שליפת הודעות | `GET /my-messages` | צריך לסנן לפי type |

### מה ה-IVR צריך לדמות ל-Webhook

כל קריאה מה-IVR תצטרף לשרת עם header ייעודי:
```
Authorization: Bearer <IVR_SERVICE_TOKEN>
```
השרת יזהה שזה IVR (לא משתמש רגיל) ויאמת לפי `phone` (Caller ID) במקום JWT.

---

## חלק ג׳ — מה צריך לבנות

---

### 3.1 — שינויים ב-DB (לרוץ דרך `updateDbSchema`)

```sql
-- טבלת users — הוספת שדות IVR
ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_pin VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_ivr_no_pass BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_blocked_until TIMESTAMP;

-- טבלת זיכרון שיחה (session)
CREATE TABLE IF NOT EXISTS ivr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    last_menu VARCHAR(50),
    last_item_id INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- טבלת לוג שיחות (BI)
CREATE TABLE IF NOT EXISTS ivr_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    caller_phone VARCHAR(20),
    call_duration_seconds INTEGER,
    drop_point_menu VARCHAR(50),
    actions_taken JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- סנכרון "נשמע בטלפון"
CREATE TABLE IF NOT EXISTS ivr_match_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    viewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, viewed_user_id)
);

-- עמודה בconnections
ALTER TABLE connections ADD COLUMN IF NOT EXISTS last_accessed_platform VARCHAR(10) DEFAULT 'web';
```

---

### 3.2 — קבצים חדשים לכתוב

| קובץ | תיאור |
|------|--------|
| `ivr/router.js` | כל נתיבי ה-IVR (`/ivr/call`, `/ivr/action`, `/ivr/hangup`) |
| `ivr/auth.js` | אימות Caller ID + PIN, חסימת ניסיונות |
| `ivr/tts.js` | Google TTS + Cache מקומי |
| `ivr/phonetic-map.json` | מילון תעתיק: `pending` → "ממתין לתשובה" |
| `ivr/menus/` | תפריט ראשי + כל תת-תפריט (קובץ לכל תפריט) |
| `ivr/session.js` | שמירה/טעינה של `ivr_sessions` |

---

### 3.3 — Cache קבצי אודיו

```
uploads/
  ivr-audio/
    static/       ← קבצים קבועים (welcome, menu, numbers)
    dynamic/      ← קבצים לפי hash+user_id
```

**אסטרטגיית שמות קבצים דינמיים:**
```
dynamic/{hash(text)}_{user_id}_{updated_at_epoch}.mp3
```
כשפרופיל מתעדכן (`updated_at` משתנה) → hash חדש → קובץ ישן מוחלף אוטומטית.

**ניקוי cache:** cron שמוחק קבצים ישנים מ-30 יום (חיסכון בדיסק).

---

### 3.4 — נתיבי IVR לשרת (skeleton)

```javascript
// ivr/router.js
const express = require('express');
const router = express.Router();

// Webhook ראשי — ימות משיח מתקשרים כאן בכל אינטראקציה
router.get('/call', ivrAuthMiddleware, async (req, res) => {
    const { caller, key, digit } = req.query;
    // ...לוגיקת תפריטים
});

// Webhook ניתוק — לוג + שמירת session
router.get('/hangup', ivrAuthMiddleware, async (req, res) => {
    // שמירת ivr_logs
    res.json({ status: 'ok' });
});

module.exports = router;
```

```javascript
// ב-server.js
const ivrRouter = require('./ivr/router');
app.use('/ivr', ivrRouter);
```

---

### 3.5 — פיסוק טקסט לפני TTS

```javascript
function addProsodicPunctuation(text) {
    // אחרי פסיק ממילא יש השהיה — להוסיף פסיקים לפני "גיל", "מ-", "עיר"
    return text
        .replace(/,\s*/g, ', ')
        .replace(/\b(גיל|עיר|ישיבה|סמינר|מוסד)\b/g, ', $1');
}
```

---

### 3.6 — הגדרות PIN באתר (פרונט)

יש להוסיף ל-`Profile.jsx` (בלשונית הגדרות):

```jsx
{/* הגדרות IVR */}
<div className="ivr-settings">
  <h3>כניסה מהטלפון</h3>
  <input type="password" placeholder="קוד PIN חדש (4 ספרות)" maxLength={4} />
  <label>
    <input type="checkbox" /> אפשר כניסה מהירה ממכשיר זה (ללא PIN)
  </label>
  <button onClick={saveIvrPin}>שמור</button>
</div>
```

API נדרש בשרת:
- `POST /ivr-settings` — שמירת PIN + allow_ivr_no_pass

---

## חלק ד׳ — סדר פיתוח מומלץ (MVP)

---

| שלב | מה עושים | זמן משוער |
|-----|----------|-----------|
| **1** | פתיחת חשבון ימות משיח + קבלת מספר טלפון | 1–3 ימי עסקים |
| **2** | הגדרת Google Cloud TTS + credentials בשרת | 2–4 שעות |
| **3** | שינויי DB (`updateDbSchema`) | 1 שעה |
| **4** | `ivr/tts.js` — מנוע TTS + Cache | 3–5 שעות |
| **5** | `ivr/auth.js` — Caller ID + PIN | 3–4 שעות |
| **6** | Webhook ראשי + תפריט ראשי + מבזק סטטוס | 4–6 שעות |
| **7** | תפריט 1 — הצעות חדשות (לולאה) | 4–6 שעות |
| **8** | תפריט 2 — בקשות נכנסות | 3–4 שעות |
| **9** | תפריט 3 — סטטוס פניות יוצאות | 3–4 שעות |
| **10** | תפריט 4 — ניהול תמונות | 2–3 שעות |
| **11** | תפריט 5 — הודעות מסוננות | 2–3 שעות |
| **12** | תפריט 9 — שינוי PIN | 2–3 שעות |
| **13** | Session management + reconnect flow | 3–4 שעות |
| **14** | `ivr_logs` + חיבור ל-`activity_log` | 2 שעות |
| **15** | הגדרות IVR ב-Profile (פרונט) | 3–4 שעות |
| **16** | בדיקות קצה-לקצה + phonetic-map | 4–6 שעות |
| **סה"כ** | | **~45–65 שעות פיתוח** |

---

## חלק ה׳ — עלות חודשית כוללת (הערכה)

| שירות | עלות חודשית |
|-------|------------|
| ימות משיח — מספר + שיחות | ~100–300 ₪ (תלוי בנפח) |
| Google Cloud TTS | $0–$6 (~0–25 ₪) עם Cache |
| שרת (כבר קיים) | 0 ₪ נוסף |
| **סה"כ** | **~100–325 ₪/חודש** |

---

## חלק ו׳ — נקודות דגש ואזהרות

---

### אבטחה

- **IVR_SERVICE_TOKEN:** קבע token סודי. ימות משיח שולחים אותו בכל Webhook. השרת מאמת שהוא נכון לפני כל עיבוד.  
  ```env
  IVR_SERVICE_TOKEN=your_secret_token_here
  ```
- **חסימת PIN:** 3 כשלונות → חסם ל-30 דקות. שמור `ivr_failed_attempts` + `ivr_blocked_until` ב-DB.
- **HTTPS חובה:** ימות משיח שולחים Webhooks רק ל-HTTPS. לוודא שיש SSL תקף ב-`pinkas.cloud`.

### TTS

- כל הטקסטים **שעוברים לפרופיל** מכילים תווי Unicode עברי — לבדוק שה-encoding תקין (UTF-8) בקובץ MP3.
- **בדוק את הקולות** לפני שמתחילים: `he-IL-Neural2-A` נשמע טוב יותר אבל עולה יותר מ-Standard.
- **אל תשלח ל-TTS** ערכים כמו `NULL`, מחרוזות ריקות, או ערים לא מוכרות — יגרמו ל-fallback.

### ימות משיח

- פרוטוקול ה-Webhook שלהם — תמיד `GET` (לא `POST`). הפרמטרים בקוורי סטרינג.
- בדוק אם יש **IP whitelist** שצריך להגדיר בשרת (קבל מהם רשימת IPs).
- שאל מהם על **זמן timeout ל-Webhook** — כמה שניות הם מחכים לתגובת השרת (בד"כ 3–5 שניות).

### Cache

- `uploads/ivr-audio/` חייב להיות **נגיש דרך HTTP** מהשרת (ימות משיח יצטרכו להוריד קבצים).
- **אל תשמור** קבצי שמע ב-Git — ה-`.gitignore` כבר מתעלם מ-`uploads/`.

---

## חלק ז׳ — phonetic-map.json (גרסה ראשונית)

```json
{
  "pending": "ממתין לתשובה",
  "active": "פעיל",
  "waiting_for_shadchan": "בטיפול שדכנית",
  "rejected": "הצעה שנסגרה",
  "cancelled": "בוטל",
  "haredi": "חרדי",
  "dati_leumi": "דתי לאומי",
  "masorti": "מסורתי",
  "baal_teshuva": "בעל תשובה",
  "ת\"ת": "תלמוד תורה",
  "ל\"ת": "ליטאי",
  "חב\"ד": "חַבָּד",
  "פוניבז'": "פוני-בז",
  "single": "רווק",
  "divorced": "גרוש",
  "widower": "אלמן",
  "studying": "לומד",
  "working": "עובד",
  "both": "לומד ועובד",
  "thin": "רזה",
  "average": "ממוצע",
  "full": "מלא",
  "IVR": "מערכת טלפונית"
}
```

---

## חלק ח׳ — שאלות לימות המשיח

### נענו ✅
1. ~~פורמט Webhook?~~ → GET, פרמטרים: `phone` (מקומי), `digits`, `token`
2. ~~Timeout?~~ → 3–4 שניות מומלץ, עד **20 שניות** מותר
3. ~~IP whitelist?~~ → `10.168.9.41`, `91.108.232.128`, `10.168.1.102`, `82.210.17.149`
4. ~~פורמט תגובה?~~ → JSON: `action: playback / read / hangup`
5. ~~MP3 — URL ישיר או העלאה?~~ → **ימות משיח מושכים מ-URL שלנו ישירות**
6. ~~Barge-in?~~ → **כן, נתמך דרך `read`**
7. ~~עלות API?~~ → **חינם (Routing V2, שימוש עצמי)**
8. ~~Callback URL?~~ → **`https://pinkas.cloud/ivr/call`**

### נענו ✅ (המשך)
9. ~~עלות קו?~~ → ~50–100 ₪/חודש + עלות דקה (לסגור מול נציג מכירות)
10. ~~Retry / timeout?~~ → **ניתוק אוטומטי** אחרי 20 שניות — יש להשמיע fallback מוקלט מראש לפני כן
11. ~~`ivr_service_token` — איך מגיע?~~ → **Query string**: `?token=xxx` → `req.query.token` ב-Node.js

### כל השאלות הטכניות נענו ✅

**המתנה יחידה לפני פיתוח: הוצאת קו מימות המשיח.**  
ברגע שיש מספר טלפון פעיל — מתחילים.

---

*נכתב: אפריל 2026 — על בסיס `IVR-אפיון-סופי.md` + ניתוח `server.js`*
