const fs = require('fs');

const idxPath = '/var/www/hapinkas/ivr-audio/tts-index.json';
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));

const keys = [
    'הגעת לשלב הבירורים',
    'הבירורים עם',
    'פרטים לבירורים',
    'פרטי בירורים',
    'ממליץ ראשון',
    'ממליץ שני',
    'עזרה בדיור',
    'שם האב',
    'שם האם',
    'שם הרב',
    'שם הרב או הרבנית',
    'כתובת:'
];

let removed = 0;
for (const [hash, entry] of Object.entries(idx)) {
    const text = (entry && entry.text) ? entry.text : '';
    if (keys.some((k) => text.includes(k))) {
        delete idx[hash];
        removed++;
    }
}

fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log(`removed ${removed}`);
