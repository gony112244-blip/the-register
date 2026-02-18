require('dotenv').config();
const pool = require('./db');

async function fixMissingItems() {
    try {
        console.log('🔧 Fixing missing table and columns...\n');

        // 1. Create user_images table if it doesn't exist
        console.log('📊 Creating user_images table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT FALSE,
                uploaded_at TIMESTAMP DEFAULT NOW(),
                approved_at TIMESTAMP,
                rejected_at TIMESTAMP,
                rejection_reason TEXT
            );
        `);
        console.log('✅ user_images table created\n');

        // 2. Add search_heritage_sectors column
        console.log('📝 Adding search_heritage_sectors column...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS search_heritage_sectors TEXT;
        `);
        console.log('✅ search_heritage_sectors column added\n');

        // 3. Add any other potentially missing search columns
        console.log('📝 Adding other search columns...');
        await pool.query(`
            DO $$ 
            BEGIN 
                -- search_sector (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='search_sector') THEN 
                    ALTER TABLE users ADD COLUMN search_sector TEXT; 
                END IF;

                -- search_backgrounds (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='search_backgrounds') THEN 
                    ALTER TABLE users ADD COLUMN search_backgrounds TEXT; 
                END IF;

                -- unwanted_heritages (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='unwanted_heritages') THEN 
                    ALTER TABLE users ADD COLUMN unwanted_heritages TEXT; 
                END IF;

                -- mixed_heritage_ok (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='mixed_heritage_ok') THEN 
                    ALTER TABLE users ADD COLUMN mixed_heritage_ok BOOLEAN; 
                END IF;

                -- search_financial_min (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='search_financial_min') THEN 
                    ALTER TABLE users ADD COLUMN search_financial_min VARCHAR(100); 
                END IF;

                -- search_financial_discuss (might be missing)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='users' AND column_name='search_financial_discuss') THEN 
                    ALTER TABLE users ADD COLUMN search_financial_discuss BOOLEAN; 
                END IF;
            END $$;
        `);
        console.log('✅ All search columns verified\n');

        console.log('🎉 All fixes applied successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Restart the server (Ctrl+C then npm start)');
        console.log('   2. Refresh the browser\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixMissingItems();
