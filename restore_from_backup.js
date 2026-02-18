require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const backupsDir = path.join(__dirname, 'backups');

// Check if backups directory exists
if (!fs.existsSync(backupsDir)) {
    console.log('❌ No backups directory found!');
    console.log('💡 Run "npm run db:backup" first to create a backup.\n');
    process.exit(1);
}

// Get list of backup files
const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
    .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        time: fs.statSync(path.join(backupsDir, file)).mtime,
        size: fs.statSync(path.join(backupsDir, file)).size
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first

if (backupFiles.length === 0) {
    console.log('❌ No backup files found!');
    console.log('💡 Run "npm run db:backup" first to create a backup.\n');
    process.exit(1);
}

// Display available backups
console.log('\n📦 Available Backups:');
console.log('=====================================\n');

backupFiles.forEach((file, index) => {
    const sizeKB = (file.size / 1024).toFixed(2);
    const date = file.time.toLocaleString('he-IL');
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   📅 ${date}`);
    console.log(`   📦 ${sizeKB} KB\n`);
});

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter backup number to restore (or 0 to cancel): ', (answer) => {
    const choice = parseInt(answer);

    if (choice === 0 || isNaN(choice)) {
        console.log('❌ Restore cancelled.\n');
        rl.close();
        process.exit(0);
    }

    if (choice < 1 || choice > backupFiles.length) {
        console.log('❌ Invalid choice!\n');
        rl.close();
        process.exit(1);
    }

    const selectedBackup = backupFiles[choice - 1];

    console.log(`\n⚠️  WARNING: This will REPLACE all current data!`);
    rl.question('Are you sure? Type "yes" to confirm: ', (confirm) => {
        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Restore cancelled.\n');
            rl.close();
            process.exit(0);
        }

        rl.close();
        restoreBackup(selectedBackup);
    });
});

function restoreBackup(backup) {
    console.log('\n🔄 Starting Database Restore...');
    console.log('=====================================');
    console.log(`📁 Restoring from: ${backup.name}\n`);

    const DB_USER = process.env.DB_USER || 'postgres';
    const DB_HOST = process.env.DB_HOST || '127.0.0.1';
    const DB_NAME = process.env.DB_NAME || 'the_register';
    const DB_PORT = process.env.DB_PORT || 5432;
    const DB_PASSWORD = process.env.DB_PASSWORD;

    // Set password environment variable
    process.env.PGPASSWORD = DB_PASSWORD;

    // Build psql command to restore
    const command = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${backup.path}"`;

    console.log('⏳ Restoring... (this may take a moment)\n');

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Restore failed: ${error.message}`);

            if (error.message.includes('psql')) {
                console.log('\n💡 Troubleshooting:');
                console.log('  1. Make sure PostgreSQL is installed');
                console.log('  2. Check that psql is in your PATH');
                console.log('  3. Verify database connection settings in .env\n');
            }

            process.exit(1);
        }

        if (stderr && !stderr.includes('NOTICE') && !stderr.includes('WARNING')) {
            console.error(`⚠️  Warning: ${stderr}`);
        }

        console.log('✅ Database restored successfully!');
        console.log(`📊 Database: ${DB_NAME}`);
        console.log(`📁 From: ${backup.name}\n`);

        console.log('📝 Next steps:');
        console.log('  1. Restart your server: npm start');
        console.log('  2. Verify data at: http://localhost:3000/status\n');
    });
}
