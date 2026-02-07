require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
    console.log('Testing email connection...');
    console.log('User:', process.env.EMAIL_USER);

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Test Email from Register App',
            text: 'If you see this, the email configuration is working correctly!אם אתם רואים את זה, המייל עובד תקין.',
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

test();
