# התקנת PostgreSQL מקומי — לביצוע בהמשך

## שלב 1 — הורדה
- גש ל: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- הורד גרסה **16.x** עמודת **חלונות x86-64** (החץ הכחול)

## שלב 2 — התקנה
- הפעל את הקובץ שהורדת
- לחץ Next בכל השלבים
- **סיסמה:** בחר סיסמה ורשום אותה כאן: `__________`
- **פורט:** 5432 (ברירת מחדל)
- אחרי סיום — **בטל** את Stack Builder

## שלב 3 — עדכון .env
פתח `.env` בשורש הפרויקט ועדכן:
```
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=the_register
DB_PASSWORD=הסיסמה_שבחרת
DB_PORT=5432
```

## שלב 4 — אתחול מסד
```powershell
npm run db:setup
```

## שלב 5 — הרצת שרת
```powershell
npm start
```
בדוק: http://localhost:3000/status
