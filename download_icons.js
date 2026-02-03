const fs = require('fs');
const https = require('https');
const path = require('path');

const iconUrl = 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png'; // אייקון של ספר/יומן בצבעים מתאימים
const publicDir = path.join(__dirname, 'frontend', 'public');

// ווידוא שהתיקייה קיימת
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const download = (url, dest) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded: ${dest}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`❌ Error downloading: ${err.message}`);
    });
};

console.log("Downloading icons...");
download(iconUrl, path.join(publicDir, 'pwa-192x192.png'));
download(iconUrl, path.join(publicDir, 'pwa-512x512.png'));
