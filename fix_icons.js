const fs = require('fs');
const https = require('https');
const path = require('path');

// ביטול בדיקת SSL (כדי לעקוף חסימות סינון)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const publicDir = path.join(__dirname, 'frontend', 'public');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// אייקון נקי של פנקס (ללא טקסט) - גוון צהוב/זהוב
const iconUrl = 'https://cdn-icons-png.flaticon.com/512/7603/7603584.png';

const download = (url, filename) => {
    const dest = path.join(publicDir, filename);

    https.get(url, (res) => {
        const file = fs.createWriteStream(dest);
        res.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log(`✅ אייקון ${filename} ירד בהצלחה!`);
        });
    }).on('error', (err) => {
        console.error(`❌ שגיאה: ${err.message}`);
    });
};

console.log("מוריד אייקונים (מצב לא מאובטח)...");
download(iconUrl, 'pwa-192x192.png');
download(iconUrl, 'pwa-512x512.png');
