# מבנה מסד הנתונים (PostgreSQL) — הפנקס

מסמך זה מיועד **לתיעוד ולמפתחים**. הוא **אינו** נטען על ידי האתר בזמן ריצה — שינוי בקובץ לא משפיע על השרת.

## מקורות אמת בקוד

| מקור | תפקיד |
|------|--------|
| `database_recovery.sql` | סכמת בסיס לפרויקט חדש (יצירת טבלאות עיקריות) |
| `updateDbSchema()` ב־`server.js` | רץ בעת עליית השרת: יוצר טבלאות חסרות, מוסיף עמודות ואינדקסים (`IF NOT EXISTS`) |

אם יש סתירה בין מסמך זה לבין הקוד — **הקוד הוא המכריע**.

---

## טבלאות פעילות (בשימוש האפליקציה)

| טבלה | תיאור |
|------|--------|
| `users` | משתמשים, פרופיל מלא, העדפות חיפוש, אימות מייל, סיסמה וכו׳ |
| `connections` | פניות / קשרים בין משתמשים (pending, active, rejected, waiting_for_shadchan וכו׳) |
| `matches` | שידוכים מנוהלים (אם קיימים ב-DB מהסקריפט הראשוני) |
| `messages` | הודעות בין משתמשים + סוגים (מערכת, מנהל, בקשת תמונה וכו׳); עמודת `meta` (JSONB) |
| `notifications` | התראות למשתמש |
| `photo_approvals` | בקשות צפייה בתמונות (מבקש ↔ יעד) |
| `hidden_profiles` | פרופילים שהוסתרו («סל המיחזור»); ייתכן עמודת `reason` |
| `user_images` | תמונות פרופיל נפרדות (מאושרות/נדחות וכו׳) |
| `activity_log` | לוג פעילות (אירועים למנהל) |
| `reference_requests` | בקשות ממליצים נוספים בתוך קשר |
| `user_blocks` | חסימות בין משתמשים |
| `support_tickets` / `support_replies` | פניות תמיכה ותשובות |
| `shadchaniot` | רשימת שדכניות; קישור מ־`connections.shadchanit_id` |

---

## טבלאות שלא מופיעות בקוד הנוכחי

טבלאות כמו `user_profiles` או `user_references` **אינן בשימוש** בקבצי ה-JS של הפרויקט (אין התאמה בקוד). אם הן קיימות ב-DB ישן — הן legacy ולא חלק מהלוגיקה הנוכחית.

---

## `users` — קבוצות עמודות (תמצית)

העמודות המלאות מוגדרות ב־`database_recovery.sql` ומתעדכנות ב־`updateDbSchema()`. בין השאר:

- **זיהוי והתחברות:** `phone`, `email`, `password`, `is_admin`, `is_approved`, `is_blocked`, `blocked_reason`, `created_at`, `last_login`
- **אימות מייל:** `is_email_verified`, `email_verification_code`, `email_notifications_enabled`, `never_ask_email`, `email_skip_verification`, `verify_reminder_sent`
- **איפוס סיסמה:** `reset_password_code`, `reset_password_expires` (נוספים בזרימת forgot-password)
- **פרטים אישיים:** `full_name`, `last_name`, `age`, `birth_date`, `gender`, `height`, `city`, `status`, ילדים, מראה, עיסוק, לימודים, טקסטים חופשיים (`about_me`, `home_style`, וכו׳)
- **משפחה ורקע:** `family_background`, `heritage_sector`, שדות הורים, אחים, ממליצים, רב, מחותנים
- **חיפוש (העדפות):** `search_min_age`, `search_max_age`, `search_height_min`, `search_height_max`, רשימות מופרדות ב־TEXT (מופעי גוף, מראה, סטטוסים, רקעים וכו׳), `search_heritage_sectors`, `search_occupations`, `search_life_aspirations`, `mixed_heritage_ok`, `search_financial_min`, `search_financial_discuss`
- **כיסוי ראש (נוסף ב־schema):** `head_covering`, `search_head_covering`
- **תמונות ות״ז:** `profile_images`, `profile_images_count`, `id_card_image_url`, שדות קשורים לאימות ת״ז לפי הסקריפט
- **עריכה ממתינה לאישור מנהל:** `is_profile_pending`, `pending_changes` (JSONB), `pending_changes_at`, `profile_edit_count`, `admin_notes`

> **הערה:** שמות כמו `sector` לעומת `heritage_sector` — בקוד ובסקריפט השחזור משתמשים ב־`heritage_sector` / `search_sector` לפי ההגדרות ב-SQL; אל תסמוך על שמות ישנים במסמכים היסטוריים.

---

## `connections` — הרחבות מעבר לבסיס

בנוסף ל־`sender_id`, `receiver_id`, `status`, אישורים סופיים, חותמות זמן:

- `shadchanit_id` — קישור ל־`shadchaniot`
- `match_succeeded`, `fail_reason`, `close_summary`, `closed_at` — סגירת תיק שידוך

---

## `photo_approvals`

- `requester_id`, `target_id`, `status`
- `connection_id`, `auto_approve`, `updated_at` (נוספים ב־`updateDbSchema`)

---

## `user_images`

- `user_id`, `image_url`
- `is_approved`, `uploaded_at`, `approved_at`, `rejected_at`, `rejection_reason`

---

## `messages`

- `from_user_id`, `to_user_id`, `content`, `type`, `is_read`, `created_at`
- `meta` (JSONB) — מטא־דאטה (למשל קישור לבקשות)

---

## `hidden_profiles`

- `user_id`, `hidden_user_id`, `created_at`
- `reason` (נוסף דרך `ALTER` בשרת, אם רלוונטי)

---

## `activity_log`

- `user_id`, `action`, `target_user_id`, `actor_id`, `note`, `created_at`

---

## `support_tickets` / `support_replies`

- כרטיס: משתמש, שם, מייל, טלפון, נושא, הודעה, סטטוס, זמנים
- תשובה: `ticket_id`, `sender_type`, `message`, `created_at`

---

## `reference_requests`

- `connection_id`, `requester_id`, `reason`, `count`, `status`, `created_at`

---

## `user_blocks`

- `blocker_id`, `blocked_id`, `created_at` (ייחודיות על הזוג)

---

## אינדקסים לביצועים

חלק מהאינדקסים נוצרים ב־`updateDbSchema()` (למשל על `connections`, `hidden_profiles`, `user_blocks`, `photo_approvals`, `users` לפי מגדר/אישור/חסימה). פרטים — בקוד.

---

## שחזור / התקנה מחדש

ליצירת מסד מאפס ראו `database_recovery.sql` ואז הרצת השרת כדי להשלים עמודות וטבלאות דרך `updateDbSchema()`.

---

*עדכון מסמך: אפריל 2026 — מסונכרן עם עקרונות `server.js` (פונקציית `updateDbSchema`) ו־`database_recovery.sql`.*
