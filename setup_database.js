require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupDatabase() {
    log('\n🚀 Starting Database Setup...', 'cyan');
    log('=====================================\n', 'cyan');

    // Step 1: Connect to PostgreSQL (default postgres database)
    log('📡 Step 1: Connecting to PostgreSQL...', 'blue');
    
    const adminPool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: 'postgres', // Connect to default database first
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    });

    try {
        await adminPool.query('SELECT 1');
        log('✅ Connected to PostgreSQL successfully!\n', 'green');
    } catch (err) {
        log('❌ Failed to connect to PostgreSQL!', 'red');
        log(`Error: ${err.message}`, 'red');
        log('\n💡 Make sure:', 'yellow');
        log('  1. PostgreSQL is installed and running', 'yellow');
        log('  2. The password in .env matches your PostgreSQL password', 'yellow');
        log('  3. PostgreSQL service is started\n', 'yellow');
        process.exit(1);
    }

    // Step 2: Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'the_register';
    log(`📊 Step 2: Creating database "${dbName}"...`, 'blue');

    try {
        // Check if database exists
        const checkDb = await adminPool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (checkDb.rows.length === 0) {
            await adminPool.query(`CREATE DATABASE ${dbName}`);
            log(`✅ Database "${dbName}" created successfully!\n`, 'green');
        } else {
            log(`ℹ️  Database "${dbName}" already exists.\n`, 'yellow');
        }
    } catch (err) {
        log(`❌ Error creating database: ${err.message}`, 'red');
        await adminPool.end();
        process.exit(1);
    }

    await adminPool.end();

    // Step 3: Connect to the new database
    log(`🔗 Step 3: Connecting to "${dbName}"...`, 'blue');
    
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: dbName,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    });

    try {
        await pool.query('SELECT 1');
        log('✅ Connected successfully!\n', 'green');
    } catch (err) {
        log(`❌ Failed to connect to database: ${err.message}`, 'red');
        process.exit(1);
    }

    // Step 4: Run the SQL recovery script
    log('📜 Step 4: Running database recovery script...', 'blue');
    
    const sqlPath = path.join(__dirname, 'database_recovery.sql');
    
    if (!fs.existsSync(sqlPath)) {
        log('❌ database_recovery.sql not found!', 'red');
        await pool.end();
        process.exit(1);
    }

    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Generate hashed password for admin user
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Replace placeholder with actual hashed password
    sqlContent = sqlContent.replace(
        '$2b$10$YourHashedPasswordHere',
        hashedPassword
    );

    try {
        await pool.query(sqlContent);
        log('✅ Database schema created successfully!\n', 'green');
    } catch (err) {
        log(`❌ Error running SQL script: ${err.message}`, 'red');
        await pool.end();
        process.exit(1);
    }

    // Step 5: Verify tables were created
    log('🔍 Step 5: Verifying tables...', 'blue');
    
    const expectedTables = [
        'users',
        'connections',
        'matches',
        'messages',
        'notifications',
        'photo_approvals',
        'hidden_profiles'
    ];

    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        const createdTables = result.rows.map(row => row.table_name);
        
        log(`\n📋 Tables created (${createdTables.length}):`, 'cyan');
        createdTables.forEach(table => {
            const isExpected = expectedTables.includes(table);
            log(`  ${isExpected ? '✅' : '⚠️ '} ${table}`, isExpected ? 'green' : 'yellow');
        });

        const missingTables = expectedTables.filter(t => !createdTables.includes(t));
        if (missingTables.length > 0) {
            log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`, 'yellow');
        }
    } catch (err) {
        log(`❌ Error verifying tables: ${err.message}`, 'red');
    }

    // Step 6: Check admin user
    log('\n👤 Step 6: Verifying admin user...', 'blue');
    
    try {
        const adminCheck = await pool.query(
            'SELECT id, phone, full_name, is_admin FROM users WHERE id = 1'
        );

        if (adminCheck.rows.length > 0) {
            const admin = adminCheck.rows[0];
            log('✅ Admin user created:', 'green');
            log(`   ID: ${admin.id}`, 'cyan');
            log(`   Phone: ${admin.phone}`, 'cyan');
            log(`   Name: ${admin.full_name}`, 'cyan');
            log(`   Password: ${adminPassword} (change this!)`, 'yellow');
        } else {
            log('⚠️  Admin user not found', 'yellow');
        }
    } catch (err) {
        log(`❌ Error checking admin user: ${err.message}`, 'red');
    }

    await pool.end();

    // Final summary
    log('\n=====================================', 'cyan');
    log('🎉 Database Setup Complete!', 'green');
    log('=====================================\n', 'cyan');
    
    log('📝 Next steps:', 'blue');
    log('  1. Run: npm start', 'cyan');
    log('  2. Visit: http://localhost:3000/status', 'cyan');
    log('  3. Set up daily backups: npm run db:backup\n', 'cyan');
    
    log('⚠️  Important:', 'yellow');
    log('  - Change admin password after first login!', 'yellow');
    log('  - Set up automated backups (see INSTALLATION_GUIDE.md)\n', 'yellow');
}

// Run the setup
setupDatabase().catch(err => {
    log(`\n❌ Fatal error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
});
