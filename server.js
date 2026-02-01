require('dotenv').config(); // חובה: טעינת המשתנים הסודיים (.env)
const cors = require('cors');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // הסבר: ספרייה להעלאת קבצים
const path = require('path'); // הסבר: לעבודה עם נתיבי קבצים

const app = express();

app.use(express.json());
app.use(cors());

// הסבר: הגדרת תיקיית uploads כסטטית - כך אפשר לגשת לתמונות מהדפדפן
// לדוגמא: http://localhost:3000/uploads/image-123.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = process.env.PORT || 3000;
const saltRounds = 10;

// ==========================================
// 📁 הגדרת Multer להעלאת קבצים
// ==========================================
const storage = multer.diskStorage({
    // הסבר: לאן לשמור את הקבצים
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // תיקיית uploads
    },
    // הסבר: איך לקרוא לקובץ
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // סיומת הקובץ
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// הסבר: סינון סוגי קבצים - רק תמונות!
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // מותר
    } else {
        cb(new Error('רק קבצי תמונה מותרים (JPG, PNG, GIF, WEBP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // הסבר: מקסימום 5MB
});

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

// הרשמה (Register) - עם כניסה אוטומטית!
// הסבר: אחרי הרשמה מוצלחת, מייצרים טוקן ומחזירים אותו
// כך המשתמש נכנס מיד בלי צורך להתחבר שוב
app.post('/register', async (req, res) => {
    const { phone, password, full_name } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // שמירת המשתמש החדש - is_approved=false כי צריך אישור אחרי מילוי פרטים
        const result = await pool.query(
            'INSERT INTO users (phone, password, full_name, is_approved, is_admin) VALUES ($1, $2, $3, false, false) RETURNING *',
            [phone, hashedPassword, full_name]
        );

        const newUser = result.rows[0];
        delete newUser.password; // לא מחזירים סיסמה ללקוח!

        // יצירת טוקן - כך המשתמש יוכל להיכנס מיד
        const token = jwt.sign(
            { id: newUser.id, is_admin: newUser.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // תוקף שבוע למילוי פרטים
        );

        res.status(201).json({
            message: "נרשמת בהצלחה! עכשיו נשלים את הפרטים",
            user: newUser,
            token: token // מחזירים טוקן לכניסה אוטומטית
        });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ message: "המספר כבר רשום במערכת" });
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

// ==========================================
// 👤 פרופיל משתמש
// ==========================================

// --- עדכון פרופיל (גרסה מלאה עם 3 חלקים) ---
// הסבר: כאן נשמרים כל פרטי המשתמש - חלק א', ב', ג'
app.post('/update-profile', authenticateToken, async (req, res) => {
    const {
        id,
        // חלק א' - פרטים בסיסיים
        full_name, last_name, age, gender, phone,
        status, has_children, children_count,
        // רקע משפחתי
        family_background, father_occupation, mother_occupation,
        father_heritage, mother_heritage, siblings_count, sibling_position,
        // מראה
        height, body_type, skin_tone, appearance,
        // כלכלה ועיסוק
        apartment_help, current_occupation, yeshiva_name, work_field,
        life_aspiration, favorite_study, study_place, study_field, occupation_details,
        // על עצמי
        about_me, home_style, partner_description, important_in_life,
        // ת.ז.
        id_card_image_url,

        // חלק ב' - פרטים נסתרים
        full_address, father_full_name, mother_full_name, siblings_details,
        reference_1_name, reference_1_phone,
        reference_2_name, reference_2_phone,
        reference_3_name, reference_3_phone,
        family_reference_name, family_reference_phone,
        rabbi_name, rabbi_phone,
        mechutanim_name, mechutanim_phone,

        // חלק ג' - דרישות
        search_min_age, search_max_age,
        search_height_min, search_height_max,
        search_body_types, search_appearances, search_skin_tones,
        search_statuses, search_backgrounds, unwanted_heritages,
        mixed_heritage_ok, search_financial_min, search_financial_discuss
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET 
                full_name = $1, last_name = $2, age = $3, gender = $4, phone = $5,
                status = $6, has_children = $7, children_count = $8,
                family_background = $9, father_occupation = $10, mother_occupation = $11,
                father_heritage = $12, mother_heritage = $13, siblings_count = $14, sibling_position = $15,
                height = $16, body_type = $17, skin_tone = $18, appearance = $19,
                apartment_help = $20, current_occupation = $21, yeshiva_name = $22, work_field = $23,
                life_aspiration = $24, favorite_study = $25, study_place = $26, study_field = $27, occupation_details = $28,
                about_me = $29, home_style = $30, partner_description = $31, important_in_life = $32,
                id_card_image_url = $33,
                full_address = $34, father_full_name = $35, mother_full_name = $36, siblings_details = $37,
                reference_1_name = $38, reference_1_phone = $39,
                reference_2_name = $40, reference_2_phone = $41,
                reference_3_name = $42, reference_3_phone = $43,
                family_reference_name = $44, family_reference_phone = $45,
                rabbi_name = $46, rabbi_phone = $47,
                mechutanim_name = $48, mechutanim_phone = $49,
                search_min_age = $50, search_max_age = $51,
                search_height_min = $52, search_height_max = $53,
                search_body_types = $54, search_appearances = $55, search_skin_tones = $56,
                search_statuses = $57, search_backgrounds = $58, unwanted_heritages = $59,
                mixed_heritage_ok = $60, search_financial_min = $61, search_financial_discuss = $62
             WHERE id = $63 RETURNING *`,
            [
                full_name, last_name, age, gender, phone,
                status, has_children, children_count,
                family_background, father_occupation, mother_occupation,
                father_heritage, mother_heritage, siblings_count, sibling_position,
                height, body_type, skin_tone, appearance,
                apartment_help, current_occupation, yeshiva_name, work_field,
                life_aspiration, favorite_study, study_place, study_field, occupation_details,
                about_me, home_style, partner_description, important_in_life,
                id_card_image_url,
                full_address, father_full_name, mother_full_name, siblings_details,
                reference_1_name, reference_1_phone,
                reference_2_name, reference_2_phone,
                reference_3_name, reference_3_phone,
                family_reference_name, family_reference_phone,
                rabbi_name, rabbi_phone,
                mechutanim_name, mechutanim_phone,
                search_min_age, search_max_age,
                search_height_min, search_height_max,
                search_body_types, search_appearances, search_skin_tones,
                search_statuses, search_backgrounds, unwanted_heritages,
                mixed_heritage_ok, search_financial_min, search_financial_discuss,
                id // ID בסוף
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }

        // הסבר: מחזירים את המשתמש המעודכן ללקוח
        const updatedUser = result.rows[0];
        delete updatedUser.password; // לא מחזירים סיסמה!

        res.json({ message: "הפרופיל עודכן בהצלחה! ✅", user: updatedUser });

    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "שגיאה בשמירת הנתונים בשרת" });
    }
});

// ==========================================
// 📸 העלאת קבצים (File Uploads)
// ==========================================

// העלאת תמונת תעודת זהות
// הסבר: המשתמש מעלה תמונת ת.ז. לאימות זהות
app.post('/upload-id-card', authenticateToken, upload.single('id_card'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "לא התקבל קובץ" });
        }

        const userId = req.user.id; // מזהה המשתמש מהטוקן
        const imageUrl = `/uploads/${req.file.filename}`; // הנתיב לתמונה

        // עדכון הקישור בדאטאבייס
        await pool.query(
            'UPDATE users SET id_card_image_url = $1 WHERE id = $2',
            [imageUrl, userId]
        );

        res.json({
            message: "תמונת ת.ז. הועלתה בהצלחה! ✅",
            imageUrl: imageUrl
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "שגיאה בהעלאת הקובץ" });
    }
});

// העלאת תמונת פרופיל
// הסבר: המשתמש יכול להעלות עד 3 תמונות פרופיל
app.post('/upload-profile-image', authenticateToken, upload.single('profile_image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "לא התקבל קובץ" });
        }

        const userId = req.user.id;
        const imageUrl = `/uploads/${req.file.filename}`;

        // בדיקה כמה תמונות יש למשתמש
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM user_images WHERE user_id = $1',
            [userId]
        );

        if (parseInt(countResult.rows[0].count) >= 3) {
            return res.status(400).json({ message: "מותר עד 3 תמונות בלבד" });
        }

        // הוספת התמונה לטבלה
        const result = await pool.query(
            'INSERT INTO user_images (user_id, image_url) VALUES ($1, $2) RETURNING *',
            [userId, imageUrl]
        );

        res.json({
            message: "התמונה הועלתה בהצלחה! ✅",
            image: result.rows[0]
        });

    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "שגיאה בהעלאת הקובץ" });
    }
});

// ==========================================
// 💘 מנוע השידוכים (Matches Engine)
// ==========================================

app.get('/matches', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // שלב 1: שליפת פרטי המשתמש הנוכחי
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        const currentUser = userResult.rows[0];

        // הגנה: אם אין מגדר - לא נוכל לחפש
        if (!currentUser.gender) {
            return res.json([]);
        }

        // הסבר: בניית שאילתה דינמית לסינון
        // מחפשים את המגדר ההפוך
        const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

        // שלב 2: בניית תנאי הסינון
        let conditions = [
            'id != $1',                    // לא את עצמי
            'is_approved = true',          // רק מאושרים
            'gender = $2'                  // מגדר הפוך
        ];
        let params = [userId, targetGender];
        let paramIndex = 3;

        // סינון לפי גיל
        if (currentUser.search_min_age) {
            conditions.push(`age >= $${paramIndex}`);
            params.push(currentUser.search_min_age);
            paramIndex++;
        }
        if (currentUser.search_max_age) {
            conditions.push(`age <= $${paramIndex}`);
            params.push(currentUser.search_max_age);
            paramIndex++;
        }

        // סינון לפי גובה
        if (currentUser.search_height_min) {
            conditions.push(`height >= $${paramIndex}`);
            params.push(currentUser.search_height_min);
            paramIndex++;
        }
        if (currentUser.search_height_max) {
            conditions.push(`height <= $${paramIndex}`);
            params.push(currentUser.search_height_max);
            paramIndex++;
        }

        // סינון לפי מבנה גוף (אם הוגדר)
        if (currentUser.search_body_types && currentUser.search_body_types !== '') {
            const bodyTypes = currentUser.search_body_types.split(',').map(t => t.trim());
            const placeholders = bodyTypes.map((_, i) => `$${paramIndex + i}`).join(',');
            conditions.push(`body_type IN (${placeholders})`);
            params.push(...bodyTypes);
            paramIndex += bodyTypes.length;
        }

        // סינון לפי מראה כללי
        if (currentUser.search_appearances && currentUser.search_appearances !== '') {
            const appearances = currentUser.search_appearances.split(',').map(t => t.trim());
            const placeholders = appearances.map((_, i) => `$${paramIndex + i}`).join(',');
            conditions.push(`appearance IN (${placeholders})`);
            params.push(...appearances);
            paramIndex += appearances.length;
        }

        // סינון לפי רקע משפחתי
        if (currentUser.search_backgrounds && currentUser.search_backgrounds !== '') {
            const backgrounds = currentUser.search_backgrounds.split(',').map(t => t.trim());
            const placeholders = backgrounds.map((_, i) => `$${paramIndex + i}`).join(',');
            conditions.push(`family_background IN (${placeholders})`);
            params.push(...backgrounds);
            paramIndex += backgrounds.length;
        }

        // סינון לפי סטטוס
        if (currentUser.search_statuses && currentUser.search_statuses !== '') {
            const statuses = currentUser.search_statuses.split(',').map(t => t.trim());
            const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(',');
            conditions.push(`status IN (${placeholders})`);
            params.push(...statuses);
            paramIndex += statuses.length;
        }

        // הסבר: בדיקה שגם הצד השני מחפש אותי!
        // המועמד צריך לרצות את הגיל שלי
        if (currentUser.age) {
            conditions.push(`(search_min_age IS NULL OR search_min_age <= $${paramIndex})`);
            params.push(currentUser.age);
            paramIndex++;
            conditions.push(`(search_max_age IS NULL OR search_max_age >= $${paramIndex})`);
            params.push(currentUser.age);
            paramIndex++;
        }

        // הסבר: המועמד צריך לרצות את הגובה שלי
        if (currentUser.height) {
            conditions.push(`(search_height_min IS NULL OR search_height_min <= $${paramIndex})`);
            params.push(currentUser.height);
            paramIndex++;
            conditions.push(`(search_height_max IS NULL OR search_height_max >= $${paramIndex})`);
            params.push(currentUser.height);
            paramIndex++;
        }

        // שלב 3: הרצת השאילתה
        const query = `
            SELECT id, full_name, last_name, age, height, gender, phone,
                   family_background, body_type, appearance, skin_tone,
                   current_occupation, about_me, sector
            FROM users
            WHERE ${conditions.join(' AND ')}
            ORDER BY id DESC
            LIMIT 20
        `;

        const result = await pool.query(query, params);
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