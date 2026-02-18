require('dotenv').config();
const pool = require('./db');

async function syncSchema() {
    try {
        console.log(`🔧 Syncing schema for database: ${process.env.DB_NAME}...\n`);

        const queries = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_person_type VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone_1 VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_phone_2 VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS family_reference_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS family_reference_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS rabbi_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS rabbi_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_1_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_1_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_2_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_2_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_3_name VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reference_3_phone VARCHAR(50);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_occupations TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_life_aspirations TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_heritage_sectors TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_sector TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_backgrounds TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS unwanted_heritages TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS mixed_heritage_ok BOOLEAN;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_financial_min VARCHAR(100);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS search_financial_discuss BOOLEAN;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS sector TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_pending BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_changes JSONB;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_changes_at TIMESTAMP;',
            `CREATE TABLE IF NOT EXISTS user_images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT FALSE,
                uploaded_at TIMESTAMP DEFAULT NOW(),
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                rejection_reason TEXT
            );`
        ];

        for (const query of queries) {
            try {
                await pool.query(query);
                console.log(`✅ Executed: ${query.substring(0, 50)}...`);
            } catch (err) {
                console.warn(`⚠️ Warning on query: ${query.substring(0, 50)}... -> ${err.message}`);
            }
        }

        console.log('\n🎉 Schema sync complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

syncSchema();
