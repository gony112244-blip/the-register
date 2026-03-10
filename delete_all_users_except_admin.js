const pool = require('./db');

async function cleanupUsers() {
    console.log('🧹 Starting database cleanup...');

    try {
        // 1. Delete dependent data first to avoid FK constraints issues (though most are ON DELETE CASCADE)
        console.log('🗑️ Deleting connections, matches, and messages...');
        await pool.query('DELETE FROM connections');
        await pool.query('DELETE FROM matches');
        await pool.query('DELETE FROM messages');
        await pool.query('DELETE FROM notifications');
        await pool.query('DELETE FROM photo_approvals');
        await pool.query('DELETE FROM hidden_profiles');

        // 2. Delete all users except admin (id = 1)
        console.log('👤 Deleting all users except Admin (ID: 1)...');
        const result = await pool.query('DELETE FROM users WHERE id != 1');

        console.log(`✅ Cleanup complete! Removed ${result.rowCount} users.`);

        // 3. Reset sequences
        console.log('⚙️ Resetting ID sequence for users...');
        await pool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

cleanupUsers();
