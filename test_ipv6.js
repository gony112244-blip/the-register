require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Testing Gmail with IPv6 support...');

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true
    });

    try {
        const info = await transporter.sendMail({
            from: '"הפנקס" <' + process.env.EMAIL_USER + '>',
            to: process.env.EMAIL_USER,
            subject: 'בדיקת IPv6',
            text: 'מייל בדיקה לבירור תקינות השליחה באמצעות IPv6.',
        });
        console.log('✅ Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

testEmail();
