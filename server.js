const express = require('express');
const pool = require('./db'); // אנחנו מייבאים את החיבור שיצרנו ב-db.js
const app = express();
app.use(express.json()); // מאפשר לשרת לקרוא מידע שנשלח בפורמט JSON
const port = 3000;

// המלצר מקשיב לבקשות בכתובת localhost:3000/status
app.get('/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT COUNT(*) FROM users');
        const count = dbRes.rows[0].count;
        res.send(`השרת עובד! כרגע יש במערכת ${count} משתמשים.`);
    } catch (err) {
        res.status(500).send('תקלה בשרת');
    }
});

const bcrypt = require('bcrypt'); // תוסיף את זה למעלה

app.post('/register', async (req, res) => {
    const { phone, password } = req.body;
    
    try {
        // ערבול הסיסמה - 10 זה רמת ה"קושי" של הערבול
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await pool.query(
            'INSERT INTO users (phone, password) VALUES ($1, $2) RETURNING id',
            [phone, hashedPassword] // שומרים את הסיסמה המעורבלת!
        );
        res.status(201).json({ message: 'משתמש נוצר בבטחה!', id: newUser.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).send('שגיאה ברישום');
    }
});

app.post('/create-profile', async (req, res) => {
    const { user_id, first_name, last_name, gender, birth_date, height_cm, sector, occupation } = req.body;

    try {
        const newProfile = await pool.query(
            `INSERT INTO user_profiles 
            (user_id, first_name, last_name, gender, birth_date, height_cm, sector, occupation) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [user_id, first_name, last_name, gender, birth_date, height_cm, sector, occupation]
        );
        res.status(201).json({ message: 'הפרופיל נוצר בהצלחה!', profile: newProfile.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('שגיאה ביצירת הפרופיל');
    }
});

app.get('/user-full-details/:id', async (req, res) => {
    const userId = req.params.id; // לוקח את ה-ID מכתובת ה-URL

    try {
        const fullDetails = await pool.query(
            `SELECT u.phone, up.first_name, up.last_name, up.sector, up.occupation
             FROM users u
             JOIN user_profiles up ON u.id = up.user_id
             WHERE u.id = $1`,
            [userId]
        );

        if (fullDetails.rows.length === 0) {
            return res.status(404).send('משתמש לא נמצא או שטרם מילא פרופיל');
        }

        res.json(fullDetails.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('שגיאה בשליפת הנתונים');
    }
});

app.listen(port, () => {
    console.log(`🚀 השרת רץ בכתובת: http://localhost:${port}/status`);
});