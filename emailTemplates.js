// תבניות אימייל מקצועיות עבור מערכת הפנקס

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// --- תבנית בסיס ---
const baseTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="x-apple-disable-message-reformatting">
    <title>הפנקס - שידוכים לבני תורה</title>
    ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Heebo', 'Segoe UI', Tahoma, Arial, sans-serif;
            background-color: #ffffff;
            direction: rtl;
            text-align: right;
            -webkit-text-size-adjust: 100%;
        }
        .wrapper {
            width: 100%;
            background-color: #ffffff;
            padding: 30px 16px;
        }
        .email-card {
            max-width: 580px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        /* ---- Header ---- */
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);
            padding: 30px 30px 24px;
            text-align: center;
        }
        .header-logo { font-size: 38px; display: block; margin-bottom: 8px; }
        .header h1 { color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 4px; }
        .header-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; }
        .header-divider {
            height: 3px;
            background: linear-gradient(90deg, transparent, #c9a227, transparent);
        }
        /* ---- Body ---- */
        .body {
            padding: 36px 32px;
            background: #ffffff;
            color: #1e293b;
            line-height: 1.8;
            direction: rtl;
            text-align: right;
        }
        .greeting {
            font-size: 20px;
            font-weight: 800;
            color: #1e3a5f;
            margin-bottom: 12px;
            text-align: right;
        }
        .body p {
            font-size: 15px;
            color: #475569;
            margin-bottom: 14px;
            text-align: right;
        }
        /* ---- Highlight Box ---- */
        .highlight-box {
            background: #f8fafc;
            border-right: 4px solid #c9a227;
            border-radius: 10px;
            padding: 16px 18px;
            margin: 20px 0;
            text-align: right;
        }
        .highlight-box p { margin: 0; color: #1e3a5f; font-size: 15px; text-align: right; }
        /* ---- Success Box ---- */
        .success-box {
            background: #f0fdf4;
            border-right: 4px solid #22c55e;
            border-radius: 10px;
            padding: 16px 18px;
            margin: 20px 0;
            text-align: right;
        }
        .success-box p { margin: 0; color: #14532d; font-size: 15px; text-align: right; }
        /* ---- Error Box ---- */
        .error-box {
            background: #fef2f2;
            border-right: 4px solid #ef4444;
            border-radius: 10px;
            padding: 16px 18px;
            margin: 20px 0;
            text-align: right;
        }
        .error-box p { margin: 0; color: #7f1d1d; font-size: 15px; text-align: right; }
        /* ---- Code Box ---- */
        .code-box {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%);
            border-radius: 14px;
            padding: 24px;
            margin: 20px 0;
            text-align: center;
        }
        .code-label {
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        .code-number {
            color: #ffd700;
            font-size: 38px;
            font-weight: 800;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            display: block;
            margin-bottom: 8px;
        }
        .code-expiry { color: rgba(255,255,255,0.4); font-size: 12px; }
        /* ---- CTA Button ---- */
        .btn-wrapper { text-align: center; margin: 24px 0; }
        .btn-primary {
            display: inline-block;
            padding: 14px 36px;
            background: linear-gradient(135deg, #c9a227 0%, #b08d1f 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
        }
        .btn-secondary {
            display: inline-block;
            padding: 11px 28px;
            background: transparent;
            color: #1e3a5f !important;
            text-decoration: none;
            border: 2px solid #1e3a5f;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
        }
        /* ---- Step List (RTL safe) ---- */
        .step-list { list-style: none; padding: 0; margin: 16px 0; }
        .step-list li {
            display: flex;
            flex-direction: row-reverse;
            align-items: flex-start;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            color: #475569;
            text-align: right;
        }
        .step-list li:last-child { border-bottom: none; }
        .step-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
        /* ---- Update Item (RTL safe) ---- */
        .update-item {
            display: flex;
            flex-direction: row-reverse;
            gap: 14px;
            align-items: flex-start;
            padding: 14px 0;
            border-bottom: 1px solid #f1f5f9;
            text-align: right;
        }
        .update-item:last-child { border-bottom: none; }
        .update-icon-wrap {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, #1e3a5f, #2d5a8f);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0;
        }
        .update-title { font-size: 15px; font-weight: 700; color: #1e3a5f; margin-bottom: 3px; text-align: right; }
        .update-desc { font-size: 13px; color: #64748b; text-align: right; }
        /* ---- Separator ---- */
        .separator {
            height: 1px;
            background: #e2e8f0;
            margin: 24px 0;
        }
        /* ---- Wrong Email Banner ---- */
        .wrong-email-banner {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 24px;
            font-size: 13px;
            color: #7f1d1d;
            text-align: center;
        }
        .wrong-email-banner a { color: #dc2626; font-weight: 600; }
        /* ---- Footer ---- */
        .footer {
            background: #f8fafc;
            padding: 20px 28px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            line-height: 2;
        }
        .footer a { color: #64748b; text-decoration: none; }
        .footer-copy { font-size: 11px; color: #cbd5e1; margin-top: 6px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="email-card">

        <div class="header">
            <span class="header-logo">📋</span>
            <h1>הפנקס</h1>
            <p class="header-subtitle">שידוכים לבני תורה</p>
        </div>
        <div class="header-divider"></div>

        <div class="body">
            ${content}
        </div>

        <div class="footer">
            <a href="${APP_URL}">כניסה למערכת</a>
            &nbsp;·&nbsp;
            <a href="${APP_URL}/profile">הפרופיל שלי</a>
            &nbsp;·&nbsp;
            <a href="mailto:hapinkas.contact@gmail.com">צור קשר</a>
            <br>
            <p>קיבלת מייל זה כי נרשמת למערכת "הפנקס".</p>
            <div class="footer-copy">© ${new Date().getFullYear()} הפנקס · כל הזכויות שמורות</div>
        </div>

    </div>
</div>
</body>
</html>
`;

// ============================================================
// 1. אימות אימייל
// ============================================================
const verificationEmail = (fullName, code, userId) => baseTemplate(`
    <p class="greeting">שלום ${fullName || 'אורח'} 👋</p>
    <p>תודה שנרשמת ל<strong>פנקס השידוכים</strong>. אנא אמת את כתובת המייל שלך כדי להפעיל את החשבון ולקבל התראות.</p>

    <p style="font-size:14px; color:#1e3a5f; font-weight:600; margin-bottom:6px;">אפשרות א׳ — לחיצת כפתור (קלה ומהירה):</p>
    <div class="btn-wrapper">
        <a href="${SERVER_URL}/verify-email-link?code=${code}&userId=${userId}" class="btn-primary">✅ אמת את האימייל שלי</a>
    </div>

    <div class="separator"></div>

    <p style="font-size:14px; color:#1e3a5f; font-weight:600; margin-bottom:6px;">אפשרות ב׳ — הזנת קוד ידנית:</p>
    <div class="code-box">
        <p class="code-label">קוד האימות שלך</p>
        <span class="code-number">${code}</span>
        <p class="code-expiry">הקוד תקף ל-24 שעות</p>
    </div>
    <p style="font-size:14px; color:#64748b;">היכנס לאתר ובשלב אימות המייל הזן את הקוד למעלה.</p>

    <div class="wrong-email-banner">
        ⚠️ לא נרשמת ל"פנקס" ואינך מכיר/ה מי שנרשם?<br>
        <a href="${SERVER_URL}/report-wrong-email?userId=${userId}">לחץ כאן להסרת המייל מהמערכת</a>
    </div>
`, 'אמת את חשבונך ב"הפנקס"');


// ============================================================
// 2. ברוכים הבאים (לאחר אימות)
// ============================================================
const welcomeEmail = (fullName) => baseTemplate(`
    <p class="greeting">🎉 ברוך הבא, ${fullName}!</p>
    <p>חשבונך אומת בהצלחה! כעת אתה חלק ממערכת <strong>הפנקס</strong> — שידוכים לבני תורה.</p>

    <div class="highlight-box">
        <p><strong>השלבים הבאים לתחילת הדרך:</strong></p>
    </div>

    <ul class="step-list">
        <li><span class="step-icon">📝</span><span>השלם את <strong>פרטי הפרופיל</strong> — ככל שיהיה מלא יותר, כך ייטב</span></li>
        <li><span class="step-icon">🪪</span><span>העלה <strong>תעודת זהות</strong> לאימות — שלב חיוני לאבטחת המערכת</span></li>
        <li><span class="step-icon">⏳</span><span>המתן לאישור המנהל — בדרך כלל תוך 24 שעות</span></li>
        <li><span class="step-icon">💍</span><span>התחל לקבל <strong>הצעות שידוך</strong> מותאמות אישית</span></li>
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
        <p style="font-style:italic;">"${messagePreview}"</p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/inbox" class="btn-primary">📨 קרא וענה עכשיו</a>
    </div>
`, `${senderName} שלח/ה לך הודעה`);


// ============================================================
// 4. אישור פרופיל על ידי המנהל
// ============================================================
const profileApprovedEmail = (fullName) => baseTemplate(`
    <p class="greeting">✅ מזל טוב, ${fullName}!</p>
    <p>הפרופיל שלך עבר בדיקה ואושר על ידי הצוות שלנו. כעת אתה חלק פעיל במערכת השידוכים!</p>

    <div class="success-box">
        <p>💍 תתחיל לקבל הצעות שידוך מותאמות בקרוב.<br>
        🔍 תוכל גם לגלוש בעצמך ולמצוא הצעות מתאימות.</p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/matches" class="btn-primary">💫 גש לשידוכים עכשיו</a>
    </div>
`, 'הפרופיל שלך אושר! ✅');


// ============================================================
// 5. אישור שינויים בפרופיל
// ============================================================
const profileChangesApprovedEmail = (fullName) => baseTemplate(`
    <p class="greeting">✅ השינויים אושרו, ${fullName || ''}!</p>
    <p>המנהל עבר על השינויים שביקשת בפרופיל שלך ואישר אותם.</p>

    <div class="success-box">
        <p>הכרטיס שלך מעודכן כעת ומוצג למחפשים מתאימים.</p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/my-profile" class="btn-primary">👤 צפה בפרופיל שלי</a>
    </div>
`, 'השינויים בפרופיל אושרו ✅');


// ============================================================
// 6. דחיית שינויים בפרופיל
// ============================================================
const profileChangesRejectedEmail = (fullName, reason) => baseTemplate(`
    <p class="greeting">השינויים בפרופיל נדחו</p>
    <p>שלום ${fullName || ''}, המנהל בדק את השינויים שביקשת ולא אישר אותם.</p>

    ${reason ? `
    <div class="error-box">
        <p><strong>סיבה:</strong> ${reason}</p>
    </div>` : ''}

    <p>ניתן לערוך את הפרופיל מחדש ולשלוח לאישור שנית, או לפנות ישירות לצוות לקבלת הסבר.</p>

    <div class="btn-wrapper">
        <a href="${APP_URL}/my-profile" class="btn-secondary">✏️ ערוך פרופיל מחדש</a>
    </div>
`, 'השינויים בפרופיל נדחו');


// ============================================================
// 7. בקשת צפייה בתמונות
// ============================================================
const photoRequestEmail = (requesterName) => baseTemplate(`
    <p class="greeting">📸 בקשה לצפייה בתמונות</p>
    <p><strong>${requesterName}</strong> מבקש/ת לקבל גישה לצפייה ב<strong>תמונות</strong> שלך.</p>

    <div class="highlight-box">
        <p>
            💭 זהו שלב חשוב בתהליך ההיכרות.<br>
            🔒 אשר/י רק אם אתה/ת מעוניין/ת להמשיך.
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/photo-requests" class="btn-primary">👁️ ראה את הבקשה ואשר / דחה</a>
    </div>
`, `${requesterName} מבקש/ת לראות תמונות`);


// ============================================================
// 8. הצעת שידוך חדשה
// ============================================================
const newMatchEmail = (matchDetails) => baseTemplate(`
    <p class="greeting">💍 הצעת שידוך חדשה!</p>
    <p>יש לנו הצעה שעשויה מאוד להתאים לך — כדאי להסתכל!</p>

    ${matchDetails ? `
    <div class="highlight-box">
        <p>${matchDetails}</p>
    </div>` : ''}

    <div class="btn-wrapper">
        <a href="${APP_URL}/matches" class="btn-primary">🌟 צפה בהצעה</a>
    </div>

    <p style="font-size:13px; color:#94a3b8; text-align:center;">כל שידוך מתחיל בצעד ראשון — בהצלחה! 🙏</p>
`, 'הצעת שידוך חדשה ממתינה לך 💍');


// ============================================================
// 9. בקשת קשר חדשה (מישהו הציע את עצמו)
// ============================================================
const newConnectionEmail = (senderName) => baseTemplate(`
    <p class="greeting">🤝 בקשת קשר וגישה לפרטים</p>
    <p><strong>${senderName}</strong> מעוניין/ת להציע שידוך ולקבל גישה ל<strong>פרטי הפרופיל</strong> שלך.</p>

    <div class="highlight-box">
        <p>
            ✨ בדוק/י את הפרטים והחליט/י אם להמשיך.<br>
            💬 אישור הבקשה פותח ערוץ תקשורת ביניכם.
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/connections" class="btn-primary">👀 ראה את הבקשה</a>
    </div>
`, `${senderName} מציע/ה קשר`);


// ============================================================
// 10. הבקשה שלך אושרה (הצד השני הסכים)
// ============================================================
const connectionAcceptedEmail = (acceptorName) => baseTemplate(`
    <p class="greeting">🎉 הבקשה שלך אושרה!</p>
    <p><strong>${acceptorName}</strong> אישר/ה את בקשת הקשר שלך. כעת ניתן להתחיל שיחה!</p>

    <div class="success-box">
        <p>
            💬 תוכל לשלוח הודעה ראשונה דרך תיבת הדואר.<br>
            🙏 בהצלחה!
        </p>
    </div>

    <div class="btn-wrapper">
        <a href="${APP_URL}/connections" class="btn-primary">💬 התחל שיחה עכשיו</a>
    </div>
`, `${acceptorName} אישר/ה את בקשתך!`);


// ============================================================
// 11. איפוס סיסמה
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
        <p>⚠️ לא ביקשת לאפס סיסמה? <strong>התעלם ממייל זה</strong> — אין צורך לעשות דבר.</p>
    </div>
`, 'קוד לאיפוס סיסמה 🔑');


// ============================================================
// 12. חידושים במערכת
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
        <div style="margin: 20px 0;">
            ${updateItems}
        </div>
        <div class="btn-wrapper">
            <a href="${APP_URL}" class="btn-primary">🚀 כנס ובדוק עכשיו</a>
        </div>
    `, 'יש חידושים ב"הפנקס" עבורך!');
};


// ============================================================
// 13. תזכורת לאימות מייל
// ============================================================
const verifyReminderEmail = (fullName, code, userId) => baseTemplate(`
    <p class="greeting">⏰ תזכורת: אימות המייל שלך</p>
    <p>שלום ${fullName}, שמנו לב שטרם אימתת את כתובת המייל שלך ב"פנקס".</p>
    <p>אימות המייל מאפשר לך לקבל:</p>

    <ul class="step-list">
        <li><span class="step-icon">📨</span><span>התראות על הודעות חדשות</span></li>
        <li><span class="step-icon">💍</span><span>עדכונים על הצעות שידוך</span></li>
        <li><span class="step-icon">📸</span><span>בקשות צפייה בתמונות</span></li>
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
`, 'תזכורת: אימות האימייל שלך');


// ============================================================
// getEmailTemplate — מרכז כל הסוגים
// ============================================================
function getEmailTemplate(type, data) {
    switch (type) {
        case 'verification':
            return {
                subject: '🔐 אימות האימייל שלך — הפנקס',
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
        case 'profile_changes_approved':
            return {
                subject: '✅ השינויים בפרופיל אושרו',
                html: profileChangesApprovedEmail(data.fullName)
            };
        case 'profile_changes_rejected':
            return {
                subject: '❌ השינויים בפרופיל נדחו',
                html: profileChangesRejectedEmail(data.fullName, data.reason)
            };
        case 'photo_request':
            return {
                subject: `📷 ${data.requesterName} מבקש/ת לראות את התמונות שלך`,
                html: photoRequestEmail(data.requesterName)
            };
        case 'new_match':
            return {
                subject: '💍 הצעת שידוך חדשה ממתינה לך!',
                html: newMatchEmail(data.matchDetails)
            };
        case 'new_connection':
            return {
                subject: `🤝 ${data.senderName} מציע/ה קשר`,
                html: newConnectionEmail(data.senderName)
            };
        case 'connection_accepted':
            return {
                subject: `🎉 ${data.acceptorName} אישר/ה את בקשתך!`,
                html: connectionAcceptedEmail(data.acceptorName)
            };
        case 'reset_password':
            return {
                subject: '🔑 קוד לאיפוס סיסמה — הפנקס',
                html: resetPasswordEmail(data.code)
            };
        case 'system_updates':
            return {
                subject: '🗞️ חידושים ב"הפנקס"',
                html: systemUpdatesEmail(data.updates || [])
            };
        default:
            return null;
    }
}

module.exports = { getEmailTemplate };
