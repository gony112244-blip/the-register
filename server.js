// override: true — קובץ .env מנצח משתני סביבה ישנים ש-PM2 או השרת מזריקים (אחרת EMAIL_* לא מתעדכן)
require('dotenv').config({ override: true }); // חובה: טעינת המשתנים הסודיים (.env)
const cors = require('cors');
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // הסבר: ספרייה להעלאת קבצים
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer'); // ספרייה לשליחת מיילים
const dns = require('dns');

// IPv6 is supported and works better in some environments

const sharp = require('sharp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');


const app = express();

// הגדרת CORS מורחבת (חייב להיות ראשון!)
// הגדרת CORS מורחבת (זמנית - מתיר הכל)
app.use(cors({
    origin: true, // מאפשר לכל Origin ששולח את הבקשה
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 🛡️ הגדרות אבטחה (Security)
// ==========================================

// 1. Helmet - הגנה על כותרות HTTP (מוגדר לעבודה על HTTP ללא HTTPS)
app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false
}));

// הגדרת חריגה ל-Helmet כדי לאפשר הצגת תמונות מקומית (Cross-Origin Resource Policy)
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// 2. Rate Limiting - הגבלת בקשות כללית
/*
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 דקות
    max: 300, // מקסימום 300 בקשות לכל IP (הוגדל מ-100)
    message: "יותר מדי בקשות מכתובת זו, נא לנסות שוב מאוחר יותר."
});
app.use(limiter);

// 3. הגבלה מחמירה לניסיונות התחברות (Brute Force Protection)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // רק 5 ניסיונות כושלים
    message: "יותר מדי ניסיונות התחברות, החשבון ננעל זמנית ל-15 דקות."
});
*/

app.use(express.json());



// הגדרת תיקיות סטטיות
// תמונות רגישות (פרופיל + ת.ז.) — מוגשות רק דרך /secure-file עם JWT
// קבצים לא רגישים (אודיו IVR) — נשארים ציבוריים
app.use('/ivr-audio', express.static(path.join(__dirname, 'ivr-audio')));


// ==========================================
// 📞 IVR — מערכת טלפונית (ימות משיח)
// ==========================================
const ivrRouter = require('./ivr/router');
app.use('/ivr', ivrRouter);

const port = process.env.PORT || 3000;
const saltRounds = 10;

// ==========================================
// 📧 הגדרת שירות המיילים
// ==========================================
let transporter = null;

// פונקציה לאתחול ה-Mailer (נקראת כשהשרת עולה)
async function initMailer() {
    try {
        if (!process.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE === 'ethereal') {
            // יצירת חשבון טסט אוטומטי (לפיתוח)
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('📧 Mailer initialized: Using Ethereal (Development Mode)');
        } else {
            // שימוש בשירות אמיתי (Gmail וכו')
            transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // port 465 uses SSL/TLS
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                // הגדרת TLS לשיפור תאימות
                tls: {
                    rejectUnauthorized: false
                }
            });
            console.log(`📧 Mailer initialized: Using Gmail SMTP (Port 465, SSL/TLS Mode)`);
        }
    } catch (err) {
        console.error("❌ Mailer initialization failed:", err);
    }
}


// הפעלת האתחול
initMailer();


// ייבוא תבניות המייל
const { getEmailTemplate } = require('./emailTemplates');

// פונקציית עזר מתקדמת לשליחת מייל
async function sendEmail(to, subject, htmlContent, userId = null) {
    if (!transporter) await initMailer();

    // אם ה-transporter עדיין null לאחר initMailer — נחזיר false במקום throw
    if (!transporter) {
        console.error('❌ Email transporter is not available (initMailer failed).');
        return false;
    }

    // אם יש userId, בדוק אם המשתמש רוצה לקבל מיילים
    if (userId) {
        try {
            const userPrefs = await pool.query(
                'SELECT email_notifications_enabled, is_email_verified FROM users WHERE id = $1',
                [userId]
            );

            if (userPrefs.rows.length > 0) {
                const prefs = userPrefs.rows[0];
                
                // 1. בדיקה אם המשתמש ביטל התראות ביוזמתו
                if (!prefs.email_notifications_enabled) {
                    console.log(`📧 Email skipped for user ${userId} - notifications disabled`);
                    return false;
                }

                // 2. הגנה: אם האימייל לא מאומת, לא שולחים התראות מערכת (למנוע הטרדת צד ג')
                // הערה: נבדוק אם זה מייל מסוג "auth" או "verification" בנפרד למטה
                if (!prefs.is_email_verified && !subject.includes('אימות') && !subject.includes('סיסמה')) {
                    console.log(`📧 Email blocked for user ${userId} - email not verified yet`);
                    return false;
                }
            }
        } catch (err) {
            console.error('Error checking email preferences:', err);
        }
    }

    try {
        const info = await transporter.sendMail({
            from: `"הפנקס - שידוכים" <${process.env.EMAIL_USER || 'hapinkas.contact@gmail.com'}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        console.log("📨 Email sent: %s", info.messageId);

        // ב-Dev מציגים לינק לצפייה
        if (!process.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE === 'ethereal') {
            console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        return true;
    } catch (err) {
        console.error(`❌ Error sending email to ${to}:`, err.message || err);
        return false;
    }
}

// פונקציית עזר: שליחת מייל "הודעה חדשה" למשתמש
async function sendNewMessageEmail(toUserId, senderName, content) {
    try {
        const userRes = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [toUserId]
        );

        if (userRes.rows.length === 0) {
            return;
        }

        const userEmail = userRes.rows[0].email;
        if (!userEmail) {
            return;
        }

        const preview = (content || '').toString().slice(0, 150);

        await sendTemplateEmail(
            userEmail,
            'new_message',
            {
                senderName: senderName || 'הפנקס',
                messagePreview: preview || 'יש לך הודעה חדשה במערכת.'
            },
            toUserId
        );
    } catch (err) {
        console.error('Error sending new message email:', err);
    }
}

// פונקציה מקוצרת לשליחת מייל עם תבנית
async function sendTemplateEmail(to, templateType, data, userId = null) {
    const template = getEmailTemplate(templateType, data);
    if (!template) {
        console.error(`❌ Unknown email template: ${templateType}`);
        return false;
    }

    return await sendEmail(to, template.subject, template.html, userId);
}

// פונקציית עזר: שליחת מייל עם תבנית לפי userId (שולפת מייל אוטומטית)
async function sendTemplateEmailForUser(toUserId, templateType, data) {
    try {
        const res = await pool.query('SELECT email FROM users WHERE id = $1', [toUserId]);
        if (!res.rows.length || !res.rows[0].email) return false;
        return await sendTemplateEmail(res.rows[0].email, templateType, data, toUserId);
    } catch (err) {
        console.error(`[sendTemplateEmailForUser] Error for userId ${toUserId}:`, err.message);
        return false;
    }
}

// ==========================================
// 📁 הגדרת Multer להעלאת קבצים
// ==========================================

// וודא שתיקיית uploads קיימת בעת טעינת השרת
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory at: ${uploadDir}`);
}

const storage = multer.diskStorage({
    // הסבר: לאן לשמור את הקבצים
    destination: function (req, file, cb) {
        console.log(`Saving file to: ${uploadDir}`); // Debug log
        cb(null, uploadDir); // שימוש בנתיב המלא
    },
    // הסבר: איך לקרוא לקובץ
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // סיומת הקובץ
        const name = file.fieldname + '-' + uniqueSuffix + ext;
        console.log(`Generated filename: ${name}`); // Debug log
        cb(null, name);
    }
});

// הסבר: סינון סוגי קבצים - רק תמונות!
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // מותר
    } else {
        console.error(`Invalid file type rejected: ${file.mimetype}`);
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
// 🔒 הגשת קבצים מאובטחת (תמונות פרופיל + ת.ז.)
// ==========================================
app.get('/secure-file/:filename', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) return res.status(401).json({ message: 'נא להתחבר למערכת' });

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return res.status(403).json({ message: 'החיבור פג תוקף' });
    }

    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'קובץ לא נמצא' });
    }

    const ext = path.extname(filename).toLowerCase();
    const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

    // Watermark: only for image files, skipped for admins
    if (imageExts.has(ext) && !decoded.is_admin) {
        try {
            const userRow = await pool.query('SELECT full_name FROM users WHERE id = $1', [decoded.id]);
            const viewerName = userRow.rows[0]?.full_name || `user-${decoded.id}`;
            const meta = await sharp(filePath).metadata();
            const w = meta.width || 400;
            const h = meta.height || 400;
            const fontSize = Math.max(14, Math.round(w * 0.04));

            const svgOverlay = Buffer.from(`
                <svg width="${w}" height="${h}">
                    <defs>
                        <style>
                            .wm { fill: rgba(255,255,255,0.35); font-size: ${fontSize}px; font-family: Arial, sans-serif; font-weight: bold; }
                        </style>
                    </defs>
                    <text x="${Math.round(w * 0.5)}" y="${Math.round(h * 0.92)}" text-anchor="middle" class="wm">${viewerName}</text>
                    <text x="${Math.round(w * 0.5)}" y="${Math.round(h * 0.35)}" text-anchor="middle" class="wm" transform="rotate(-30, ${Math.round(w * 0.5)}, ${Math.round(h * 0.35)})">${viewerName}</text>
                </svg>
            `);

            const outputFormat = (ext === '.png') ? 'png' : 'jpeg';
            const result = await sharp(filePath)
                .composite([{ input: svgOverlay, top: 0, left: 0 }])
                .toFormat(outputFormat, { quality: 85 })
                .toBuffer();

            res.setHeader('Content-Type', outputFormat === 'png' ? 'image/png' : 'image/jpeg');
            res.setHeader('Cache-Control', 'private, no-store');
            return res.send(result);
        } catch (sharpErr) {
            console.error('Watermark failed, serving original:', sharpErr.message);
        }
    }

    // Fallback: serve original file (non-image, admin, or watermark failure)
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(filePath);
});

// ==========================================
// 📡 נתיבי מערכת כלליים (ללא אימות)
// ==========================================

// נתיב זמני לאיפוס סיסמה — רק מחוץ לפרודקשן (מסוכן אחרת)
app.get('/debug/reset-user/:email', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
    }
    const { email } = req.params;
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        const result = await pool.query(
            'UPDATE users SET password = $1, is_blocked = FALSE WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );
        if (result.rowCount === 0) return res.status(404).send("User not found");
        res.send(`User ${email} password reset to '123456'`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT COUNT(*) FROM users');
        res.send(`השרת עובד ומחובר! יש במערכת ${dbRes.rows[0].count} משתמשים.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('תקלה בחיבור למסד הנתונים');
    }
});

// ==========================================
// 🔑 הרשמה והתחברות (Public)
// ==========================================

// בדיקת קיום משתמש (לשלב הראשון בהרשמה)
app.post('/check-user-exists', async (req, res) => {
    const { email, phone } = req.body;

    // הגנה מפני ערכים ריקים שנשלחים מהפרונט
    const emailToCheck = email && email.trim() !== '' ? email : null;
    const phoneToCheck = phone ? phone.replace(/[-\s]/g, '').trim() : null;

    if (!emailToCheck && !phoneToCheck) {
        return res.status(200).json({ message: "OK (No data to check)" });
    }

    try {
        const userCheck = await pool.query(
            `SELECT * FROM users WHERE 
             ($1::text IS NOT NULL AND email = $1) OR 
             ($2::text IS NOT NULL AND phone = $2)`,
            [emailToCheck, phoneToCheck]
        );

        if (userCheck.rows.length > 0) {
            const existing = userCheck.rows[0];
            let msg = "משתמש קיים במערכת";

            // אימייל כבר לא חוסם כי הוא יכול להיות משותף לכמה אנשים
            if (existing.phone === phoneToCheck) {
                msg = "מספר הטלפון כבר קיים במערכת";
                return res.status(409).json({ message: msg });
            }
        }
        res.status(200).json({ message: "המשתמש לא קיים, אפשר להמשיך" });
    } catch (err) {
        console.error("Check user error:", err);
        res.status(500).json({ message: "שגיאת שרת בבדיקת משתמש" });
    }
});

// ── פונקציית עזר: תיעוד פעילות ──
async function logActivity(userId, action, { targetUserId = null, actorId = null, note = null } = {}) {
    try {
        await pool.query(
            `INSERT INTO activity_log (user_id, action, target_user_id, actor_id, note)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, targetUserId || null, actorId || null, note || null]
        );
    } catch (e) {
        console.error('[logActivity]', e.message);
    }
}

