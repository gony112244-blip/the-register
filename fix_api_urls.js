const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
            if (entry.name !== 'config.js') files.push(full);
        }
    }
    return files;
}

let changed = 0;
for (const filePath of walk(srcDir)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('http://localhost:3000')) continue;

    // הוספת import אם עוד אין
    if (!content.includes('import API_BASE from')) {
        const isComponent = filePath.includes(`${path.sep}components${path.sep}`);
        const importPath = isComponent ? "'../config'" : "'./config'";
        content = `import API_BASE from ${importPath};\n` + content;
    }

    // החלפה בתוך template literals: `http://localhost:3000/...`
    content = content.replace(/`http:\/\/localhost:3000\//g, '`${API_BASE}/');

    // החלפה ב-single quotes: 'http://localhost:3000/path'
    content = content.replace(/'http:\/\/localhost:3000\/([^']*)'/g, (_, rest) => {
        return '`${API_BASE}/' + rest + '`';
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated:', path.relative(__dirname, filePath));
    changed++;
}

console.log(`\nסה"כ עודכנו: ${changed} קבצים`);
