const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const pdfPath = process.argv[2] || path.join(__dirname, '..', 'אישור_מעודכן.pdf');
const dataBuffer = fs.readFileSync(pdfPath);
pdf(dataBuffer).then((data) => console.log(data.text)).catch(console.error);
