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

// --- קבלת פרטי הפרופיל שלי ---
app.get('/my-profile', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }

        const user = result.rows[0];
        delete user.password; // לא מחזירים סיסמה!

        // בדיקת אישור אוטומטי אחרי 28 שעות
        if (user.is_profile_pending && user.pending_changes_at) {
            const hoursSinceRequest = (Date.now() - new Date(user.pending_changes_at).getTime()) / (1000 * 60 * 60);

            if (hoursSinceRequest >= 28) {
                // אישור אוטומטי!
                const pendingChanges = user.pending_changes || {};
                const updateFields = Object.keys(pendingChanges).map((key, i) => `${key} = $${i + 1}`).join(', ');
                const updateValues = Object.values(pendingChanges);

                if (updateFields) {
                    await pool.query(
                        `UPDATE users SET ${updateFields}, is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL WHERE id = $${updateValues.length + 1}`,
                        [...updateValues, userId]
                    );

                    // הודעה למשתמש
                    await pool.query(
                        `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
                        [userId, '✅ השינויים בפרופיל אושרו על ידי המנהל!']
                    );
                }

                // רענון הנתונים
                const refreshed = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
                delete refreshed.rows[0].password;
                return res.json(refreshed.rows[0]);
            }
        }

        res.json(user);
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: "שגיאה בטעינת הפרופיל" });
    }
});

// ==========================================
// 📷 העלאת תעודת זהות לאימות
// ==========================================
app.post('/upload-id-card', authenticateToken, upload.single('idCard'), async (req, res) => {
    const userId = req.user.id;
    const { idOwner } = req.body; // 'self' / 'parent' / 'candidate'

    if (!req.file) {
        return res.status(400).json({ message: "לא נבחר קובץ" });
    }

    try {
        // שמירת הנתיב בדאטאבייס
        const imageUrl = `/uploads/${req.file.filename}`;

        await pool.query(
            `UPDATE users SET 
                id_card_image_url = $1,
                id_card_owner_type = $2,
                id_card_uploaded_at = NOW(),
                id_card_verified = FALSE
             WHERE id = $3`,
            [imageUrl, idOwner || 'self', userId]
        );

        // שליפת פרטי המשתמש להודעה
        const userResult = await pool.query('SELECT full_name, contact_person_type FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        // הודעה למנהל
        const ownerText = {
            self: 'של המועמד עצמו',
            parent: 'של ההורה',
            candidate: 'של המועמד (הועלה ע"י הורה)'
        };

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, 1, $2, 'admin_notification')`,
            [userId, `📷 ${user.full_name} העלה צילום תעודת זהות ${ownerText[idOwner] || 'לאימות'}.\nנא לאמת את הזהות.`]
        );

        res.json({
            message: "תעודת הזהות הועלתה בהצלחה! ✅",
            info: "המנהל יבדוק ויאשר בהקדם.",
            imageUrl
        });

    } catch (err) {
        console.error("Upload ID error:", err);
        res.status(500).json({ message: "שגיאה בהעלאת הקובץ" });
    }
});

// ==========================================
// 📷 העלאת תמונות פרופיל (עד 3)
// ==========================================
app.post('/upload-profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({ message: "לא נבחר קובץ" });
    }

    try {
        // בדיקה - עד 3 תמונות
        const current = await pool.query('SELECT profile_images FROM users WHERE id = $1', [userId]);
        const images = current.rows[0]?.profile_images || [];

        if (images.length >= 3) {
            return res.status(400).json({ message: "ניתן להעלות עד 3 תמונות בלבד" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        await pool.query(
            `UPDATE users SET 
                profile_images = array_append(profile_images, $1),
                profile_images_count = COALESCE(profile_images_count, 0) + 1
             WHERE id = $2`,
            [imageUrl, userId]
        );

        res.json({ message: "התמונה הועלתה!", imageUrl });

    } catch (err) {
        console.error("Upload profile image error:", err);
        res.status(500).json({ message: "שגיאה בהעלאה" });
    }
});

// מחיקת תמונת פרופיל
app.post('/delete-profile-image', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { imageUrl } = req.body;

    try {
        await pool.query(
            `UPDATE users SET 
                profile_images = array_remove(profile_images, $1),
                profile_images_count = GREATEST(COALESCE(profile_images_count, 0) - 1, 0)
             WHERE id = $2`,
            [imageUrl, userId]
        );

        res.json({ message: "התמונה נמחקה" });

    } catch (err) {
        console.error("Delete profile image error:", err);
        res.status(500).json({ message: "שגיאה במחיקה" });
    }
});