// הרשמה למערכת
app.post('/register', async (req, res) => {
    const {
        email, password, full_name, last_name, phone, gender,
        birth_year, height, city, // שדות בסיס
        profile_images, // מערך תמונות (אופציונלי)
        email_notifications_enabled // העדפת התראות (ברירת מחדל: true)
    } = req.body;

    // ניקוי אימייל (אם ריק -> NULL) כדי למנוע כפילויות על מחרוזת ריקה
    const emailToSave = email && email.trim() !== '' ? email : null;
    // ניקוי טלפון - הסרת כל תו שאינו ספרה כדי למנוע כפילויות וטעויות
    const phoneToSave = phone ? phone.replace(/\D/g, '').trim() : null;

    if (!phoneToSave) {
        return res.status(400).json({ message: "חובה להזין מספר טלפון" });
    }

    try {
        // 1. בדיקה אם קיים (טלפון הוא המזהה הראשי)
        const userCheck = await pool.query(
            'SELECT id, full_name, is_admin FROM users WHERE phone = $1',
            [phoneToSave]
        );

        if (userCheck.rows.length > 0) {
            console.warn(`[Register Attempt] Phone already exists: ${phoneToSave}`);
            return res.status(409).json({ message: "מספר הטלפון כבר רשום במערכת" });
        }

        // 2. הצפנת סיסמה
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. חישוב גיל (לפי שנת לידה)
        const currentYear = new Date().getFullYear();
        const age = birth_year ? currentYear - parseInt(birth_year) : null;

        // 4. יצירת קוד אימות למייל (6 ספרות)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 5. שמירה במסד הנתונים
        const newUser = await pool.query(
            `INSERT INTO users (
                email, password, full_name, last_name, phone, gender,
                age, height, city, created_at, is_approved, is_blocked,
                profile_images, profile_images_count, email_notifications_enabled,
                is_email_verified, email_verification_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), FALSE, FALSE, $10, $11, $12, FALSE, $13) RETURNING *`,
            [
                emailToSave, hashedPassword, full_name, last_name, phoneToSave, gender,
                age, height || null, city || null,
                profile_images || [], (profile_images || []).length,
                email_notifications_enabled !== false, // ברירת מחדל true
                verificationCode
            ]
        );

        // 5. יצירת טוקן התחברות אוטומטי
        const token = jwt.sign(
            { id: newUser.rows[0].id, is_admin: false },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // 6. שליחת הודעת ברוכים הבאים (במערכת + במייל) — non-blocking
        const welcomeContent = `👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.`;
        const newUserId = newUser.rows[0].id;

        setImmediate(async () => {
            try {
                await pool.query(
                    `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
                    [newUserId, welcomeContent]
                );
            } catch (msgErr) {
                console.error('[Register] Failed to insert welcome message:', msgErr.message);
            }

            if (emailToSave) {
                try {
                    await sendTemplateEmail(
                        emailToSave,
                        'verification',
                        {
                            fullName: full_name || '',
                            code: verificationCode,
                            userId: newUserId
                        },
                        newUserId
                    );
                } catch (mailErr) {
                    console.error('[Register] Failed to send verification email:', mailErr.message);
                }
            }
        });

        setImmediate(() => logActivity(newUserId, 'registered'));

        res.status(201).json({
            message: "ההרשמה בוצעה בהצלחה!",
            token,
            user: {
                id: newUser.rows[0].id,
                full_name: newUser.rows[0].full_name,
                is_admin: false,
                gender: newUser.rows[0].gender,
                age: newUser.rows[0].age,
                birth_date: newUser.rows[0].birth_date,
                city: newUser.rows[0].city,
                email: newUser.rows[0].email,
                is_email_verified: newUser.rows[0].is_email_verified,
                never_ask_email: newUser.rows[0].never_ask_email
            }
        });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "שגיאה בתהליך ההרשמה" });
    }
});


// התחברות למערכת (תומך באימייל או טלפון)
app.post('/login', async (req, res) => {
    // Frontend שולח לפעמים phone ולפעמים email, ולפעמים identifier
    const identifier = req.body.identifier || req.body.email || req.body.phone;
    const { password } = req.body;

    console.log(`[Login Attempt] Identifier: ${identifier}, Password Provided: ${password ? 'Yes' : 'No'}`);

    if (!identifier) {
        return res.status(400).json({ message: "יש להזין כתובת מייל או מספר טלפון" });
    }

    try {
        // 1. חיפוש המשתמש לפי אימייל או טלפון
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR phone = $1',
            [identifier]
        );

        if (userResult.rows.length === 0) {
            console.log(`[Login Failed] User not found: ${identifier}`);
            return res.status(400).json({ message: "שם משתמש או סיסמה שגויים" });
        }

        const user = userResult.rows[0];

        // בדיקת תקינות מידע בסיסי
        if (!user.password) {
            console.error(`[Login Error] User ${identifier} has no password hash in DB.`);
            return res.status(500).json({ message: "שגיאת מערכת: למשתמש זה אין סיסמה מוגדרת. נא לפנות לתמיכה." });
        }

        // 2. בדיקת חסימה
        if (user.is_blocked) {
            return res.status(403).json({ message: `החשבון חסום. סיבה: ${user.blocked_reason}` });
        }

        // 3. בדיקת סיסמה
        const validPassword = await bcrypt.compare(password, user.password);
        console.log(`[Login Debug] Password match for ${identifier}: ${validPassword}`);

        if (!validPassword) {
            console.log(`[Login Failed] Incorrect password for: ${identifier}`);
            return res.status(400).json({ message: "שם משתמש או סיסמה שגויים" });
        }

        // 4. יצירת טוקן
        const token = jwt.sign(
            { id: user.id, is_admin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // סשן ארוך (חודש)
        );

        // 5. עדכון זמן התחברות אחרון
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                is_admin: user.is_admin,
                is_approved: user.is_approved,
                gender: user.gender,
                age: user.age,
                birth_date: user.birth_date,
                city: user.city,
                email: user.email,
                phone: user.phone,
                is_email_verified: user.is_email_verified,
                email_notifications_enabled: user.email_notifications_enabled,
                never_ask_email: user.never_ask_email
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "שגיאה בהתחברות" });
    }
});

// אימות מייל (קבלת קוד)
app.post('/verify-email', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "נא להזין קוד אימות" });
    }

    try {
        const result = await pool.query(
            'SELECT email_verification_code, is_email_verified FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }

        const user = result.rows[0];

        if (user.is_email_verified) {
            return res.json({ message: "המייל כבר מאומת", isVerified: true });
        }

        if (user.email_verification_code === code) {
            await pool.query(
                'UPDATE users SET is_email_verified = TRUE, email_verification_code = NULL WHERE id = $1',
                [userId]
            );
            setImmediate(() => logActivity(userId, 'email_verified'));
            // שליחת מייל ברוכים הבאים לאחר אימות מוצלח
            setImmediate(async () => {
                try {
                    const userInfo = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
                    if (userInfo.rows.length > 0 && userInfo.rows[0].email) {
                        await sendTemplateEmail(userInfo.rows[0].email, 'welcome', {
                            fullName: userInfo.rows[0].full_name || ''
                        }, userId);
                    }
                } catch (e) { console.error('[verify-email] welcome email error:', e.message); }
            });
            return res.json({ message: "המייל אומת בהצלחה! 🎉", isVerified: true });
        } else {
            return res.status(400).json({ message: "קוד אימות שגוי, נא לנסות שוב" });
        }
    } catch (err) {
        console.error("Email verification error:", err);
        res.status(500).json({ message: "שגיאה בתהליך האימות" });
    }
});

// שליחת קוד אימות מחדש
app.post('/resend-verification', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            'SELECT email, full_name, is_email_verified FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "משתמש לא נמצא" });
        if (result.rows[0].is_email_verified) return res.status(400).json({ message: "המייל כבר מאומת" });

        const { email, full_name } = result.rows[0];
        if (!email) return res.status(400).json({ message: "לא מוגדר מייל למשתמש זה" });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query('UPDATE users SET email_verification_code = $1 WHERE id = $2', [verificationCode, userId]);

        await sendTemplateEmail(email, 'verification', { fullName: full_name, code: verificationCode, userId }, userId);
        res.json({ message: "קוד אימות חדש נשלח למייל שלך" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "שגיאה בשליחת המייל" });
    }
});

/**
 * עדכון אימייל ושליחת קוד אימות חדש
 */
app.post('/update-email-and-send-code', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "כתובת מייל לא תקינה" });
    }

    try {
        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "משתמש לא נמצא" });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // עדכון המייל ואיפוס סטטוס אימות + קוד חדש (+ איפוס תזכורת כדי לאפשר שליחה מחדש)
        await pool.query(
            'UPDATE users SET email = $1, is_email_verified = FALSE, email_verification_code = $2, verify_reminder_sent = FALSE WHERE id = $3',
            [email, verificationCode, userId]
        );

        await sendTemplateEmail(email, 'verification', { fullName: userRes.rows[0].full_name, code: verificationCode, userId }, userId);
        
        res.json({ message: "המייל עודכן וקוד אימות נשלח" });
    } catch (err) {
        console.error('[update-email-and-send-code] Error:', err);
        res.status(500).json({ message: "שגיאת שרת" });
    }
});


// דילוג על אימות מייל (המשתמש יקבל תזכורת לאחר מכן)
app.post('/skip-email-verification', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // מסמנים שדילג — לא מוחקים את המייל, הוא יוכל לאמת מאוחר יותר
        // נשלח לו תזכורת בפעם הבאה שייכנס דרך ה-Inbox/פרופיל
        await pool.query(
            'UPDATE users SET email_skip_verification = TRUE WHERE id = $1',
            [userId]
        );
        res.json({ message: "בסדר! ניתן לאמת מאוחר יותר דרך הפרופיל." });
    } catch (err) {
        // אם העמודה לא קיימת — לא נפיל שגיאה, פשוט מדלגים
        console.warn('[skip-email-verification] Column may not exist yet:', err.message);
        res.json({ message: "בסדר! ניתן לאמת מאוחר יותר." });
    }
});

/**
 * עדכון המשתמש שלא לשאול עוד על אימייל
 */
app.post('/never-ask-email', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        await pool.query(
            'UPDATE users SET never_ask_email = TRUE WHERE id = $1',
            [userId]
        );
        res.json({ message: "ההעדפה נשמרה. לא נשאל אותך שוב על מייל." });
    } catch (err) {
        console.error('[never-ask-email] Error:', err.message);
        res.status(500).json({ message: "שגיאת שרת" });
    }
});
// הפעלה/כיבוי התראות מייל
app.post('/toggle-email-notifications', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { enabled } = req.body;
    try {
        await pool.query(
            'UPDATE users SET email_notifications_enabled = $1 WHERE id = $2',
            [enabled, userId]
        );
        res.json({ message: enabled ? "התראות מייל הופעלו" : "התראות מייל כובו", email_notifications_enabled: enabled });
    } catch (err) {
        console.error('[toggle-email-notifications] Error:', err.message);
        res.status(500).json({ message: "שגיאה בעדכון ההגדרות" });
    }
});

// עדכון מספר טלפון
app.post('/update-phone', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "נא להזין מספר טלפון" });
    const cleanPhone = phone.replace(/\D/g, '').trim();
    if (!/^0[2-9]\d{7,8}$/.test(cleanPhone)) {
        return res.status(400).json({ message: "מספר טלפון לא תקין (דוגמה: 0501234567)" });
    }
    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE phone = $1 AND id != $2',
            [cleanPhone, userId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "מספר טלפון זה כבר רשום במערכת" });
        }
        await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [cleanPhone, userId]);
        res.json({ message: "מספר הטלפון עודכן בהצלחה", phone: cleanPhone });
    } catch (err) {
        console.error('[update-phone] Error:', err.message);
        res.status(500).json({ message: "שגיאה בעדכון מספר הטלפון" });
    }
});

// בקשת אימות מחדש (למי שדילג בהרשמה — שולח מייל חדש, פעם אחת בלבד)
app.post('/request-reverify', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT email, full_name, is_email_verified, verify_reminder_sent FROM users WHERE id = $1',
            [userId]
        );

        if (!result.rows.length) return res.status(404).json({ message: 'משתמש לא נמצא' });

        const { email, full_name, is_email_verified, verify_reminder_sent } = result.rows[0];

        if (is_email_verified) {
            return res.json({ message: '✅ כתובת המייל שלך כבר מאומתת!', alreadyVerified: true });
        }

        if (!email) {
            return res.status(400).json({ message: 'לא הוזנה כתובת מייל. יש לעדכן אותה בפרופיל.' });
        }

        // הגבלה: תזכורת נשלחת פעם אחת בלבד
        if (verify_reminder_sent) {
            return res.json({ message: `מייל תזכורת כבר נשלח אל ${email}. אם לא קיבלת — בדוק ספאם, או עדכן את כתובת המייל שלך.`, alreadySent: true });
        }

        // יצירת קוד חדש ושליחה
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query(
            'UPDATE users SET email_verification_code = $1, verify_reminder_sent = TRUE WHERE id = $2',
            [newCode, userId]
        );

        // שולחים דרך הקיים — sendEmail ישלח אפילו לפני אימות כי subject כולל "אימות"
        await sendTemplateEmail(email, 'verify_reminder', {
            fullName: full_name || '',
            code: newCode,
            userId
        }, null); // null = מדלגים על בדיקת is_email_verified (רציונל: זה מייל אימות!)

        res.json({ message: `מייל אימות נשלח אל ${email}` });
    } catch (err) {
        console.error('[request-reverify]', err);
        res.status(500).json({ message: 'שגיאה בשליחת המייל' });
    }
});

// --- נתיבים לאימות והגנה על כתובת מייל ---

// 1. אימות מייל דרך לינק (GET)
app.get('/verify-email-link', async (req, res) => {
    const { code, userId } = req.query;

    if (!code || !userId) return res.send("<h2>מידע חסר בבקשה</h2>");

    try {
        const result = await pool.query(
            'SELECT email_verification_code, is_email_verified FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) return res.send("<h2>משתמש לא נמצא</h2>");
        
        const user = result.rows[0];
        if (user.is_email_verified) return res.send("<h2>המייל שלך כבר מאומת! 🎉</h2><p>ניתן לסגור חלון זה.</p>");

        if (user.email_verification_code === code) {
            await pool.query(
                'UPDATE users SET is_email_verified = TRUE, email_verification_code = NULL WHERE id = $1',
                [userId]
            );
            // שליחת מייל ברוכים הבאים לאחר אימות דרך לינק
            setImmediate(async () => {
                try {
                    const userInfo = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
                    if (userInfo.rows.length > 0 && userInfo.rows[0].email) {
                        await sendTemplateEmail(userInfo.rows[0].email, 'welcome', {
                            fullName: userInfo.rows[0].full_name || ''
                        }, parseInt(userId));
                    }
                } catch (e) { console.error('[verify-email-link] welcome email error:', e.message); }
            });
            res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>אימות הצליח — הפנקס</title>
<style>
  body { margin:0; font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0f1a2e, #1e3a5f); min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .card { background:#fff; border-radius:20px; padding:50px 40px; max-width:420px; width:90%; text-align:center; box-shadow:0 30px 80px rgba(0,0,0,0.4); }
  .icon { font-size:60px; margin-bottom:20px; display:block; }
  h1 { color:#1e3a5f; font-size:24px; margin:0 0 12px; }
  p  { color:#64748b; font-size:15px; margin:0 0 28px; }
  a  { display:inline-block; padding:14px 36px; background:linear-gradient(135deg,#c9a227,#b08d1f); color:#fff; text-decoration:none; border-radius:12px; font-size:16px; font-weight:700; }
</style></head>
<body><div class="card">
  <span class="icon">✅</span>
  <h1>כתובת המייל אומתה בהצלחה!</h1>
  <p>תודה שאימתת את חשבונך. מעכשיו ניתן לקבל הצעות שידוך והתראות מהמערכת.</p>
  <a href="${process.env.APP_URL || 'http://localhost:5173'}">חזרה לפנקס →</a>
</div></body></html>`);
        } else {
            res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>שגיאה — הפנקס</title>
<style>body{margin:0;font-family:sans-serif;background:#1e3a5f;min-height:100vh;display:flex;align-items:center;justify-content:center;}
.card{background:#fff;border-radius:20px;padding:40px;max-width:400px;text-align:center;}
h1{color:#dc2626;} p{color:#64748b;}</style></head>
<body><div class="card"><h1>❌ קוד לא תקין</h1><p>הקוד שגוי או שפג תוקף. נא לחזור לאתר ולבקש קוד חדש.</p></div></body></html>`);
        }
    } catch (err) {
        res.status(500).send("שגיאת שרת בעיבוד הבקשה");
    }
});

// 2. דיווח על "זה לא המייל שלי"
app.get('/report-wrong-email', async (req, res) => {
    const { userId } = req.query;
    
    try {
        // מחיקת האימייל מהמשתמש וביטול התראות כדי שלא יקבל עוד כלום לעולם
        await pool.query(
            'UPDATE users SET email = NULL, email_notifications_enabled = FALSE, is_email_verified = FALSE WHERE id = $1',
            [userId]
        );

        res.send(`
            <div style="direction: rtl; text-align: center; font-family: sans-serif; padding: 50px;">
                <h1>כתובת המייל הוסרה מהמערכת ✉️</h1>
                <p>מצטערים על אי־הנוחות. כתובת המייל הוסרה ולא תקבל מאיתנו הודעות נוספות.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send("שגיאה בעיבוד הבקשה");
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        res.json({ totalUsers: result.rows[0].count });
    } catch (err) {
        console.error("DB Error:", err.message);
        res.status(500).json({ message: "שגיאת שרת", error: err.message });
    }
});

// בדיקת בריאות DB
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        res.json({ status: 'error', db: 'disconnected', error: err.message });
    }
});

// (Removed duplicate Legacy Auth Routes)

// ==========================================
// 🔐 שכחתי סיסמה
// ==========================================

// אחסון קודי איפוס (בזיכרון - בפרודקשן צריך Redis)
const resetCodes = new Map();

// שלב 1: שליחת קוד אימות
app.post('/forgot-password', async (req, res) => {
    const { phone, method, email: emailFromClient } = req.body;

    // ולידציה בסיסית
    if (!phone) {
        return res.status(400).json({ message: "נא להזין מספר טלפון" });
    }
    if (!method) {
        return res.status(400).json({ message: "נא לבחור שיטת קבלת קוד" });
    }

    // ניקוי מספר הטלפון
    const cleanPhone = phone.replace(/\D/g, '').trim();

    try {
        // 1. בדיקה אם המשתמש קיים ושליפת המייל שלו מהדאטאבייס (אבטחה)
        const result = await pool.query(
            'SELECT id, email, full_name FROM users WHERE phone = $1',
            [cleanPhone]
        );

        if (result.rows.length === 0) {
            // נחזיר 404 אבל הודעה כללית (לא לחשוף אם הטלפון קיים)
            return res.status(404).json({ message: "מספר הטלפון לא נמצא במערכת" });
        }

        const user = result.rows[0];
        
        // קביעת כתובת המייל - עדיפות למה שיש ב-DB, אם אין משתמשים במה שנשלח מהלקוח
        const targetEmail = user.email || emailFromClient;

        if (method === 'email' && !targetEmail) {
            return res.status(400).json({ message: "לא מוגדרת כתובת מייל למשתמש זה. נא לפנות לתמיכה." });
        }

        // 2. יצירת קוד 6 ספרות
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. שמירת הקוד בזיכרון (resetCodes)
        resetCodes.set(cleanPhone, {
            code,
            expires: Date.now() + 10 * 60 * 1000,
            attempts: 0,
            method
        });

        // 4. שליחה לפי השיטה שנבחרה
        if (method === 'email') {
            console.log(`[forgot-password] Sending reset code to email: ${targetEmail} for phone: ${cleanPhone}`);
            const sent = await sendTemplateEmail(targetEmail, 'reset_password', {
                code,
                fullName: user.full_name || ''
            });

            if (sent) {
                return res.json({ message: "📧 קוד אימות נשלח למייל שלך!" });
            } else {
                console.error(`[forgot-password] Failed to send email to ${targetEmail}`);
                return res.status(500).json({ message: "תקלה בשליחת המייל — אנא נסה שוב מאוחר יותר, או בחר שיטת שיחה קולית." });
            }
        } else if (method === 'call') {
            console.log(`📞 שיחה קולית לטלפון ${cleanPhone} עם הקוד: ${code}`);
            return res.json({
                message: "📞 שיחה קולית יוצאת אליך עכשיו עם הקוד",
                code: process.env.NODE_ENV === 'production' ? undefined : code 
            });
        } else {
            return res.status(400).json({ message: "נא לבחור שיטת קבלת קוד" });
        }

    } catch (err) {
        console.error("[forgot-password] Server error:", err.message || err);
        res.status(500).json({ message: "שגיאת שרת פנימית" });
    }
});

// שלב 2: אימות הקוד
app.post('/verify-reset-code', async (req, res) => {
    const { phone, code } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').trim();

    const stored = resetCodes.get(cleanPhone);

    if (!stored) {
        return res.status(400).json({ message: "לא נמצא קוד איפוס. נא לבקש קוד חדש." });
    }

    if (Date.now() > stored.expires) {
        resetCodes.delete(cleanPhone);
        return res.status(400).json({ message: "הקוד פג תוקף. נא לבקש קוד חדש." });
    }

    stored.attempts++;
    if (stored.attempts > 5) {
        resetCodes.delete(cleanPhone);
        return res.status(429).json({ message: "יותר מדי ניסיונות. נא לבקש קוד חדש." });
    }

    if (stored.code !== code) {
        return res.status(400).json({ message: "קוד שגוי. נסה שוב." });
    }

    // הקוד נכון - מסמנים שאומת
    stored.verified = true;
    res.json({ message: "הקוד אומת בהצלחה" });
});

// שלב 3: איפוס הסיסמה
app.post('/reset-password', async (req, res) => {
    const { phone, code, newPassword } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').trim();

    const stored = resetCodes.get(cleanPhone);

    if (!stored || !stored.verified || stored.code !== code) {
        return res.status(400).json({ message: "תהליך האימות לא הושלם. התחל מחדש." });
    }

    if (Date.now() > stored.expires) {
        resetCodes.delete(cleanPhone);
        return res.status(400).json({ message: "פג תוקף. התחל מחדש." });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query(
            'UPDATE users SET password = $1 WHERE phone = $2',
            [hashedPassword, cleanPhone]
        );

        resetCodes.delete(cleanPhone);

        res.json({ message: "הסיסמה שונתה בהצלחה!" });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ message: "שגיאת שרת" });
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
                const updateFields = Object.keys(pendingChanges).map((key, i) => `"${key}" = $${i + 1}`).join(', ');
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
                } else {
                    // אין שדות לעדכון אבל צריך לאפס את הדגל
                    await pool.query(
                        `UPDATE users SET is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL WHERE id = $1`,
                        [userId]
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
        console.log(`[Upload] Processing ID upload for user ${userId}, file: ${imageUrl}`);

        try {
            await pool.query(
                `UPDATE users SET 
                    id_card_image_url = $1,
                    id_card_owner_type = $2,
                    id_card_uploaded_at = NOW(),
                    id_card_verified = FALSE
                 WHERE id = $3`,
                [imageUrl, idOwner || 'self', userId]
            );
        } catch (dbErr) {
            console.error("[Upload] Database Update Error:", dbErr);
            throw new Error("Database update failed: " + dbErr.message);
        }

        // שליפת פרטי המשתמש להודעה
        const userResult = await pool.query('SELECT full_name, contact_person_type FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        // הודעה למנהל
        const ownerText = {
            self: 'של המועמד עצמו',
            parent: 'של ההורה',
            candidate: 'של המועמד (הועלה ע"י הורה)'
        };

        try {
            await pool.query(
                `INSERT INTO messages (from_user_id, to_user_id, content, type) 
                 VALUES ($1, 1, $2, 'admin_notification')`,
                [userId, `📷 ${user.full_name} העלה צילום תעודת זהות ${ownerText[idOwner] || 'לאימות'}.\nנא לאמת את הזהות.`]
            );
        } catch (msgErr) {
            console.error("[Upload] Message Insert Error (Non-critical):", msgErr);
            // לא זורקים שגיאה כי זה לא קריטי לכשלון ההעלאה
        }

        console.log("[Upload] Success!");
        res.json({
            message: "תעודת הזהות הועלתה בהצלחה! ✅",
            info: "המנהל יבדוק ויאשר בהקדם.",
            imageUrl
        });

    } catch (err) {
        console.error("Upload ID error (Full Trace):", err);
        res.status(500).json({ message: "שגיאה בהעלאת הקובץ: " + err.message });
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
        // בדיקה אם אני חסום אצל היעד
        const isBlocked = await pool.query(
            'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [targetId, requesterId]
        );
        if (isBlocked.rows.length > 0) {
            return res.status(403).json({ message: "לא ניתן לשלוח בקשה למשתמש זה" });
        }

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

        // שליחת הודעה לצד השני (במערכת + מייל)
        const requesterInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [requesterId]);
        const msgContent = `📷 ${requesterInfo.rows[0].full_name} מבקש/ת לראות את התמונות שלך`;

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, $2, $3, 'photo_request')`,
            [requesterId, targetId, msgContent]
        );

        // מייל בקשת תמונות
        await sendTemplateEmailForUser(targetId, 'photo_request', {
            requesterName: requesterInfo.rows[0].full_name
        });

        setImmediate(() => logActivity(requesterId, 'photo_requested', { targetUserId: parseInt(targetId) }));
        res.json({ message: "הבקשה נשלחה! תקבל הודעה כשיאשרו את הבקשה" });

    } catch (err) {
        console.error("Photo request error:", err);
        res.status(500).json({ message: "שגיאה בשליחת הבקשה" });
    }
});

// תגובה לבקשת תמונות (אישור/לא כרגע/אישור אוטומטי)
app.post('/respond-photo-request', authenticateToken, async (req, res) => {
    const targetId = req.user.id; // מי שמגיב הוא ה-target
    const { requesterId, response, rejectMessage } = req.body; // response: 'approve' / 'reject' / 'auto_approve'

    try {
        if (response === 'reject') {
            await pool.query(
                `UPDATE photo_approvals SET status = 'rejected', updated_at = NOW() 
                 WHERE requester_id = $1 AND target_id = $2`,
                [requesterId, targetId]
            );

            const msgContent = rejectMessage || '📷 הבקשה לצפייה בתמונות נדחתה לעת עתה';

            // הודעה למבקש
            await pool.query(
                `INSERT INTO messages (from_user_id, to_user_id, content, type) 
                 VALUES ($1, $2, $3, 'photo_response')`,
                [targetId, requesterId, msgContent]
            );

            // מייל למבקש — הבקשה נדחתה
            const rejectorInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [targetId]);
            setImmediate(() => sendNewMessageEmail(requesterId, rejectorInfo.rows[0]?.full_name || 'המשתמש', msgContent));
            setImmediate(() => logActivity(targetId, 'photo_rejected', { targetUserId: parseInt(requesterId) }));

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
        const approveMsg = `✅ ${targetInfo.rows[0].full_name} אישר/ה צפייה בתמונות!`;
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) 
             VALUES ($1, $2, $3, 'photo_response')`,
            [targetId, requesterId, approveMsg]
        );

        // מייל למבקש — הבקשה אושרה
        setImmediate(() => sendNewMessageEmail(requesterId, targetInfo.rows[0]?.full_name || 'המשתמש', approveMsg));
        setImmediate(() => logActivity(targetId, 'photo_approved', { targetUserId: parseInt(requesterId) }));

        res.json({
            message: autoApprove
                ? "אישרת! מעכשיו כל תמונה שתעלה תהיה גלויה לו"
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
    const targetId = parseInt(req.params.targetId, 10);
    if (isNaN(targetId)) return res.status(400).json({ canView: false });

    try {
        // בדיקה דו-כיוונית: אם אחד מהצדדים אישר — שניהם רואים
        // updated_at IS NULL מייצג רשומות ישנות שאושרו לפני הוספת העמודה — עדיין מאפשרות צפייה
        const result = await pool.query(
            `SELECT status, updated_at FROM photo_approvals
             WHERE status = 'approved'
               AND (updated_at IS NULL OR updated_at > NOW() - INTERVAL '48 hours')
               AND ((requester_id = $1 AND target_id = $2) OR (requester_id = $2 AND target_id = $1))
             LIMIT 1`,
            [requesterId, targetId]
        );

        const canView = result.rows.length > 0;
        const updatedAt = result.rows[0]?.updated_at;
        const expiresAt = (canView && updatedAt)
            ? new Date(new Date(updatedAt).getTime() + 48 * 60 * 60 * 1000).toISOString()
            : null;

        res.json({ canView, expiresAt });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// קבלת תמונות של מישהו (רק אם יש הרשאה — דו-כיוונית ל-48 שעות)
app.get('/get-user-photos/:targetId', authenticateToken, async (req, res) => {
    const requesterId = req.user.id;
    const targetId = parseInt(req.params.targetId, 10);
    if (isNaN(targetId)) return res.status(400).json({ message: "מזהה לא תקין" });

    try {
        // בדיקת הרשאה דו-כיוונית (updated_at IS NULL = רשומות ישנות, מאפשרות צפייה)
        const permission = await pool.query(
            `SELECT id FROM photo_approvals 
             WHERE status = 'approved'
               AND (updated_at IS NULL OR updated_at > NOW() - INTERVAL '48 hours')
               AND ((requester_id = $1 AND target_id = $2) OR (requester_id = $2 AND target_id = $1))
             LIMIT 1`,
            [requesterId, targetId]
        );

        if (permission.rows.length === 0) {
            return res.status(403).json({ message: "אין הרשאה לצפייה", photos: [] });
        }

        // יש הרשאה — מנסה להביא תמונות מטבלת user_images
        let photos = [];
        try {
            const photosFromTable = await pool.query(
                'SELECT image_url FROM user_images WHERE user_id = $1 ORDER BY id',
                [targetId]
            );
            photos = photosFromTable.rows.map(r => r.image_url);
        } catch (tableErr) {
            console.warn('user_images table issue:', tableErr.message);
        }

        // fallback: profile_images מטבלת users
        if (photos.length === 0) {
            const fromUsers = await pool.query('SELECT profile_images FROM users WHERE id = $1', [targetId]);
            const raw = fromUsers.rows[0]?.profile_images;
            photos = Array.isArray(raw) ? raw : [];
        }

        res.json({ photos });
    } catch (err) {
        console.error('get-user-photos error:', err.message, err.detail || '');
        res.status(500).json({ message: "שגיאה: " + err.message });
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
        birth_date, country_of_birth,
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

        // עיר מגורים (חדש)
        city,

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
        search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss,
        search_occupations, search_life_aspirations
    } = req.body;

    const isMissing = (value) => value === undefined || value === null || value === '';
    const requiredProfileFields = [
        'full_name', 'last_name', 'birth_date', 'gender', 'country_of_birth', 'city', 'status',
        'contact_phone_1', 'contact_person_type', 'family_background', 'heritage_sector',
        'siblings_count', 'height', 'body_type', 'skin_tone', 'appearance', 'current_occupation',
        'has_children',
        'full_address', 'father_full_name', 'mother_full_name',
        'reference_1_name', 'reference_1_phone', 'reference_2_name', 'reference_2_phone',
        'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max',
        'search_body_types', 'search_appearances',
        'search_statuses', 'search_backgrounds', 'search_heritage_sectors',
        'search_occupations', 'search_life_aspirations',
    ];

    const payload = req.body || {};
    const missingFields = requiredProfileFields.filter((field) => isMissing(payload[field]));
    if (payload.country_of_birth === 'abroad') {
        if (isMissing(payload.origin_country)) missingFields.push('origin_country');
        if (isMissing(payload.aliyah_age)) missingFields.push('aliyah_age');
    }
    if (payload.gender === 'male' && isMissing(payload.yeshiva_name)) {
        missingFields.push('yeshiva_name');
    }
    if (payload.gender === 'male' && isMissing(payload.search_head_covering)) {
        missingFields.push('search_head_covering');
    }
    if (payload.gender === 'female' && isMissing(payload.head_covering)) {
        missingFields.push('head_covering');
    }
    if (['working', 'both', 'fixed_times'].includes(payload.current_occupation) && isMissing(payload.work_field)) {
        missingFields.push('work_field');
    }
    if (payload.apartment_help === 'yes' && isMissing(payload.apartment_amount)) {
        missingFields.push('apartment_amount');
    }
    if (payload.has_children === true && isMissing(payload.children_count)) {
        missingFields.push('children_count');
    }

    const minAgeNum = Number(payload.search_min_age);
    const maxAgeNum = Number(payload.search_max_age);
    const minHeightNum = Number(payload.search_height_min);
    const maxHeightNum = Number(payload.search_height_max);
    if (!Number.isNaN(minAgeNum) && !Number.isNaN(maxAgeNum) && minAgeNum > maxAgeNum) {
        return res.status(400).json({ message: "טווח הגילאים אינו תקין", missingFields: ['search_min_age', 'search_max_age'] });
    }
    if (!Number.isNaN(minHeightNum) && !Number.isNaN(maxHeightNum) && minHeightNum > maxHeightNum) {
        return res.status(400).json({ message: "טווח הגובה אינו תקין", missingFields: ['search_height_min', 'search_height_max'] });
    }
    if (missingFields.length > 0) {
        return res.status(400).json({ message: "לא ניתן לשמור פרופיל לא מלא", missingFields: [...new Set(missingFields)] });
    }

    // פונקציית עזר לניקוי ערכים מספריים (ריק הופך ל-null)
    const toNum = (val) => (val === '' || val === undefined || val === null) ? null : Number(val);

    const cleanAge = toNum(age);
    const cleanChildrenCount = toNum(children_count);
    const cleanSiblingsCount = toNum(siblings_count);
    const cleanSiblingPosition = toNum(sibling_position);
    const cleanHeight = toNum(height);
    const cleanSearchMinAge = toNum(search_min_age);
    const cleanSearchMaxAge = toNum(search_max_age);
    const cleanSearchHeightMin = toNum(search_height_min);
    const cleanSearchHeightMax = toNum(search_height_max);

    try {
        const result = await pool.query(
            `UPDATE users SET 
                full_name = $1, last_name = $2, age = $3, gender = $4, phone = COALESCE($5, phone),
                birth_date = $6, country_of_birth = $7,
                status = $8, has_children = $9, children_count = $10,
                contact_person_type = $11, contact_person_name = $12, contact_phone_1 = $13, contact_phone_2 = $14,
                family_background = $15, heritage_sector = $16, father_occupation = $17, mother_occupation = $18,
                father_heritage = $19, mother_heritage = $20, siblings_count = $21, sibling_position = $22,
                height = $23, body_type = $24, skin_tone = $25, appearance = $26,
                apartment_help = $27, current_occupation = $28, yeshiva_name = $29, work_field = $30,
                life_aspiration = $31, favorite_study = $32, study_place = $33, study_field = $34, occupation_details = $35,
                about_me = $36, home_style = $37, partner_description = $38, important_in_life = $39,
                id_card_image_url = $40,
                full_address = $41, father_full_name = $42, mother_full_name = $43, siblings_details = $44,
                reference_1_name = $45, reference_1_phone = $46,
                reference_2_name = $47, reference_2_phone = $48,
                reference_3_name = $49, reference_3_phone = $50,
                family_reference_name = $51, family_reference_phone = $52,
                rabbi_name = $53, rabbi_phone = $54,
                mechutanim_name = $55, mechutanim_phone = $56,
                search_min_age = $57, search_max_age = $58,
                search_height_min = $59, search_height_max = $60,
                search_body_types = $61, search_appearances = $62,
                search_statuses = $63, search_backgrounds = $64,
                search_heritage_sectors = $65, mixed_heritage_ok = $66, search_financial_min = $67, search_financial_discuss = $68,
                search_occupations = $69, search_life_aspirations = $70,
                city = $71,
                is_profile_pending = TRUE
             WHERE id = $72 RETURNING *`,
            [
                full_name, last_name, cleanAge, gender, phone,
                birth_date || null, country_of_birth || null,
                status, has_children, cleanChildrenCount,
                contact_person_type, contact_person_name, contact_phone_1, contact_phone_2,
                family_background, heritage_sector, father_occupation, mother_occupation,
                father_heritage, mother_heritage, cleanSiblingsCount, cleanSiblingPosition,
                cleanHeight, body_type, skin_tone, appearance,
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
                cleanSearchMinAge, cleanSearchMaxAge,
                cleanSearchHeightMin, cleanSearchHeightMax,
                search_body_types, search_appearances,
                search_statuses, search_backgrounds,
                search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss,
                search_occupations, search_life_aspirations,
                city, // עיר מגורים
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

        // יצירת אודיו IVR ברקע (fire & forget)
        try {
            const { generateProfileAudio } = require('./ivr/profileAudio');
            generateProfileAudio(updatedUser).catch(e =>
                console.error('[ProfileAudio] ❌ background:', e.message)
            );
        } catch (e) { /* IVR module not critical */ }

    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "שגיאה בשמירת הנתונים בשרת" });
    }
});

// --- שמירה מיידית לשדות שאינם רגישים (לא מצריכים אישור מנהל) ---
// שדות רגישים שכן דורשים אישור: full_name, last_name, phone, status,
//   full_address, father_full_name, mother_full_name, references, rabbi, mechutanim
const SAFE_FIELDS = new Set([
    'birth_date', 'country_of_birth', 'city', 'gender',
    'heritage_sector', 'family_background', 'father_occupation', 'mother_occupation',
    'father_heritage', 'mother_heritage', 'siblings_count', 'sibling_position',
    'height', 'body_type', 'skin_tone', 'appearance', 'head_covering',
    'apartment_help',
    'current_occupation', 'life_aspiration', 'work_field', 'occupation_details',
    'yeshiva_name', 'yeshiva_ketana_name', 'study_place', 'study_field', 'favorite_study',
    'about_me', 'home_style', 'partner_description', 'important_in_life',
    'contact_person_type', 'contact_person_name', 'contact_phone_1', 'contact_phone_2',
    'has_children', 'children_count',
    'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max',
    'search_body_types', 'search_appearances', 'search_statuses', 'search_backgrounds',
    'search_heritage_sectors', 'mixed_heritage_ok', 'search_financial_min', 'search_financial_discuss',
    'search_occupations', 'search_life_aspirations', 'search_head_covering',
]);

const NUMERIC_FIELDS = new Set(['age', 'height', 'children_count', 'siblings_count', 'sibling_position',
    'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max']);

app.post('/update-safe-fields', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const changes = req.body; // כל השדות הבטוחים

    try {
        const currentUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (currentUserRes.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        const mergedProfile = { ...currentUserRes.rows[0], ...changes };
        const isMissing = (value) => value === undefined || value === null || value === '';
        const requiredForMatching = [
            'birth_date', 'gender', 'city',
            'family_background', 'heritage_sector',
            'height', 'body_type', 'skin_tone', 'appearance',
            'current_occupation',
            'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max',
            'search_body_types', 'search_appearances',
            'search_statuses', 'search_backgrounds', 'search_heritage_sectors',
            'search_occupations', 'search_life_aspirations',
        ];
        const missingFields = requiredForMatching.filter((field) => isMissing(mergedProfile[field]));
        if (mergedProfile.gender === 'male' && isMissing(mergedProfile.yeshiva_name)) {
            missingFields.push('yeshiva_name');
        }
        if (mergedProfile.gender === 'male' && isMissing(mergedProfile.search_head_covering)) {
            missingFields.push('search_head_covering');
        }
        if (mergedProfile.gender === 'female' && isMissing(mergedProfile.head_covering)) {
            missingFields.push('head_covering');
        }
        if (['working', 'both', 'fixed_times'].includes(mergedProfile.current_occupation) && isMissing(mergedProfile.work_field)) {
            missingFields.push('work_field');
        }
        if (mergedProfile.has_children === true && isMissing(mergedProfile.children_count)) {
            missingFields.push('children_count');
        }
        const minAgeNum = Number(mergedProfile.search_min_age);
        const maxAgeNum = Number(mergedProfile.search_max_age);
        const minHeightNum = Number(mergedProfile.search_height_min);
        const maxHeightNum = Number(mergedProfile.search_height_max);
        if (!Number.isNaN(minAgeNum) && !Number.isNaN(maxAgeNum) && minAgeNum > maxAgeNum) {
            return res.status(400).json({ message: "טווח הגילאים אינו תקין", missingFields: ['search_min_age', 'search_max_age'] });
        }
        if (!Number.isNaN(minHeightNum) && !Number.isNaN(maxHeightNum) && minHeightNum > maxHeightNum) {
            return res.status(400).json({ message: "טווח הגובה אינו תקין", missingFields: ['search_height_min', 'search_height_max'] });
        }
        if (missingFields.length > 0) {
            console.error(`[update-safe-fields 400] userId=${userId} gender=${mergedProfile.gender} missing=${JSON.stringify([...new Set(missingFields)])}`);
            return res.status(400).json({ message: "לא ניתן לשמור לפני שהפרופיל מלא", missingFields: [...new Set(missingFields)] });
        }

        // סינון לשדות מאושרים בלבד
        const safeEntries = Object.entries(changes).filter(([key]) => SAFE_FIELDS.has(key));
        if (safeEntries.length === 0) {
            return res.json({ message: "אין שדות לעדכן" });
        }

        const setClause = safeEntries.map(([key], i) => `"${key}" = $${i + 1}`).join(', ');
        const values = safeEntries.map(([key, val]) => {
            if (val === '' || val === undefined) return null;
            if (NUMERIC_FIELDS.has(key)) return (val === null ? null : Number(val));
            return val;
        });

        await pool.query(
            `UPDATE users SET ${setClause} WHERE id = $${values.length + 1}`,
            [...values, userId]
        );

        const updated = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = updated.rows[0];
        delete user.password;
        res.json({ message: "נשמר!", user });

        // יצירת אודיו IVR ברקע
        try {
            const { generateProfileAudio } = require('./ivr/profileAudio');
            generateProfileAudio(updated.rows[0]).catch(e =>
                console.error('[ProfileAudio] ❌ background:', e.message)
            );
        } catch (e) { /* IVR module not critical */ }

    } catch (err) {
        console.error("update-safe-fields error:", err);
        res.status(500).json({ message: "שגיאה בשמירה: " + err.message });
    }
});

// --- בקשה לשינוי פרופיל (דורש אישור מנהל) — לשדות רגישים בלבד ---
// ==========================================
// GET /api/ivr-settings — הגדרות כניסה לטלפון
// ==========================================
app.get('/api/ivr-settings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT allow_ivr_no_pass, ivr_pin FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = result.rows[0];
        res.json({
            allow_ivr_no_pass: user?.allow_ivr_no_pass || false,
            has_pin: !!(user?.ivr_pin)
        });
    } catch (err) {
        console.error('[IVR Settings GET]', err.message);
        res.status(500).json({ message: 'שגיאה בשרת' });
    }
});

// ==========================================
// POST /api/ivr-settings — שמירת הגדרות כניסה לטלפון
// ==========================================
app.post('/api/ivr-settings', authenticateToken, async (req, res) => {
    const { allow_ivr_no_pass, new_pin } = req.body;
    try {
        if (allow_ivr_no_pass) {
            // כניסה מהירה — ללא קוד, מנקים גם PIN קיים
            await pool.query(
                'UPDATE users SET allow_ivr_no_pass = TRUE, ivr_pin = NULL WHERE id = $1',
                [req.user.id]
            );
        } else if (new_pin) {
            // כניסה עם קוד חדש
            if (!/^\d{4}$/.test(new_pin)) {
                return res.status(400).json({ message: 'הקוד חייב להכיל 4 ספרות בדיוק' });
            }
            const pinHash = await bcrypt.hash(new_pin, 10);
            await pool.query(
                'UPDATE users SET allow_ivr_no_pass = FALSE, ivr_pin = $1 WHERE id = $2',
                [pinHash, req.user.id]
            );
        } else {
            // כניסה עם קוד — ללא שינוי קוד קיים
            await pool.query(
                'UPDATE users SET allow_ivr_no_pass = FALSE WHERE id = $1',
                [req.user.id]
            );
        }
        res.json({ success: true, message: 'ההגדרות נשמרו בהצלחה' });
    } catch (err) {
        console.error('[IVR Settings POST]', err.message);
        res.status(500).json({ message: 'שגיאה בשרת' });
    }
});

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

// (הוסר כפילות) upload/delete-profile-image — נתיב יחיד למעלה עם profileImage + users.profile_images

// --- קבלת פרטי המשתמש הנוכחי (כולל תמונות) ---
app.get('/my-profile-data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // שליפת פרטי משתמש
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "משתמש לא נמצא" });

        const user = userRes.rows[0];
        delete user.password; // הסרת סיסמה

        // שליפת תמונות פרופיל — מטבלת user_images (העלאות מהפרופיל) או מעמודת users.profile_images (מהרשמה)
        const imagesRes = await pool.query('SELECT image_url FROM user_images WHERE user_id = $1 ORDER BY id', [userId]);
        const fromUserImages = imagesRes.rows.map(img => img.image_url);
        const fromUsersColumn = Array.isArray(user.profile_images) ? user.profile_images : [];
        user.profile_images = fromUserImages.length > 0 ? fromUserImages : fromUsersColumn;

        // מיזוג pending_changes — כדי שהמשתמש יראה את מה שהגיש (גם אם עדיין לא אושר)
        if (user.pending_changes && typeof user.pending_changes === 'object') {
            const skip = new Set(['id', 'password', 'profile_images', 'profile_images_count', 'is_admin', 'is_blocked', 'is_approved']);
            Object.entries(user.pending_changes).forEach(([key, val]) => {
                if (!skip.has(key) && val !== null && val !== undefined) {
                    user[key] = val;
                }
            });
        }

        res.json(user);
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: "שגיאה בטעינת פרופיל" });
    }
});

