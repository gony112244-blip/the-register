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
        // הוספתי כאן את "id" בהתחלה - זה הקריטי!
        const result = await pool.query(
            `SELECT id, full_name, age, height, sector, phone, gender FROM users 
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


// --- נתיב יצירת קשר (שליחת "לייק") ---
app.post('/connect', async (req, res) => {
    const { myId, targetId } = req.body; // מקבלים: מי אני (myId) ולמי אני פונה (targetId)

    try {
        // 1. בדיקת חסימה: האם אני כרגע "תפוס" בשידוך פעיל וטרי?
        // אנחנו בודקים אם יש שורה שבה אני מעורב, הסטטוס הוא 'active', וזה קרה ב-24 שעות האחרונות
        const checkBlock = await pool.query(
            `SELECT * FROM connections 
             WHERE (sender_id = $1 OR receiver_id = $1) 
             AND status = 'active' 
             AND updated_at > NOW() - INTERVAL '24 hours'`,
            [myId]
        );

        // אם מצאנו שורה כזו - המשתמש חסום!
        if (checkBlock.rows.length > 0) {
            return res.status(400).json({ 
                message: "🚫 יש לך התאמה פעילה! עליך לסיים אותה או להמתין 24 שעות." 
            });
        }

        // 2. בדיקה כפולה: האם כבר פניתי לאדם הזה בעבר? (כדי לא לשלוח פעמיים)
        const checkDuplicate = await pool.query(
            `SELECT * FROM connections 
             WHERE sender_id = $1 AND receiver_id = $2`,
            [myId, targetId]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(400).json({ message: "כבר שלחת פנייה למשתמש זה בעבר." });
        }

        // 3. אם הכל תקין - רושמים את ההצעה ביומן!
        // הסטטוס יהיה 'pending' (ממתין) באופן אוטומטי בגלל הגדרת ברירת המחדל בטבלה
        await pool.query(
            `INSERT INTO connections (sender_id, receiver_id) VALUES ($1, $2)`,
            [myId, targetId]
        );

        res.json({ message: "🎉 הפנייה נשלחה בהצלחה! ממתינים לתשובה." });

    } catch (err) {
        console.error("Connection error:", err);
        res.status(500).json({ message: "שגיאה ביצירת הקשר" });
    }
});


// --- 1. שליפת בקשות נכנסות (Inbox) ---
app.get('/my-requests', async (req, res) => {
    const { userId } = req.query;

    try {
        // שיעור ה-JOIN: אנחנו שולפים את פרטי השידוך (c) ואת פרטי המשתמש השולח (u)
        const result = await pool.query(
            `SELECT 
                c.id AS connection_id, 
                c.created_at,
                u.full_name, 
                u.age, 
                u.height, 
                u.sector, 
                u.gender 
             FROM connections c
             JOIN users u ON c.sender_id = u.id  -- החיבור הקסום!
             WHERE c.receiver_id = $1 AND c.status = 'pending'`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ message: "שגיאה בטעינת בקשות" });
    }
});

// --- 2. אישור בקשה (מתחילים שידוך!) ---
app.post('/approve-request', async (req, res) => {
    const { connectionId, userId } = req.body;

    try {
        // עדכון הסטטוס ל-active, ורישום ש"אני" ביצעתי את הפעולה האחרונה
        await pool.query(
            `UPDATE connections 
             SET status = 'active', updated_at = NOW(), last_action_by = $1
             WHERE id = $2`,
            [userId, connectionId]
        );
        res.json({ message: "🎉 השידוך אושר! עכשיו שניכם יכולים לראות פרטים מלאים." });
    } catch (err) {
        console.error("Error approving:", err);
        res.status(500).json({ message: "שגיאה באישור השידוך" });
    }
});

// --- 3. דחיית בקשה ---
app.post('/reject-request', async (req, res) => {
    const { connectionId } = req.body;

    try {
        // אנחנו משנים את הסטטוס ל-rejected (כדי לשמור היסטוריה)
        await pool.query(
            `UPDATE connections SET status = 'rejected' WHERE id = $1`,
            [connectionId]
        );
        res.json({ message: "הבקשה הוסרה בהצלחה." });
    } catch (err) {
        console.error("Error rejecting:", err);
        res.status(500).json({ message: "שגיאה בדחיית השידוך" });
    }
});


// --- שליפת שידוכים פעילים (החדר המאובטח) ---
app.get('/my-connections', async (req, res) => {
    const { userId } = req.query;

    try {
        // שאילתה חכמה: תביא לי את הפרטים של הצד *השני* בשידוך
        // (אם אני השולח -> תביא את המקבל. אם אני המקבל -> תביא את השולח)
        const result = await pool.query(
            `SELECT 
                c.id AS connection_id,
                c.updated_at, -- מתי השידוך אושר (בשביל הטיימר)
                u.full_name,
                u.age,
                u.phone, -- הנה הזהב! הטלפון נחשף
                u.reference_1_name, -- ממליץ 1
                u.reference_1_phone,
                u.reference_2_name, -- ממליץ 2
                u.reference_2_phone
             FROM connections c
             JOIN users u ON (
                CASE 
                    WHEN c.sender_id = $1 THEN c.receiver_id 
                    ELSE c.sender_id 
                END
             ) = u.id
             WHERE (c.sender_id = $1 OR c.receiver_id = $1) 
             AND c.status = 'active'`, 
            [userId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching connections:", err);
        res.status(500).json({ message: "שגיאה בטעינת השידוכים" });
    }
});


app.listen(port, () => {
    console.log(`🚀 שרת השידוכים רץ: http://localhost:${port}/status`);
});