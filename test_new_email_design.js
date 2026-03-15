require('dotenv').config();
const nodemailer = require('nodemailer');
const { getEmailTemplate } = require('./emailTemplates');

async function sendTestEmail() {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const emailType = 'verification';
    const data = {
        fullName: 'ישראל ישראלי',
        code: '123456',
        userId: 123
    };

    const template = getEmailTemplate(emailType, data);

    try {
        console.log('Sending test email to hapinkas.contact@gmail.com...');
        await transporter.sendMail({
            from: '"הפנקס - שידוכים" <hapinkas.contact@gmail.com>',
            to: 'hapinkas.contact@gmail.com',
            subject: template.subject,
            html: template.html,
        });
        console.log('✅ Test email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending test email:', error);
    }
}

sendTestEmail();
