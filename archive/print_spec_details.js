const fs = require('fs');

function inspectItemTokens(item) {
  const content = fs.readFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${item}_full_text.txt`, 'latin1');
  // Match lines with Tj or TJ
  const lines = content.split('\n');
  const tokens = [];
  for (const line of lines) {
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let m;
    while ((m = tjRegex.exec(line)) !== null) {
      tokens.push(m[1].trim());
    }
    const tjArrRegex = /\[(.*?)\]\s*TJ/g;
    while ((m = tjArrRegex.exec(line)) !== null) {
      const inner = m[1];
      const sMatches = inner.match(/\((.*?)\)/g);
      if (sMatches) {
        tokens.push(sMatches.map(s => s.slice(1, -1)).join('').trim());
      }
    }
  }
  return tokens;
}

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];
for (const it of items) {
  const t = inspectItemTokens(it);
  console.log(`\n============================ ${it} ============================`);
  fs.writeFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${it}_ordered_tokens.json`, JSON.stringify(t, null, 2));
  console.log(`Saved ${t.length} tokens for ${it}`);
}

