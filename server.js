const cors = require('cors');
const express = require('express');
const pool = require('./db');
const app = express();

app.use(express.json());
app.use(cors());
const port = 3000;

// --- נתיב בדיקה כללי ---
app.get('/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT COUNT(*) FROM users');
        res.send(`השרת עובד! יש במערכת ${dbRes.rows[0].count} משתמשים.`);
    } catch (err) {
        res.status(500).send('תקלה בחיבור למסד הנתונים');
    }
});

// --- תיקון לבעיית ה-0 משתמשים בדף הבית ---
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        // מחזיר את המספר בפורמט שהדף מצפה לו
        res.json({ totalUsers: result.rows[0].count });
    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ message: "שגיאת שרת" });
    }
});

// --- כניסה (Login) - תוקן לשליפת כל הנתונים ---
app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        // הכוכבית (*) קריטית כדי לטעון גם את המגדר וההעדפות
        const result = await pool.query(
            'SELECT * FROM users WHERE phone = $1 AND password = $2',
            [phone, password]
        );
        if (result.rows.length > 0) {
            res.json({ user: result.rows[0] });
        } else {
            res.status(401).json({ message: "טלפון או סיסמה שגויים" });
        }
    } catch (err) {
        res.status(500).send("שגיאת שרת");
    }
});

// --- הרשמה (Register) ---
app.post('/register', async (req, res) => {
    const { phone, password, full_name } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (phone, password, full_name, is_approved, is_admin) VALUES ($1, $2, $3, false, false) RETURNING id, full_name',
            [phone, password, full_name]
        );
        res.status(201).json({ message: "הרישום בוצע בהצלחה", user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: "המספר כבר רשום" });
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

// --- עדכון פרופיל (Update) - תוקן לשמירת מגדר וחיפוש ---
app.put('/update-profile', async (req, res) => {
    console.log("נתונים שהתקבלו לעדכון:", req.body); // לוג לבדיקה

    const { 
        phone, fullName, age, sector, height, gender, 
        search_min_age, search_max_age, search_sector 
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET 
                full_name = $1, 
                age = $2, 
                sector = $3, 
                height = $4, 
                gender = $5, 
                search_min_age = $6, 
                search_max_age = $7, 
                search_sector = $8 
             WHERE phone = $9 RETURNING *`,
            [
                fullName,       // $1
                age,            // $2
                sector,         // $3
                height,         // $4
                gender,         // $5 - זה מה שהיה חסר קודם!
                search_min_age, // $6
                search_max_age, // $7
                search_sector,  // $8
                phone           // $9
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        res.json({ message: "הפרופיל עודכן בהצלחה!", user: result.rows[0] });

    } catch (err) {
        console.error("❌ שגיאה בעדכון הפרופיל:", err.message);
        res.status(500).json({ message: "שגיאה בשמירת הנתונים בשרת" });
    }
});

// --- שידוכים (Matches) ---
app.get('/matches', async (req, res) => {
    const { gender, search_sector, search_min_age, search_max_age, myAge, currentPhone } = req.query;

    try {
        const result = await pool.query(
            `SELECT full_name, age, height, sector, phone, gender FROM users 
             WHERE 
                phone != $1 AND is_approved = true
                AND gender != $2
                AND ($3::text IS NULL OR $3 = '' OR sector = $3)
                AND age >= $4 AND age <= $5
                AND search_min_age <= $6 AND search_max_age >= $6`,
            [currentPhone, gender, search_sector, search_min_age, search_max_age, myAge]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("❌ שגיאה בשידוכים:", err.message);
        res.status(500).json({ message: "תקלה בטעינת השידוכים" });
    }
});

// --- ניהול (Admin) ---
app.get('/admin/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, phone, full_name, age, sector, height, is_approved FROM users WHERE is_admin = false ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

app.put('/admin/approve/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [id]);
        res.json({ message: "אושר" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

app.listen(port, () => {
    console.log(`🚀 שרת השידוכים רץ: http://localhost:${port}/status`);
});