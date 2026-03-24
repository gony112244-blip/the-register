const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// --- הגדרות לבדיקה ---
const SERVER_URL = 'http://localhost:3000'; // וודא שהשרת רץ על פורט 3000
const TEST_PHONE = '0501234567';            // מספר הטלפון שקיים בדאטאבייס שלך
const TEST_EMAIL = 'office@hapinkas.co.il';  // המייל שאליו תרצה לקבל את הקוד בבדיקה

async function testServerForgotPassword() {
    console.log(`🚀 בודק את השרת בכתובת: ${SERVER_URL}...`);
    console.log(`📱 מנסה לשלוח קוד לטלפון: ${TEST_PHONE}`);

    try {
        const response = await fetch(`${SERVER_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: TEST_PHONE,
                method: 'email',
                email: TEST_EMAIL // זה ישמש רק אם למשתמש ב-DB אין מייל מוגדר
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ הצלחה!');
            console.log('📄 תגובת השרת:', data.message);
            console.log('📧 בדוק את המייל שלך עכשיו!');
        } else {
            console.log('❌ השגיאה מהשרת:', data.message || 'שגיאה לא ידועה');
        }
    } catch (err) {
        console.error('❌ תקלה בחיבור לשרת. האם הרצת npm start?');
        console.error('Error:', err.message);
    }
}

testServerForgotPassword();
