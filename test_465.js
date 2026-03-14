require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function testEmail() {
    console.log('Testing Gmail Port 465 (SSL/TLS)...');

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
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
            subject: 'בדיקת פורט 465',
            text: 'מייל בדיקה לבירור תקינות השליחה בפורט 465.',
        });
        console.log('✅ Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

testEmail();
