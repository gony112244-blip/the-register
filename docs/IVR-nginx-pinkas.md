# Nginx — העברת `/ivr` ו־`/ivr-audio` ל-Node

## הבעיה
אם `curl https://pinkas.cloud/ivr/call?...` מחזיר HTML של האתר — **Nginx** מגיש את ה-`dist` של React ולא מעביר לשרת Node (פורט 3000).

## בדיקה על השרת (לפני שינוי Nginx)
```bash
curl "http://127.0.0.1:3000/ivr/call?token=הטוקן_מ-.env&phone=0501234567"
```
אם כאן מקבלים JSON — Node תקין; חסר רק Nginx.

## מה להוסיף ב-Nginx
בתוך ה-`server { ... }` של `pinkas.cloud` (לפני `location /` שמגיש static או catch-all):

```nginx
# IVR — חייב לפני location / הרחב
location ^~ /ivr {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /ivr-audio {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

אחרי שמירה:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## IP Whitelist (ימות משיח)
אם משתמשים ב-`allow/deny` רק ל-`/ivr` — זה מוגדר **באותו `location ^~ /ivr`** עם `allow` לפי הרשימה מימות המשיח.
