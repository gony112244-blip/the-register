// תבניות אימייל מקצועיות עבור מערכת הפנקס

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// --- תבנית בסיס: עיצוב פרימיום ---
const baseTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="x-apple-disable-message-reformatting">
    <title>הפנקס - שידוכים לבני תורה</title>
    ${previewText ? `<!-- Preview text --><div style="max-height:0; overflow:hidden; display:none;">${previewText}</div>` : ''}
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Heebo', 'Segoe UI', Tahoma, Arial, sans-serif;
            background-color: #0f1a2e;
            direction: rtl;
            -webkit-text-size-adjust: 100%;
        }

        .wrapper {
            width: 100%;
            background: linear-gradient(160deg, #0f1a2e 0%, #1e3a5f 50%, #0f1a2e 100%);
            padding: 40px 16px;
        }

        .email-card {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        }

        /* ---- Header ---- */
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 60%, #1a4a7f 100%);
            padding: 36px 30px 28px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50px; left: 50%;
            transform: translateX(-50%);
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%);
            pointer-events: none;
        }
        .header-badge {
            display: inline-block;
            background: rgba(201,162,39,0.2);
            border: 1px solid rgba(201,162,39,0.4);
            color: #ffd700;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 2px;
            padding: 4px 14px;
            border-radius: 20px;
            margin-bottom: 14px;
            text-transform: uppercase;
        }
        .header-logo {
            font-size: 42px;
            display: block;
            margin-bottom: 10px;
        }
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
        }
        .header-subtitle {
            color: rgba(255,255,255,0.6);
            font-size: 14px;
            font-weight: 400;
        }

        /* ---- Divider Line ---- */
        .header-divider {
            height: 3px;
            background: linear-gradient(90deg, transparent, #c9a227, transparent);
        }

        /* ---- Body ---- */
        .body {
            padding: 40px 36px;
            background: #ffffff;
            color: #1e293b;
            line-height: 1.8;
        }

        .greeting {
            font-size: 22px;
            font-weight: 800;
            color: #1e3a5f;
            margin-bottom: 12px;
        }

        .body p {
            font-size: 15px;
            color: #475569;
            margin-bottom: 16px;
        }

        /* ---- Highlight Box ---- */
        .highlight-box {
            background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
            border-right: 4px solid #c9a227;
            border-radius: 12px;
            padding: 18px 20px;
            margin: 24px 0;
        }
        .highlight-box p { margin: 0; color: #1e3a5f; font-size: 15px; }

        /* ---- Code Box (for verification codes) ---- */
        .code-box {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
        }
        .code-label {
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .code-number {
            color: #ffd700;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            display: block;
            margin-bottom: 8px;
        }
        .code-expiry {
            color: rgba(255,255,255,0.4);
            font-size: 12px;
        }

        /* ---- CTA Button ---- */
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn-primary {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #c9a227 0%, #b08d1f 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.3px;
            box-shadow: 0 8px 25px rgba(201,162,39,0.4);
        }
        .btn-secondary {
            display: inline-block;
            padding: 12px 32px;
            background: transparent;
            color: #1e3a5f !important;
            text-decoration: none;
            border: 2px solid #1e3a5f;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        .btn-danger {
            display: inline-block;
            padding: 10px 28px;
            background: transparent;
            color: #dc2626 !important;
            text-decoration: none;
            border: 1.5px solid #dc2626;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
        }

        /* ---- Icon Row ---- */
        .step-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .step-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            color: #475569;
        }
        .step-list li:last-child { border-bottom: none; }
        .step-icon {
            font-size: 20px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        /* ---- Update Item (for 'what's new' emails) ---- */
        .update-item {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            padding: 14px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .update-item:last-child { border-bottom: none; }
        .update-icon-wrap {
            width: 42px; height: 42px;
            background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .update-title { font-size: 15px; font-weight: 700; color: #1e3a5f; margin-bottom: 3px; }
        .update-desc  { font-size: 13px; color: #64748b; }

        /* ---- Separator ---- */
        .separator {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 28px 0;
        }

        /* ---- Wrong Email Banner ---- */
        .wrong-email-banner {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 10px;
            padding: 14px 16px;
            margin-top: 28px;
            font-size: 13px;
            color: #7f1d1d;
            text-align: center;
        }
        .wrong-email-banner a { color: #dc2626; font-weight: 600; }

        /* ---- Footer ---- */
        .footer {
            background: #f8fafc;
            padding: 24px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            line-height: 2;
        }
        .footer a { color: #64748b; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .footer-links { margin-bottom: 8px; }
        .footer-copy { font-size: 11px; color: #cbd5e1; margin-top: 8px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="email-card">

        <!-- Header -->
        <div class="header">
            <span class="header-badge">הפנקס</span>
            <span class="header-logo">📋</span>
            <h1>הפנקס</h1>
            <p class="header-subtitle">שידוכים לבני תורה</p>
        </div>
        <div class="header-divider"></div>

        <!-- Body -->
        <div class="body">
            ${content}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-links">
                <a href="${APP_URL}">כניסה למערכת</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/profile">הפרופיל שלי</a>
                &nbsp;·&nbsp;
                <a href="mailto:hapinkas.contact@gmail.com">צור קשר</a>
            </div>
            <p>קיבלת מייל זה כי נרשמת למערכת "הפנקס".</p>
            <div class="footer-copy">© ${new Date().getFullYear()} הפנקס · כל הזכויות שמורות</div>
        </div>

    </div>
</div>
</body>
</html>
`;

// ============================================================
// 1. אימות אימייל (Verification) - עם שתי אפשרויות
// ============================================================
const verificationEmail = (fullName, code, userId) => baseTemplate(`
    <p class="greeting">שלום ${fullName || 'אורח'} 👋</p>
    <p>תודה שנרשמת ל<strong>פנקס השידוכים</strong>. כדי להפעיל את חשבונך ולקבל עדכונים, אנא אמת את כתובת המייל שלך.</p>

    <p style="font-size:14px; color:#64748b; margin-bottom:6px;"><strong>אפשרות א' — לחיצת כפתור (קלה ומהירה):</strong></p>
    <div class="btn-wrapper">
        <a href="${SERVER_URL}/verify-email-link?code=${code}&userId=${userId}" class="btn-primary">✅ אמת את האימייל שלי</a>
    </div>

    <div class="separator"></div>

    <p style="font-size:14px; color:#64748b; margin-bottom:6px;"><strong>אפשרות ב' — הזנת קוד ידנית:</strong></p>
    <div class="code-box">
        <p class="code-label">קוד האימות שלך</p>
        <span class="code-number">${code}</span>
        <p class="code-expiry">הקוד תקף ל-24 שעות</p>
    </div>
    <p style="font-size:14px; color:#64748b;">היכנס לאתר ובשלב אימות המייל הזן את הקוד למעלה.</p>

    <div class="wrong-email-banner">
        ⚠️ לא נרשמת ל"פנקס" ואינך מכיר/ה מי שנרשם?<br>
        <a href="${SERVER_URL}/report-wrong-email?userId=${userId}">לחץ כאן להסרת המייל מהמערכת</a> — לא תשמע מאיתנו שוב.
    </div>
`, 'אמת את חשבונך ב"הפנקס"');


// ============================================================
// 2. ברוכים הבאים (לאחר אימות)
// ============================================================
const welcomeEmail = (fullName) => baseTemplate(`
    <p class="greeting">🎉 ברוך הבא, ${fullName}!</p>
    <p>חשבונך אומת! כעת אתה חלק ממשפחת <strong>הפנקס</strong> — מערכת השידוכים לבני תורה.</p>

    <div class="highlight-box">
        <p><strong>👇 השלבים הבאים:</strong></p>
    </div>

    <ul class="step-list">
        <li><span class="step-icon">📝</span><span>השלם את <strong>פרטי הפרופיל</strong> שלך — ככל שיהיה מלא יותר, כך ייטב</span></li>
        <li><span class="step-icon">🪪</span><span>העלה <strong>תעודת זהות</strong> לאימות — שלב חיוני לאבטחת המערכת</span></li>
        <li><span class="step-icon">⏳</span><span>המתן לאישור המנהל — בד"כ תוך 24 שעות</span></li>
        <li><span class="step-icon">💝</span><span>התחל לקבל <strong>הצעות שידוך</strong> מותאמות אישית!</span></li>
    </ul>

    <div class="btn-wrapper">
        <a href="${APP_URL}/profile" class="btn-primary">🚀 השלם פרופיל עכשיו</a>
    </div>
`, 'ברוך הבא לפנקס! 🎉');


// ============================================================
// 3. הודעה חדשה
// ============================================================
const newMessageEmail = (senderName, messagePreview) => baseTemplate(`
    <p class="greeting">💬 הודעה חדשה מחכה לך!</p>
    <p>קיבלת הודעה חדשה מ<strong>${senderName}</strong>:</p>

    <div class="highlight-box">
        <p style="font-style:italic; font-size:15px;">"${messagePreview}"</p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/inbox" class="btn-primary">📨 קרא וענה עכשיו</a>
    </div>

    <p style="font-size:13px; color:#94a3b8; text-align:center;">🔔 תגובה מהירה מגבירה את הסיכוי להצלחה!</p>
`, `${senderName} שלח/ה לך הודעה`);


// ============================================================
// 4. אישור פרופיל
// ============================================================
const profileApprovedEmail = (fullName) => baseTemplate(`
    <p class="greeting">✅ מזל טוב, ${fullName}!</p>
    <p>הפרופיל שלך אושר על ידי הצוות שלנו. כעת אתה חלק פעיל במערכת השידוכים!</p>

    <div class="highlight-box">
        <p>💝 תתחיל לקבל הצעות שידוך מותאמות בקרוב.<br>
        🔍 תוכל גם לגלוש בעצמך ולמצוא הצעות מתאימות.</p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/matches" class="btn-primary">💫 גש לשידוכים עכשיו</a>
    </div>

    <p style="font-size:13px; color:#94a3b8; text-align:center;">💡 עדכן את העדפות החיפוש שלך לתוצאות מדויקות יותר.</p>
`, 'הפרופיל שלך אושר! ✅');


// ============================================================
// 5. בקשת צפייה בתמונות
// ============================================================
const photoRequestEmail = (requesterName) => baseTemplate(`
    <p class="greeting">📷 בקשה לצפייה בתמונות</p>
    <p><strong>${requesterName}</strong> מבקש/ת לראות את התמונות שלך.</p>

    <div class="highlight-box">
        <p>
            💭 זהו שלב חשוב בתהליך ההיכרות.<br>
            🔒 אשר/י רק אם אתה/ת מעוניין/ת להמשיך.
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/photo-requests" class="btn-primary">👁️ ראה את הבקשה ואשר/דחה</a>
    </div>
`, `${requesterName} מבקש/ת לראות תמונות`);


// ============================================================
// 6. הצעת שידוך חדשה
// ============================================================
const newMatchEmail = (partnerName, matchDetails) => baseTemplate(`
    <p class="greeting">💝 הצעת שידוך חדשה!</p>
    <p>יש לנו הצעה שעשויה מאוד להתאים לך:</p>

    <div class="highlight-box">
        <p style="font-size:16px;">
            <strong>ההצעה:</strong> ${matchDetails || 'פתח את האפליקציה למידע מלא'}
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/matches" class="btn-primary">🌟 צפה בפרטי ההצעה</a>
    </div>

    <p style="font-size:13px; color:#94a3b8; text-align:center;">כל שידוך מתחיל בצעד ראשון — בהצלחה! 🙏</p>
`, 'הצעת שידוך חדשה ממתינה לך 💝');


// ============================================================
// 7. איפוס סיסמה
// ============================================================
const resetPasswordEmail = (code) => baseTemplate(`
    <p class="greeting">🔑 בקשה לאיפוס סיסמה</p>
    <p>קיבלנו בקשה לאיפוס הסיסמה שלך. הנה קוד האימות:</p>

    <div class="code-box">
        <p class="code-label">קוד איפוס סיסמה</p>
        <span class="code-number">${code}</span>
        <p class="code-expiry">הקוד תקף ל-10 דקות בלבד</p>
    </div>

    <div class="highlight-box">
        <p>⚠️ לא ביקשת לאפס סיסמה? <strong>התעלם ממייל זה לגמרי</strong> — אין צורך לעשות דבר.</p>
    </div>
`, 'קוד לאיפוס סיסמה 🔑');


// ============================================================
// 8. בקשת חיבור חדשה
// ============================================================
const newConnectionEmail = (senderName) => baseTemplate(`
    <p class="greeting">🤝 בקשת קשר חדשה!</p>
    <p><strong>${senderName}</strong> מעוניין/ת ליצור איתך קשר דרך "הפנקס".</p>

    <div class="highlight-box">
        <p>
            ✨ בדוק/י את הפרופיל והחליט/י אם להמשיך.<br>
            💬 אישור הבקשה פותח ערוץ תקשורת ביניכם.
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/connections" class="btn-primary">👀 ראה את הבקשה</a>
    </div>
`, `${senderName} מעוניין/ת ביצירת קשר`);


// ============================================================
// 9. חידושים במערכת (What's New)
// ============================================================
const systemUpdatesEmail = (updates) => {
    const updateItems = updates.map(u => `
        <div class="update-item">
            <div class="update-icon-wrap">${u.icon}</div>
            <div>
                <p class="update-title">${u.title}</p>
                <p class="update-desc">${u.description}</p>
            </div>
        </div>
    `).join('');

    return baseTemplate(`
        <p class="greeting">🗞️ חידושים ב"הפנקס"</p>
        <p>יש חדשות! הנה מה שהתעדכן לאחרונה במערכת עבורך:</p>
        <div style="margin: 24px 0;">
            ${updateItems}
        </div>
        <div class="btn-wrapper">
            <a href="${APP_URL}" class="btn-primary">🚀 כנס ובדוק עכשיו</a>
        </div>
    `, 'יש חידושים ב"הפנקס" עבורך!');
};


// ============================================================
// 10. תזכורת לאימות מייל (נשלחת אחרי דילוג)
// ============================================================
const verifyReminderEmail = (fullName, code, userId) => baseTemplate(`
    <p class="greeting">⏰ תזכורת: אמת את האימייל שלך</p>
    <p>שלום ${fullName}, שמנו לב שטרם אימתת את כתובת המייל שלך ב"פנקס".</p>
    <p>אימות המייל מאפשר לך לקבל:</p>

    <ul class="step-list">
        <li><span class="step-icon">📨</span><span>התראות על הודעות חדשות</span></li>
        <li><span class="step-icon">💝</span><span>עדכונים על הצעות שידוך</span></li>
        <li><span class="step-icon">📷</span><span>בקשות צפייה בתמונות</span></li>
        <li><span class="step-icon">🔑</span><span>אפשרות לשחזור סיסמה</span></li>
    </ul>

    <div class="btn-wrapper">
        <a href="${SERVER_URL}/verify-email-link?code=${code}&userId=${userId}" class="btn-primary">✅ אמת עכשיו</a>
    </div>

    <div class="code-box">
        <p class="code-label">קוד אימות חלופי</p>
        <span class="code-number">${code}</span>
        <p class="code-expiry">תקף ל-24 שעות</p>
    </div>

    <div class="wrong-email-banner">
        ⚠️ קיבלת זאת בטעות?
        <a href="${SERVER_URL}/report-wrong-email?userId=${userId}">לחץ כאן להסרת המייל</a>
    </div>
`, 'תזכורת: אמת את האימייל שלך');


// ============================================================
// getEmailTemplate — מרכז כל הסוגים
// ============================================================
function getEmailTemplate(type, data) {
    switch (type) {
        case 'verification':
            return {
                subject: '🔐 אמת את האימייל שלך — הפנקס',
                html: verificationEmail(data.fullName, data.code, data.userId)
            };
        case 'verify_reminder':
            return {
                subject: '⏰ תזכורת — אימות האימייל שלך',
                html: verifyReminderEmail(data.fullName, data.code, data.userId)
            };
        case 'welcome':
            return {
                subject: '🎉 ברוכים הבאים לפנקס!',
                html: welcomeEmail(data.fullName)
            };
        case 'new_message':
            return {
                subject: `💬 הודעה חדשה מ-${data.senderName}`,
                html: newMessageEmail(data.senderName, data.messagePreview)
            };
        case 'profile_approved':
            return {
                subject: '✅ הפרופיל שלך אושר!',
                html: profileApprovedEmail(data.fullName)
            };
        case 'photo_request':
            return {
                subject: `📷 ${data.requesterName} מבקש/ת לראות את התמונות שלך`,
                html: photoRequestEmail(data.requesterName)
            };
        case 'new_match':
            return {
                subject: '💝 הצעת שידוך חדשה ממתינה לך!',
                html: newMatchEmail(data.partnerName, data.matchDetails)
            };
        case 'reset_password':
            return {
                subject: '🔑 קוד לאיפוס סיסמה — הפנקס',
                html: resetPasswordEmail(data.code)
            };
        case 'new_connection':
            return {
                subject: `🤝 ${data.senderName} רוצה ליצור איתך קשר`,
                html: newConnectionEmail(data.senderName)
            };
        case 'system_updates':
            return {
                subject: '🗞️ חידושים ב"הפנקס" — עדכון מהמערכת',
                html: systemUpdatesEmail(data.updates || [])
            };
        default:
            return null;
    }
}

module.exports = { getEmailTemplate };
