# 📊 מבנה הדאטאבייס - מערכת שידוכים
## DATABASE SCHEMA - The Register

---

## 🔷 טבלה: `users` (משתמשים ראשיים)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `phone` | varchar(20) | NOT NULL | מספר טלפון (ייחודי) |
| `password` | varchar(255) | NOT NULL | סיסמה מוצפנת |
| `full_name` | text | - | שם מלא |
| `age` | integer | - | גיל |
| `gender` | text | - | מגדר (male/female) |
| `height` | numeric(5,2) | - | גובה |
| `sector` | text | - | מגזר |
| `is_admin` | boolean | false | האם מנהל |
| `is_approved` | boolean | false | האם מאושר ע"י מנהל |
| `is_active` | boolean | true | האם פעיל במערכת |
| `is_identity_approved` | boolean | false | האם זהות מאומתת |
| `created_at` | timestamp | now() | תאריך יצירה |
| `last_login` | timestamp | now() | כניסה אחרונה |
| **העדפות חיפוש** |||
| `search_min_age` | integer | - | גיל מינימלי לחיפוש |
| `search_max_age` | integer | - | גיל מקסימלי לחיפוש |
| `search_sector` | text | - | מגזר מועדף |
| **ממליצים ובירורים** |||
| `reference_1_name` | varchar(100) | - | שם ממליץ 1 |
| `reference_1_phone` | varchar(20) | - | טלפון ממליץ 1 |
| `reference_2_name` | varchar(100) | - | שם ממליץ 2 |
| `reference_2_phone` | varchar(20) | - | טלפון ממליץ 2 |
| `rabbi_name` | varchar(100) | - | שם הרב |
| `rabbi_phone` | varchar(20) | - | טלפון הרב |
| **פרטים מורחבים** |||
| `personal_status` | varchar(20) | - | מצב אישי |
| `children_count` | integer | 0 | מספר ילדים |
| `father_ethnic` | varchar(50) | - | עדת האב |
| `mother_ethnic` | varchar(50) | - | עדת האם |
| `family_style` | varchar(50) | - | סגנון משפחה |
| `occupation_detail` | text | - | פרטי עיסוק |
| **איש קשר** |||
| `contact_person_name` | varchar(100) | - | שם איש קשר |
| `contact_phone_1` | varchar(20) | - | טלפון איש קשר 1 |
| `contact_phone_2` | varchar(20) | - | טלפון איש קשר 2 |
| **אימות זהות** |||
| `real_id_number` | varchar(15) | - | מספר ת.ז. |
| `id_card_image_url` | text | - | תמונת ת.ז. |
| `full_address` | text | - | כתובת מלאה |
| `health_declaration` | text | - | הצהרת בריאות |
| **עריכות** |||
| `edit_requests_count` | integer | 0 | מונה שינויים |
| `last_edit_request_at` | timestamp | - | תאריך עריכה אחרונה |

---

## 🔷 טבלה: `connections` (קשרים בין משתמשים)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `sender_id` | integer | FK→users | מי שלח את הבקשה |
| `receiver_id` | integer | FK→users | מי קיבל את הבקשה |
| `status` | varchar(20) | 'pending' | סטטוס: pending/active/rejected/waiting_for_shadchan |
| `sender_final_approve` | boolean | false | אישור סופי של השולח |
| `receiver_final_approve` | boolean | false | אישור סופי של המקבל |
| `last_action_by` | integer | FK→users | מי עשה פעולה אחרונה |
| `created_at` | timestamp | now() | תאריך יצירה |
| `updated_at` | timestamp | now() | תאריך עדכון |

---

## 🔷 טבלה: `matches` (שידוכים מנוהלים)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `boy_id` | integer | FK→users | מזהה הבחור |
| `girl_id` | integer | FK→users | מזהה הבחורה |
| `status` | varchar(50) | 'proposal' | סטטוס השידוך |
| `boy_saw_photo` | boolean | false | האם הבחור ראה תמונה |
| `girl_saw_photo` | boolean | false | האם הבחורה ראתה תמונה |
| `shadchan_internal_notes` | text | - | הערות פנימיות לשדכנית |
| `started_at` | timestamp | now() | תאריך התחלה |
| `ended_at` | timestamp | - | תאריך סיום |

**UNIQUE:** לא יכולים להיות שני שידוכים פעילים בין אותם אנשים (boy_id + girl_id)

---

## 🔷 טבלה: `user_images` (תמונות משתמשים)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `user_id` | integer | FK→users | מזהה משתמש |
| `image_url` | text | NOT NULL | קישור לתמונה |
| `created_at` | timestamp | now() | תאריך העלאה |

---

## 🔷 טבלה: `notifications` (התראות)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `user_id` | integer | FK→users | למי ההתראה |
| `title` | varchar(100) | - | כותרת |
| `message` | text | - | תוכן ההודעה |
| `is_read` | boolean | false | האם נקראה |
| `created_at` | timestamp | now() | תאריך יצירה |

---

## 🔷 טבלה: `user_profiles` (פרופילים מורחבים - לא בשימוש?)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `user_id` | integer | FK→users | מזהה משתמש |
| `first_name` | varchar(50) | NOT NULL | שם פרטי |
| `last_name` | varchar(50) | NOT NULL | שם משפחה |
| `gender` | varchar(10) | NOT NULL | מגדר |
| `birth_date` | date | NOT NULL | תאריך לידה |
| `height_cm` | integer | - | גובה בס"מ |
| `sector` | varchar(50) | - | מגזר |
| `occupation` | varchar(50) | - | עיסוק |

⚠️ **הערה:** טבלה זו מכילה שדות שכבר קיימים בטבלת `users` - ייתכן ומיותרת.

---

## 🔷 טבלה: `user_references` (ממליצים - טבלה נפרדת)

| עמודה | סוג | ברירת מחדל | תיאור |
|-------|-----|------------|-------|
| `id` | integer | AUTO | מזהה ייחודי |
| `user_id` | integer | FK→users | מזהה משתמש |
| `name` | varchar(100) | - | שם הממליץ |
| `phone` | varchar(20) | - | טלפון הממליץ |
| `relation` | varchar(50) | - | סוג הקשר (רב, שבט, חבר...) |

⚠️ **הערה:** טבלת `users` כבר מכילה שדות ממליצים - ייתכן כפילות.

---

## 🔗 יחסי גומלין (Foreign Keys)

```
connections.sender_id → users.id
connections.receiver_id → users.id
connections.last_action_by → users.id
matches.boy_id → users.id
matches.girl_id → users.id
user_images.user_id → users.id
notifications.user_id → users.id
user_profiles.user_id → users.id
user_references.user_id → users.id
```

---

## ⚠️ בעיות זוהו

1. **כפילות מידע:** `user_profiles` מכיל שדות שגם קיימים ב-`users`
2. **כפילות ממליצים:** `user_references` וגם שדות ממליצים ב-`users`
3. **שתי מערכות קשרים:** `connections` ו-`matches` - לבדוק אם שתיהן נחוצות

---

*עדכון אחרון: 2026-02-01*
