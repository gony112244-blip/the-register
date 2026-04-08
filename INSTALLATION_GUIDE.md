# 📥 מדריך התקנה - PostgreSQL ושחזור מסד הנתונים

## שלב 1: התקנת PostgreSQL (15-20 דקות)

### הורדה והתקנה

1. **הורד את PostgreSQL:**
   - גש ל: https://www.postgresql.org/download/windows/
   - לחץ על "Download the installer"
   - בחר את הגרסה העדכנית ביותר (PostgreSQL 16.x)
   - הורד את ה-installer ל-Windows x86-64

2. **הרץ את ההתקנה:**
   - הפעל את הקובץ שהורדת (postgresql-16.x-windows-x64.exe)
   - לחץ Next בכל השלבים
   
3. **הגדרות חשובות בהתקנה:**
   
   **📍 Installation Directory:**
   ```
   C:\Program Files\PostgreSQL\16
   ```
   (השאר כברירת מחדל)
   
   **📍 Select Components:**
   ✅ PostgreSQL Server
   ✅ pgAdmin 4
   ✅ Command Line Tools
   ✅ Stack Builder (אופציונלי)
   
   **📍 Data Directory:**
   ```
   C:\Program Files\PostgreSQL\16\data
   ```
   (השאר כברירת מחדל)
   
   **📍 Password:**
   ```
   הזן סיסמה חזקה עבור המשתמש postgres
   ⚠️ חשוב! זכור את הסיסמה הזו - תצטרך אותה!
   ```
   
   **📍 Port:**
   ```
   5432
   ```
   (השאר כברירת מחדל)
   
   **📍 Locale:**
   ```
   [Default locale]
   ```

4. **סיום ההתקנה:**
   - לחץ Next עד הסוף
   - אפשר לבטל את Stack Builder (לא נחוץ)

---

## שלב 2: בדיקת ההתקנה

פתח **PowerShell חדש** (חשוב! סגור את הישן) והרץ:

```powershell
psql --version
```

אם אתה רואה משהו כמו `psql (PostgreSQL) 16.x` - ההתקנה הצליחה! ✅

**אם זה לא עובד:**
1. סגור את PowerShell
2. פתח PowerShell **חדש** (כדי לטעון את ה-PATH)
3. נסה שוב

---

## שלב 3: הגדרת קובץ .env

עדכן את הקובץ `.env` בפרויקט:

```env
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=the_register
DB_PASSWORD=הסיסמה_שהזנת_בהתקנה
DB_PORT=5432
JWT_SECRET=superSecretKey123

# הגדרות מייל (אפשר להשאיר כמו שזה)
EMAIL_SERVICE=gmail
EMAIL_USER=hapinkas.contact@gmail.com
EMAIL_PASS=dkvx njre fdcm plig
```

⚠️ **חשוב:** החלף את `הסיסמה_שהזנת_בהתקנה` בסיסמה האמיתית שהגדרת!

---

## שלב 4: הרצת שחזור מסד הנתונים

לאחר שהתקנת את PostgreSQL, הרץ:

```powershell
npm run db:setup
```

הסקריפט יבצע:
1. ✅ יצירת מסד נתונים חדש `the_register`
2. ✅ יצירת כל 7 הטבלאות
3. ✅ הוספת משתמש admin ראשוני
4. ✅ אימות שהכל עובד

---

## שלב 5: הפעלת השרת

```powershell
npm start
```

בדוק ב: http://localhost:3000/status

אם אתה רואה "השרת עובד ומחובר!" - הכל מוכן! 🎉

---

## 🔄 גיבוי אוטומטי (מומלץ מאוד!)

### גיבוי ידני
```powershell
npm run db:backup
```

### גיבוי אוטומטי יומי (Windows Task Scheduler)

1. פתח **Task Scheduler** (חפש ב-Start)
2. לחץ "Create Basic Task"
3. שם: "The Register Daily Backup"
4. Trigger: Daily, בשעה 02:00
5. Action: Start a program
   - Program: `C:\Program Files\nodejs\npm.cmd`
   - Arguments: `run db:backup`
   - Start in: `C:\Users\מיכל\Desktop\the-register`
6. Finish

---

## ❓ פתרון בעיות

### בעיה: "psql is not recognized"
**פתרון:** 
1. סגור את PowerShell
2. פתח PowerShell **חדש**
3. אם עדיין לא עובד, הוסף ידנית ל-PATH:
   ```
   C:\Program Files\PostgreSQL\16\bin
   ```

### בעיה: "password authentication failed"
**פתרון:**
- ודא שהסיסמה ב-`.env` זהה לזו שהזנת בהתקנה
- נסה לאפס סיסמה דרך pgAdmin 4

### בעיה: "database does not exist"
**פתרון:**
- הרץ `npm run db:setup` - זה יוצר את המסד אוטומטית

### בעיה: "port 5432 already in use"
**פתרון:**
- כנראה PostgreSQL כבר רץ
- בדוק ב-Services (services.msc) שהשירות postgresql-x64-16 רץ

---

## 📞 צריך עזרה?

אם משהו לא עובד:
1. העתק את הודעת השגיאה המלאה
2. שלח לי אותה
3. אפתור את זה מיד!

---

**זמן משוער כולל: 30-40 דקות**
- התקנת PostgreSQL: 15-20 דקות
- הרצת שחזור: 2-3 דקות
- בדיקות: 5 דקות