// ==========================================
// 👁️ מערכת אישור צפייה בתמונות
// ==========================================

// בקשה לצפות בתמונות של מישהו
app.post('/request-photo-access', authenticateToken, async (req, res) => {
    const requesterId = req.user.id;
    const { targetId } = req.body;

    try {
        // בדיקה אם כבר יש בקשה/אישור
        const existing = await pool.query(
            'SELECT * FROM photo_approvals WHERE requester_id = $1 AND target_id = $2',
            [requesterId, targetId]
        );

        if (existing.rows.length > 0) {
            return res.json({ message: "כבר שלחת בקשה", status: existing.rows[0].status });
        }

        // יצירת בקשה חדשה
        await pool.query(
            `INSERT INTO photo_approvals (requester_id, target_id, status) VALUES ($1, $2, 'pending')`,
            [requesterId, targetId]
        );

        // שליחת הודעה לצד השני
        const requesterInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [requesterId]);
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, $2, $3, 'photo_request')`,
            [requesterId, targetId, `📷 ${requesterInfo.rows[0].full_name} מבקש/ת לראות את התמונות שלך`]
        );

        res.json({ message: "הבקשה נשלחה! תקבל הודעה כשיאשרו" });

    } catch (err) {
        console.error("Photo request error:", err);
        res.status(500).json({ message: "שגיאה בשליחת הבקשה" });
    }
});

// תגובה לבקשת תמונות (אישור/לא כרגע/אישור אוטומטי)
app.post('/respond-photo-request', authenticateToken, async (req, res) => {
    const targetId = req.user.id; // מי שמגיב הוא ה-target
    const { requesterId, response } = req.body; // response: 'approve' / 'reject' / 'auto_approve'

    try {
        if (response === 'reject') {
            await pool.query(
                `UPDATE photo_approvals SET status = 'rejected', updated_at = NOW() 
                 WHERE requester_id = $1 AND target_id = $2`,
                [requesterId, targetId]
            );

            // הודעה למבקש
            await pool.query(
                `INSERT INTO messages (from_user_id, to_user_id, content, type) 
                 VALUES ($1, $2, $3, 'photo_response')`,
                [targetId, requesterId, `📷 הבקשה לצפייה בתמונות נדחתה לעת עתה`]
            );

            return res.json({ message: "הבקשה נדחתה" });
        }

        // אישור (רגיל או אוטומטי)
        const autoApprove = response === 'auto_approve';
        await pool.query(
            `UPDATE photo_approvals SET status = 'approved', auto_approve = $1, updated_at = NOW() 
             WHERE requester_id = $2 AND target_id = $3`,
            [autoApprove, requesterId, targetId]
        );

        // הכלל: מי שמאשר - גם רואה! לכן ניצור גם אישור הפוך
        const reverseExists = await pool.query(
            'SELECT * FROM photo_approvals WHERE requester_id = $1 AND target_id = $2',
            [targetId, requesterId]
        );

        if (reverseExists.rows.length === 0) {
            await pool.query(
                `INSERT INTO photo_approvals (requester_id, target_id, status, auto_approve) 
                 VALUES ($1, $2, 'approved', $3)`,
                [targetId, requesterId, autoApprove]
            );
        } else {
            await pool.query(
                `UPDATE photo_approvals SET status = 'approved', updated_at = NOW() 
                 WHERE requester_id = $1 AND target_id = $2`,
                [targetId, requesterId]
            );
        }

        // הודעה למבקש
        const targetInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [targetId]);
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, $2, $3, 'photo_response')`,
            [targetId, requesterId, `✅ ${targetInfo.rows[0].full_name} אישר/ה צפייה בתמונות!`]
        );

        res.json({
            message: autoApprove
                ? "אישרת! מעכשיו כל תמונה שתעלה - תהיה גלויה לו"
                : "אישרת צפייה בתמונות!"
        });

    } catch (err) {
        console.error("Photo response error:", err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// בדיקה אם יש לי הרשאה לראות תמונות של מישהו
app.get('/check-photo-access/:targetId', authenticateToken, async (req, res) => {
    const requesterId = req.user.id;
    const targetId = req.params.targetId;

    try {
        const result = await pool.query(
            `SELECT status FROM photo_approvals 
             WHERE requester_id = $1 AND target_id = $2 AND status = 'approved'`,
            [requesterId, targetId]
        );

        res.json({
            canView: result.rows.length > 0,
            status: result.rows[0]?.status || 'none'
        });

    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// קבלת תמונות של מישהו (רק אם יש הרשאה!)
app.get('/get-user-photos/:targetId', authenticateToken, async (req, res) => {
    const requesterId = req.user.id;
    const targetId = req.params.targetId;

    try {
        // בדיקת הרשאה
        const permission = await pool.query(
            `SELECT status FROM photo_approvals 
             WHERE requester_id = $1 AND target_id = $2 AND status = 'approved'`,
            [requesterId, targetId]
        );

        if (permission.rows.length === 0) {
            return res.status(403).json({ message: "אין הרשאה לצפייה", photos: [] });
        }

        // יש הרשאה - שולח תמונות
        const photos = await pool.query(
            'SELECT profile_images FROM users WHERE id = $1',
            [targetId]
        );

        res.json({ photos: photos.rows[0]?.profile_images || [] });

    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// קבלת בקשות תמונות שממתינות לי
app.get('/pending-photo-requests', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT pa.*, u.full_name, u.profile_images_count
             FROM photo_approvals pa
             JOIN users u ON u.id = pa.requester_id
             WHERE pa.target_id = $1 AND pa.status = 'pending'
             ORDER BY pa.created_at DESC`,
            [userId]
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// --- עדכון פרופיל (גרסה מלאה עם 3 חלקים) ---
// הסבר: כאן נשמרים כל פרטי המשתמש - חלק א', ב', ג'
app.post('/update-profile', authenticateToken, async (req, res) => {
    const {
        id,
        // חלק א' - פרטים בסיסיים
        full_name, last_name, age, gender, phone,
        status, has_children, children_count,
        // 📞 איש קשר לשידוך
        contact_person_type, contact_person_name, contact_phone_1, contact_phone_2,
        // רקע משפחתי
        family_background, heritage_sector, father_occupation, mother_occupation,
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

        // חלק ג' - דרישות (פשוט יותר!)
        search_min_age, search_max_age,
        search_height_min, search_height_max,
        search_body_types, search_appearances,
        search_statuses, search_backgrounds,
        search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET 
                full_name = $1, last_name = $2, age = $3, gender = $4, phone = $5,
                status = $6, has_children = $7, children_count = $8,
                contact_person_type = $9, contact_person_name = $10, contact_phone_1 = $11, contact_phone_2 = $12,
                family_background = $13, heritage_sector = $14, father_occupation = $15, mother_occupation = $16,
                father_heritage = $17, mother_heritage = $18, siblings_count = $19, sibling_position = $20,
                height = $21, body_type = $22, skin_tone = $23, appearance = $24,
                apartment_help = $25, current_occupation = $26, yeshiva_name = $27, work_field = $28,
                life_aspiration = $29, favorite_study = $30, study_place = $31, study_field = $32, occupation_details = $33,
                about_me = $34, home_style = $35, partner_description = $36, important_in_life = $37,
                id_card_image_url = $38,
                full_address = $39, father_full_name = $40, mother_full_name = $41, siblings_details = $42,
                reference_1_name = $43, reference_1_phone = $44,
                reference_2_name = $45, reference_2_phone = $46,
                reference_3_name = $47, reference_3_phone = $48,
                family_reference_name = $49, family_reference_phone = $50,
                rabbi_name = $51, rabbi_phone = $52,
                mechutanim_name = $53, mechutanim_phone = $54,
                search_min_age = $55, search_max_age = $56,
                search_height_min = $57, search_height_max = $58,
                search_body_types = $59, search_appearances = $60,
                search_statuses = $61, search_backgrounds = $62,
                search_heritage_sectors = $63, mixed_heritage_ok = $64, search_financial_min = $65, search_financial_discuss = $66
             WHERE id = $67 RETURNING *`,
            [
                full_name, last_name, age, gender, phone,
                status, has_children, children_count,
                contact_person_type, contact_person_name, contact_phone_1, contact_phone_2,
                family_background, heritage_sector, father_occupation, mother_occupation,
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
                search_body_types, search_appearances,
                search_statuses, search_backgrounds,
                search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss,
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

// --- בקשה לשינוי פרופיל (דורש אישור מנהל) ---
// הסבר: משתמש מאושר שרוצה לשנות פרטים - השינויים ממתינים לאישור
app.post('/request-profile-update', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const changes = req.body.changes; // אובייקט עם השינויים

    try {
        // בדיקה שהמשתמש כבר מאושר (אחרת update-profile רגיל)
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        const currentUser = userResult.rows[0];

        if (!currentUser.is_approved) {
            // משתמש חדש - לא צריך אישור, שומרים ישירות
            return res.status(400).json({ message: "משתמש חדש - השתמש ב-update-profile" });
        }

        // שמירת השינויים כ-pending
        await pool.query(
            `UPDATE users SET 
                pending_changes = $1,
                pending_changes_at = NOW(),
                is_profile_pending = TRUE,
                profile_edit_count = COALESCE(profile_edit_count, 0) + 1
             WHERE id = $2`,
            [JSON.stringify(changes), userId]
        );

        // שליחת הודעה למנהל (ID=1 הוא המנהל)
        const changedFields = Object.keys(changes).join(', ');
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, 1, $2, 'admin_notification')`,
            [userId, `📝 ${currentUser.full_name} מבקש לשנות את הפרופיל שלו.\nשדות ששונו: ${changedFields}\nזו בקשת העריכה מספר ${(currentUser.profile_edit_count || 0) + 1} שלו.`]
        );

        res.json({
            message: "הבקשה נשלחה למנהל! ⏳",
            info: "השינויים יאושרו תוך 28 שעות לכל היותר."
        });

    } catch (err) {
        console.error("Request update error:", err);
        res.status(500).json({ message: "שגיאה בשליחת הבקשה" });
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

        // סינון לפי מגזר עדתי (החדש והפשוט!)
        if (currentUser.search_heritage_sectors && currentUser.search_heritage_sectors !== '') {
            const sectors = currentUser.search_heritage_sectors.split(',').map(t => t.trim());
            const placeholders = sectors.map((_, i) => `$${paramIndex + i}`).join(',');
            conditions.push(`(heritage_sector IS NULL OR heritage_sector IN (${placeholders}))`);
            params.push(...sectors);
            paramIndex += sectors.length;
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

        // הסבר: המועמד צריך לרצות את המגזר העדתי שלי
        if (currentUser.heritage_sector) {
            conditions.push(`(search_heritage_sectors IS NULL OR search_heritage_sectors = '' OR search_heritage_sectors LIKE $${paramIndex})`);
            params.push(`%${currentUser.heritage_sector}%`);
            paramIndex++;
        }

        // 🆕 המועמד צריך לרצות את הסטטוס שלי (רווק/גרוש/אלמן)
        if (currentUser.status) {
            conditions.push(`(search_statuses IS NULL OR search_statuses = '' OR search_statuses LIKE $${paramIndex})`);
            params.push(`%${currentUser.status}%`);
            paramIndex++;
        }

        // 🆕 המועמד צריך לרצות את הרקע הדתי שלי
        if (currentUser.family_background) {
            conditions.push(`(search_backgrounds IS NULL OR search_backgrounds = '' OR search_backgrounds LIKE $${paramIndex})`);
            params.push(`%${currentUser.family_background}%`);
            paramIndex++;
        }

        // 🆕 המועמד צריך לרצות את מבנה הגוף שלי
        if (currentUser.body_type) {
            conditions.push(`(search_body_types IS NULL OR search_body_types = '' OR search_body_types LIKE $${paramIndex})`);
            params.push(`%${currentUser.body_type}%`);
            paramIndex++;
        }

        // 🆕 המועמד צריך לרצות את המראה שלי
        if (currentUser.appearance) {
            conditions.push(`(search_appearances IS NULL OR search_appearances = '' OR search_appearances LIKE $${paramIndex})`);
            params.push(`%${currentUser.appearance}%`);
            paramIndex++;
        }

        // שלב 3: הרצת השאילתה
        const query = `
            SELECT id, full_name, last_name, age, height, gender, phone,
                   family_background, heritage_sector, body_type, appearance, skin_tone,
                   current_occupation, about_me, profile_images_count
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

// 🆕 שליפת פרופילים שממתינים לאישור שינויים
app.get('/admin/pending-profiles', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            `SELECT id, full_name, phone, pending_changes, pending_changes_at, profile_edit_count
             FROM users 
             WHERE is_profile_pending = TRUE
             ORDER BY pending_changes_at ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בשליפת בקשות שינוי" });
    }
});

// 🆕 אישור שינויי פרופיל
app.post('/admin/approve-profile-changes/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { id } = req.params;

    try {
        // שליפת השינויים הממתינים
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        const user = userResult.rows[0];
        const pendingChanges = user.pending_changes || {};

        // יישום השינויים
        const updateFields = Object.keys(pendingChanges).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const updateValues = Object.values(pendingChanges);

        if (updateFields) {
            await pool.query(
                `UPDATE users SET ${updateFields}, is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL WHERE id = $${updateValues.length + 1}`,
                [...updateValues, id]
            );
        }

        // הודעה למשתמש
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
            [id, '✅ השינויים בפרופיל אושרו על ידי המנהל!']
        );

        res.json({ message: "השינויים אושרו בהצלחה!" });
    } catch (err) {
        console.error("Approve changes error:", err);
        res.status(500).json({ message: "שגיאה באישור השינויים" });
    }
});

// 🆕 דחיית שינויי פרופיל
app.post('/admin/reject-profile-changes/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { id } = req.params;
    const { reason } = req.body;

    try {
        // איפוס השינויים הממתינים
        await pool.query(
            `UPDATE users SET is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL WHERE id = $1`,
            [id]
        );

        // הודעה למשתמש
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
            [id, `❌ השינויים בפרופיל לא אושרו.\nסיבה: ${reason || 'לא צוינה סיבה'}`]
        );

        res.json({ message: "השינויים נדחו והמשתמש קיבל הודעה" });
    } catch (err) {
        console.error("Reject changes error:", err);
        res.status(500).json({ message: "שגיאה בדחיית השינויים" });
    }
});

// ==========================================
// 👥 ניהול משתמשים למנהל
// ==========================================

// שליפת כל המשתמשים למנהל
app.get('/admin/all-users', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            `SELECT id, full_name, last_name, phone, age, gender, 
                    is_approved, is_blocked, blocked_reason, blocked_at,
                    admin_notes, profile_images, profile_images_count,
                    created_at, id_card_verified
             FROM users 
             WHERE is_admin != TRUE
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Get all users error:", err);
        res.status(500).json({ message: "שגיאה בשליפת משתמשים" });
    }
});

// חסימה/שחרור משתמש
app.post('/admin/block-user', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { userId, block, reason } = req.body;

    try {
        if (block) {
            await pool.query(
                `UPDATE users SET is_blocked = TRUE, blocked_reason = $1, blocked_at = NOW() WHERE id = $2`,
                [reason || 'לא צוינה סיבה', userId]
            );
            // הודעה למשתמש
            await pool.query(
                `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
                [userId, `⚠️ החשבון שלך הוגבל זמנית.\nלפרטים נוספים, פנה למנהל.`]
            );
        } else {
            await pool.query(
                `UPDATE users SET is_blocked = FALSE, blocked_reason = NULL, blocked_at = NULL WHERE id = $1`,
                [userId]
            );
            // הודעה למשתמש
            await pool.query(
                `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
                [userId, `✅ החשבון שלך שוחרר! אתה יכול להמשיך להשתמש במערכת.`]
            );
        }

        res.json({ message: block ? "המשתמש נחסם" : "המשתמש שוחרר" });
    } catch (err) {
        console.error("Block user error:", err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// שמירת הערת מנהל על משתמש
app.post('/admin/user-note', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { userId, note } = req.body;

    try {
        await pool.query(
            `UPDATE users SET admin_notes = $1 WHERE id = $2`,
            [note, userId]
        );
        res.json({ message: "ההערה נשמרה" });
    } catch (err) {
        console.error("Save note error:", err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// שליחת הודעה מהמנהל למשתמש
app.post('/admin/send-message', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { userId, message } = req.body;

    try {
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'admin_message')`,
            [userId, `📬 הודעה מהמנהל:\n${message}`]
        );
        res.json({ message: "ההודעה נשלחה" });
    } catch (err) {
        console.error("Send admin message error:", err);
        res.status(500).json({ message: "שגיאה" });
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
// 📬 מערכת הודעות (Mailbox)
// ==========================================

// שליפת הודעות שלי
app.get('/my-messages', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT * FROM messages 
             WHERE to_user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת הודעות" });
    }
});

// סימון הודעה כנקראה
app.post('/mark-message-read/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE messages SET is_read = TRUE WHERE id = $1 AND to_user_id = $2', [id, req.user.id]);
        res.json({ message: "סומן כנקרא" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// ספירת הודעות שלא נקראו (לתפריט)
app.get('/unread-count', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT COUNT(*) FROM messages WHERE to_user_id = $1 AND is_read = FALSE`,
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// ==========================================
//  הפעלת השרת
// ==========================================
app.listen(port, () => {
    console.log(`🚀 שרת השידוכים רץ בפורט ${port}: http://localhost:${port}/status`);
});