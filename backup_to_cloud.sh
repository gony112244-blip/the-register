#!/bin/bash
# ═══════════════════════════════════════════════════════
#  גיבוי מסד נתונים + העלאה ל-Google Drive
#  מריץ pg_dump, שומר 30 ימים מקומית, מעלה לענן
# ═══════════════════════════════════════════════════════

set -e

# ── הגדרות ────────────────────────────────────────────
PROJECT_DIR="/var/www/hapinkas"
BACKUP_DIR="$PROJECT_DIR/backups"
CLOUD_REMOTE="gdrive"          # שם ה-remote שהגדרת ב-rclone
CLOUD_FOLDER="hapinkas-backups" # שם התיקייה ב-Google Drive
KEEP_DAYS=30                    # כמה גיבויים לשמור מקומית

# ── טעינת .env ────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# ── בניית שם קובץ ─────────────────────────────────────
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="backup_${TIMESTAMP}.sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

mkdir -p "$BACKUP_DIR"

echo "═══════════════════════════════════════"
echo "  🔄 גיבוי מסד נתונים — הפנקס"
echo "  📅 $TIMESTAMP"
echo "═══════════════════════════════════════"

# ── pg_dump ────────────────────────────────────────────
export PGPASSWORD="${DB_PASSWORD}"

# תמיכה ב-DATABASE_URL או בפרמטרים נפרדים
if [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" -F p -f "$FILEPATH"
else
    pg_dump \
        -h "${DB_HOST:-127.0.0.1}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER:-postgres}" \
        -d "${DB_NAME:-hapinkas_db}" \
        -F p \
        -f "$FILEPATH"
fi

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "✅ גיבוי נוצר: $FILENAME ($SIZE)"

# ── ניקוי קבצים ישנים מקומית ─────────────────────────
echo "🧹 מנקה גיבויים ישנים (שומר $KEEP_DAYS ימים)..."
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +$KEEP_DAYS -delete
echo "✅ ניקוי הושלם"

# ── העלאה לענן (רק אם rclone מותקן ומוגדר) ───────────
if command -v rclone &>/dev/null; then
    echo "☁️  מעלה ל-Google Drive..."
    rclone copy "$FILEPATH" "${CLOUD_REMOTE}:${CLOUD_FOLDER}/" \
        --log-level INFO \
        --timeout 60s

    # שמור רק 30 הגיבויים האחרונים גם בענן
    echo "🧹 מנקה גיבויים ישנים בענן..."
    rclone delete "${CLOUD_REMOTE}:${CLOUD_FOLDER}/" \
        --min-age ${KEEP_DAYS}d \
        --include "backup_*.sql" \
        --log-level INFO 2>/dev/null || true

    echo "✅ הועלה לענן בהצלחה"
else
    echo "⚠️  rclone לא מותקן — גיבוי נשמר מקומית בלבד"
fi

echo ""
echo "✅ גיבוי הושלם: $FILEPATH"
echo "═══════════════════════════════════════"
