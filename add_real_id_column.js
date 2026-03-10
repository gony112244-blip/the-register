const pool = require('./db');

async function migrate() {
    try {
        console.log("Checking for missing columns...");
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'real_id_number'
        `);

        if (res.rows.length === 0) {
            console.log("Adding real_id_number column...");
            await pool.query("ALTER TABLE users ADD COLUMN real_id_number VARCHAR(20)");
            console.log("real_id_number column added.");
        } else {
            console.log("real_id_number column already exists.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
