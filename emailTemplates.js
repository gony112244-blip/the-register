// תבניות אימייל מקצועיות עבור מערכת הפנקס

const logoUrl = 'https://raw.githubusercontent.com/gony112244-blip/the-register/main/frontend/public/logo.svg';

// תבנית בסיס עם עיצוב מקצועי
const baseTemplate = (content) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 15px;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            color: #ffd700;
            margin: 5px 0 0 0;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
            text-align: right;
            color: #333333;
            line-height: 1.8;
        }
        .content h2 {
            color: #1e3a5f;
            margin-top: 0;
            font-size: 24px;
        }
        .button {
            display: inline-block;
            padding: 15px 35px;
            background: linear-gradient(135deg, #c9a227 0%, #e0b84a 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: scale(1.05);
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666666;
            font-size: 14px;
            border-top: 1px solid #eeeeee;
        }
        .footer a {
            color: #1e3a5f;
            text-decoration: none;
        }
        .highlight-box {
            background-color: #f0f7ff;
            border-right: 4px solid #c9a227;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .info-text {
            color: #666666;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="${logoUrl}" alt="הפנקס" class="logo" />
            <h1>הפנקס</h1>
            <p>שידוכים לבני תורה</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>קיבלת מייל זה כי אישרת לקבל התראות במייל.</p>
            <p>רוצה להפסיק לקבל התראות? <a href="{{UNSUBSCRIBE_LINK}}">לחץ כאן</a></p>
            <p style="margin-top: 15px;">
                <a href="http://localhost:5173">כניסה למערכת</a> | 
                <a href="mailto:hapinkas.contact@gmail.com">צור קשר</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
                © 2026 הפנקס - כל הזכויות שמורות
            </p>
        </div>
    </div>
</body>
</html>
`;

// 1. ברוכים הבאים
const welcomeEmail = (fullName) => baseTemplate(`
    <h2>שלום ${fullName}, ברוכים הבאים! 🎉</h2>
    <p>שמחים מאוד שהצטרפת למערכת השידוכים "הפנקס"!</p>
    
    <div class="highlight-box">
        <strong>השלבים הבאים:</strong>
        <ol style="margin: 10px 0; padding-right: 20px;">
            <li>השלם את פרטי הפרופיל שלך</li>
            <li>העלה תעודת זהות לאימות</li>
            <li>המתן לאישור המנהל</li>
            <li>התחל לקבל הצעות שידוך!</li>
        </ol>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/profile" class="button">השלם פרופיל עכשיו</a>
    </p>
    
    <p class="info-text">💡 טיפ: ככל שתשלים יותר פרטים, כך נוכל להציע לך שידוכים מתאימים יותר.</p>
`);

// 2. הודעה חדשה במערכת
const newMessageEmail = (senderName, messagePreview) => baseTemplate(`
    <h2>קיבלת הודעה חדשה! 💬</h2>
    <p><strong>${senderName}</strong> שלח/ה לך הודעה:</p>
    
    <div class="highlight-box">
        <p style="margin: 0; font-style: italic;">"${messagePreview}"</p>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/messages" class="button">קרא הודעה מלאה</a>
    </p>
    
    <p class="info-text">🔔 זכור לענות במהירות - תקשורת טובה היא המפתח!</p>
`);

// 3. אישור פרופיל
const profileApprovedEmail = (fullName) => baseTemplate(`
    <h2>מזל טוב ${fullName}! ✅</h2>
    <p>הפרופיל שלך אושר על ידי הצוות שלנו!</p>
    
    <div class="highlight-box">
        <p style="margin: 0;">
            🎊 כעת אתה חלק פעיל ממערכת השידוכים.<br>
            💝 תתחיל לקבל הצעות שידוך מתאימות בקרוב.
        </p>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/search" class="button">התחל לחפש שידוכים</a>
    </p>
    
    <p class="info-text">💡 המלצה: עדכן את העדפות החיפוש שלך לקבלת תוצאות מדויקות יותר.</p>
`);

// 4. בקשת צפייה בתמונות
const photoRequestEmail = (requesterName) => baseTemplate(`
    <h2>בקשה לצפייה בתמונות 📷</h2>
    <p><strong>${requesterName}</strong> מבקש/ת לראות את התמונות שלך.</p>
    
    <div class="highlight-box">
        <p style="margin: 0;">
            💭 זהו שלב חשוב בתהליך ההיכרות.<br>
            🔒 שמור על פרטיותך - אשר רק אם אתה מעוניין.
        </p>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/photo-requests" class="button">עבור לבקשות</a>
    </p>
`);

// 5. שידוך חדש מוצע
const newMatchEmail = (partnerName, matchDetails) => baseTemplate(`
    <h2>הצעת שידוך חדשה! 💝</h2>
    <p>יש לנו הצעת שידוך שעשויה להתאים לך!</p>
    
    <div class="highlight-box">
        <p style="margin: 0; font-size: 16px;">
            <strong>הצעה:</strong> ${matchDetails || 'לחץ למידע נוסף'}
        </p>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/matches" class="button">צפה בהצעה</a>
    </p>
    
    <p class="info-text">🌟 זכור: כל שידוך מתחיל בצעד ראשון. בהצלחה!</p>
`);

// 6. איפוס סיסמה
const resetPasswordEmail = (code) => baseTemplate(`
    <h2>בקשה לאיפוס סיסמה 🔑</h2>
    <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
    
    <div class="highlight-box" style="text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #666;">קוד האימות שלך:</p>
        <h1 style="color: #c9a227; letter-spacing: 8px; margin: 15px 0; font-size: 36px;">${code}</h1>
        <p style="margin: 0; font-size: 14px; color: #666;">הקוד תקף ל-10 דקות</p>
    </div>
    
    <p class="info-text">⚠️ לא ביקשת לאפס סיסמה? התעלם ממייל זה.</p>
`);

// 7. Connection חדש
const newConnectionEmail = (senderName) => baseTemplate(`
    <h2>בקשת חיבור חדשה! 🤝</h2>
    <p><strong>${senderName}</strong> מעוניין/ת ליצור איתך קשר.</p>
    
    <div class="highlight-box">
        <p style="margin: 0;">
            ✨ זו הזדמנות נהדרת להכיר מישהו חדש!<br>
            💬 עיין/י בפרופיל והחלט/י אם להמשיך.
        </p>
    </div>
    
    <p style="text-align: center;">
        <a href="http://localhost:5173/connections" class="button">צפה בבקשה</a>
    </p>
`);

// פונקציה לקבלת תבנית לפי סוג
function getEmailTemplate(type, data) {
    switch (type) {
        case 'welcome':
            return {
                subject: 'ברוכים הבאים לפנקס! 🎉',
                html: welcomeEmail(data.fullName)
            };
        case 'new_message':
            return {
                subject: `הודעה חדשה מ-${data.senderName}`,
                html: newMessageEmail(data.senderName, data.messagePreview)
            };
        case 'profile_approved':
            return {
                subject: 'הפרופיל שלך אושר! ✅',
                html: profileApprovedEmail(data.fullName)
            };
        case 'photo_request':
            return {
                subject: `${data.requesterName} מבקש/ת לראות את התמונות שלך`,
                html: photoRequestEmail(data.requesterName)
            };
        case 'new_match':
            return {
                subject: 'הצעת שידוך חדשה! 💝',
                html: newMatchEmail(data.partnerName, data.matchDetails)
            };
        case 'reset_password':
            return {
                subject: '🔑 קוד לאיפוס סיסמה',
                html: resetPasswordEmail(data.code)
            };
        case 'new_connection':
            return {
                subject: `${data.senderName} רוצה ליצור איתך קשר`,
                html: newConnectionEmail(data.senderName)
            };
        default:
            return null;
    }
}

module.exports = { getEmailTemplate };
