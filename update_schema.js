require('dotenv').config();
const pool = require('./db');

async function updateSchema() {
    try {
        console.log('🔧 Updating database schema...\n');

        // Add missing columns from server.js updateDbSchema()
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);');
        console.log('✅ Added city column');

        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='birth_date') THEN 
                    ALTER TABLE users ADD COLUMN birth_date DATE; 
                END IF;
            END $$;
        `);
        console.log('✅ Checked birth_date column');

        // Contact person columns
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_person_type') THEN 
                    ALTER TABLE users ADD COLUMN contact_person_type VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_person_name') THEN 
                    ALTER TABLE users ADD COLUMN contact_person_name VARCHAR(100); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_phone_1') THEN 
                    ALTER TABLE users ADD COLUMN contact_phone_1 VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='contact_phone_2') THEN 
                    ALTER TABLE users ADD COLUMN contact_phone_2 VARCHAR(50); 
                END IF;
            END $$;
        `);
        console.log('✅ Added contact person columns');

        // Additional phone columns
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_1_phone') THEN 
                    ALTER TABLE users ADD COLUMN reference_1_phone VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_2_phone') THEN 
                    ALTER TABLE users ADD COLUMN reference_2_phone VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='reference_3_phone') THEN 
                    ALTER TABLE users ADD COLUMN reference_3_phone VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='family_reference_phone') THEN 
                    ALTER TABLE users ADD COLUMN family_reference_phone VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='rabbi_phone') THEN 
                    ALTER TABLE users ADD COLUMN rabbi_phone VARCHAR(50); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mechutanim_phone') THEN 
                    ALTER TABLE users ADD COLUMN mechutanim_phone VARCHAR(50); 
                END IF;
            END $$;
        `);
        console.log('✅ Added reference phone columns');

        // Additional columns
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='apartment_amount') THEN 
                    ALTER TABLE users ADD COLUMN apartment_amount VARCHAR(100); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='yeshiva_ketana_name') THEN 
                    ALTER TABLE users ADD COLUMN yeshiva_ketana_name VARCHAR(255); 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='occupation_details') THEN 
                    ALTER TABLE users ADD COLUMN occupation_details TEXT; 
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country_of_birth') THEN 
                    ALTER TABLE users ADD COLUMN country_of_birth VARCHAR(100); 
                END IF;
            END $$;
        `);
        console.log('✅ Added additional columns');

        console.log('\n🎉 Schema update complete!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
