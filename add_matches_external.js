require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
});

async function addMatches() {
  const targetPhone = '0583229028';
  try {
    // 1. Fetch user by phone
    const userRes = await pool.query('SELECT id, gender FROM users WHERE phone = $1', [targetPhone]);
    if (userRes.rows.length === 0) {
      console.log(`User with phone ${targetPhone} not found on this server.`);
      process.exit(1);
    }
    const targetUser = userRes.rows[0];
    const oppositeGender = targetUser.gender === 'male' ? 'female' : 'male';
    
    // 2. Fetch some users of opposite gender to use as matches
    const potentialMatches = await pool.query('SELECT id FROM users WHERE gender = $1 AND id != $2 LIMIT 5', [oppositeGender, targetUser.id]);
    
    if (potentialMatches.rows.length === 0) {
      console.log('No potential matches (opposite gender) found in the DB to connect with.');
      process.exit(1);
    }
    
    let count = 0;
    // 3. Create connections
    for (const match of potentialMatches.rows) {
      // 2 suitable matches (pending), 2 active matches (active)
      const status = count < 2 ? 'pending' : 'active';
      count++;
      
      // Check if exists
      const existing = await pool.query(
        'SELECT id FROM connections WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)',
        [targetUser.id, match.id]
      );
      if (existing.rows.length > 0) {
        console.log(`Connection already exists between user ${targetUser.id} and user ${match.id}`);
        continue;
      }
      
      await pool.query(
         'INSERT INTO connections (sender_id, receiver_id, status, created_at) VALUES ($1, $2, $3, NOW())',
         // using the other user as sender, so it appears as incoming for the target user. Change as needed.
         [match.id, targetUser.id, status] 
      );
      console.log(`Added ${status} match! (User ${match.id} -> User ${targetUser.id})`);
    }
    console.log('Finished adding matches successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addMatches();