// ==========================================
// 💘 מנוע השידוכים (Matches Engine)
// ==========================================

app.get('/matches', authenticateToken, async (req, res) => {
    // Force reload v2
    const userId = req.user.id;

    try {
        // שלב 1: שליפת פרטי המשתמש הנוכחי
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        let currentUser = userResult.rows[0];

        // רק משתמש מאושר רואה רשימת התאמות (הפרונט גם חוסם; כאן הגנה כפולה)
        if (!currentUser.is_approved) {
            return res.json([]);
        }

        // מיזוג pending_changes — כדי שקריטריוני החיפוש והפרטים האישיים
        // (גובה, גוון עור, מגזר וכו') ישמשו אפילו לפני אישור המנהל
        if (currentUser.pending_changes && typeof currentUser.pending_changes === 'object') {
            const skip = new Set(['id', 'password', 'profile_images', 'profile_images_count', 'is_admin', 'is_blocked', 'is_approved', 'is_email_verified']);
            currentUser = { ...currentUser };
            Object.entries(currentUser.pending_changes).forEach(([key, val]) => {
                if (!skip.has(key) && val !== null && val !== undefined && val !== '') {
                    currentUser[key] = val;
                }
            });
        }

        // הגנה: אם אין מגדר - לא נוכל לחפש
        if (!currentUser.gender) {
            return res.json([]);
        }

        // מחפשים את המגדר ההפוך
        const targetGender = currentUser.gender === 'male' ? 'female' : 'male';

        // שלב 2: בניית תנאי הסינון (מתחיל כאן)

        // שלב 2: בניית תנאי הסינון
        let params = [userId];
        let paramIndex = 2; // כי הפרמטר הראשון הוא userId
        let conditions = [
            `is_approved = TRUE`,        // רק מאושרים
            `is_blocked = FALSE`,        // לא חסומים
            `id != $1`,                  // לא אני עצמי
            `gender != (SELECT gender FROM users WHERE id = $1)`, // מין נגדי
            // מסנן רק קשרים פעילים/גמורים — pending נשאר ומסומן על הכרטיס
            `id NOT IN (SELECT receiver_id FROM connections WHERE sender_id = $1 AND status IN ('active','waiting_for_shadchan'))`,
            `id NOT IN (SELECT sender_id FROM connections WHERE receiver_id = $1 AND status IN ('active','waiting_for_shadchan'))`,
            // סינון מוסתרים (סל מחזור)
            `id NOT IN (SELECT hidden_user_id FROM hidden_profiles WHERE user_id = $1)`,
            // סינון משתמשים שחסמו אותי
            `id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = $1)`,
            // סינון משתמשים שחסמתי
            `id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)`
        ];

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
            params.push(Math.round(Number(currentUser.search_height_min)));
            paramIndex++;
        }
        if (currentUser.search_height_max) {
            conditions.push(`height <= $${paramIndex}`);
            params.push(Math.round(Number(currentUser.search_height_max)));
            paramIndex++;
        }

        // סינון לפי מבנה גוף (אם הוגדר) — NULL מותר (לא מפסלים מי שלא מילא)
        if (currentUser.search_body_types && currentUser.search_body_types !== '') {
            const bodyTypes = currentUser.search_body_types.split(',').map(t => t.trim()).filter(Boolean);
            if (bodyTypes.length > 0) {
                const placeholders = bodyTypes.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(body_type IS NULL OR body_type IN (${placeholders}))`);
                params.push(...bodyTypes);
                paramIndex += bodyTypes.length;
            }
        }

        // סינון לפי מראה כללי — NULL מותר (לא מפסלים מי שלא מילא)
        if (currentUser.search_appearances && currentUser.search_appearances !== '') {
            const appearances = currentUser.search_appearances.split(',').map(t => t.trim()).filter(Boolean);
            if (appearances.length > 0) {
                const placeholders = appearances.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(appearance IS NULL OR appearance IN (${placeholders}))`);
                params.push(...appearances);
                paramIndex += appearances.length;
            }
        }

        // סינון לפי רקע משפחתי — NULL מותר
        if (currentUser.search_backgrounds && currentUser.search_backgrounds !== '') {
            const backgrounds = currentUser.search_backgrounds.split(',').map(t => t.trim()).filter(Boolean);
            if (backgrounds.length > 0) {
                const placeholders = backgrounds.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(family_background IS NULL OR family_background IN (${placeholders}))`);
                params.push(...backgrounds);
                paramIndex += backgrounds.length;
            }
        }

        // סינון לפי סטטוס — NULL מותר
        if (currentUser.search_statuses && currentUser.search_statuses !== '') {
            const statuses = currentUser.search_statuses.split(',').map(t => t.trim()).filter(Boolean);
            if (statuses.length > 0) {
                const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(status IS NULL OR status IN (${placeholders}))`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        }

        // סינון לפי מגזר עדתי — mixed_heritage_ok שלי: אם אני מסמן "מתאים כלאיים" מקבל גם מעורב
        if (currentUser.search_heritage_sectors && currentUser.search_heritage_sectors !== '') {
            const sectors = currentUser.search_heritage_sectors.split(',').map(t => t.trim()).filter(Boolean);
            if (sectors.length > 0) {
                const placeholders = sectors.map((_, i) => `$${paramIndex + i}`).join(',');
                params.push(...sectors);
                paramIndex += sectors.length;
                const mixedAccept = currentUser.mixed_heritage_ok
                    ? ` OR (heritage_sector = 'mixed')`
                    : '';
                conditions.push(`(heritage_sector IS NULL OR heritage_sector IN (${placeholders})${mixedAccept})`);
            }
        }

        // סינון לפי עיסוק — NULL מותר
        if (currentUser.search_occupations && currentUser.search_occupations !== '') {
            const occupations = currentUser.search_occupations.split(',').map(t => t.trim()).filter(Boolean);
            if (occupations.length > 0) {
                const placeholders = occupations.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(current_occupation IS NULL OR current_occupation IN (${placeholders}))`);
                params.push(...occupations);
                paramIndex += occupations.length;
            }
        }

        // סינון לפי שאיפות חיים — NULL מותר
        if (currentUser.search_life_aspirations && currentUser.search_life_aspirations !== '') {
            const aspirations = currentUser.search_life_aspirations.split(',').map(t => t.trim()).filter(Boolean);
            if (aspirations.length > 0) {
                const placeholders = aspirations.map((_, i) => `$${paramIndex + i}`).join(',');
                conditions.push(`(life_aspiration IS NULL OR life_aspiration IN (${placeholders}))`);
                params.push(...aspirations);
                paramIndex += aspirations.length;
            }
        }

        // סינון לפי כיסוי ראש:
        // 'paah' → מוצגים head_covering IN ('paah','flexible') OR head_covering IS NULL
        // 'kisui' → מוצגים head_covering IN ('kisui','flexible') OR head_covering IS NULL
        // 'not_relevant' / NULL → כולם
        if (currentUser.search_head_covering && currentUser.search_head_covering !== 'not_relevant') {
            conditions.push(
                `(head_covering IS NULL OR head_covering = 'flexible' OR head_covering = $${paramIndex})`
            );
            params.push(currentUser.search_head_covering);
            paramIndex++;
        }

        // הסבר: בדיקה שגם הצד השני מחפש אותי!
        // המועמד צריך לרצות את הגיל שלי
        if (currentUser.age) {
            const myAge = Math.round(Number(currentUser.age));
            conditions.push(`(search_min_age IS NULL OR search_min_age <= $${paramIndex})`);
            params.push(myAge);
            paramIndex++;
            conditions.push(`(search_max_age IS NULL OR search_max_age >= $${paramIndex})`);
            params.push(myAge);
            paramIndex++;
        }

        // הסבר: המועמד צריך לרצות את הגובה שלי
        if (currentUser.height) {
            const myHeight = Math.round(Number(currentUser.height));
            conditions.push(`(search_height_min IS NULL OR search_height_min <= $${paramIndex})`);
            params.push(myHeight);
            paramIndex++;
            conditions.push(`(search_height_max IS NULL OR search_height_max >= $${paramIndex})`);
            params.push(myHeight);
            paramIndex++;
        }

        // הסבר: המועמד צריך לרצות את המגזר העדתי שלי
        // שימוש ב-regexp_split_to_array עם trim — מטפל ברווחים אחרי פסיקים (ashkenazi, sephardi)
        // mixed_heritage_ok: אם אני מעורב והמועמד מסמן "מתאים כלאיים" — מתקבל
        if (currentUser.heritage_sector) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_heritage_sectors,'')), E'\\\\s*,\\\\s*')`;
            const mixedOk = currentUser.heritage_sector === 'mixed'
                ? ' OR (mixed_heritage_ok = TRUE)'
                : '';
            conditions.push(`(search_heritage_sectors IS NULL OR trim(coalesce(search_heritage_sectors,'')) = '' OR $${paramIndex} = ANY(${arrExpr})${mixedOk})`);
            params.push(currentUser.heritage_sector);
            paramIndex++;
        }

        // המועמד צריך לרצות את הסטטוס שלי (רווק/גרוש/אלמן)
        if (currentUser.status) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_statuses,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_statuses IS NULL OR trim(coalesce(search_statuses,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.status);
            paramIndex++;
        }

        // המועמד צריך לרצות את הרקע הדתי שלי
        if (currentUser.family_background) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_backgrounds,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_backgrounds IS NULL OR trim(coalesce(search_backgrounds,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.family_background);
            paramIndex++;
        }

        // המועמד צריך לרצות את מבנה הגוף שלי
        if (currentUser.body_type) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_body_types,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_body_types IS NULL OR trim(coalesce(search_body_types,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.body_type);
            paramIndex++;
        }

        // המועמד צריך לרצות את המראה שלי
        if (currentUser.appearance) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_appearances,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_appearances IS NULL OR trim(coalesce(search_appearances,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.appearance);
            paramIndex++;
        }

        // המועמד צריך לרצות את העיסוק שלי
        if (currentUser.current_occupation) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_occupations,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_occupations IS NULL OR trim(coalesce(search_occupations,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.current_occupation);
            paramIndex++;
        }

        // המועמד צריך לרצות את השאיפה שלי
        if (currentUser.life_aspiration) {
            const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_life_aspirations,'')), E'\\\\s*,\\\\s*')`;
            conditions.push(`(search_life_aspirations IS NULL OR trim(coalesce(search_life_aspirations,'')) = '' OR $${paramIndex} = ANY(${arrExpr}))`);
            params.push(currentUser.life_aspiration);
            paramIndex++;
        }

        // שלב 3: הרצת השאילתה הסופית
        const query = `
            SELECT id, full_name, last_name, age, height, gender, phone,
                   family_background, heritage_sector, body_type, appearance, skin_tone,
                   current_occupation, about_me, profile_images_count, life_aspiration, study_place, work_field,
                   head_covering, city, status, has_children, children_count
            FROM users
            WHERE ${conditions.join(' AND ')}
            ORDER BY id DESC
            LIMIT 30
        `;

        // Debug log (יש להסיר בפרודקשן)

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error("Match error:", err.message);
        if (typeof params !== 'undefined') console.error("Query params:", params);
        console.error("Full error:", err);
        res.status(500).json({ message: "תקלה בטעינת השידוכים" });
    }
});

// --- דיבאג: בדיקת סינון בין שני משתמשים ---
app.get('/matches-debug/:targetId', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const targetId = req.params.targetId;
    try {
        const [me, target] = await Promise.all([
            pool.query('SELECT * FROM users WHERE id = $1', [myId]),
            pool.query('SELECT * FROM users WHERE id = $1', [targetId])
        ]);
        if (me.rows.length === 0 || target.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }
        const u1 = me.rows[0], u2 = target.rows[0];
        const checks = [];
        // גיל
        if (u1.search_min_age != null && u2.age != null) checks.push({ field: 'גיל מינימלי', ok: u2.age >= u1.search_min_age, v: `${u2.age} >= ${u1.search_min_age}` });
        if (u1.search_max_age != null && u2.age != null) checks.push({ field: 'גיל מקסימלי', ok: u2.age <= u1.search_max_age, v: `${u2.age} <= ${u1.search_max_age}` });
        if (u2.search_min_age != null && u1.age != null) checks.push({ field: 'הצד השני רוצה גיל מינ', ok: u1.age >= u2.search_min_age, v: `${u1.age} >= ${u2.search_min_age}` });
        if (u2.search_max_age != null && u1.age != null) checks.push({ field: 'הצד השני רוצה גיל מקס', ok: u1.age <= u2.search_max_age, v: `${u1.age} <= ${u2.search_max_age}` });
        // גובה
        if (u1.search_height_min != null && u2.height != null) checks.push({ field: 'גובה מינ', ok: u2.height >= u1.search_height_min, v: `${u2.height} >= ${u1.search_height_min}` });
        if (u1.search_height_max != null && u2.height != null) checks.push({ field: 'גובה מקס', ok: u2.height <= u1.search_height_max, v: `${u2.height} <= ${u1.search_height_max}` });
        if (u2.search_height_min != null && u1.height != null) checks.push({ field: 'הצד השני רוצה גובה מינ', ok: u1.height >= u2.search_height_min, v: `${u1.height} >= ${u2.search_height_min}` });
        if (u2.search_height_max != null && u1.height != null) checks.push({ field: 'הצד השני רוצה גובה מקס', ok: u1.height <= u2.search_height_max, v: `${u1.height} <= ${u2.search_height_max}` });
        // מגזר
        const u2InMySectors = !u1.search_heritage_sectors || u1.search_heritage_sectors.split(',').map(t => t.trim()).includes(u2.heritage_sector) || (u2.heritage_sector === 'mixed' && u1.mixed_heritage_ok);
        checks.push({ field: 'מגזר שלי מתאים', ok: u2InMySectors, v: `u2.heritage=${u2.heritage_sector} my_search=${u1.search_heritage_sectors}` });
        const u1InU2Sectors = !u2.search_heritage_sectors || u2.search_heritage_sectors.split(',').map(t => t.trim()).includes(u1.heritage_sector) || (u1.heritage_sector === 'mixed' && u2.mixed_heritage_ok);
        checks.push({ field: 'מגזר שלי מתאים לצד השני', ok: u1InU2Sectors, v: `u1.heritage=${u1.heritage_sector} u2_search=${u2.search_heritage_sectors}` });
        // גבר/אישה
        checks.push({ field: 'מגדר נגדי', ok: u1.gender !== u2.gender, v: `${u1.gender} vs ${u2.gender}` });
        checks.push({ field: 'מאושר', ok: u2.is_approved === true, v: `u2.is_approved=${u2.is_approved}` });
        res.json({ u1: { id: u1.id, name: u1.full_name, gender: u1.gender, age: u1.age, height: u1.height, heritage_sector: u1.heritage_sector, is_approved: u1.is_approved }, u2: { id: u2.id, name: u2.full_name, gender: u2.gender, age: u2.age, height: u2.height, heritage_sector: u2.heritage_sector, is_approved: u2.is_approved }, checks });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// 👮 אזור ניהול (Admin)
// ==========================================

// ==========================================
// 🛡️ ניהול מנהל (Admin Management)
// ==========================================


// שליפת תיקים שממתינים לשדכן
app.get('/admin/waiting-matches', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            `SELECT 
                c.id AS connection_id,
                u1.full_name AS s_name, u1.phone AS s_phone, u1.age AS s_age, u1.heritage_sector AS s_sector,
                u1.rabbi_name AS s_rabbi, u1.rabbi_phone AS s_rabbi_phone,
                u2.full_name AS r_name, u2.phone AS r_phone, u2.age AS r_age, u2.heritage_sector AS r_sector,
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
// 👥 ניהול משתמשים למנהל
// ==========================================

// שליפת כל המשתמשים למנהל
app.get('/admin/all-users', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    try {
        const result = await pool.query(
            `SELECT *
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

        setImmediate(() => logActivity(parseInt(userId), block ? 'admin_blocked_user' : 'admin_unblocked_user', { actorId: req.user.id, note: reason || null }));
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

// שליפת פרטים מלאים של משתמש למנהל (כולל תמונות מהטבלה)
app.get('/admin/user/:id/full', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { id } = req.params;
    try {
        // שליפת כל שדות המשתמש
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "משתמש לא נמצא" });

        const user = userRes.rows[0];
        delete user.password; // לא מחזירים סיסמה

        // שליפת תמונות מהטבלה user_images (תמונות שהועלו אחרי ההרשמה)
        const imagesRes = await pool.query('SELECT image_url FROM user_images WHERE user_id = $1', [id]);
        const fromUserImagesTable = imagesRes.rows.map((img) => img.image_url).filter(Boolean);

        // מיזוג עם עמודת users.profile_images (מערך Postgres / טקסט) — המנהל רואה את כל מה שקיים
        let fromColumn = [];
        const rawCol = user.profile_images;
        if (Array.isArray(rawCol)) {
            fromColumn = rawCol.filter(Boolean);
        } else if (typeof rawCol === 'string' && rawCol.trim()) {
            const t = rawCol.trim();
            if (t.startsWith('[')) {
                try {
                    const parsed = JSON.parse(t);
                    fromColumn = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
                } catch {
                    fromColumn = [];
                }
            } else {
                fromColumn = [t];
            }
        }
        const merged = [...new Set([...fromUserImagesTable, ...fromColumn])];
        if (merged.length > 0) {
            user.profile_images = merged;
        }

        res.json(user);
    } catch (err) {
        console.error("Get full user error:", err);
        res.status(500).json({ message: "שגיאה בשליפת פרטי משתמש" });
    }
});


// שליחת הודעה מהמנהל למשתמש
app.post('/admin/send-message', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "אין לך הרשאות מנהל" });

    const { userId, message } = req.body;

    try {
        const finalContent = `📬 הודעה מהמנהל:\n${message}`;

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'admin_message')`,
            [userId, finalContent]
        );

        // שליחת מייל למשתמש (אם יש לו אימייל ומופעלת קבלת התראות)
        await sendNewMessageEmail(userId, 'מנהל המערכת', finalContent);

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
    const myId = req.user.id;
    const { targetId } = req.body;
    if (!targetId || Number(targetId) === Number(myId)) {
        return res.status(400).json({ message: "בקשה לא תקינה" });
    }
    try {
        // בדיקה אם אני חסום אצל היעד
        const isBlocked = await pool.query(
            'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [targetId, myId]
        );
        if (isBlocked.rows.length > 0) {
            return res.status(400).json({ message: "ההצעה אינה זמינה כרגע" });
        }

        // בדיקה אם כבר יש בקשה פעילה/ממתינה בין השניים (ביטול ודחייה מאפשרים פנייה מחדש)
        const existing = await pool.query(
            `SELECT id FROM connections
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
             AND status NOT IN ('rejected', 'cancelled')`,
            [myId, targetId]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "כבר שלחת בקשה למשתמש זה" });
        }

        await pool.query(
            `INSERT INTO connections (sender_id, receiver_id) VALUES ($1, $2)`,
            [myId, targetId]
        );

        setImmediate(() => logActivity(myId, 'connection_sent', { targetUserId: parseInt(targetId) }));
        res.json({ message: "🎉 הפנייה נשלחה בהצלחה!" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה ביצירת הקשר" });
    }
});

// דואר נכנס (Inbox) - בקשות שממתינות לי
app.get('/my-requests', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // סמן כל פנייה שנפתחת בפעם הראשונה
        await pool.query(
            `UPDATE connections SET receiver_first_viewed_at = NOW()
             WHERE receiver_id = $1 AND status = 'pending' AND receiver_first_viewed_at IS NULL`,
            [userId]
        );
        const result = await pool.query(
            `SELECT c.id AS connection_id, c.created_at,
                    u.id AS user_id, u.full_name, u.age, u.height, u.heritage_sector,
                    u.family_background, u.body_type, u.appearance, u.current_occupation,
                    u.about_me, u.city, u.profile_images_count, u.life_aspiration,
                    u.study_place, u.work_field, u.gender, u.skin_tone,
                    u.head_covering, u.status, u.has_children, u.children_count
             FROM connections c
             JOIN users u ON c.sender_id = u.id
             WHERE c.receiver_id = $1 AND c.status = 'pending'
             ORDER BY c.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת בקשות" });
    }
});

// הבקשות שאני שלחתי ועדיין ממתינות לתשובה
app.get('/my-sent-requests', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT c.id AS connection_id, c.created_at, c.status,
                    c.receiver_first_viewed_at,
                    u.id AS user_id, u.full_name, u.age, u.height, u.heritage_sector,
                    u.family_background, u.body_type, u.appearance, u.current_occupation,
                    u.about_me, u.city, u.profile_images_count, u.life_aspiration,
                    u.study_place, u.work_field, u.gender, u.skin_tone,
                    u.head_covering, u.status, u.has_children, u.children_count
             FROM connections c
             JOIN users u ON c.receiver_id = u.id
             WHERE c.sender_id = $1 AND c.status = 'pending'
             ORDER BY c.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת הבקשות" });
    }
});

// בקשות תמונות שנשלחו ועדיין ממתינות
app.get('/my-sent-photo-requests', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT pa.id, pa.created_at, pa.status,
                    u.id AS user_id, u.full_name, u.age, u.height, u.heritage_sector,
                    u.family_background, u.body_type, u.appearance, u.current_occupation,
                    u.about_me, u.city, u.profile_images_count, u.life_aspiration,
                    u.study_place, u.work_field, u.gender, u.skin_tone,
                    u.head_covering, u.status, u.has_children, u.children_count
             FROM photo_approvals pa
             JOIN users u ON pa.target_id = u.id
             WHERE pa.requester_id = $1 AND pa.status = 'pending'
             ORDER BY pa.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת בקשות תמונה" });
    }
});

// כרטיס פרופיל ציבורי — לצפייה בפרטים המותרים בשלב זה
app.get('/match-card/:userId', authenticateToken, async (req, res) => {
    const targetId = req.params.userId;
    const myId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT id, full_name, last_name, age, height, gender, city, status,
                    has_children, children_count,
                    family_background, heritage_sector,
                    father_heritage, mother_heritage, father_occupation, mother_occupation,
                    siblings_count, sibling_position, country_of_birth,
                    body_type, appearance, skin_tone,
                    about_me, home_style, important_in_life, partner_description,
                    apartment_help, apartment_amount,
                    current_occupation, life_aspiration, work_field, occupation_details,
                    yeshiva_name, yeshiva_ketana_name, study_place, study_field, favorite_study,
                    profile_images_count, created_at, head_covering
             FROM users WHERE id = $1 AND is_approved = TRUE AND is_blocked = FALSE`,
            [targetId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "לא נמצא" });

        // בדיקה אם המשתמש חסם אותי — מחזיר 404 גנרי כדי לא לחשוף שחסמו
        const blockedByTarget = await pool.query(
            'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [targetId, myId]
        );
        if (blockedByTarget.rows.length > 0) {
            return res.status(404).json({ message: "הכרטיס אינו זמין כרגע" });
        }

        // בדיקה אם אני חסמתי אותו
        const blockedByMe = await pool.query(
            'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [myId, targetId]
        );

        const card = result.rows[0];
        card.i_blocked_them = blockedByMe.rows.length > 0;
        res.json(card);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// ביטול בקשת חיבור שנשלחה
app.post('/cancel-request', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { connectionId } = req.body;
    try {
        const check = await pool.query(
            `SELECT c.id, c.receiver_id, u.full_name AS sender_name
             FROM connections c JOIN users u ON u.id = c.sender_id
             WHERE c.id = $1 AND c.sender_id = $2 AND c.status = 'pending'`,
            [connectionId, userId]
        );
        if (check.rows.length === 0) return res.status(403).json({ message: "לא ניתן לבטל" });

        const { receiver_id, sender_name } = check.rows[0];

        // שליחת הודעה למקבל לפני המחיקה
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES ($1, $2, $3, 'system')`,
            [userId, receiver_id, `ℹ️ ${sender_name} ביטל/ה את פנייתו/ה.`]
        );
        setImmediate(() => sendNewMessageEmail(receiver_id, sender_name, `ℹ️ ${sender_name} ביטל/ה את פנייתו/ה.`));

        await pool.query('DELETE FROM connections WHERE id = $1', [connectionId]);
        setImmediate(() => logActivity(userId, 'connection_cancelled', { targetUserId: receiver_id }));
        res.json({ message: "הבקשה בוטלה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה בביטול" });
    }
});

// ביטול בקשת תמונה שנשלחה
app.post('/cancel-photo-request', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { targetId } = req.body;
    try {
        const check = await pool.query(
            "SELECT id FROM photo_approvals WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'",
            [userId, targetId]
        );
        if (check.rows.length === 0) return res.status(403).json({ message: "לא נמצאה בקשה פעילה" });
        await pool.query(
            "DELETE FROM photo_approvals WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'",
            [userId, targetId]
        );
        res.json({ message: "הבקשה בוטלה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה בביטול" });
    }
});

// אישור בקשה (שלב 1)
app.post('/approve-request', authenticateToken, async (req, res) => {
    const { connectionId } = req.body;
    const userId = req.user.id;
    try {
        const connRow = await pool.query(
            'SELECT sender_id, receiver_id, status FROM connections WHERE id = $1',
            [connectionId]
        );
        if (connRow.rows.length === 0) return res.status(404).json({ message: "לא נמצא" });
        const { sender_id: originalSenderId, receiver_id, status: connStatus } = connRow.rows[0];
        if (connStatus !== 'pending') {
            return res.status(400).json({ message: "הבקשה כבר לא ממתינה" });
        }
        if (receiver_id !== userId) {
            return res.status(403).json({ message: "רק מקבל הבקשה יכול לאשר" });
        }

        await pool.query(
            `UPDATE connections SET status = 'active', updated_at = NOW(), last_action_by = $1 WHERE id = $2`,
            [userId, connectionId]
        );

        // הודעת מייל לשולח הבקשה המקורי — הבקשה שלו אושרה!
        if (originalSenderId && originalSenderId !== userId) {
            const approverInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
            const approverName = approverInfo.rows[0]?.full_name || 'הצד השני';
            setImmediate(() => sendTemplateEmailForUser(originalSenderId, 'connection_accepted', {
                acceptorName: approverName
            }));
        }

        setImmediate(() => {
            logActivity(userId, 'connection_approved', { targetUserId: originalSenderId });
            logActivity(originalSenderId, 'connection_got_approved', { targetUserId: userId });
        });
        res.json({ message: "הבקשה אושרה! ההתאמה מופיעה כעת תחת שיחות פעילות." });
    } catch (err) {
        res.status(500).json({ message: "שגיאה באישור" });
    }
});

// דחיית בקשה
app.post('/reject-request', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { connectionId } = req.body;
    try {
        const connRow = await pool.query(
            `SELECT c.receiver_id, c.sender_id, c.status,
                    u_recv.full_name AS receiver_name
             FROM connections c
             JOIN users u_recv ON u_recv.id = c.receiver_id
             WHERE c.id = $1`,
            [connectionId]
        );
        if (connRow.rows.length === 0) return res.status(404).json({ message: "לא נמצא" });
        if (connRow.rows[0].receiver_id !== userId) {
            return res.status(403).json({ message: "רק מקבל הבקשה יכול לדחות" });
        }
        if (connRow.rows[0].status !== 'pending') {
            return res.status(400).json({ message: "הבקשה כבר לא ממתינה" });
        }
        const senderId = connRow.rows[0].sender_id;
        const receiverName = connRow.rows[0].receiver_name;
        await pool.query(`UPDATE connections SET status = 'rejected' WHERE id = $1`, [connectionId]);
        setImmediate(() => sendNewMessageEmail(senderId, receiverName, `הפנייה שלך נדחתה בשלב זה.`));
        setImmediate(() => logActivity(userId, 'connection_rejected', { targetUserId: senderId }));
        res.json({ message: "הבקשה נדחתה." });
    } catch (err) {
        res.status(500).json({ message: "שגיאה בדחייה" });
    }
});

// ביטול שידוך פעיל (מ-Connections) — מחזיר מצב לקדמותו ושולח הודעה לצד השני
app.post('/cancel-active-connection', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { connectionId, reason } = req.body;
    try {
        const check = await pool.query(
            `SELECT c.*, u1.full_name AS sender_name, u2.full_name AS receiver_name
             FROM connections c
             JOIN users u1 ON c.sender_id = u1.id
             JOIN users u2 ON c.receiver_id = u2.id
             WHERE c.id = $1 AND (c.sender_id = $2 OR c.receiver_id = $2)
               AND c.status IN ('active','waiting_for_shadchan')`,
            [connectionId, userId]
        );
        if (check.rows.length === 0) return res.status(403).json({ message: "לא ניתן לבטל" });

        const conn = check.rows[0];
        const otherUserId = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
        const myName = conn.sender_id === userId ? conn.sender_name : conn.receiver_name;

        // עדכון סטטוס לבוטל
        await pool.query(`UPDATE connections SET status = 'cancelled' WHERE id = $1`, [connectionId]);

        // איפוס אישורים סופיים
        await pool.query(`UPDATE connections SET sender_final_approve = false, receiver_final_approve = false WHERE id = $1`, [connectionId]);

        // ביטול הרשאות צפייה בתמונות — השידוך ירד, אין סיבה שהצדדים ימשיכו לראות תמונות
        await pool.query(
            `DELETE FROM photo_approvals
             WHERE (requester_id = $1 AND target_id = $2)
                OR (requester_id = $2 AND target_id = $1)`,
            [conn.sender_id, conn.receiver_id]
        );

        // הודעה לצד השני
        const msgContent = reason
            ? `${myName} ביטל/ה את הצעת השידוך.\nסיבה: ${reason}`
            : `${myName} ביטל/ה את הצעת השידוך.`;
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES ($1, $2, $3, 'system')`,
            [userId, otherUserId, msgContent]
        );
        setImmediate(() => sendNewMessageEmail(otherUserId, myName, msgContent));
        setImmediate(() => logActivity(userId, 'connection_cancelled', { targetUserId: otherUserId, note: reason || null }));

        res.json({ message: "השידוך בוטל" });
    } catch (err) {
        console.error("Error cancelling connection:", err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// השיחות הפעילות שלי
app.get('/my-connections', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT c.id, c.status, c.sender_id, c.receiver_id, c.sender_final_approve, c.receiver_final_approve,
                u.full_name, u.phone, u.reference_1_name, u.reference_1_phone,
                u.reference_2_name, u.reference_2_phone, u.rabbi_name, u.rabbi_phone,
                u.full_address, u.father_full_name, u.mother_full_name
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
    const { connectionId } = req.body;
    const userId = req.user.id;
    try {
        const checkUser = await pool.query(`SELECT sender_id, receiver_id FROM connections WHERE id = $1`, [connectionId]);
        if (checkUser.rows.length === 0) return res.status(404).json({ message: "לא נמצא" });

        const conn = checkUser.rows[0];
        if (conn.sender_id !== userId && conn.receiver_id !== userId) {
            return res.status(403).json({ message: "אין הרשאה" });
        }
        let updateField = conn.sender_id === userId ? 'sender_final_approve' : 'receiver_final_approve';

        await pool.query(`UPDATE connections SET ${updateField} = TRUE WHERE id = $1`, [connectionId]);

        const otherUserId = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
        setImmediate(() => logActivity(userId, 'payment_terms_accepted', {
            targetUserId: otherUserId,
            note: `אישר תנאי תשלום (4000 ש"ח לשדכנית במקרה של הצלחה) — חיבור #${connectionId}`
        }));

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
    const userId = req.user.id;
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "חסר נתיב תמונה" });
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
    const userId = req.user.id;
    try {
        const row = await pool.query('SELECT id FROM user_images WHERE id = $1 AND user_id = $2', [imageId, userId]);
        if (row.rows.length === 0) return res.status(403).json({ message: "אין הרשאה" });
        await pool.query('DELETE FROM user_images WHERE id = $1', [imageId]);
        res.json({ message: "התמונה נמחקה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה במחיקה" });
    }
});

// שליפת תמונות של משתמש
app.get('/api/user-images/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const me = req.user.id;
    const isAdmin = req.user.is_admin === true;
    if (!isAdmin && String(userId) !== String(me)) {
        return res.status(403).json({ message: "אין הרשאה" });
    }
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
                c.status, c.shadchanit_id,
                -- פרטי צד א' (השולח)
                c.sender_id,
                u1.full_name AS sender_name, u1.phone AS sender_phone, 
                u1.age AS sender_age, u1.heritage_sector AS sender_sector,
                u1.rabbi_name AS sender_rabbi, u1.rabbi_phone AS sender_rabbi_phone,
                u1.reference_1_name AS s_ref1, u1.reference_1_phone AS s_ref1_phone,
                
                -- פרטי צד ב' (המקבל)
                c.receiver_id,
                u2.full_name AS receiver_name, u2.phone AS receiver_phone, 
                u2.age AS receiver_age, u2.heritage_sector AS receiver_sector,
                u2.rabbi_name AS receiver_rabbi, u2.rabbi_phone AS receiver_rabbi_phone,
                u2.reference_1_name AS r_ref1, u2.reference_1_phone AS r_ref1_phone

            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            WHERE c.status = 'waiting_for_shadchan'
            ORDER BY c.updated_at DESC
        `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (err) {
        console.error("Error fetching admin matches:", err);
        res.status(500).json({ message: "שגיאת שרת בשליפת שידוכים" });
    }
});

// תמונות משתמש לאדמין (ללא בדיקת הרשאות 48 שעות)
app.get('/admin/user-photos/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const userId = parseInt(req.params.userId, 10);
    try {
        let photos = [];
        const fromTable = await pool.query('SELECT image_url FROM user_images WHERE user_id = $1 ORDER BY id', [userId]);
        photos = fromTable.rows.map(r => r.image_url);
        if (photos.length === 0) {
            const fromUsers = await pool.query('SELECT profile_images FROM users WHERE id = $1', [userId]);
            const raw = fromUsers.rows[0]?.profile_images;
            photos = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        }
        res.json({ photos });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// ==========================================
// 👰 ניהול שדכניות ושידוכים
// ==========================================

// סגירת תיק שידוך - סימון כטופל (ישן)
app.put('/admin/mark-handled/:connectionId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { connectionId } = req.params;
    try {
        await pool.query(`UPDATE connections SET status = 'handled' WHERE id = $1`, [connectionId]);
        res.json({ message: "התיק סומן כטופל" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// שליפת כל השדכניות
app.get('/admin/shadchaniot', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        const result = await pool.query(
            `SELECT s.*, 
                    COUNT(c.id) FILTER (WHERE c.status NOT IN ('handled','rejected','cancelled')) AS active_matches,
                    COUNT(c.id) FILTER (WHERE c.match_succeeded = true) AS successful_matches
             FROM shadchaniot s
             LEFT JOIN connections c ON c.shadchanit_id = s.id
             GROUP BY s.id
             ORDER BY s.name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// הוספת שדכנית
app.post('/admin/shadchaniot', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO shadchaniot (name, phone, email) VALUES ($1, $2, $3) RETURNING *`,
            [name, phone, email]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// עדכון שדכנית
app.put('/admin/shadchaniot/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { name, phone, email } = req.body;
    try {
        const result = await pool.query(
            `UPDATE shadchaniot SET name=$1, phone=$2, email=$3 WHERE id=$4 RETURNING *`,
            [name, phone, email, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// מחיקת שדכנית
app.delete('/admin/shadchaniot/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        await pool.query(`UPDATE connections SET shadchanit_id = NULL WHERE shadchanit_id = $1`, [req.params.id]);
        await pool.query(`DELETE FROM shadchaniot WHERE id = $1`, [req.params.id]);
        res.json({ message: "נמחקה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// שיוך שדכנית לשידוך
app.put('/admin/match-shadchanit/:connectionId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { shadchanitId } = req.body;
    try {
        await pool.query(`UPDATE connections SET shadchanit_id = $1 WHERE id = $2`, [shadchanitId || null, req.params.connectionId]);
        res.json({ message: "שדכנית עודכנה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// שליחת כרטיסיות לשדכנית במייל
app.post('/admin/send-match-cards/:connectionId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { connectionId } = req.params;
    try {
        // שליפת פרטי השידוך, המשתמשים, והשדכנית
        const matchRes = await pool.query(`
            SELECT c.*,
                u1.full_name AS sender_name, u1.last_name AS sender_last, u1.age AS sender_age,
                u1.phone AS sender_phone, u1.email AS sender_email,
                u1.city AS sender_city, u1.heritage_sector AS sender_sector,
                u1.rabbi_name AS sender_rabbi, u1.rabbi_phone AS sender_rabbi_phone,
                u1.contact_person_name AS sender_contact, u1.contact_phone_1 AS sender_contact_phone,
                u1.gender AS sender_gender, u1.profile_images AS sender_images,
                u1.height AS sender_height, u1.body_type AS sender_body_type,
                u1.father_heritage AS sender_father_heritage, u1.mother_heritage AS sender_mother_heritage,
                u1.siblings_count AS sender_siblings, u1.sibling_position AS sender_sibling_position,
                u1.current_occupation AS sender_occupation, u1.yeshiva_name AS sender_yeshiva,
                u1.work_field AS sender_work_field,
                u1.father_full_name AS sender_father_name, u1.mother_full_name AS sender_mother_name,
                u1.reference_1_name AS sender_ref1_name, u1.reference_1_phone AS sender_ref1_phone,
                u1.reference_2_name AS sender_ref2_name, u1.reference_2_phone AS sender_ref2_phone,
                u1.about_me AS sender_about, u1.partner_description AS sender_partner_desc,
                u2.full_name AS receiver_name, u2.last_name AS receiver_last, u2.age AS receiver_age,
                u2.phone AS receiver_phone, u2.email AS receiver_email,
                u2.city AS receiver_city, u2.heritage_sector AS receiver_sector,
                u2.rabbi_name AS receiver_rabbi, u2.rabbi_phone AS receiver_rabbi_phone,
                u2.contact_person_name AS receiver_contact, u2.contact_phone_1 AS receiver_contact_phone,
                u2.gender AS receiver_gender, u2.profile_images AS receiver_images,
                u2.height AS receiver_height, u2.body_type AS receiver_body_type,
                u2.father_heritage AS receiver_father_heritage, u2.mother_heritage AS receiver_mother_heritage,
                u2.siblings_count AS receiver_siblings, u2.sibling_position AS receiver_sibling_position,
                u2.current_occupation AS receiver_occupation, u2.yeshiva_name AS receiver_yeshiva,
                u2.work_field AS receiver_work_field,
                u2.father_full_name AS receiver_father_name, u2.mother_full_name AS receiver_mother_name,
                u2.reference_1_name AS receiver_ref1_name, u2.reference_1_phone AS receiver_ref1_phone,
                u2.reference_2_name AS receiver_ref2_name, u2.reference_2_phone AS receiver_ref2_phone,
                u2.about_me AS receiver_about, u2.partner_description AS receiver_partner_desc,
                s.name AS shadchanit_name, s.email AS shadchanit_email
            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            LEFT JOIN shadchaniot s ON c.shadchanit_id = s.id
            WHERE c.id = $1
        `, [connectionId]);

        if (!matchRes.rows.length) return res.status(404).json({ message: "שידוך לא נמצא" });
        const m = matchRes.rows[0];

        if (!m.shadchanit_email) return res.status(400).json({ message: "לא שויכה שדכנית לשידוך זה" });

        const sectorLabels = {
            haredi: 'חרדי', dati_leumi: 'דתי לאומי', ashkenazi: 'אשכנזי',
            sephardi: 'ספרדי', teimani: 'תימני', mixed: 'מעורב'
        };

        const cardHTML = (side, data) => `
            <div style="background:#f8f9fa;padding:16px;border-radius:10px;margin-bottom:20px;border-right:4px solid #c9a227;direction:rtl">
                <h3 style="color:#1e3a5f;margin:0 0 12px;font-size:1.1rem;border-bottom:1px solid #e5e7eb;padding-bottom:8px">${side}: ${data.name} ${data.last || ''}</h3>
                <table style="width:100%;border-collapse:collapse;font-size:0.92rem">
                    <tr><td style="padding:3px 0;color:#374151;width:38%"><strong>גיל:</strong></td><td style="padding:3px 0;color:#1f2937">${data.age || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>עיר:</strong></td><td style="padding:3px 0;color:#1f2937">${data.city || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>גובה:</strong></td><td style="padding:3px 0;color:#1f2937">${data.height ? data.height + ' ס"מ' : '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>מגזר:</strong></td><td style="padding:3px 0;color:#1f2937">${sectorLabels[data.sector] || data.sector || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>עדת אב:</strong></td><td style="padding:3px 0;color:#1f2937">${data.fatherHeritage || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>עדת אם:</strong></td><td style="padding:3px 0;color:#1f2937">${data.motherHeritage || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>טלפון:</strong></td><td style="padding:3px 0;color:#1f2937">${data.phone || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>מייל:</strong></td><td style="padding:3px 0;color:#1f2937">${data.email || '—'}</td></tr>
                    ${data.occupation ? `<tr><td style="padding:3px 0;color:#374151"><strong>עיסוק/ישיבה:</strong></td><td style="padding:3px 0;color:#1f2937">${data.occupation}${data.yeshiva ? ' — ' + data.yeshiva : ''}</td></tr>` : ''}
                    <tr><td style="padding:3px 0;color:#374151"><strong>אחים/אחיות:</strong></td><td style="padding:3px 0;color:#1f2937">${data.siblings != null ? data.siblings + ' (מקום ' + (data.siblingPos || '—') + ')' : '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>שם האב:</strong></td><td style="padding:3px 0;color:#1f2937">${data.fatherName || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>שם האם:</strong></td><td style="padding:3px 0;color:#1f2937">${data.motherName || '—'}</td></tr>
                    <tr><td style="padding:3px 0;color:#374151"><strong>רב/ממליץ:</strong></td><td style="padding:3px 0;color:#1f2937">${data.rabbi || '—'}${data.rabbiPhone ? ' · ' + data.rabbiPhone : ''}</td></tr>
                    ${data.ref1Name ? `<tr><td style="padding:3px 0;color:#374151"><strong>ממליץ 1:</strong></td><td style="padding:3px 0;color:#1f2937">${data.ref1Name}${data.ref1Phone ? ' · ' + data.ref1Phone : ''}</td></tr>` : ''}
                    ${data.ref2Name ? `<tr><td style="padding:3px 0;color:#374151"><strong>ממליץ 2:</strong></td><td style="padding:3px 0;color:#1f2937">${data.ref2Name}${data.ref2Phone ? ' · ' + data.ref2Phone : ''}</td></tr>` : ''}
                    <tr><td style="padding:3px 0;color:#374151"><strong>איש קשר:</strong></td><td style="padding:3px 0;color:#1f2937">${data.contact || '—'}${data.contactPhone ? ' · ' + data.contactPhone : ''}</td></tr>
                </table>
                ${data.about ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb"><strong style="color:#374151">על עצמי:</strong><p style="color:#4b5563;margin:4px 0 0;font-size:0.9rem">${data.about}</p></div>` : ''}
                ${data.partnerDesc ? `<div style="margin-top:8px"><strong style="color:#374151">מה מחפש/ת:</strong><p style="color:#4b5563;margin:4px 0 0;font-size:0.9rem">${data.partnerDesc}</p></div>` : ''}
            </div>
        `;

        const emailBody = `
            <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#1e3a5f;text-align:center">💍 כרטיסיות שידוך</h2>
                <p>שלום ${m.shadchanit_name},</p>
                <p>להלן פרטי הזוג שהועבר לטיפולך:</p>
                ${cardHTML('צד א׳', {
                    name: m.sender_name, last: m.sender_last, age: m.sender_age,
                    city: m.sender_city, sector: m.sender_sector, phone: m.sender_phone,
                    email: m.sender_email, rabbi: m.sender_rabbi, rabbiPhone: m.sender_rabbi_phone,
                    contact: m.sender_contact, contactPhone: m.sender_contact_phone,
                    height: m.sender_height, fatherHeritage: m.sender_father_heritage,
                    motherHeritage: m.sender_mother_heritage, siblings: m.sender_siblings,
                    siblingPos: m.sender_sibling_position, occupation: m.sender_occupation,
                    yeshiva: m.sender_yeshiva, fatherName: m.sender_father_name,
                    motherName: m.sender_mother_name, ref1Name: m.sender_ref1_name,
                    ref1Phone: m.sender_ref1_phone, ref2Name: m.sender_ref2_name,
                    ref2Phone: m.sender_ref2_phone, about: m.sender_about,
                    partnerDesc: m.sender_partner_desc
                })}
                ${cardHTML('צד ב׳', {
                    name: m.receiver_name, last: m.receiver_last, age: m.receiver_age,
                    city: m.receiver_city, sector: m.receiver_sector, phone: m.receiver_phone,
                    email: m.receiver_email, rabbi: m.receiver_rabbi, rabbiPhone: m.receiver_rabbi_phone,
                    contact: m.receiver_contact, contactPhone: m.receiver_contact_phone,
                    height: m.receiver_height, fatherHeritage: m.receiver_father_heritage,
                    motherHeritage: m.receiver_mother_heritage, siblings: m.receiver_siblings,
                    siblingPos: m.receiver_sibling_position, occupation: m.receiver_occupation,
                    yeshiva: m.receiver_yeshiva, fatherName: m.receiver_father_name,
                    motherName: m.receiver_mother_name, ref1Name: m.receiver_ref1_name,
                    ref1Phone: m.receiver_ref1_phone, ref2Name: m.receiver_ref2_name,
                    ref2Phone: m.receiver_ref2_phone, about: m.receiver_about,
                    partnerDesc: m.receiver_partner_desc
                })}
                <p style="color:#666;font-size:0.85rem;margin-top:20px">נשלח ממערכת השידוכים האדמיניסטרטיבית</p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: m.shadchanit_email,
            subject: `💍 כרטיסיות שידוך: ${m.sender_name} & ${m.receiver_name}`,
            html: emailBody
        });

        setImmediate(() => {
            logActivity(m.sender_id, 'match_sent_to_shadchan', { targetUserId: m.receiver_id, actorId: req.user.id });
            logActivity(m.receiver_id, 'match_sent_to_shadchan', { targetUserId: m.sender_id, actorId: req.user.id });
        });
        res.json({ message: "הכרטיסיות נשלחו בהצלחה" });
    } catch (err) {
        console.error("Error sending match cards:", err);
        res.status(500).json({ message: "שגיאה בשליחת המייל" });
    }
});

// סגירת שידוך (הצלחה / כישלון)
app.post('/admin/close-match/:connectionId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { connectionId } = req.params;
    const { succeeded, failReason, summary } = req.body;
    try {
        const connInfo = await pool.query('SELECT sender_id, receiver_id FROM connections WHERE id = $1', [connectionId]);
        const conn = connInfo.rows[0];

        if (succeeded) {
            await pool.query(
                `UPDATE connections SET status = 'successful', match_succeeded = true, close_summary = $1, closed_at = NOW() WHERE id = $2`,
                [summary || null, connectionId]
            );
            if (conn) {
                setImmediate(() => {
                    logActivity(conn.sender_id, 'inquiry_ended', { targetUserId: conn.receiver_id, actorId: req.user.id, note: 'הצלחה' });
                    logActivity(conn.receiver_id, 'inquiry_ended', { targetUserId: conn.sender_id, actorId: req.user.id, note: 'הצלחה' });
                });
            }
        } else {
            // כישלון: מחזירים למצב רגיל ומוחקים מהמסך
            await pool.query(
                `UPDATE connections SET status = 'rejected', match_succeeded = false, fail_reason = $1, close_summary = $2, closed_at = NOW() WHERE id = $3`,
                [failReason || null, summary || null, connectionId]
            );
            // מחיקת כל האישורים כדי שיוכלו להתחיל מחדש
            await pool.query(`DELETE FROM photo_approvals WHERE connection_id = $1`, [connectionId]);
            if (conn) {
                setImmediate(() => {
                    logActivity(conn.sender_id, 'inquiry_ended', { targetUserId: conn.receiver_id, actorId: req.user.id, note: failReason || 'לא הצליח' });
                    logActivity(conn.receiver_id, 'inquiry_ended', { targetUserId: conn.sender_id, actorId: req.user.id, note: failReason || 'לא הצליח' });
                });
            }
        }
        res.json({ message: "השידוך נסגר" });
    } catch (err) {
        console.error("Error closing match:", err);
        res.status(500).json({ message: "שגיאה" });
    }
});

// שליפת שידוכים שהצליחו
app.get('/admin/successful-matches', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        const result = await pool.query(`
            SELECT c.id, c.closed_at, c.close_summary,
                u1.full_name AS sender_name, u1.age AS sender_age,
                u2.full_name AS receiver_name, u2.age AS receiver_age,
                s.name AS shadchanit_name
            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            LEFT JOIN shadchaniot s ON c.shadchanit_id = s.id
            WHERE c.match_succeeded = true
            ORDER BY c.closed_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// היסטוריית כל השידוכים הסגורים
app.get('/admin/closed-connections', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        const result = await pool.query(`
            SELECT c.id, c.status, c.closed_at, c.match_succeeded, c.fail_reason, c.close_summary,
                c.created_at,
                u1.full_name AS sender_name, u1.age AS sender_age,
                u2.full_name AS receiver_name, u2.age AS receiver_age,
                s.name AS shadchanit_name
            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            LEFT JOIN shadchaniot s ON c.shadchanit_id = s.id
            WHERE c.closed_at IS NOT NULL
            ORDER BY c.closed_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
    }
});

// היסטוריית שדכנית
app.get('/admin/shadchanit-history/:shadchanitId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        const result = await pool.query(`
            SELECT c.id, c.status, c.closed_at, c.match_succeeded, c.fail_reason, c.close_summary,
                u1.full_name AS sender_name, u2.full_name AS receiver_name
            FROM connections c
            JOIN users u1 ON c.sender_id = u1.id
            JOIN users u2 ON c.receiver_id = u2.id
            WHERE c.shadchanit_id = $1 AND c.closed_at IS NOT NULL
            ORDER BY c.closed_at DESC
        `, [req.params.shadchanitId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה" });
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
            `SELECT m.*, u.full_name AS from_name
             FROM messages m
             LEFT JOIN users u ON u.id = m.from_user_id
             WHERE m.to_user_id = $1
             ORDER BY m.created_at DESC`,
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
// 🗑️ סל מחזור (הסתרת פרופילים)
// ==========================================

// הסתרת פרופיל
app.post('/api/hide-profile', authenticateToken, async (req, res) => {
    const { userId, hiddenUserId, reason } = req.body;
    try {
        // Auto-add reason column if missing (idempotent)
        await pool.query(`
            ALTER TABLE hidden_profiles ADD COLUMN IF NOT EXISTS reason TEXT;
        `).catch(() => {});
        await pool.query(
            `INSERT INTO hidden_profiles (user_id, hidden_user_id, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, hidden_user_id) DO UPDATE SET reason = EXCLUDED.reason`,
            [userId, hiddenUserId, reason || null]
        );
        setImmediate(() => logActivity(parseInt(userId), 'match_hidden', { targetUserId: parseInt(hiddenUserId), note: reason || null }));
        res.json({ message: "הפרופיל הועבר לסל המיחזור" });
    } catch (err) {
        console.error('[hide-profile]', err.message);
        res.status(500).json({ message: "שגיאה בהסתרה" });
    }
});

// שחזור פרופיל
app.post('/api/unhide-profile', authenticateToken, async (req, res) => {
    const { userId, hiddenUserId } = req.body;
    try {
        await pool.query(
            'DELETE FROM hidden_profiles WHERE user_id = $1 AND hidden_user_id = $2',
            [userId, hiddenUserId]
        );
        setImmediate(() => logActivity(parseInt(userId), 'match_restored', { targetUserId: parseInt(hiddenUserId) }));
        res.json({ message: "הפרופיל הוחזר לרשימה" });
    } catch (err) {
        res.status(500).json({ message: "שגיאה בשחזור" });
    }
});

// קבלת רשימת המוסתרים שלי
// קבלת רשימת המוסתרים שלי
app.get('/api/my-hidden-profiles', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.age, u.height, u.status, u.heritage_sector, u.profile_images,
                    h.reason, h.created_at AS hidden_at
             FROM hidden_profiles h
             JOIN users u ON h.hidden_user_id = u.id
             WHERE h.user_id = $1
             ORDER BY h.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "שגיאה בטעינת מוסתרים" });
    }
});

// --- ניהול מנהל (המשך): היסטוריה, אישור, מחיקה — all-users/block/note/send-message כבר מוגדרים למעלה ---

// היסטוריית משתמש (הודעות + חיבורים) - לשימוש מנהל
app.get('/admin/user-history/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    try {
        const messages = await pool.query(
            `SELECT m.*, 
                    u_from.full_name AS from_name
             FROM messages m
             LEFT JOIN users u_from ON m.from_user_id = u_from.id
             WHERE m.to_user_id = $1 OR m.from_user_id = $1
             ORDER BY m.created_at DESC
             LIMIT 50`,
            [userId]
        );

        const connections = await pool.query(
            `SELECT c.id, c.status, c.created_at, c.updated_at,
                    u1.full_name AS sender_name, u1.id AS sender_id,
                    u2.full_name AS receiver_name, u2.id AS receiver_id
             FROM connections c
             JOIN users u1 ON c.sender_id = u1.id
             JOIN users u2 ON c.receiver_id = u2.id
             WHERE c.sender_id = $1 OR c.receiver_id = $1
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json({ messages: messages.rows, connections: connections.rows });
    } catch (err) {
        console.error("Error fetching user history:", err);
        res.status(500).json({ message: "שגיאה בטעינת היסטוריה" });
    }
});

