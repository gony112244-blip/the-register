const pool = require('./db');
pool.query("SELECT * FROM users WHERE is_admin != TRUE LIMIT 5", (err, res) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(res.rows, null, 2));
    }
    process.exit();
});
