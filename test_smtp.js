require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function testEmail() {
    console.log('Testing email directly with Gmail service (Forced IPv4)...');
    console.log('User:', process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    try {
        const info = await transporter.sendMail({
            from: '"הפנקס - שידוכים" <' + process.env.EMAIL_USER + '>',
            to: process.env.EMAIL_USER, // Send to self
            subject: 'בדיקת חיבור - הפנקס',
            text: 'אם המייל הזה הגיע, סימן שהחיבור עובד (IPv4)!',
        });
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send test email:', error);
    }
}

testEmail();
