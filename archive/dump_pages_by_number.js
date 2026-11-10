const fs = require('fs');
const zlib = require('zlib');

function extractPages(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('binary');
  const streamStarts = [];
  let idx = 0;
  while ((idx = str.indexOf('stream', idx)) !== -1) {
    let start = idx + 6;
    if (str[start] === '\r') start++;
    if (str[start] === '\n') start++;
    const end = str.indexOf('endstream', start);
    if (end !== -1) {
      streamStarts.push({ start, end });
      idx = end + 9;
    } else {
      break;
    }
  }

  const results = [];
  for (let i = 0; i < streamStarts.length; i++) {
    const { start, end } = streamStarts[i];
    const streamBuf = buf.slice(start, end);
    let decompressed = null;
    try {
      decompressed = zlib.inflateSync(streamBuf);
    } catch (e1) {
      try {
        decompressed = zlib.inflateRawSync(streamBuf);
      } catch (e2) {}
    }
    if (decompressed) {
      const text = decompressed.toString('latin1');
      const tokens = [];
      const regex = /\((.*?)\)/g;
      let m;
      while ((m = regex.exec(text)) !== null) {
        if (m[1].trim()) tokens.push(m[1].trim());
      }
      if (tokens.length > 0) {
        results.push(tokens);
      }
    }
  }
  return results;
}

const f1 = 'c:/Users/1221390/Desktop/Agent double check new item/downloads/TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf';
const p1 = extractPages(f1);
console.log(`TNF pages count: ${p1.length}`);
p1.forEach((p, idx) => {
  console.log(`--- Page ${idx + 1} (${p.length} tokens) ---`);
  console.log(p.slice(0, 30).join(' | '));
});

const f2 = 'c:/Users/1221390/Desktop/Agent double check new item/downloads/SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf';
const p2 = extractPages(f2);
console.log(`\nSWT pages count: ${p2.length}`);
p2.forEach((p, idx) => {
  console.log(`--- Page ${idx + 1} (${p.length} tokens) ---`);
  console.log(p.slice(0, 30).join(' | '));
});

