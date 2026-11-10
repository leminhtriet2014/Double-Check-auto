const fs = require('fs');
const content = fs.readFileSync('c:/Users/1221390/Desktop/Agent double check new item/downloads/tnf_dump.txt', 'utf8');

const pages = content.split('=================== TNF PAGE ');
for (let i = 1; i < pages.length; i++) {
  const pText = pages[i];
  if (pText.includes('2-550615-052-00') || pText.includes('2600052-00') || pText.includes('Specifications') || pText.includes('Manufacturing Notes')) {
    console.log(`\n********************* MATCH IN PAGE ${i} *********************`);
    console.log(pText.slice(0, 1500));
  }
}