// אישור משתמש
app.put('/admin/approve/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    try {
        await pool.query('UPDATE users SET is_approved = TRUE WHERE id = $1', [userId]);

        // הודעה למשתמש במערכת
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
            [userId, '✅ הפרופיל שלך אושר! כעת תוכל לגלוש ולחפש שידוכים.']
        );

        // מייל לאישור פרופיל
        const userInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
        setImmediate(() => sendTemplateEmailForUser(parseInt(userId), 'profile_approved', {
            fullName: userInfo.rows[0]?.full_name || 'משתמש'
        }));
        setImmediate(() => logActivity(parseInt(userId), 'profile_approved', { actorId: req.user.id }));

        res.json({ message: "המשתמש אושר בהצלחה" });
    } catch (err) {
        console.error("Error approving user:", err);
        res.status(500).json({ message: "שגיאה באישור" });
    }
});

// מחיקת משתמש
app.delete('/admin/delete-user/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    try {
        // תיעוד לפני מחיקה (ON DELETE CASCADE ימחק שורות הלוג של המשתמש)
        // לכן לא נוכל לתעד אחרי — תועדו הפעולות ההיסטוריות שלו בלוג של המנהל
        await logActivity(req.user.id, 'admin_deleted_user', { note: `userId=${userId}` });

        // מחיקת נתונים קשורים לפני מחיקת המשתמש
        await pool.query('DELETE FROM messages WHERE from_user_id = $1 OR to_user_id = $1', [userId]);
        await pool.query('DELETE FROM connections WHERE sender_id = $1 OR receiver_id = $1', [userId]);
        await pool.query('DELETE FROM hidden_profiles WHERE user_id = $1 OR hidden_user_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: "המשתמש נמחק בהצלחה" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ message: "שגיאה במחיקת המשתמש" });
    }
});

