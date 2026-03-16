#!/bin/bash
# ═══════════════════════════════════════════════════════
#  סקריפט התקנה מלאה — שרת הפנקס
#  מריצים פעם אחת על שרת חדש עם Ubuntu 22.04/24.04
# ═══════════════════════════════════════════════════════
set -e

echo "════════════════════════════════════"
echo "  📦 שלב 1: עדכון מערכת"
echo "════════════════════════════════════"
apt update && apt upgrade -y
apt install -y curl git nginx ufw

echo "════════════════════════════════════"
echo "  🟢 שלב 2: התקנת Node.js 20"
echo "════════════════════════════════════"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v

echo "════════════════════════════════════"
echo "  🐘 שלב 3: התקנת PostgreSQL"
echo "════════════════════════════════════"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

echo "════════════════════════════════════"
echo "  🗄️  שלב 4: יצירת מסד נתונים"
echo "════════════════════════════════════"
sudo -u postgres psql -c "CREATE USER hapinkas WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE hapinkas_db OWNER hapinkas;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hapinkas_db TO hapinkas;"

echo "════════════════════════════════════"
echo "  ⚡ שלב 5: התקנת PM2"
echo "════════════════════════════════════"
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo "════════════════════════════════════"
echo "  📁 שלב 6: שכפול הקוד"
echo "════════════════════════════════════"
mkdir -p /var/www
cd /var/www
git clone https://github.com/gony112244-blip/the-register.git hapinkas
cd hapinkas

echo "════════════════════════════════════"
echo "  📦 שלב 7: התקנת תלויות"
echo "════════════════════════════════════"
npm install
cd frontend && npm install && npm run build && cd ..

echo "════════════════════════════════════"
echo "  🔧 שלב 8: הגדרת .env"
echo "════════════════════════════════════"
cat > /var/www/hapinkas/.env << 'ENVFILE'
DATABASE_URL=postgresql://hapinkas:CHANGE_THIS_PASSWORD@localhost:5432/hapinkas_db
JWT_SECRET=CHANGE_THIS_JWT_SECRET_TO_RANDOM_STRING
EMAIL_USER=hapinkas.contact@gmail.com
EMAIL_PASS=YOUR_EMAIL_APP_PASSWORD
PORT=3000
NODE_ENV=production
ENVFILE

echo "⚠️  חשוב: ערוך את קובץ .env לפני ההמשך!"
echo "   nano /var/www/hapinkas/.env"

echo "════════════════════════════════════"
echo "  🌐 שלב 9: הגדרת Nginx"
echo "════════════════════════════════════"
cat > /etc/nginx/sites-available/hapinkas << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/hapinkas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "════════════════════════════════════"
echo "  🔥 שלב 10: Firewall"
echo "════════════════════════════════════"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "════════════════════════════════════"
echo "  🚀 שלב 11: הפעלת האפליקציה"
echo "════════════════════════════════════"
cd /var/www/hapinkas
pm2 start server.js --name hapinkas
pm2 save

echo ""
echo "✅ ════════════════════════════════════"
echo "   ההתקנה הושלמה!"
echo "   גש ל: http://187.124.168.26"
echo "════════════════════════════════════"
