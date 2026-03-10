const pool = require('./db');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'", (err, res) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(res.rows, null, 2));
    }
    process.exit();
});