// שליפת פרופילים ממתינים לאישור שינויים
app.get('/admin/pending-profiles', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    try {
        const result = await pool.query(
            `SELECT *,
                    COALESCE(profile_edit_count, 0) AS profile_edit_count
             FROM users
             WHERE (is_profile_pending = TRUE OR is_approved = FALSE) AND is_admin = FALSE
             ORDER BY COALESCE(pending_changes_at, created_at) ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching pending profiles:", err);
        res.status(500).json({ message: "שגיאה בטעינת פרופילים ממתינים" });
    }
});

// דיבאג: מה יש ב-pending_changes של משתמש
app.get('/admin/pending-changes-debug/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    try {
        const r = await pool.query('SELECT id, full_name, pending_changes FROM users WHERE id = $1', [userId]);
        res.json(r.rows[0] || { message: 'not found' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// אישור שינויי פרופיל
app.post('/admin/approve-profile-changes/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    try {
        // שליפת השינויים הממתינים
        const userResult = await pool.query(
            'SELECT pending_changes, email, full_name FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "משתמש לא נמצא" });
        }

        const pendingChanges = userResult.rows[0].pending_changes || {};
        const userEmail = userResult.rows[0].email;
        const userName = userResult.rows[0].full_name;

        if (Object.keys(pendingChanges).length > 0) {
            // שליפת עמודות קיימות בטבלה
            const colsResult = await pool.query(
                `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`
            );
            const colMeta = {};
            colsResult.rows.forEach(r => { colMeta[r.column_name] = r.data_type; });

            // שדות שאסור לעדכן / לא קיימים בטבלה / מנוהלים בנפרד
            const forbiddenCols = new Set([
                'id', 'password', 'created_at', 'email_verification_code',
                'profile_images', 'profile_images_count', // מנוהלים ע"י upload routes
                'apartment_amount', 'yeshiva_ketana_name', // שדות וירטואליים של הטופס
                'is_admin', 'is_blocked'
            ]);

            const safeChanges = Object.entries(pendingChanges).filter(([key]) => {
                if (forbiddenCols.has(key)) return false;
                if (!colMeta[key]) {
                    console.warn(`[Approve] Skipping unknown column: ${key}`);
                    return false;
                }
                return true;
            });

            if (safeChanges.length > 0) {
                const numericCols = new Set(['age', 'children_count', 'siblings_count', 'sibling_position', 'height',
                    'search_min_age', 'search_max_age', 'search_height_min', 'search_height_max']);
                const boolCols = new Set(['has_children', 'mixed_heritage_ok', 'search_financial_discuss',
                    'is_email_verified', 'email_notifications_enabled', 'never_ask_email']);
                const dateCols = new Set(['birth_date']);

                // עדכון שדה-שדה כדי שמשהו בעייתי לא יעצור את כל האישור
                for (const [key, rawVal] of safeChanges) {
                    try {
                        let val = rawVal;
                        if (val === '' || val === undefined) val = null;
                        if (val !== null) {
                            if (numericCols.has(key)) val = Number(val);
                            else if (boolCols.has(key)) val = (val === 'true' || val === true);
                            else if (dateCols.has(key)) val = val || null;
                            else if (Array.isArray(val)) val = val;
                            else if (typeof val === 'object') val = JSON.stringify(val);
                        }
                        await pool.query(
                            `UPDATE users SET "${key}" = $1 WHERE id = $2`,
                            [val, userId]
                        );
                    } catch (fieldErr) {
                        console.warn(`[Approve] Skipping field "${key}" due to error: ${fieldErr.message}`);
                    }
                }
            }
            // תמיד מאשרים ומאפסים pending
            await pool.query(
                'UPDATE users SET is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL, is_approved = TRUE WHERE id = $1',
                [userId]
            );
        } else {
            await pool.query(
                'UPDATE users SET is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL, is_approved = TRUE WHERE id = $1',
                [userId]
            );
        }

        // הודעה למשתמש

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
            [userId, '✅ השינויים בפרופיל אושרו על ידי המנהל!']
        );

        // מייל למשתמש
        if (userEmail) {
            setImmediate(() => sendTemplateEmail(userEmail, 'profile_changes_approved', {
                fullName: userName || ''
            }, parseInt(userId)));
        }

        res.json({ message: "השינויים אושרו בהצלחה" });

        // יצירת אודיו IVR ברקע אחרי אישור שינויים
        try {
            const updatedUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (updatedUserRes.rows.length > 0) {
                const { generateProfileAudio } = require('./ivr/profileAudio');
                generateProfileAudio(updatedUserRes.rows[0]).catch(e =>
                    console.error('[ProfileAudio] ❌ background:', e.message)
                );
            }
        } catch (e) { /* IVR module not critical */ }

    } catch (err) {
        console.error("[Approve] Error:", err.message, err.detail || '', err.hint || '');
        res.status(500).json({ message: "שגיאה באישור השינויים: " + err.message + (err.detail ? ' | ' + err.detail : '') });
    }
});

// דחיית שינויי פרופיל
app.post('/admin/reject-profile-changes/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: "גישה נדחתה" });
    const { userId } = req.params;
    const { reason } = req.body;
    try {
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
        const userEmail = userResult.rows[0]?.email;

        // איפוס הבקשה הממתינה
        await pool.query(
            'UPDATE users SET is_profile_pending = FALSE, pending_changes = NULL, pending_changes_at = NULL WHERE id = $1',
            [userId]
        );

        // הודעה למשתמש
        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
            [userId, `❌ השינויים בפרופיל נדחו. סיבה: ${reason || 'לא צוינה'}`]
        );

        // מייל למשתמש
        if (userEmail) {
            const userNameRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
            setImmediate(() => sendTemplateEmail(userEmail, 'profile_changes_rejected', {
                fullName: userNameRes.rows[0]?.full_name || '',
                reason: reason || null
            }, parseInt(userId)));
        }

        res.json({ message: "השינויים נדחו" });
    } catch (err) {
        console.error("Error rejecting profile changes:", err);
        res.status(500).json({ message: "שגיאה בדחיית השינויים" });
    }
});

// ==========================================
// 📊 דשבורד מנהל - סטטיסטיקות
// ==========================================
app.get('/admin/stats', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).send("גישה נדחתה");

    try {
        // 1. ספירות כלליות
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = false');
        const pendingUsers = await pool.query('SELECT COUNT(*) FROM users WHERE (is_approved = false OR is_profile_pending = true) AND is_admin = false');
        const activeMatches = await pool.query("SELECT COUNT(*) FROM connections WHERE status = 'active' OR status = 'waiting_for_shadchan'");
        const openTickets = await pool.query("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'");

        // 2. פילוח לפי מגזר (לגרף עוגה)
        const sectors = await pool.query(`
            SELECT heritage_sector, COUNT(*) as count 
            FROM users 
            WHERE is_admin = false AND heritage_sector IS NOT NULL 
            GROUP BY heritage_sector
        `);

        // 3. הרשמות לפי חודשים (לגרף עמודות) - 6 חודשים אחרונים
        const monthly = await pool.query(`
            SELECT to_char(created_at, 'Mon') as month, COUNT(*) as count
            FROM users 
            WHERE created_at > NOW() - INTERVAL '6 months'
            GROUP BY 1, date_part('month', created_at)
            ORDER BY date_part('month', created_at)
        `);

        res.json({
            total: parseInt(totalUsers.rows[0].count),
            pending: parseInt(pendingUsers.rows[0].count),
            matches: parseInt(activeMatches.rows[0].count),
            open_tickets: parseInt(openTickets.rows[0].count),
            sectors: sectors.rows,
            monthly: monthly.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "שגיאה בטעינת סטטיסטיקות" });
    }
});

// ==========================================
// 📋 בקשות ממליצים נוספים
// ==========================================

const REFERENCE_REASONS = {
    not_enough:  'לא הספיק לנו לברר באמצעות הממליצים שסיפקת',
    no_answer:   'הממליצים שסיפקת לא ענו לנו',
    family_ref:  'נבקש מכר שמכיר את המשפחה',
};

// שליחת בקשה לממליץ נוסף
app.post('/request-additional-reference', authenticateToken, async (req, res) => {
    const requesterId = req.user.id;
    const { connectionId, reason, count } = req.body;
    if (!connectionId || !REFERENCE_REASONS[reason]) {
        return res.status(400).json({ message: 'נתונים חסרים' });
    }
    try {
        // וידוא שהמשתמש שייך לשידוך
        const connCheck = await pool.query(
            `SELECT c.id, c.sender_id, c.receiver_id,
                    u_req.full_name AS requester_name,
                    u_other.full_name AS other_name
             FROM connections c
             JOIN users u_req ON u_req.id = $2
             JOIN users u_other ON u_other.id = CASE WHEN c.sender_id = $2 THEN c.receiver_id ELSE c.sender_id END
             WHERE c.id = $1 AND (c.sender_id = $2 OR c.receiver_id = $2)
               AND c.status IN ('active','waiting_for_shadchan')`,
            [connectionId, requesterId]
        );
        if (connCheck.rows.length === 0) return res.status(403).json({ message: 'לא ניתן לשלוח בקשה' });

        const { sender_id, receiver_id, requester_name, other_name } = connCheck.rows[0];
        const otherUserId = sender_id === requesterId ? receiver_id : sender_id;
        const countNum = count === 2 ? 2 : 1;
        const reasonText = REFERENCE_REASONS[reason];

        // שמירת הבקשה
        const inserted = await pool.query(
            `INSERT INTO reference_requests (connection_id, requester_id, reason, count)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [connectionId, requesterId, reason, countNum]
        );
        const requestId = inserted.rows[0].id;

        // ניסוח הודעה לצד השני
        const countText = countNum === 2 ? 'שניים' : 'אחד';
        const msg = `📋 בקשה לממליץ נוסף\n\n${requester_name} מבקש/ת ממך ${countText} איש קשר נוסף לצורך בירורים.\n\nסיבה: ${reasonText}.\n\nתוכל/י להגיב להודעה זו ישירות.`;

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type, meta)
             VALUES ($1, $2, $3, 'reference_request', $4)`,
            [requesterId, otherUserId, msg, JSON.stringify({ requestId, connectionId, count: countNum })]
        );

        // מייל לצד המקבל
        setImmediate(() => sendNewMessageEmail(otherUserId, requester_name, msg));

        res.json({ message: 'הבקשה נשלחה בהצלחה' });
    } catch (err) {
        console.error('[request-additional-reference]', err);
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// תגובה לבקשת ממליץ נוסף
app.post('/respond-reference-request', authenticateToken, async (req, res) => {
    const responderId = req.user.id;
    const { requestId, response, refName, refPhone } = req.body;
    // response: 'provide' | 'cannot'

    try {
        const reqRow = await pool.query(
            `SELECT rr.*, c.sender_id, c.receiver_id,
                    u_resp.full_name AS responder_name,
                    u_req.full_name AS requester_name
             FROM reference_requests rr
             JOIN connections c ON c.id = rr.connection_id
             JOIN users u_resp ON u_resp.id = $2
             JOIN users u_req ON u_req.id = rr.requester_id
             WHERE rr.id = $1
               AND (c.sender_id = $2 OR c.receiver_id = $2)`,
            [requestId, responderId]
        );
        if (reqRow.rows.length === 0) return res.status(404).json({ message: 'בקשה לא נמצאה' });

        const { requester_id, responder_name, requester_name } = reqRow.rows[0];

        await pool.query(`UPDATE reference_requests SET status = $1 WHERE id = $2`, [response, requestId]);

        let msg;
        if (response === 'provide' && refName && refPhone) {
            msg = `✅ ${responder_name} שלח/ה ממליץ נוסף:\n\nשם: ${refName}\nטלפון: 📞 ${refPhone}`;
        } else if (response === 'provide') {
            msg = `✅ ${responder_name} אישר/ה שישלח/ת ממליץ נוסף — יצרו קשר ישירות.`;
        } else {
            msg = `ℹ️ ${responder_name} ציין/נה שלצערם/ן בשלב זה אינם יכולים לספק ממליץ נוסף.`;
        }

        await pool.query(
            `INSERT INTO messages (from_user_id, to_user_id, content, type)
             VALUES ($1, $2, $3, 'reference_response')`,
            [responderId, requester_id, msg]
        );

        setImmediate(() => sendNewMessageEmail(requester_id, responder_name, msg));

        res.json({ message: 'תגובתך נשלחה' });
    } catch (err) {
        console.error('[respond-reference-request]', err);
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// ==========================================
// 🚫 חסימת משתמשים
// ==========================================

// חסימת משתמש
app.post('/block-user/:userId', authenticateToken, async (req, res) => {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId);
    if (!blockedId || blockerId === blockedId) return res.status(400).json({ message: 'בקשה לא תקינה' });

    try {
        await pool.query(
            'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [blockerId, blockedId]
        );
        // מחיקת כל החיבורים הפעילים/ממתינים בין השניים
        await pool.query(
            `DELETE FROM connections
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
            [blockerId, blockedId]
        );
        // מחיקת בקשות תמונות בין השניים
        await pool.query(
            `DELETE FROM photo_approvals
             WHERE (requester_id = $1 AND target_id = $2) OR (requester_id = $2 AND target_id = $1)`,
            [blockerId, blockedId]
        );
        setImmediate(() => logActivity(blockerId, 'user_blocked', { targetUserId: blockedId }));
        res.json({ message: 'המשתמש נחסם. הוא לא יוכל יותר לפנות אליך.' });
    } catch (err) {
        console.error('[block-user]', err);
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// ביטול חסימה
app.delete('/block-user/:userId', authenticateToken, async (req, res) => {
    const blockerId = req.user.id;
    const blockedId = parseInt(req.params.userId);
    try {
        await pool.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, blockedId]);
        setImmediate(() => logActivity(blockerId, 'user_unblocked', { targetUserId: blockedId }));
        res.json({ message: 'החסימה בוטלה' });
    } catch (err) {
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// שליפת רשימת חסומים שלי
app.get('/my-blocked-users', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT b.blocked_id, u.full_name, b.created_at
             FROM user_blocks b JOIN users u ON u.id = b.blocked_id
             WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// ==========================================
// 📬 מערכת פניות תמיכה / יצירת קשר
// ==========================================

// שליחת פנייה (גם אורח, גם משתמש מחובר)
app.post('/support/submit', async (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'נא למלא שם, מייל והודעה' });
    }

    // ניסיון לזהות משתמש מחובר לפי טוקן (לא חובה)
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (_) {}
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO support_tickets (user_id, name, email, phone, subject, message)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [userId, name.trim(), email.trim(), phone?.trim() || null, subject?.trim() || null, message.trim()]
        );
        const ticketId = result.rows[0].id;

        // מייל ודאות למשתמש
        setImmediate(() => sendEmail(
            email.trim(),
            '✅ פנייתך התקבלה — הפנקס',
            `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px">
                <h2 style="color:#1e3a5f">קיבלנו את פנייתך!</h2>
                <p>שלום ${name}, פנייתך (מס' ${ticketId}) התקבלה ונשמרה במערכת.</p>
                <p><strong>הודעתך:</strong><br>${message.replace(/\n/g,'<br>')}</p>
            </div>`
        ));

        res.json({ message: 'הפנייה נשלחה בהצלחה.', ticketId });
    } catch (err) {
        console.error('[support/submit]', err);
        res.status(500).json({ message: 'שגיאת שרת, נסה שוב' });
    }
});

