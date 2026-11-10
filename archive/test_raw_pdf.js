const fs = require('fs');
const zlib = require('zlib');

function extractPdfTextRaw(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('binary');
  
  const streamStarts = [];
  const streamEnds = [];
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

  console.log(`Found ${streamStarts.length} streams in ${filePath}`);
  const allTexts = [];

  for (let i = 0; i < streamStarts.length; i++) {
    const { start, end } = streamStarts[i];
    const streamBuf = buf.slice(start, end);
    let decompressed = null;
    try {
      decompressed = zlib.inflateSync(streamBuf);
    } catch (e1) {
      try {
        decompressed = zlib.inflateRawSync(streamBuf);
      } catch (e2) {
        // Not zlib compressed
      }
    }

    if (decompressed) {
      const text = decompressed.toString('latin1');
      // Extract (text) Tj
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let m;
      while ((m = tjRegex.exec(text)) !== null) {
        allTexts.push(m[1]);
      }
      // Extract [(text) (more)] TJ
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      while ((m = tjArrayRegex.exec(text)) !== null) {
        const inner = m[1];
        const strMatches = inner.match(/\((.*?)\)/g);
        if (strMatches) {
          allTexts.push(strMatches.map(s => s.slice(1, -1)).join(''));
        }
      }
    }
  }

  return allTexts;
}

const f1 = 'c:/Users/1221390/Desktop/Agent double check new item/downloads/TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf';
const t1 = extractPdfTextRaw(f1);
console.log('TNF spec strings count:', t1.length);
console.log('TNF sample preview:', t1.slice(0, 50).join(' | '));

const f2 = 'c:/Users/1221390/Desktop/Agent double check new item/downloads/SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf';
const t2 = extractPdfTextRaw(f2);
console.log('SWT spec strings count:', t2.length);
console.log('SWT sample preview:', t2.slice(0, 50).join(' | '));

