const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const A4_W = 595.32;
const A4_H = 841.92;
const MARGIN = 56;
const FONT_PATH = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'Fonts', 'arial.ttf');

async function main() {
  const fontBytes = fs.readFileSync(FONT_PATH);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const page = pdfDoc.addPage([A4_W, A4_H]);
  const black = rgb(0, 0, 0);
  const size = 12;
  const line = 18;

  let y = A4_H - MARGIN;

  const lines = [
    'כ"ז אדר ה\'תשפ"ו',
    '16 מרץ 2026',
    '',
    'לכל המעוניין,',
    '',
    '',
    'הנדון: אישור לימודים',
    '',
    'הנני לאשר בזה כי מר יהודה זאב לונדנר ת.ז. 212779862,',
    'הנו סטודנט במכינה טכנולוגית ב"מרכז החרדי להכשרה מקצועית"',
    'בשנת הלימודים תשפ"ה.',
    '30 שעות שבועיות.',
    '',
    '',
    '',
    'בכבוד רב,',
    '',
    'מזכירות',
  ];

  for (const text of lines) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: A4_W - MARGIN - w,
      y: y - size,
      size,
      font,
      color: black,
    });
    y -= line;
  }

  const outPath = path.join(__dirname, '..', 'אישור_מעודכן.pdf');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);
  console.log('Wrote:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
