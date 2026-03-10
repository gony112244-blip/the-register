require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function testEmail() {
    console.log('Final Test: Gmail Port 465 (SSL/TLS) + Forced IPv4');

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
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
            subject: 'בדיקת חיבור סופית',
            text: 'מייל בדיקה לבירור תקינות השליחה.',
        });
        console.log('✅ Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

testEmail();
