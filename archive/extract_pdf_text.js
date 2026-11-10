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
    if (c >= 33 && c <= 117) { // '!' to 'u'
      tuple = tuple * 85 + (c - 33);
      count++;
      if (count === 5) {
        out.push((tuple >> 24) & 0xff);
        out.push((tuple >> 16) & 0xff);
        out.push((tuple >> 8) & 0xff);
        out.push(tuple & 0xff);
        tuple = 0;
        count = 0;
      }
    } else if (c === 122) { // 'z' represents 4 zero bytes
      if (count !== 0) throw new Error('Unexpected z in ascii85');
      out.push(0, 0, 0, 0);
    }
  }

  if (count > 0) {
    for (let i = count; i < 5; i++) {
      tuple = tuple * 85 + 84;
    }
    for (let i = 0; i < count - 1; i++) {
      out.push((tuple >> (24 - i * 8)) & 0xff);
    }
  }

  return Buffer.from(out);
}

const pdfPath = 'c:/Users/1221390/Desktop/Agent double check new item/downloads/62761250 2-539037-000-00 vn spec.pdf';
const content = fs.readFileSync(pdfPath, 'utf8');

const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let match;
let pageIndex = 1;

while ((match = streamRegex.exec(content)) !== null) {
  try {
    const rawStream = match[1];
    const a85Decoded = decodeAscii85(rawStream);
    const inflated = zlib.inflateSync(a85Decoded);
    console.log(`\n=== STREAM ${pageIndex++} (length ${inflated.length}) ===`);
    const text = inflated.toString('latin1');
    
    // Extract strings inside parentheses (Tj or TJ operators)
    const strings = [];
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let sMatch;
    while ((sMatch = tjRegex.exec(text)) !== null) {
      strings.push(sMatch[1]);
    }
    
    // Also array of strings: [(...) ... (...)] TJ
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((sMatch = tjArrayRegex.exec(text)) !== null) {
      const inner = sMatch[1];
      const strMatches = inner.match(/\((.*?)\)/g);
      if (strMatches) {
        strings.push(strMatches.map(m => m.slice(1, -1)).join(''));
      }
    }

    console.log('Text content:\n', strings.join(' '));
  } catch (err) {
    console.error('Error decoding stream:', err.message);
  }
}

