const cors = require('cors');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());
app.use(cors());
const port = 3000;

// בדיקת סטטוס
app.get('/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT COUNT(*) FROM users');
        res.send(`השרת עובד! יש במערכת ${dbRes.rows[0].count} משתמשים.`);
    } catch (err) {
        res.status(500).send('תקלה בחיבור למסד הנתונים');
    }
});

// שלב 1: רישום ראשוני (טלפון וסיסמה)
app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (phone, password) VALUES ($1, $2) RETURNING id',
            [phone, hashedPassword]
        );
        res.status(201).json({ message: 'נרשמת בהצלחה!', id: newUser.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'שגיאה: ייתכן והמספר כבר קיים' });
    }
});

// שלב 2: עדכון פרטי פרופיל (שם, גיל, מגזר)
app.put('/update-profile', async (req, res) => {
    const { phone, fullName, age, sector, height } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET full_name = $1, age = $2, sector = $3, height = $4 WHERE phone = $5 RETURNING *",
            [fullName, age, sector, height, phone]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "לא מצאנו משתמש עם הטלפון הזה" });
        }

        res.json({ message: "הפרופיל עודכן!", user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "שגיאה בעדכון הנתונים" });
    }
});

app.listen(port, () => {
    console.log(`🚀 שרת השידוכים רץ: http://localhost:${port}/status`);
});