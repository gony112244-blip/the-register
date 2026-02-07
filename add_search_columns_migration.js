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
        console.log('Adding search columns to users table...');

        // Add search_occupations column
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_occupations') THEN 
                    ALTER TABLE users ADD COLUMN search_occupations TEXT; 
                END IF; 
            END $$;
        `);
        console.log('Added search_occupations column.');

        // Add search_life_aspirations column
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='search_life_aspirations') THEN 
                    ALTER TABLE users ADD COLUMN search_life_aspirations TEXT; 
                END IF; 
            END $$;
        `);
        console.log('Added search_life_aspirations column.');

        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
