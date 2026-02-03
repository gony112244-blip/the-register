const fs = require('fs');
const https = require('https');
const path = require('path');

const publicDir = path.join(__dirname, 'frontend', 'public');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// אייקון איכותי של פנקס/יומן (צבעוני)
const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3238/3238016.png';

const download = (url, dest) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ אייקון עודכן: ${path.basename(dest)}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`❌ שגיאה: ${err.message}`);
    });
};

console.log("מוריד אייקונים חדשים...");
download(iconUrl, path.join(publicDir, 'pwa-192x192.png'));
download(iconUrl, path.join(publicDir, 'pwa-512x512.png'));
