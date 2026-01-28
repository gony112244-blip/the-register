require('dotenv').config(); // חובה: טעינת המשתנים הסודיים (.env)
const cors = require('cors');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000; 
const saltRounds = 10; 

// ==========================================
// 🛡️ Middleware: שומר הסף (חייב להיות למעלה!)
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // שולף את הטוקן מה-Bearer

    if (!token) return res.status(401).json({ message: "נא להתחבר למערכת" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "החיבור פג תוקף, נא להתחבר מחדש" });
        req.user = user; // שומרים את פרטי המשתמש לבקשה הבאה
        next(); // ממשיכים הלאה
    });
};

// ==========================================
// 📡 נתיבי מערכת כלליים (ללא אימות)
// ==========================================

app.get('/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT COUNT(*) FROM users');
        res.send(`השרת עובד ומחובר! יש במערכת ${dbRes.rows[0].count} משתמשים.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('תקלה בחיבור למסד הנתונים');
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        res.json({ totalUsers: result.rows[0].count });
    } catch (err) {
        res.status(500).json({ message: "שגיאת שרת" });
    }
});

// ==========================================
// 🔐 אימות והרשמה (Auth)
// ==========================================

// כניסה (Login)
app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                delete user.password; // מחיקת הסיסמה מהפלט לביטחון
                
                // יצירת הטוקן
                const token = jwt.sign(
                    { id: user.id, is_admin: user.is_admin }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '1h' } 
                );
                res.json({ user, token });
            } else {
                res.status(401).json({ message: "טלפון או סיסמה שגויים" });
            }
        } else {
            res.status(401).json({ message: "טלפון או סיסמה שגויים" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

// הרשמה (Register)
app.post('/register', async (req, res) => {
    const { phone, password, full_name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'INSERT INTO users (phone, password, full_name, is_approved, is_admin) VALUES ($1, $2, $3, false, false) RETURNING id, full_name',
            [phone, hashedPassword, full_name]
        );
        res.status(201).json({ message: "הרישום בוצע בהצלחה", user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: "המספר כבר רשום במערכת" });
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

// ==========================================
// 👤 פרופיל משתמש
// ==========================================

// --- עדכון פרופיל (הגרסה המתוקנת והמלאה) ---
// --- עדכון פרופיל (הגרסה המתוקנת והמלאה) ---
app.post('/update-profile', authenticateToken, async (req, res) => {
    const { 
        id, full_name, age, height, sector, phone,
        reference_1_name, reference_1_phone, 
        reference_2_name, reference_2_phone,
        rabbi_name, rabbi_phone,
        // 👇 הנה מה שהיה חסר בקוד ששלחת:
        gender, search_min_age, search_max_age, search_sector
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET 
                full_name = $1, age = $2, height = $3, sector = $4, phone = $5,
                reference_1_name = $6, reference_1_phone = $7,
                reference_2_name = $8, reference_2_phone = $9,
                rabbi_name = $10, rabbi_phone = $11,
                -- 👇 הוספנו את השורות האלו לשאילתה:
                gender = $12, search_min_age = $13, search_max_age = $14, search_sector = $15
             WHERE id = $16 RETURNING *`,
            [
                full_name, age, height, sector, phone, 
                reference_1_name, reference_1_phone, 
                reference_2_name, reference_2_phone, 
                rabbi_name, rabbi_phone,
                // 👇 הוספנו אותם גם לרשימת המשתנים:
                gender, search_min_age, search_max_age, search_sector, 
                id // ה-ID זז למקום ה-16
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        
        res.json({ message: "הפרופיל עודכן בהצלחה! ✅", user: result.rows[0] });

    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "שגיאה בשמירת הנתונים בשרת" });
    }
});

// ==========================================
// 💘 מנוע השידוכים (Matches Engine)
// ==========================================

