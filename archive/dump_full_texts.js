const fs = require('fs');
const zlib = require('zlib');

function decodeAscii85(str) {
  str = str.replace(/\s+/g, '');
  if (str.startsWith('<~')) str = str.slice(2);
  if (str.endsWith('~>')) str = str.slice(0, -2);
  const out = [];
  let count = 0;
  let tuple = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 33 && c <= 117) {
      tuple = tuple * 85 + (c - 33);
      count++;
      if (count === 5) {
        out.push((tuple >> 24) & 0xff, (tuple >> 16) & 0xff, (tuple >> 8) & 0xff, tuple & 0xff);
        tuple = 0;
        count = 0;
      }
    } else if (c === 122) {
      if (count !== 0) throw new Error('Unexpected z in ascii85');
      out.push(0, 0, 0, 0);
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    for (let i = 0; i < count - 1; i++) out.push((tuple >> (24 - i * 8)) & 0xff);
  }
  return Buffer.from(out);
}

function extractAll(filePath) {
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

  const pagesText = [];
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
        try {
          const a85 = decodeAscii85(streamBuf.toString('latin1'));
          decompressed = zlib.inflateSync(a85);
        } catch (e3) {}
      }
    }
    if (decompressed) {
      pagesText.push(decompressed.toString('latin1'));
    }
  }
  return pagesText;
}

const files = [
  { item: '2-539037-000-00', path: 'c:/Users/1221390/Desktop/Agent double check new item/downloads/62761250 2-539037-000-00 vn spec.pdf' },
  { item: '2-550615-052-00', path: 'c:/Users/1221390/Desktop/Agent double check new item/downloads/TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf' },
  { item: '2-555714-000-01', path: 'c:/Users/1221390/Desktop/Agent double check new item/downloads/SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf' }
];

for (const f of files) {
  const pages = extractAll(f.path);
  console.log(`\n=================== ITEM: ${f.item} (Pages: ${pages.length}) ===================`);
  fs.writeFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${f.item}_full_text.txt`, pages.join('\n\n---PAGE---\n\n'));
}
console.log('Saved all raw full texts to downloads folder.');

