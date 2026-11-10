const fs = require('fs');

function inspectText(item) {
  const file = `c:/Users/1221390/Desktop/Agent double check new item/downloads/${item}_full_text.txt`;
  const raw = fs.readFileSync(file, 'latin1');
  
  // Extract all strings in parentheses
  const matches = [];
  const regex = /\((.*?)\)/g;
  let m;
  while ((m = regex.exec(raw)) !== null) {
    if (m[1].trim().length > 0) {
      matches.push(m[1].trim());
    }
  }
  return matches;
}

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];
for (const it of items) {
  const tokens = inspectText(it);
  console.log(`\n============================ ${it} ============================`);
  // Let's filter interesting tokens
  console.log('Sample tokens:', tokens.filter(t => 
    t.includes('Length') || t.includes('Width') || t.includes('Color') || t.includes('Material') || 
    t.includes('Notes') || t.includes('Customer') || t.includes('Item') || t.includes('Sheet') ||
    t.includes('Cut') || t.includes('Special') || t.includes('MM') || t.includes('In:') ||
    t.includes('217') || t.includes('63') || t.includes('22') || t.includes('83') || t.includes('62') ||
    t.includes('FSKP') || t.includes('CSC') || t.includes('Pantone') || t.includes('Black')
  ).slice(0, 40));
}

