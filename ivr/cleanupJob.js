/**
 * Cleanup Job — מחיקת קבצי אודיו של פרופילים ישנים מימות
 *
 * מוחק קבצי MP3 של פרופילים שלא הושמעו יותר מ-X חודשים.
 * רץ אחת ל-24 שעות (או כל פרק זמן שנקבע).
 *
 * הלוגיקה:
 * 1. שלוף מ-DB כל המשתמשים עם tts_last_played ישן מספיק
 * 2. מחק את קבצי L1/L2/L3 שלהם מימות
 * 3. עדכן tts_last_played ל-NULL
 */

const { deleteFile } = require('./yemotApi');

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 שעות
const MAX_AGE_MONTHS = 6; // מחיקה אחרי 6 חודשים ללא האזנה

let cleanupTimer = null;

async function runCleanup(pool) {
    if (!process.env.YEMOT_NUMBER || !process.env.YEMOT_PASSWORD) {
        console.log('[Cleanup] ⏭️ YEMOT credentials not set — skipping');
        return;
    }

    console.log('[Cleanup] 🧹 מתחיל ניקוי קבצי אודיו ישנים...');

    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - MAX_AGE_MONTHS);

        const result = await pool.query(
            `SELECT id FROM users 
             WHERE tts_last_played IS NOT NULL 
             AND tts_last_played < $1`,
            [cutoff]
        );

        if (result.rows.length === 0) {
            console.log('[Cleanup] ✅ אין קבצים ישנים למחיקה');
            return;
        }

        console.log(`[Cleanup] 🗑️ ${result.rows.length} פרופילים עם אודיו ישן`);

        let deleted = 0, failed = 0;

        for (const row of result.rows) {
            const userId = row.id;
            const subdir = String(userId).slice(-2);
            const layers = ['L1', 'L2', 'L3'];

            for (const layer of layers) {
                const yemotPath = `ivr2:/tts_profiles/${subdir}/${userId}_${layer}.wav`;
                try {
                    await deleteFile(yemotPath);
                    deleted++;
                } catch (err) {
                    failed++;
                }
            }

            await pool.query(
                'UPDATE users SET tts_last_played = NULL WHERE id = $1',
                [userId]
            );
        }

        console.log(`[Cleanup] ✅ סיום: ${deleted} קבצים נמחקו, ${failed} נכשלו`);

    } catch (err) {
        console.error('[Cleanup] ❌ שגיאה:', err.message);
    }
}

function startCleanupScheduler(pool) {
    console.log(`[Cleanup] ⏰ מתוזמן לרוץ כל ${CLEANUP_INTERVAL_MS / 3600000} שעות`);

    // ריצה ראשונה אחרי 5 דקות (לאפשר לשרת לעלות)
    setTimeout(() => {
        runCleanup(pool).catch(err =>
            console.error('[Cleanup] ❌ initial run:', err.message)
        );
    }, 5 * 60 * 1000);

    cleanupTimer = setInterval(() => {
        runCleanup(pool).catch(err =>
            console.error('[Cleanup] ❌ scheduled run:', err.message)
        );
    }, CLEANUP_INTERVAL_MS);
}

function stopCleanupScheduler() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

module.exports = { startCleanupScheduler, stopCleanupScheduler, runCleanup };
