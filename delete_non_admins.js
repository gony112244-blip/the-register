const pool = require('./db');

async function cleanupUsers() {
    try {
        console.log("Checking admin users...");
        const admins = await pool.query('SELECT id, full_name, phone FROM users WHERE is_admin = TRUE');
        
        if (admins.rows.length === 0) {
            console.error("No admin found! Aborting to prevent locking yourself out.");
            return;
        }

        console.log("Admins found:", admins.rows.map(a => `${a.full_name} (${a.phone})`).join(', '));
        const adminIds = admins.rows.map(a => a.id);

        console.log("Cleaning up dependent tables...");
        // Delete connections involving non-admins
        await pool.query('DELETE FROM connections WHERE sender_id NOT IN (' + adminIds.join(',') + ') OR receiver_id NOT IN (' + adminIds.join(',') + ')');
        
        // Delete messages involving non-admins
        await pool.query('DELETE FROM messages WHERE from_user_id NOT IN (' + adminIds.join(',') + ') OR to_user_id NOT IN (' + adminIds.join(',') + ')');
        
        // Delete photo requests
        // Check if table exists first (optional but safer)
        try {
            await pool.query('DELETE FROM photo_requests WHERE requester_id NOT IN (' + adminIds.join(',') + ') OR target_id NOT IN (' + adminIds.join(',') + ')');
        } catch (e) { console.log("photo_requests table skip (might not exist)"); }

        console.log("Deleting non-admin users...");
        const result = await pool.query('DELETE FROM users WHERE is_admin = FALSE');
        
        console.log(`Successfully deleted ${result.rowCount} users.`);
        console.log("Cleanup complete!");

    } catch (err) {
        console.error("Error during cleanup:", err);
    } finally {
        await pool.end();
    }
}

cleanupUsers();
