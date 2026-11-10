const fs = require('fs');
const zlib = require('zlib');

function decodeAscii85(str) {
  str = str.replace(/\s+/g, '');
  if (str.startsWith('<~')) str = str.slice(2);
  if (str.endsWith('~>')) str = str.slice(0, -2);
  const out = [];
  let count = 0, tuple = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 33 && c <= 117) {
      tuple = tuple * 85 + (c - 33);
      count++;
      if (count === 5) {
        out.push((tuple >> 24) & 0xff, (tuple >> 16) & 0xff, (tuple >> 8) & 0xff, tuple & 0xff);
        tuple = 0; count = 0;
      }
    } else if (c === 122) {
      out.push(0, 0, 0, 0);
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    for (let i = 0; i < count - 1; i++) out.push((tuple >> (24 - i * 8)) & 0xff);
  }
  return Buffer.from(out);
}

function parsePageCoords(text) {
  // Regex to match Tm or Td and Tj
  // Tm: a b c d e f Tm (e = x, f = y)
  // Td: tx ty Td
  const tokens = [];
  let currentX = 0, currentY = 0;
  
  // Split into operators / words
  const cmdRegex = /([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+Tm|([0-9.-]+)\s+([0-9.-]+)\s+Td|\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g;
  let m;
  while ((m = cmdRegex.exec(text)) !== null) {
    if (m[5] !== undefined && m[6] !== undefined) {
      // Tm
      currentX = parseFloat(m[5]);
      currentY = parseFloat(m[6]);
    } else if (m[7] !== undefined && m[8] !== undefined) {
      // Td
      currentX += parseFloat(m[7]);
      currentY += parseFloat(m[8]);
    } else if (m[9] !== undefined) {
      // Tj
      tokens.push({ x: Math.round(currentX), y: Math.round(currentY), text: m[9] });
    } else if (m[10] !== undefined) {
      // TJ
      const inner = m[10];
      const sMatches = inner.match(/\((.*?)\)/g);
      if (sMatches) {
        const full = sMatches.map(s => s.slice(1, -1)).join('');
        tokens.push({ x: Math.round(currentX), y: Math.round(currentY), text: full });
      }
    }
  }
  return tokens;
}

function extractPdf(filePath) {
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
    } else break;
  }

  const pages = [];
  for (const { start, end } of streamStarts) {
    const streamBuf = buf.slice(start, end);
    let decomp = null;
    try { decomp = zlib.inflateSync(streamBuf); }
    catch (e) {
      try { decomp = zlib.inflateRawSync(streamBuf); }
      catch (e2) {
        try { decomp = zlib.inflateSync(decodeAscii85(streamBuf.toString('latin1'))); }
        catch (e3) {}
      }
    }
    if (decomp) {
      const pageTokens = parsePageCoords(decomp.toString('latin1'));
      if (pageTokens.length > 0) pages.push(pageTokens);
    }
  }
  return pages;
}

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];
for (const it of items) {
  const pdfPath = `c:/Users/1221390/Desktop/Agent double check new item/downloads/${it === '2-539037-000-00' ? '62761250 2-539037-000-00 vn spec.pdf' : (it === '2-550615-052-00' ? 'TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf' : 'SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf')}`;
  const pages = extractPdf(pdfPath);
  fs.writeFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${it}_coords.json`, JSON.stringify(pages, null, 2));
  console.log(`Extracted coords for ${it}: ${pages.length} pages`);
}

