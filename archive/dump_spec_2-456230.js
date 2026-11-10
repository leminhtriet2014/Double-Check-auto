const { extractPdf } = require('../double_check_tool/engine/pdf_parser');
const fs = require('fs');

const pages = extractPdf('downloads/1047833-GLB_2-456230-007-01 VN SPEC.pdf');
console.log('Total pages in PDF:', pages.length);

for (let i = 0; i < pages.length; i++) {
  console.log(`\n======================= PAGE ${i + 1} =======================`);
  const lines = {};
  for (const t of pages[i]) {
    const yKey = Math.round(t.y / 4) * 4;
    if (!lines[yKey]) lines[yKey] = [];
    lines[yKey].push(t.text);
  }
  const sortedY = Object.keys(lines).map(Number).sort((a,b) => b - a);
  for (const y of sortedY) {
    console.log(lines[y].join(' | '));
  }
}

