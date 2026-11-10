const fs = require('fs');
const content = fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/2-550615-052-00_full_text.txt', 'latin1');
const regex = /\((.*?)\)/g;
let m;
const tokens = [];
while ((m = regex.exec(content)) !== null) {
  if (m[1].trim()) tokens.push(m[1].trim());
}
console.log('TNF tokens with Pantone/Black/Color/PMS:');
console.log(tokens.filter(t => /black|pantone|pms|color|cmyk/i.test(t)));