app.get('/matches', authenticateToken, async (req, res) => {
    const { gender, search_sector, search_min_age, search_max_age, myAge, currentPhone } = req.query;

    // הגנה מקריסה אם חסרים פרטים
    if (!gender || gender === 'null' || !myAge || myAge === 'null') {
        return res.json([]); 
    }

    try {
        const result = await pool.query(
            `SELECT id, full_name, age, height, sector, phone, gender FROM users 
             WHERE phone != $1 
                AND is_approved = true
                AND gender != $2
                AND ($3::text IS NULL OR $3 = '' OR sector = $3)
                AND age >= $4 AND age <= $5
                AND search_min_age <= $6 AND search_max_age >= $6`,
            [currentPhone, gender, search_sector, search_min_age, search_max_age, myAge]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Match error:", err);
        res.status(500).json({ message: "תקלה בטעינת השידוכים" });
    }
});

// ==========================================
// 👮 אזור ניהול (Admin)
// ==========================================

app.get('/admin/users', authenticateToken, async (req, res) => {
    // וידוא הרשאות ניהול
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            'SELECT id, phone, full_name, age, sector, height, is_approved FROM users WHERE is_admin = false ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

app.put('/admin/approve/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });
    
    const { id } = req.params;
    try {
        await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [id]);
        res.json({ message: "המשתמש אושר בהצלחה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה באישור המשתמש" });
    }
});

// שליפת תיקים שממתינים לשדכן
app.get('/admin/waiting-matches', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            `SELECT 
                c.id AS connection_id,
                u1.full_name AS s_name, u1.phone AS s_phone, u1.age AS s_age, u1.sector AS s_sector,
                u1.rabbi_name AS s_rabbi, u1.rabbi_phone AS s_rabbi_phone,
                u2.full_name AS r_name, u2.phone AS r_phone, u2.age AS r_age, u2.sector AS r_sector,
                u2.rabbi_name AS r_rabbi, u2.rabbi_phone AS r_rabbi_phone
             FROM connections c
             JOIN users u1 ON c.sender_id = u1.id
             JOIN users u2 ON c.receiver_id = u2.id
             WHERE c.status = 'waiting_for_shadchan'`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בשליפת נתוני שדכן" });
    }
});

// ==========================================
// ❤️ אינטראקציות וקשרים (Connections)
// ==========================================

// שליחת "לייק" / יצירת קשר
app.post('/connect', authenticateToken, async (req, res) => {
    const { myId, targetId } = req.body;
    try {
        // בדיקת חסימה ל-24 שעות (הלוגיקה שביקשת לא לאבד)
        const checkBlock = await pool.query(
            `SELECT * FROM connections 
             WHERE (sender_id = $1 OR receiver_id = $1) 
             AND status = 'active' 
             AND updated_at > NOW() - INTERVAL '24 hours'`,
            [myId]
        );
        if (checkBlock.rows.length > 0) {
            return res.status(400).json({ message: "🚫 יש לך התאמה פעילה! המתן 24 שעות." });
        }

        await pool.query(
            `INSERT INTO connections (sender_id, receiver_id) VALUES ($1, $2)`,
            [myId, targetId]
        );
        res.json({ message: "🎉 הפנייה נשלחה בהצלחה!" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה ביצירת הקשר" });
    }
});

// דואר נכנס (Inbox) - בקשות שממתינות לי
app.get('/my-requests', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query(
            `SELECT c.id AS connection_id, c.created_at, u.full_name, u.age, u.height, u.sector 
             FROM connections c
             JOIN users u ON c.sender_id = u.id
             WHERE c.receiver_id = $1 AND c.status = 'pending'`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת בקשות" });
    }
});

// אישור בקשה (שלב 1)
app.post('/approve-request', authenticateToken, async (req, res) => {
    const { connectionId, userId } = req.body;
    try {
        await pool.query(
            `UPDATE connections SET status = 'active', updated_at = NOW(), last_action_by = $1 WHERE id = $2`,
            [userId, connectionId]
        );
        res.json({ message: "הבקשה אושרה! עכשיו בשיחות פעילות." });
    } catch (err) {
        res.status(500).json({ message: "שגיאה באישור" });
    }
});

// דחיית בקשה
app.post('/reject-request', authenticateToken, async (req, res) => {
    const { connectionId } = req.body;
    try {
        await pool.query(`UPDATE connections SET status = 'rejected' WHERE id = $1`, [connectionId]);
        res.json({ message: "הבקשה נדחתה." });
    } catch (err) {
        res.status(500).json({ message: "שגיאה בדחייה" });
    }
});

// השיחות הפעילות שלי
app.get('/my-connections', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query(
            `SELECT c.id, c.status, c.sender_id, c.receiver_id, c.sender_final_approve, c.receiver_final_approve,
                u.full_name, u.phone, u.reference_1_name, u.reference_1_phone,
                u.reference_2_name, u.reference_2_phone, u.rabbi_name, u.rabbi_phone
             FROM connections c
             JOIN users u ON (CASE WHEN c.sender_id = $1 THEN c.receiver_id ELSE c.sender_id END) = u.id
             WHERE (c.sender_id = $1 OR c.receiver_id = $1) 
             AND (c.status = 'active' OR c.status = 'waiting_for_shadchan')`, 
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת שיחות" });
    }
});

