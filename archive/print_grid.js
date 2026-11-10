const fs = require('fs');

function reconstructLines(tokens) {
  // Group by Y with tolerance of 3 points
  const rows = [];
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);

  for (const t of sorted) {
    let row = rows.find(r => Math.abs(r.y - t.y) <= 4);
    if (!row) {
      row = { y: t.y, items: [] };
      rows.push(row);
    }
    row.items.push(t);
  }

  // Sort items in each row by X ascending
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => {
    r.items.sort((a, b) => a.x - b.x);
    return r.items.map(i => i.text).join('   |   ');
  });
}

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];
for (const it of items) {
  const pages = JSON.parse(fs.readFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${it}_coords.json`));
  console.log(`\n======================================== ${it} ========================================`);
  pages.forEach((p, idx) => {
    const lines = reconstructLines(p);
    console.log(`\n--- PAGE ${idx + 1} ---`);
    console.log(lines.slice(0, 30).join('\n'));
  });
}

