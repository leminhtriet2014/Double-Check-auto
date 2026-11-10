const fs = require('fs');

function reconstructLines(tokens) {
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
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => {
    r.items.sort((a, b) => a.x - b.x);
    return r.items.map(i => i.text).join('   |   ');
  });
}

const pages = JSON.parse(fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/2-550615-052-00_coords.json'));
let out = '';
pages.forEach((p, idx) => {
  const lines = reconstructLines(p);
  out += `\n=================== TNF PAGE ${idx + 1} ===================\n` + lines.join('\n');
});
fs.writeFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/tnf_dump.txt', out);
console.log('Saved tnf_dump.txt successfully!');

