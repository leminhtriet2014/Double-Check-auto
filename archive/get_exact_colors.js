const fs = require('fs');

const tnfDump = fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/tnf_dump.txt', 'utf8');
const p3 = tnfDump.split('=================== TNF PAGE 3 ===================')[1].split('===================')[0];
console.log('--- TNF PAGE 3 COLOR SECTION ---');
p3.split('\n').filter(l => l.includes('Color') || l.includes('Front') || l.includes('Back') || l.includes('Black') || l.includes('PMS') || l.includes('Matte') || l.includes('Varnish') || l.includes('Sheet')).forEach(l => console.log(l));

const swtDump = fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/2-555714-000-01_full_text.txt', 'latin1');
console.log('\n--- SWT FULL TEXT COLOR / SHEET SECTION ---');
const regex = /\((.*?)\)/g;
let m;
const swtTokens = [];
while ((m = regex.exec(swtDump)) !== null) {
  if (m[1].trim()) swtTokens.push(m[1].trim());
}
console.log(swtTokens.filter(t => t.includes('Sheet') || t.includes('Color') || t.includes('PANTONE') || t.includes('pantone') || t.includes('Matte') || t.includes('425') || t.includes('3155') || t.includes('7466') || t.includes('545') || t.includes('395') || t.includes('Cut')));