// שליפת כל הפניות (אדמין)
// ── היסטוריית פעילות משתמש (מנהל) ──
app.get('/admin/user-activity/:userId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: 'גישה נדחתה' });
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT a.id, a.action, a.note, a.created_at,
                    t.full_name AS target_name,
                    act.full_name AS actor_name
             FROM activity_log a
             LEFT JOIN users t ON t.id = a.target_user_id
             LEFT JOIN users act ON act.id = a.actor_id
             WHERE a.user_id = $1
             ORDER BY a.created_at DESC
             LIMIT 200`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[user-activity]', err);
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

app.get('/admin/support/tickets', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: 'גישה נדחתה' });
    try {
        const result = await pool.query(
            `SELECT t.*, 
                    (SELECT COUNT(*) FROM support_replies r WHERE r.ticket_id = t.id) AS reply_count
             FROM support_tickets t
             ORDER BY t.updated_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[admin/support/tickets]', err);
        res.status(500).json({ message: 'שגיאה בטעינת פניות' });
    }
});

// שליפת פנייה + שרשור תגובות (אדמין)
app.get('/admin/support/tickets/:id', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: 'גישה נדחתה' });
    const { id } = req.params;
    try {
        const ticket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
        if (!ticket.rows.length) return res.status(404).json({ message: 'פנייה לא נמצאה' });

        const replies = await pool.query(
            'SELECT * FROM support_replies WHERE ticket_id = $1 ORDER BY created_at ASC',
            [id]
        );

        // סימון כנקרא
        await pool.query(`UPDATE support_tickets SET status = CASE WHEN status = 'open' THEN 'read' ELSE status END WHERE id = $1`, [id]);

        res.json({ ticket: ticket.rows[0], replies: replies.rows });
    } catch (err) {
        console.error('[admin/support/tickets/:id]', err);
        res.status(500).json({ message: 'שגיאה' });
    }
});

