require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    console.log(`📁 Created backups directory: ${backupsDir}`);
}

// Generate filename with timestamp
const now = new Date();
const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
const filename = `backup_${timestamp}.sql`;
const filepath = path.join(backupsDir, filename);

// Database connection details from .env
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_NAME = process.env.DB_NAME || 'the_register';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_PASSWORD = process.env.DB_PASSWORD;

console.log('\n🔄 Starting Database Backup...');
console.log('=====================================');
console.log(`📊 Database: ${DB_NAME}`);
console.log(`📁 Backup file: ${filename}\n`);

// Set password environment variable for pg_dump
process.env.PGPASSWORD = DB_PASSWORD;

// Build pg_dump command
const command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F p -f "${filepath}"`;

// Execute backup
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Backup failed: ${error.message}`);

        if (error.message.includes('pg_dump')) {
            console.log('\n💡 Troubleshooting:');
            console.log('  1. Make sure PostgreSQL is installed');
            console.log('  2. Check that pg_dump is in your PATH');
            console.log('  3. Verify database connection settings in .env\n');
        }

        process.exit(1);
    }

    if (stderr && !stderr.includes('WARNING')) {
        console.error(`⚠️  Warning: ${stderr}`);
    }

    // Check if file was created and get its size
    if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        const fileSizeKB = (stats.size / 1024).toFixed(2);

        console.log('✅ Backup completed successfully!');
        console.log(`📦 File size: ${fileSizeKB} KB`);
        console.log(`📍 Location: ${filepath}\n`);

        // Clean up old backups (keep last 30)
        cleanOldBackups();
    } else {
        console.error('❌ Backup file was not created');
        process.exit(1);
    }
});

function cleanOldBackups() {
    try {
        const files = fs.readdirSync(backupsDir)
            .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
            .map(file => ({
                name: file,
                path: path.join(backupsDir, file),
                time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by newest first

        if (files.length > 30) {
            console.log(`🧹 Cleaning up old backups (keeping last 30)...`);

            const toDelete = files.slice(30);
            toDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`   Deleted: ${file.name}`);
            });

            console.log(`✅ Removed ${toDelete.length} old backup(s)\n`);
        }
    } catch (err) {
        console.error(`⚠️  Error cleaning old backups: ${err.message}`);
    }
}
