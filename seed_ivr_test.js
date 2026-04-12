/**
 * seed_ivr_test.js
 * ממלא נתוני טסט מלאים ל-IVR עבור המשתמש 0583229028
 *
 * הרצה בשרת:
 *   node seed_ivr_test.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function run() {
    console.log('🌱 מתחיל מילוי נתוני טסט...\n');

    // ============================================================
    // 1. עדכון פרופיל המשתמש הראשי (0583229028) — גוני שמוחה
    // ============================================================
    const pinHash = await bcrypt.hash('1234', 10);
    await pool.query(`
        UPDATE users SET
            full_name          = 'גוני שמוחה',
            last_name          = 'שמוחה',
            gender             = 'male',
            age                = 28,
            birth_date         = '1997-03-15',
            city               = 'ירושלים',
            status             = 'single',
            height             = 178,
            body_type          = 'medium',
            appearance         = 'good',
            skin_tone          = 'light',
            family_background  = 'dati_leumi',
            heritage_sector    = 'ashkenaz',
            current_occupation = 'working',
            work_field         = 'הייטק',
            study_place        = 'ישיבת מרכז הרב',
            life_aspiration    = 'balanced',
            about_me           = 'בחור אמין ורציני, אוהב ללמוד ולעבוד. מחפש קשר אמיתי.',
            home_style         = 'dati_leumi_open',
            has_children       = FALSE,
            search_min_age     = 22,
            search_max_age     = 27,
            search_height_min  = 155,
            search_height_max  = 175,
            search_statuses    = ARRAY['single'],
            search_backgrounds = ARRAY['dati_leumi','haredi_modern'],
            search_heritage_sectors = ARRAY['ashkenaz','sefarad','mixed'],
            search_occupations = ARRAY['working','studying','both'],
            search_life_aspirations = ARRAY['balanced','family_first'],
            is_approved        = TRUE,
            is_blocked         = FALSE,
            allow_ivr_no_pass  = TRUE,
            ivr_pin            = NULL,
            ivr_failed_attempts = 0,
            ivr_blocked_until  = NULL
        WHERE phone = '0583229028'
        RETURNING id, full_name
    `);
    const myUser = await pool.query(`SELECT id FROM users WHERE phone = '0583229028'`);
    const myId = myUser.rows[0].id;
    console.log(`✅ פרופיל ראשי עודכן | id=${myId} | כניסה ללא קוד מופעלת\n`);

    // ============================================================
    // 2. יצירת 3 פרופילים נשיים לטסט (הצעות)
    // ============================================================
    const girls = [
        {
            email: 'demo_girl1@test.local',
            phone: '0500000001',
            full_name: 'שרה לוי',
            age: 24,
            city: 'בני ברק',
            height: 163,
            body_type: 'slim',
            appearance: 'beautiful',
            skin_tone: 'medium',
            family_background: 'haredi_modern',
            heritage_sector: 'ashkenaz',
            current_occupation: 'working',
            work_field: 'חינוך',
            study_place: 'סמינר בית יעקב',
            life_aspiration: 'family_first',
            about_me: 'בחורה חיה ומאירה, אוהבת מוזיקה וטבע. מחפשת בחור ישר ומטרתי.',
            head_covering: 'mitpachat',
            status: 'single',
        },
        {
            email: 'demo_girl2@test.local',
            phone: '0500000002',
            full_name: 'רחל כהן',
            age: 25,
            city: 'אלעד',
            height: 160,
            body_type: 'medium',
            appearance: 'good',
            skin_tone: 'light',
            family_background: 'dati_leumi',
            heritage_sector: 'sefarad',
            current_occupation: 'both',
            work_field: 'שיווק',
            study_place: 'אולפנת עמית',
            life_aspiration: 'balanced',
            about_me: 'ספרדייה חמה ואוהבת חיים. עובדת וגם לומדת לתואר. מחפשת שותף לחיים.',
            head_covering: 'wig',
            status: 'single',
        },
        {
            email: 'demo_girl3@test.local',
            phone: '0500000003',
            full_name: 'מרים ברק',
            age: 23,
            city: 'מודיעין עילית',
            height: 165,
            body_type: 'slim',
            appearance: 'pretty',
            skin_tone: 'light',
            family_background: 'haredi',
            heritage_sector: 'ashkenaz',
            current_occupation: 'studying',
            work_field: null,
            study_place: 'סמינר נחלת',
            life_aspiration: 'torah_first',
            about_me: 'בחורה שקטה ועמוקה. אוהבת ספרים ואנשים. מחפשת בחור עם ערכים.',
            head_covering: 'mitpachat',
            status: 'single',
        }
    ];

    const girlIds = [];
    const pass = await bcrypt.hash('111111', 10);

    for (const g of girls) {
        // בדיקה אם קיים
        const existing = await pool.query(`SELECT id FROM users WHERE phone = $1`, [g.phone]);
        let gId;
        if (existing.rows.length > 0) {
            gId = existing.rows[0].id;
            await pool.query(`
                UPDATE users SET
                    full_name = $1, age = $2, city = $3, height = $4, body_type = $5,
                    appearance = $6, skin_tone = $7, family_background = $8,
                    heritage_sector = $9, current_occupation = $10, work_field = $11,
                    study_place = $12, life_aspiration = $13, about_me = $14,
                    head_covering = $15, status = $16, gender = 'female',
                    is_approved = TRUE, is_blocked = FALSE,
                    search_min_age = 23, search_max_age = 32,
                    search_height_min = 170, search_height_max = 190,
                    search_statuses = ARRAY['single'],
                    search_backgrounds = ARRAY['dati_leumi','haredi_modern','haredi'],
                    search_heritage_sectors = ARRAY['ashkenaz','sefarad','mixed'],
                    search_occupations = ARRAY['working','both'],
                    search_life_aspirations = ARRAY['balanced','family_first','torah_first']
                WHERE id = $17
            `, [g.full_name, g.age, g.city, g.height, g.body_type,
                g.appearance, g.skin_tone, g.family_background,
                g.heritage_sector, g.current_occupation, g.work_field,
                g.study_place, g.life_aspiration, g.about_me,
                g.head_covering, g.status, gId]);
        } else {
            const ins = await pool.query(`
                INSERT INTO users
                    (email, phone, password, full_name, age, city, height, body_type,
                     appearance, skin_tone, family_background, heritage_sector,
                     current_occupation, work_field, study_place, life_aspiration,
                     about_me, head_covering, status, gender,
                     is_approved, is_blocked,
                     search_min_age, search_max_age, search_height_min, search_height_max,
                     search_statuses, search_backgrounds, search_heritage_sectors,
                     search_occupations, search_life_aspirations)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                        'female', TRUE, FALSE,
                        23, 32, 170, 190,
                        ARRAY['single'], ARRAY['dati_leumi','haredi_modern','haredi'],
                        ARRAY['ashkenaz','sefarad','mixed'],
                        ARRAY['working','both'], ARRAY['balanced','family_first','torah_first'])
                RETURNING id
            `, [g.email, g.phone, pass, g.full_name, g.age, g.city, g.height, g.body_type,
                g.appearance, g.skin_tone, g.family_background, g.heritage_sector,
                g.current_occupation, g.work_field, g.study_place, g.life_aspiration,
                g.about_me, g.head_covering, g.status]);
            gId = ins.rows[0].id;
        }
        girlIds.push(gId);
        console.log(`  👩 ${g.full_name} | id=${gId}`);
    }
    console.log();

    // ============================================================
    // 3. פניות נכנסות — שרה (girlIds[0]) שלחה פנייה לגוני
    // ============================================================
    await pool.query(`
        DELETE FROM connections
        WHERE sender_id = $1 AND receiver_id = $2`, [girlIds[0], myId]);
    await pool.query(`
        INSERT INTO connections (sender_id, receiver_id, status)
        VALUES ($1, $2, 'pending')`, [girlIds[0], myId]);
    console.log(`✅ פנייה נכנסת: שרה לוי → גוני (pending)`);

    // ============================================================
    // 4. שידוך פעיל (active) — רחל (girlIds[1]) + גוני
    // ============================================================
    await pool.query(`
        DELETE FROM connections
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)`, [myId, girlIds[1]]);
    await pool.query(`
        INSERT INTO connections (sender_id, receiver_id, status)
        VALUES ($1, $2, 'active')`, [myId, girlIds[1]]);
    console.log(`✅ שידוך פעיל: גוני ↔ רחל כהן (active)`);

    // ============================================================
    // 5. פנייה שיצאה ממני — גוני שלח לרחל (פנייה נוספת, waiting_for_shadchan)
    //    הצעה שלישית — מרים נשארת כהצעה חדשה
    // ============================================================
    await pool.query(`
        DELETE FROM connections
        WHERE sender_id = $1 AND receiver_id = $2`, [myId, girlIds[2]]);
    await pool.query(`
        INSERT INTO connections (sender_id, receiver_id, status)
        VALUES ($1, $2, 'waiting_for_shadchan')`, [myId, girlIds[2]]);
    console.log(`✅ פנייה יוצאת: גוני → מרים ברק (waiting_for_shadchan)`);

    // ============================================================
    // 6. הודעה מהשדכנית (admin_message)
    // ============================================================
    // מחפשים admin (id=1 או is_admin=true)
    const adminRes = await pool.query(`SELECT id FROM users WHERE is_admin = TRUE ORDER BY id LIMIT 1`);
    const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : 1;

    await pool.query(`
        DELETE FROM messages
        WHERE to_user_id = $1 AND type = 'admin_message'`, [myId]);
    await pool.query(`
        INSERT INTO messages (from_user_id, to_user_id, content, type, is_read)
        VALUES ($1, $2, 'שלום גוני, בדקתי את הכרטיס שלך ויש לי הצעה מעניינת בשבילך. אשמח לדבר.', 'admin_message', FALSE)
    `, [adminId, myId]);
    console.log(`✅ הודעה מהשדכנית נוצרה`);

    // ============================================================
    // 7. בקשת תמונה — שרה מבקשת לראות תמונה של גוני
    // ============================================================
    const existingPhoto = await pool.query(
        `SELECT id FROM photo_approvals WHERE requester_id = $1 AND target_id = $2`,
        [girlIds[0], myId]
    );
    if (existingPhoto.rows.length === 0) {
        await pool.query(`
            INSERT INTO photo_approvals (requester_id, target_id, status)
            VALUES ($1, $2, 'pending')`, [girlIds[0], myId]);
        console.log(`✅ בקשת תמונה: שרה לוי → גוני (pending)`);
    } else {
        await pool.query(`
            UPDATE photo_approvals SET status = 'pending'
            WHERE requester_id = $1 AND target_id = $2`, [girlIds[0], myId]);
        console.log(`✅ בקשת תמונה: שרה לוי → גוני (עודכנה ל-pending)`);
    }

    console.log('\n🎉 כל הנתונים מוכנים לטסט!\n');
    console.log('📞 חייג ל-0772291821 עם הפלאפון 0583229028');
    console.log('   כניסה מהירה (ללא קוד) — מופעל\n');
    console.log('📋 מה תמצא בתפריט:');
    console.log('   מקש 1 — הצעות: מרים ברק (הצעה חדשה)');
    console.log('   מקש 2 — פניות נכנסות: שרה לוי (ממתינה לתשובה)');
    console.log('   מקש 3 — פניות שלי: רחל כהן (פעיל), מרים ברק (בטיפול שדכנית)');
    console.log('   מקש 4 — ניהול תמונות: שרה לוי מבקשת תמונה');
    console.log('   מקש 5 — הודעות: הודעה מהשדכנית\n');

    await pool.end();
}

run().catch(err => {
    console.error('❌ שגיאה:', err.message);
    pool.end();
    process.exit(1);
});