// תשובת מנהל לפנייה
app.post('/admin/support/reply/:ticketId', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: 'גישה נדחתה' });
    const { ticketId } = req.params;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'נא לכתוב תשובה' });

    try {
        const ticket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
        if (!ticket.rows.length) return res.status(404).json({ message: 'פנייה לא נמצאה' });

        const t = ticket.rows[0];

        // שמירת תגובה
        await pool.query(
            'INSERT INTO support_replies (ticket_id, sender_type, message) VALUES ($1, $2, $3)',
            [ticketId, 'admin', message.trim()]
        );

        // עדכון סטטוס + זמן
        await pool.query(
            `UPDATE support_tickets SET status = 'replied', updated_at = NOW() WHERE id = $1`,
            [ticketId]
        );

        // מייל למשתמש + הודעה פנימית אם מחובר
        setImmediate(async () => {
            // מייל
            await sendEmail(
                t.email,
                '💬 תשובה לפנייתך — הפנקס',
                `<div dir="rtl" style="font-family:Arial,sans-serif;padding:20px">
                    <h2 style="color:#1e3a5f">קיבלת תשובה לפנייתך</h2>
                    <p>שלום ${t.name},</p>
                    <div style="background:#f0f9ff;border-right:4px solid #1e3a5f;padding:14px;border-radius:8px;margin:16px 0">
                        <p style="margin:0">${message.trim().replace(/\n/g,'<br>')}</p>
                    </div>
                    <p>אם יש לך שאלות נוספות, תוכל לפנות אלינו שוב דרך האתר.</p>
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}/contact"
                       style="display:inline-block;margin-top:16px;padding:12px 28px;background:linear-gradient(135deg,#c9a227,#b08d1f);color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
                       לפנייה הבאה →
                    </a>
                </div>`
            );

            // הודעה פנימית אם המשתמש רשום
            if (t.user_id) {
                await pool.query(
                    `INSERT INTO messages (from_user_id, to_user_id, content, type) VALUES (1, $1, $2, 'system')`,
                    [t.user_id, `📬 תשובה לפנייתך:\n${message.trim()}`]
                ).catch(() => {});
            }
        });

        res.json({ message: 'התשובה נשלחה!' });
    } catch (err) {
        console.error('[admin/support/reply]', err);
        res.status(500).json({ message: 'שגיאה בשליחת תשובה' });
    }
});

// עדכון סטטוס פנייה (אדמין)
app.put('/admin/support/tickets/:id/status', authenticateToken, async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ message: 'גישה נדחתה' });
    const { id } = req.params;
    const { status } = req.body; // open | read | replied | closed
    try {
        await pool.query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        res.json({ message: 'סטטוס עודכן' });
    } catch (err) {
        res.status(500).json({ message: 'שגיאה' });
    }
});

