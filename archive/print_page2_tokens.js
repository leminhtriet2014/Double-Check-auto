const fs = require('fs');
const pages = JSON.parse(fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/2-550615-052-00_coords.json'));
// Page 3 in coordinates (index 2)
console.log('Tokens on page index 2 (Page 7 of 9):');
console.log(pages[2].map(t => `${t.x},${t.y}: ${t.text}`).join('\n'));

