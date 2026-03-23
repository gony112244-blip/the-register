const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.join(__dirname, '..', 'אישור .pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then((data) => {
  console.log('---TEXT---');
  console.log(data.text);
  console.log('---END---');
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