// ==========================================
//  הפעלת השרת
// ==========================================
async function updateDbSchema() {
    try {
        // טבלת לוג פעילות משתמשים
        await pool.query(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(60) NOT NULL,
                target_user_id INTEGER,
                actor_id INTEGER,
                note TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC)`);

        // כיסוי ראש
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS head_covering VARCHAR(20)`).catch(() => {});
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_head_covering VARCHAR(20)`).catch(() => {});

        // עמודת meta בהודעות (לשמירת requestId וכו')
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta JSONB`).catch(() => {});

        // טבלת בקשות ממליצים נוספים
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reference_requests (
                id SERIAL PRIMARY KEY,
                connection_id INTEGER REFERENCES connections(id) ON DELETE CASCADE,
                requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                reason VARCHAR(100) NOT NULL,
                count INTEGER DEFAULT 1,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // טבלת חסימות בין משתמשים
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_blocks (
                id SERIAL PRIMARY KEY,
                blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(blocker_id, blocked_id)
            )
        `);

        // טבלת פניות תמיכה
        await pool.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                subject VARCHAR(255),
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS support_replies (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
                sender_type VARCHAR(10) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // טבלת תמונות משתמשים
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT FALSE,
                uploaded_at TIMESTAMP DEFAULT NOW(),
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                rejection_reason TEXT
            )
        `);

        // עמודות שחסרות
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_skip_verification BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS never_ask_email BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_reminder_sent BOOLEAN DEFAULT FALSE`);

        // עמודות חיפוש שחסרות
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_heritage_sectors TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_occupations TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_life_aspirations TEXT`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mixed_heritage_ok BOOLEAN`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_financial_min VARCHAR(100)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_financial_discuss BOOLEAN DEFAULT FALSE`);

        // טבלת שדכניות
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shadchaniot (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // עמודות חיוניות לטבלת photo_approvals
        await pool.query(`ALTER TABLE photo_approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
        await pool.query(`ALTER TABLE photo_approvals ADD COLUMN IF NOT EXISTS connection_id INTEGER`);
        await pool.query(`ALTER TABLE photo_approvals ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT FALSE`);

        // עמודות נוספות לטבלת connections
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS shadchanit_id INTEGER REFERENCES shadchaniot(id)`);
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS match_succeeded BOOLEAN`);
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS fail_reason TEXT`);
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS close_summary TEXT`);
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP`);
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS receiver_first_viewed_at TIMESTAMP`);

        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255)');
        // 7. הוספת עמודות לוויזארד החדש (אם חסרות)
        // birth_date
        await pool.query(`
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='birth_date') THEN 
                ALTER TABLE users ADD COLUMN birth_date DATE; 
            END IF;
        END $$;
    `);

        // אנשי קשר
        await pool.query(`
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_person_type') THEN 
                ALTER TABLE users ADD COLUMN contact_person_type VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_person_name') THEN 
                ALTER TABLE users ADD COLUMN contact_person_name VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_phone_1') THEN 
                ALTER TABLE users ADD COLUMN contact_phone_1 VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_phone_2') THEN 
                ALTER TABLE users ADD COLUMN contact_phone_2 VARCHAR(50); 
            END IF;

            -- עמודות טלפון נוספות
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_1_phone') THEN 
                ALTER TABLE users ADD COLUMN reference_1_phone VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_2_phone') THEN 
                ALTER TABLE users ADD COLUMN reference_2_phone VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_3_phone') THEN 
                ALTER TABLE users ADD COLUMN reference_3_phone VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='family_reference_phone') THEN 
                ALTER TABLE users ADD COLUMN family_reference_phone VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='rabbi_phone') THEN 
                ALTER TABLE users ADD COLUMN rabbi_phone VARCHAR(50); 
            END IF;
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mechutanim_phone') THEN 
                ALTER TABLE users ADD COLUMN mechutanim_phone VARCHAR(50); 
            END IF;

            -- המרת עמודות טלפון ל-VARCHAR (למקרה שהן הוגדרו כ-INTEGER בטעות)
             BEGIN
                ALTER TABLE users ALTER COLUMN contact_phone_1 TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN contact_phone_2 TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN reference_1_phone TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN reference_2_phone TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN reference_3_phone TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN family_reference_phone TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN rabbi_phone TYPE VARCHAR(50);
             EXCEPTION WHEN OTHERS THEN NULL; END;
            BEGIN
                ALTER TABLE users ALTER COLUMN mechutanim_phone TYPE VARCHAR(50);
            EXCEPTION WHEN OTHERS THEN NULL; END;
            
            BEGIN
                ALTER TABLE users ALTER COLUMN search_financial_min TYPE VARCHAR(100);
            EXCEPTION WHEN OTHERS THEN NULL; END;

            -- עמודות ישיבה ודירה
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='apartment_amount') THEN 
                ALTER TABLE users ADD COLUMN apartment_amount VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='apartment_help') THEN 
                ALTER TABLE users ADD COLUMN apartment_help VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='yeshiva_name') THEN 
                ALTER TABLE users ADD COLUMN yeshiva_name VARCHAR(255); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='yeshiva_ketana_name') THEN 
                ALTER TABLE users ADD COLUMN yeshiva_ketana_name VARCHAR(255); 
            END IF;
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='occupation_details') THEN 
                ALTER TABLE users ADD COLUMN occupation_details TEXT; 
            END IF;

            -- עמודות רקע ומשפחה
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country_of_birth') THEN 
                ALTER TABLE users ADD COLUMN country_of_birth VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='father_heritage') THEN 
                ALTER TABLE users ADD COLUMN father_heritage VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mother_heritage') THEN 
                ALTER TABLE users ADD COLUMN mother_heritage VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='siblings_count') THEN 
                ALTER TABLE users ADD COLUMN siblings_count INTEGER; 
            END IF;
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sibling_position') THEN 
                ALTER TABLE users ADD COLUMN sibling_position INTEGER; 
            END IF;

             -- עמודות נוספות לוויזארד
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='skin_tone') THEN 
                ALTER TABLE users ADD COLUMN skin_tone VARCHAR(50); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='life_aspiration') THEN 
                ALTER TABLE users ADD COLUMN life_aspiration VARCHAR(255); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='favorite_study') THEN 
                ALTER TABLE users ADD COLUMN favorite_study VARCHAR(255); 
            END IF;
             IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='study_place') THEN 
                ALTER TABLE users ADD COLUMN study_place VARCHAR(255); 
            END IF;

            -- עמודות ניהול פרופיל ממתין
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_profile_pending') THEN 
                ALTER TABLE users ADD COLUMN is_profile_pending BOOLEAN DEFAULT FALSE; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pending_changes') THEN 
                ALTER TABLE users ADD COLUMN pending_changes JSONB; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pending_changes_at') THEN 
                ALTER TABLE users ADD COLUMN pending_changes_at TIMESTAMP; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_approved') THEN 
                ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='admin_notes') THEN 
                ALTER TABLE users ADD COLUMN admin_notes TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_edit_count') THEN 
                ALTER TABLE users ADD COLUMN profile_edit_count INTEGER DEFAULT 0; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_images') THEN 
                ALTER TABLE users ADD COLUMN profile_images TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_images_count') THEN 
                ALTER TABLE users ADD COLUMN profile_images_count INTEGER DEFAULT 0; 
            END IF;
            
            -- עמודות התראות ואימות מייל
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notifications_enabled') THEN 
                ALTER TABLE users ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT TRUE; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_email_verified') THEN 
                ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verification_code') THEN 
                ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(6); 
            END IF;

            -- עמודות חיפוש והעדפות (Search Preferences)
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_min_age') THEN 
                ALTER TABLE users ADD COLUMN search_min_age INTEGER; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_max_age') THEN 
                ALTER TABLE users ADD COLUMN search_max_age INTEGER; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_height_min') THEN 
                ALTER TABLE users ADD COLUMN search_height_min INTEGER; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_height_max') THEN 
                ALTER TABLE users ADD COLUMN search_height_max INTEGER; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_body_types') THEN 
                ALTER TABLE users ADD COLUMN search_body_types TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_appearances') THEN 
                ALTER TABLE users ADD COLUMN search_appearances TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_skin_tones') THEN 
                ALTER TABLE users ADD COLUMN search_skin_tones TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_statuses') THEN 
                ALTER TABLE users ADD COLUMN search_statuses TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_backgrounds') THEN 
                ALTER TABLE users ADD COLUMN search_backgrounds TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_heritage_sectors') THEN 
                ALTER TABLE users ADD COLUMN search_heritage_sectors TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mixed_heritage_ok') THEN 
                ALTER TABLE users ADD COLUMN mixed_heritage_ok BOOLEAN; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_financial_min') THEN 
                ALTER TABLE users ADD COLUMN search_financial_min VARCHAR(100); 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_financial_discuss') THEN 
                ALTER TABLE users ADD COLUMN search_financial_discuss BOOLEAN DEFAULT FALSE; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_occupations') THEN 
                ALTER TABLE users ADD COLUMN search_occupations TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_life_aspirations') THEN 
                ALTER TABLE users ADD COLUMN search_life_aspirations TEXT; 
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN 
                ALTER TABLE users ADD COLUMN city VARCHAR(255); 
            END IF;
        END $$;
    `);

        // אינדקסים לביצועי שאילתות (התאמות, חיבורים, חסימות, תמונות) — IF NOT EXISTS בטוח
        const perfIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_connections_sender_id ON connections(sender_id)`,
            `CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON connections(receiver_id)`,
            `CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status)`,
            `CREATE INDEX IF NOT EXISTS idx_hidden_profiles_user_id ON hidden_profiles(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_hidden_profiles_hidden_user_id ON hidden_profiles(hidden_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id)`,
            `CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks(blocked_id)`,
            `CREATE INDEX IF NOT EXISTS idx_photo_approvals_requester ON photo_approvals(requester_id)`,
            `CREATE INDEX IF NOT EXISTS idx_photo_approvals_target ON photo_approvals(target_id)`,
            `CREATE INDEX IF NOT EXISTS idx_users_gender_approved_blocked ON users(gender, is_approved, is_blocked)`,
        ];
        for (const q of perfIndexes) {
            await pool.query(q).catch((e) => console.warn('[schema index]', e.message));
        }

        // ==========================================
        // 📞 IVR — שדות וטבלאות מערכת טלפונית
        // ==========================================

        // שדות IVR בטבלת users
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_pin VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_ivr_no_pass BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_failed_attempts INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ivr_blocked_until TIMESTAMP`);

        // טבלת session — זיכרון שיחה (להמשך מנקודת עצירה)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ivr_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                last_menu VARCHAR(50),
                last_item_id INTEGER,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // טבלת לוג שיחות — לניתוח BI בלבד
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ivr_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                caller_phone VARCHAR(20),
                call_duration_seconds INTEGER,
                drop_point_menu VARCHAR(50),
                actions_taken JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // טבלת "נשמע בטלפון" — סנכרון עם הפרונט
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ivr_match_views (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                viewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                viewed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, viewed_user_id)
            )
        `);

        // עמודת פלטפורמה בחיבורים (web / ivr)
        await pool.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS last_accessed_platform VARCHAR(10) DEFAULT 'web'`);

        // עמודות session לשיחות IVR (הוספה רטרואקטיבית אם הטבלה נוצרה עם schema ישן)
        await pool.query(`ALTER TABLE ivr_sessions ADD COLUMN IF NOT EXISTS enter_id VARCHAR(100)`);
        await pool.query(`ALTER TABLE ivr_sessions ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
        await pool.query(`ALTER TABLE ivr_sessions ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'init'`);
        await pool.query(`ALTER TABLE ivr_sessions ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'`);
        await pool.query(`ALTER TABLE ivr_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);

        // עמודת tts_last_played — מתי פרופיל הושמע לאחרונה ב-IVR (לניקוי אודיו ישן)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tts_last_played TIMESTAMP`);

        console.log("✅ DB Schema updated: Wizard columns + IVR tables ensured.");

    } catch (err) {
        console.error("⚠️ Failed to update DB Schema:", err);
    }
}


// ==========================================
// 🔐 שחזור סיסמה (Forgot Password Flow)
// ==========================================

// שלב 1: שליחת קוד לפי טלפון (מייל או שיחה)
app.post('/forgot-password', async (req, res) => {
    const { phone, method, email } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'נא להזין מספר טלפון' });
    }

    const cleanPhone = phone.replace(/\D/g, '').trim();

    try {
        const userRes = await pool.query(
            'SELECT id, full_name, email FROM users WHERE phone = $1',
            [cleanPhone]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'מספר הטלפון לא רשום במערכת' });
        }

        const user = userRes.rows[0];

        // יצירת קוד איפוס 6 ספרות
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // תוקף 15 דקות

        // שמירת הקוד במסד הנתונים (עם ALTER TABLE אם עמודות לא קיימות)
        try {
            await pool.query(`
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reset_password_code') THEN
                        ALTER TABLE users ADD COLUMN reset_password_code VARCHAR(10);
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reset_password_expires') THEN
                        ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP;
                    END IF;
                END $$;
            `);
        } catch (altErr) {
            console.warn('[forgot-password] Column creation warning:', altErr.message);
        }

        await pool.query(
            'UPDATE users SET reset_password_code = $1, reset_password_expires = $2 WHERE id = $3',
            [resetCode, expiresAt, user.id]
        );

        if (method === 'email') {
            // שליחה למייל
            const targetEmail = email || user.email;
            if (!targetEmail) {
                return res.status(400).json({ message: 'למשתמש זה אין מייל רשום. בחר שיחה קולית.' });
            }
            await sendTemplateEmail(targetEmail, 'reset_password', {
                fullName: user.full_name || 'משתמש',
                code: resetCode
            });
            res.json({ message: `קוד נשלח למייל ${targetEmail}` });
        } else {
            // שיחה קולית — במידה ואין IVR, נשלח SMS / מייל כגיבוי
            const fallbackEmail = user.email;
            if (fallbackEmail) {
                await sendTemplateEmail(fallbackEmail, 'reset_password', {
                    fullName: user.full_name || 'משתמש',
                    code: resetCode
                });
                console.log(`[forgot-password] Voice call fallback — sent code to email: ${fallbackEmail}`);
            }
            res.json({ message: 'הקוד יישלח בשיחה קולית. לחלופין נשלח למייל.' });
        }
    } catch (err) {
        console.error('[forgot-password] Error:', err);
        res.status(500).json({ message: 'שגיאת שרת, נסה שוב' });
    }
});

// שלב 2: אימות הקוד שנשלח
app.post('/verify-reset-code', async (req, res) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ message: 'נתונים חסרים' });
    }

    const cleanPhone = phone.replace(/\D/g, '').trim();

    try {
        const userRes = await pool.query(
            'SELECT id, reset_password_code, reset_password_expires FROM users WHERE phone = $1',
            [cleanPhone]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'משתמש לא נמצא' });
        }

        const user = userRes.rows[0];

        if (!user.reset_password_code) {
            return res.status(400).json({ message: 'לא נשלח קוד לחשבון זה. נא לבקש קוד חדש.' });
        }

        if (new Date() > new Date(user.reset_password_expires)) {
            return res.status(400).json({ message: 'פג תוקפו של הקוד. נא לבקש קוד חדש.' });
        }

        if (user.reset_password_code !== code.trim()) {
            return res.status(400).json({ message: 'קוד שגוי, נסה שוב' });
        }

        res.json({ message: 'הקוד אומת בהצלחה' });
    } catch (err) {
        console.error('[verify-reset-code] Error:', err);
        res.status(500).json({ message: 'שגיאת שרת' });
    }
});

// שלב 3: עדכון הסיסמה החדשה
app.post('/reset-password', async (req, res) => {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
        return res.status(400).json({ message: 'נתונים חסרים' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
    }

    const cleanPhone = phone.replace(/\D/g, '').trim();

    try {
        const userRes = await pool.query(
            'SELECT id, reset_password_code, reset_password_expires FROM users WHERE phone = $1',
            [cleanPhone]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'משתמש לא נמצא' });
        }

        const user = userRes.rows[0];

        if (!user.reset_password_code || user.reset_password_code !== code.trim()) {
            return res.status(400).json({ message: 'קוד שגוי — נא להתחיל מחדש' });
        }

        if (new Date() > new Date(user.reset_password_expires)) {
            return res.status(400).json({ message: 'פג תוקפו של הקוד — נא לבקש קוד חדש' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password = $1, reset_password_code = NULL, reset_password_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        console.log(`[reset-password] Password reset successfully for phone: ${cleanPhone}`);
        res.json({ message: 'הסיסמה שונתה בהצלחה! 🎉' });
    } catch (err) {
        console.error('[reset-password] Error:', err);
        res.status(500).json({ message: 'שגיאת שרת, נסה שוב' });
    }
});

// ==========================================
// 📧 שליחת כרטיסיות שידוך לשדכנית
// ==========================================

app.post('/admin/send-match-cards/:connectionId', authenticateToken, async (req, res) => {
    const { connectionId } = req.params;

    if (!req.user?.is_admin) {
        return res.status(403).json({ message: 'אין הרשאה' });
    }

    try {
        // שלוף פרטי החיבור + שני המשתמשים + השדכנית המשויכת
        const connRes = await pool.query(`
            SELECT
                c.id AS connection_id,
                c.shadchanit_id,
                s.name AS shadchanit_name,
                s.email AS shadchanit_email,
                s.phone AS shadchanit_phone,
                sender.id AS sender_id,
                sender.full_name AS sender_name,
                sender.last_name AS sender_last_name,
                sender.age AS sender_age,
                sender.city AS sender_city,
                sender.gender AS sender_gender,
                sender.current_occupation AS sender_occupation,
                sender.height AS sender_height,
                sender.heritage_sector AS sender_sector,
                receiver.id AS receiver_id,
                receiver.full_name AS receiver_name,
                receiver.last_name AS receiver_last_name,
                receiver.age AS receiver_age,
                receiver.city AS receiver_city,
                receiver.gender AS receiver_gender,
                receiver.current_occupation AS receiver_occupation,
                receiver.height AS receiver_height,
                receiver.heritage_sector AS receiver_sector
            FROM connections c
            JOIN users sender ON sender.id = c.sender_id
            JOIN users receiver ON receiver.id = c.receiver_id
            LEFT JOIN shadchaniot s ON s.id = c.shadchanit_id
            WHERE c.id = $1
        `, [connectionId]);

        if (connRes.rows.length === 0) {
            return res.status(404).json({ message: 'שידוך לא נמצא' });
        }

        const match = connRes.rows[0];

        if (!match.shadchanit_email) {
            return res.status(400).json({ message: 'לא משויכת שדכנית עם מייל לשידוך זה' });
        }

        // בניית תוכן המייל עם פרטי שני הצדדים
        const senderFullName = `${match.sender_name} ${match.sender_last_name || ''}`.trim();
        const receiverFullName = `${match.receiver_name} ${match.receiver_last_name || ''}`.trim();

        const htmlContent = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
                <div style="background: linear-gradient(135deg, #1e3a5f, #2d4a6f); padding: 30px; text-align: center;">
                    <h1 style="color: #c9a227; margin: 0;">💍 כרטיסיות שידוך</h1>
                    <p style="color: #fff; margin: 10px 0 0;">שלום ${match.shadchanit_name || 'שדכנית'}, להלן פרטי השידוך הממתין לטיפולך</p>
                </div>
                <div style="padding: 30px; display: flex; gap: 20px;">
                    <div style="flex: 1; background: #f0f9ff; border: 2px solid #1e3a5f; border-radius: 12px; padding: 20px;">
                        <h2 style="color: #1e3a5f; margin: 0 0 15px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">
                            ${match.sender_gender === 'male' ? '👨' : '👩'} ${senderFullName}
                        </h2>
                        <p>📅 <strong>גיל:</strong> ${match.sender_age || '—'}</p>
                        <p>📍 <strong>עיר:</strong> ${match.sender_city || '—'}</p>
                        <p>📏 <strong>גובה:</strong> ${match.sender_height ? match.sender_height + ' ס"מ' : '—'}</p>
                        <p>💼 <strong>עיסוק:</strong> ${match.sender_occupation || '—'}</p>
                        <p>🏘️ <strong>מגזר:</strong> ${match.sender_sector || '—'}</p>
                    </div>
                    <div style="flex: 1; background: #fff9f0; border: 2px solid #c9a227; border-radius: 12px; padding: 20px;">
                        <h2 style="color: #1e3a5f; margin: 0 0 15px; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px;">
                            ${match.receiver_gender === 'female' ? '👩' : '👨'} ${receiverFullName}
                        </h2>
                        <p>📅 <strong>גיל:</strong> ${match.receiver_age || '—'}</p>
                        <p>📍 <strong>עיר:</strong> ${match.receiver_city || '—'}</p>
                        <p>📏 <strong>גובה:</strong> ${match.receiver_height ? match.receiver_height + ' ס"מ' : '—'}</p>
                        <p>💼 <strong>עיסוק:</strong> ${match.receiver_occupation || '—'}</p>
                        <p>🏘️ <strong>מגזר:</strong> ${match.receiver_sector || '—'}</p>
                    </div>
                </div>
                <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 0.9rem;">הפנקס — מערכת שידוכים | מייל זה נשלח אוטומטית</p>
                </div>
            </div>
        `;

        await sendEmail(
            match.shadchanit_email,
            `💍 כרטיסיות שידוך: ${senderFullName} & ${receiverFullName}`,
            htmlContent
        );

        // מייל לשני הצדדים — השדכנית נכנסת לטפל
        const shadchanitName = match.shadchanit_name || 'השדכנית';
        setImmediate(() => {
            sendTemplateEmailForUser(match.sender_id, 'new_match', {
                matchDetails: `השדכנית ${shadchanitName} נכנסה לטפל בשידוך שלך. היא תיצור איתך קשר בקרוב.`
            });
            sendTemplateEmailForUser(match.receiver_id, 'new_match', {
                matchDetails: `השדכנית ${shadchanitName} נכנסה לטפל בשידוך שלך. היא תיצור איתך קשר בקרוב.`
            });
        });

        console.log(`[send-match-cards] Cards sent to shadchanit ${match.shadchanit_email} for connection ${connectionId}`);
        res.json({ message: `הכרטיסיות נשלחו בהצלחה לשדכנית ${match.shadchanit_name || ''}` });

    } catch (err) {
        console.error('[send-match-cards] Error:', err);
        res.status(500).json({ message: 'שגיאת שרת בשליחת הכרטיסיות' });
    }
});

// ==========================================


// ==========================================
// 🗑️ מחיקת חשבון על ידי המשתמש (Self-Delete)
// ==========================================
app.delete('/user/delete-account', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // התחלת Transaction כדי לוודא שכל המידע נמחק או כלום לא נמחק
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. מחיקת חיבורים (Connections)
            await client.query('DELETE FROM connections WHERE sender_id = $1 OR receiver_id = $1', [userId]);

            // 2. מחיקת הודעות
            await client.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);

            // 3. מחיקת בקשות תמונה
            await client.query('DELETE FROM photo_view_requests WHERE requester_id = $1 OR target_id = $1', [userId]);

            // 4. מחיקת התראות
            await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);

            // 5. מחיקת המשתמש עצמו
            await client.query('DELETE FROM users WHERE id = $1', [userId]);

            await client.query('COMMIT');
            console.log(`[delete-account] User ${userId} deleted their account successfully.`);
            res.json({ message: 'החשבון נמחק בהצלחה. להתראות!' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[delete-account] Error:', err);
        res.status(500).json({ message: 'שגיאת שרת במחיקת החשבון' });
    }
});

updateDbSchema().then(() => {
    // הגשת frontend בפרודקשן — חייב להיות אחרי כל ה-API routes
    const distPath = path.join(__dirname, 'frontend', 'dist');
    if (require('fs').existsSync(distPath)) {
        app.use('/assets', express.static(path.join(distPath, 'assets'), {
            maxAge: '1y',
            immutable: true
        }));
        app.use(express.static(distPath, {
            maxAge: 0,
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
            }
        }));
        app.get('/{*splat}', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.sendFile(path.join(distPath, 'index.html'));
        });
        console.log('📦 Frontend served from dist/');
    }

    app.listen(port, () => {
        console.log(`🚀 שרת השידוכים רץ בפורט ${port}: http://localhost:${port}/status`);

        // העלאת משפטים סטטיים לימות (ברקע, לא חוסם את השרת)
        if (process.env.YEMOT_NUMBER && process.env.YEMOT_PASSWORD) {
            const { getAllStaticPhrases } = require('./ivr/static-phrases');
            const { preloadStaticPhrases } = require('./ivr/tts');
            const phrases = getAllStaticPhrases();
            console.log(`[TTS] 📋 ${phrases.length} משפטים סטטיים מוכנים להעלאה`);
            preloadStaticPhrases(phrases).catch(err =>
                console.error('[TTS] ❌ שגיאה בהעלאת סטטיים:', err.message)
            );

            // הפעלת job ניקוי קבצי פרופיל ישנים
            const { startCleanupScheduler } = require('./ivr/cleanupJob');
            startCleanupScheduler(pool);
        } else {
            console.log('[TTS] ⏭️ YEMOT credentials not set — skipping static phrase upload');
        }
    });
});