// אישור סופי (רצון להתקדם לשדכן)
app.post('/finalize-connection', authenticateToken, async (req, res) => {
    const { connectionId, userId } = req.body;
    try {
        const checkUser = await pool.query(`SELECT sender_id, receiver_id FROM connections WHERE id = $1`, [connectionId]);
        if (checkUser.rows.length === 0) return res.status(404).json({ message: "לא נמצא" });
        
        const conn = checkUser.rows[0];
        let updateField = conn.sender_id === userId ? 'sender_final_approve' : 'receiver_final_approve';

        await pool.query(`UPDATE connections SET ${updateField} = TRUE WHERE id = $1`, [connectionId]);

        // בדיקה אם שני הצדדים אישרו
        const checkBoth = await pool.query(`SELECT sender_final_approve, receiver_final_approve FROM connections WHERE id = $1`, [connectionId]);
        const { sender_final_approve, receiver_final_approve } = checkBoth.rows[0];

        if (sender_final_approve && receiver_final_approve) {
            await pool.query(`UPDATE connections SET status = 'waiting_for_shadchan' WHERE id = $1`, [connectionId]);
            res.json({ status: 'completed', message: "🎉 שני הצדדים אישרו! התיק עבר לשדכנית." });
        } else {
            res.json({ status: 'waiting', message: "האישור שלך התקבל. ממתינים לצד השני." });
        }
    } catch (err) {
        res.status(500).json({ message: "שגיאה באישור הסופי" });
    }
});

// ==========================================
// 📸 ניהול תמונות (Images)
// ==========================================

// הוספת תמונה (עד 3)
app.post('/api/upload-image', authenticateToken, async (req, res) => {
    const { userId, imageUrl } = req.body; 
    try {
        const countCheck = await pool.query('SELECT COUNT(*) FROM user_images WHERE user_id = $1', [userId]);
        if (parseInt(countCheck.rows[0].count) >= 3) {
            return res.status(400).json({ message: "הגעת למקסימום של 3 תמונות" });
        }

        const result = await pool.query(
            'INSERT INTO user_images (user_id, image_url) VALUES ($1, $2) RETURNING *',
            [userId, imageUrl]
        );
        res.json({ message: "התמונה נשמרה בהצלחה", image: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "שגיאה בשמירת התמונה" });
    }
});

// מחיקת תמונה
app.delete('/api/delete-image/:imageId', authenticateToken, async (req, res) => {
    const { imageId } = req.params;
    try {
        await pool.query('DELETE FROM user_images WHERE id = $1', [imageId]);
        res.json({ message: "התמונה נמחקה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה במחיקה" });
    }
});

// שליפת תמונות של משתמש
app.get('/api/user-images/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM user_images WHERE user_id = $1', [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת תמונות" });
    }
});

// --- נתיב לשדכנית: שליפת תיקים שממתינים לטיפול ---
app.get('/admin/matches-to-handle', authenticateToken, async (req, res) => {
    // 1. וידוא שרק אדמין יכול לראות את זה
    if (!req.user.is_admin) {
        return res.status(403).json({ message: "גישה לדרג ניהול בלבד" });
    }

    try {
        const query = `
            SELECT 
                c.id AS connection_id,
                -- פרטי צד א' (השולח)
                u1.full_name AS sender_name, u1.phone AS sender_phone, 
                u1.age AS sender_age, u1.sector AS sender_sector,
                u1.rabbi_name AS sender_rabbi, u1.rabbi_phone AS sender_rabbi_phone,
                u1.reference_1_name AS s_ref1, u1.reference_1_phone AS s_ref1_phone,
                
                -- פרטי צד ב' (המקבל)
                u2.full_name AS receiver_name, u2.phone AS receiver_phone, 
                u2.age AS receiver_age, u2.sector AS receiver_sector,
                u2.rabbi_name AS receiver_rabbi, u2.rabbi_phone AS receiver_rabbi_phone,
                u2.reference_1_name AS r_ref1, u2.reference_1_phone AS r_ref1_phone

            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            WHERE c.status = 'waiting_for_shadchan'
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);

    } catch (err) {
        console.error("Error fetching admin matches:", err);
        res.status(500).json({ message: "שגיאת שרת בשליפת שידוכים" });
    }
});

// ==========================================
//  הפעלת השרת
// ==========================================
app.listen(port, () => {
    console.log(`🚀 שרת השידוכים רץ בפורט ${port}: http://localhost:${port}/status`);
});