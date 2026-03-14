const pool = require('./db');
const nodemailer = require('nodemailer');

// Mock data
const emailToSave = 'hapinkas.contact@gmail.com'; // Send to self for test
const full_name = 'טסט רישום';
const userId = 999999; // Dummy ID

// Replicate the server.js transporter logic exactly
async function initMailer() {
    return nodemailer.createTransport({
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
}

// Replicate emailTemplates.js logic
function getEmailTemplate() {
    return {
        subject: 'ברוכים הבאים לפנקס! 🎉',
        html: `<h2>שלום ${full_name}, ברוכים הבאים! 🎉</h2><p>טסט שליחה מתוך השרת.</p>`
    };
}

async function testFullFlow() {
    require('dotenv').config();
    console.log('Testing full registration email flow simulation...');
    
    try {
        const transporter = await initMailer();
        const template = getEmailTemplate();
        
        console.log(`Sending to: ${emailToSave}...`);
        const info = await transporter.sendMail({
            from: '"הפנקס - שידוכים" <hapinkas.contact@gmail.com>',
            to: emailToSave,
            subject: template.subject,
            html: template.html,
        });
        
        console.log('✅ Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Failed:', error);
    }
    process.exit(0);
}

testFullFlow();
