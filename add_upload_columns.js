require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    try {
        console.log('Checking and adding missing columns for uploads...');

        // 1. Add id_card columns
        await pool.query(`
            DO $$ 
            BEGIN 
                -- id_card_owner_type
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_card_owner_type') THEN 
                    ALTER TABLE users ADD COLUMN id_card_owner_type TEXT DEFAULT 'candidate'; 
                END IF;

                -- id_card_uploaded_at
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_card_uploaded_at') THEN 
                    ALTER TABLE users ADD COLUMN id_card_uploaded_at TIMESTAMP; 
                END IF;

                -- id_card_verified
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_card_verified') THEN 
                    ALTER TABLE users ADD COLUMN id_card_verified BOOLEAN DEFAULT FALSE; 
                END IF;
            END $$;
        `);
        console.log('Checked id_card columns.');

        // 2. Add profile_images columns (Array support)
        await pool.query(`
            DO $$ 
            BEGIN 
                -- profile_images (Array of text)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_images') THEN 
                    ALTER TABLE users ADD COLUMN profile_images TEXT[] DEFAULT '{}'; 
                END IF;

                -- profile_images_count
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_images_count') THEN 
                    ALTER TABLE users ADD COLUMN profile_images_count INTEGER DEFAULT 0; 
                END IF;
            END $$;
        `);
        console.log('Checked profile_images columns.');

        console.log('Migration successful! Database is now ready for uploads.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
