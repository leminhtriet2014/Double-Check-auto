const fs = require('fs');
const path = require('path');
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

function parseTokens(text) {
  const tokens = [];
  const cmdRegex = /\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g;
  let m;
  while ((m = cmdRegex.exec(text)) !== null) {
    if (m[1] !== undefined) {
      tokens.push(m[1]);
    } else if (m[2] !== undefined) {
      const sMatches = m[2].match(/\((.*?)\)/g);
      if (sMatches) {
        tokens.push(sMatches.map(s => s.slice(1, -1)).join(''));
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
      const pageTokens = parseTokens(decomp.toString('latin1'));
      if (pageTokens.length > 0) pages.push(pageTokens.map(t => ({ x: 0, y: 0, text: t })));
    }
  }
  return pages;
}

function parseSpecPdf(filePath, targetGlid) {
  const pages = extractPdf(filePath);
  if (!pages || pages.length === 0) {
    throw new Error(`Unable to extract text streams from PDF: ${filePath}`);
  }

  // Sort pages by actual Report Page number (1..N) to read from top of document downwards
  pages.sort((a, b) => {
    const getPageNum = p => {
      const texts = p.map(t => t.text);
      const idx = texts.indexOf('Page:');
      if (idx !== -1 && idx + 1 < texts.length) {
        const n = parseInt(texts[idx + 1], 10);
        if (!isNaN(n)) return n;
      }
      return 999;
    };
    return getPageNum(a) - getPageNum(b);
  });

  const fileName = path.basename(filePath);
  const result = {
    glid: '',
    itemCode: '',
    customerName: '',
    buyingOffice: '',
    productLength: '',
    productWidth: '',
    colorF: '',
    colorB: '',
    varnishF: '',
    varnishB: '',
    materialCode: '',
    materialSource: '',
    sheetSize: '',
    offsetCutNo: '',
    hole: 'No',
    holeSize: '',
    removeWastage: 'No',
    brandProtection: 'No',
    fsc: 'No',
    fscContent: '',
    specialApplications: [],
    specialInstructions: '',
    rawTokens: []
  };

  // 1. GLID: Prefer filename GLID or targetGlid
  const fnGlid = fileName.match(/([12]-\d{6}-\d{3}-\d{2})/);
  if (fnGlid) {
    result.glid = fnGlid[1];
  } else if (targetGlid) {
    result.glid = targetGlid;
  }

  // 2. Extract Customer Name (Header on report pages: "of" -> totalPages -> CustomerName)
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const ofIdx = texts.indexOf('of');
    if (ofIdx !== -1 && ofIdx + 2 < texts.length) {
      if (/^\d+$/.test(texts[ofIdx + 1])) {
        const candidateName = texts[ofIdx + 2];
        if (candidateName && candidateName.length > 2 && !/^\d+$/.test(candidateName)) {
          result.customerName = candidateName;
          result.buyingOffice = candidateName;
          break;
        }
      }
    }
  }

  // 3. Extract FSC Content from header (e.g. FSC MIX CREDIT, FSC RECYCLED 100%)
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const fscIdx = texts.indexOf('FSC Content');
    if (fscIdx !== -1) {
      for (let j = Math.max(0, fscIdx - 8); j <= Math.min(texts.length - 1, fscIdx + 12); j++) {
        if (/fsc\s*(mix\s*credit|recycled|100%|credit)/i.test(texts[j])) {
          result.fscContent = texts[j].trim();
          break;
        }
      }
      if (result.fscContent) break;
    }
  }

  // 4. Material Code: Scan from top of document (Page 1 downwards) for newest revision / MDM RM
  for (const p of pages) {
    const texts = p.map(t => t.text);
    for (const t of texts) {
      if (/update\s*mdm\s*rm|new\s*rm|update\s*rm|-\s*rm:/i.test(t)) {
        const m = t.match(/\b([A-Z0-9]{3,4}-\d{3,4}-\d+-\d+-\d+)\b/);
        if (m) {
          result.materialCode = m[1];
          result.materialSource = 'Update MDM RM (Newest from top of spec)';
          break;
        }
      }
    }
    if (result.materialCode) break;
  }

  // 5. Find INK Colors & Coating Type Page
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const inkIdx = texts.indexOf('INK Colors');
    if (inkIdx !== -1) {
      // Tokens before INK Colors: Front Colors, Front Coating
      // Tokens after INK Colors: Back Colors, Back Coating
      // Structure:
      // BASE | <FrontColor> | <FrontCoating> | INK Colors | BASE | <BackColor> | <BackCoating>
      const beforeInk = texts.slice(Math.max(0, inkIdx - 5), inkIdx);
      const afterInk = texts.slice(inkIdx + 1, Math.min(texts.length, inkIdx + 8));

      // Front color
      const fColors = beforeInk.filter(t => /pantone|\d+C|\d+U|black|white/i.test(t));
      if (fColors.length > 0) result.colorF = fColors.join(' + ');

      // Front coating / varnish
      const fCoating = beforeInk.find(t => /touch|varnish|matte|gloss|satin/i.test(t));
      if (fCoating) result.varnishF = fCoating;

      // Back color
      const bColors = afterInk.filter(t => /pantone|\d+C|\d+U|black|white/i.test(t));
      if (bColors.length > 0) result.colorB = bColors.join(' + ');

      // Back coating / varnish
      const bCoating = afterInk.find(t => /touch|varnish|matte|gloss|satin/i.test(t));
      if (bCoating) result.varnishB = bCoating;
    }
  }

  // 4. Find Specifications Page (Dimensions, Material, Hole, Remove Wastage)
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const specIdx = texts.indexOf('Specifications');
    if (specIdx !== -1 && texts.includes('Tag Width') && texts.includes('Tag Length')) {
      const widthIn = texts[specIdx + 1];
      const lengthIn = texts[specIdx + 2];
      const matCode = texts[specIdx + 3];

      if (!result.materialCode && matCode && matCode.match(/^[A-Z0-9]{3,4}-\d+/)) {
        result.materialCode = matCode;
        result.materialSource = 'Specifications table';
      }

      // Check Hole & Remove Wastage in stream
      // Oracle Reports stream: Specifications -> WidthIn -> LengthIn -> Material -> Square -> Hole (Yes/No) -> HoleSize (.125) -> ... -> RemoveWastage (No/Yes)
      if (texts[specIdx + 5] === 'Yes' || texts[specIdx + 5] === 'No') {
        result.hole = texts[specIdx + 5];
        result.holeSize = texts[specIdx + 6] || '';
      }

      // Find Remove Wastage
      const wastageLabelIdx = texts.indexOf('Remove Wastage:');
      if (wastageLabelIdx !== -1) {
        // Look in data cells
        for (let j = specIdx + 7; j < specIdx + 15; j++) {
          if (texts[j] === 'No' || texts[j] === 'Yes') {
            result.removeWastage = texts[j];
          }
        }
      }

      // MM values
      const candidateNums = [];
      for (let i = specIdx + 4; i < Math.min(specIdx + 16, texts.length); i++) {
        if (/^\d+(\.\d+)?$/.test(texts[i])) {
          candidateNums.push(texts[i]);
        }
      }
      if (candidateNums.length >= 2) {
        result.productWidth = `${candidateNums[candidateNums.length - 2]} mm (${widthIn} in)`;
        result.productLength = `${candidateNums[candidateNums.length - 1]} mm (${lengthIn} in)`;
      } else {
        result.productWidth = widthIn;
        result.productLength = lengthIn;
      }

      // Check FSC in material desc
      const matDesc = texts.find(t => t.includes('FSC') || t.includes('COATED'));
      if (matDesc) {
        result.fsc = matDesc.includes('FSC') ? 'FSC Certified' : 'No';
      }
    }
  }

  // 5. Special Applications Page
  for (const p of pages) {
    const texts = p.map(t => t.text);
    if (texts.includes('Special Applications:') || texts.includes('Special Requirements')) {
      const apps = [];
      if (texts.includes('Lamination') && texts[texts.indexOf('Lamination') + 1] !== 'No') apps.push('Lamination');
      if (texts.includes('String') && texts[texts.indexOf('String') + 1] === 'Y') apps.push('Stringing');
      if (texts.includes('Foil Stamp / Embossing / Debossing') && texts[texts.indexOf('Foil Stamp / Embossing / Debossing') + 1] !== 'No') apps.push('Foil/Emboss');
      if (texts.includes('Double Side Tape') && texts[texts.indexOf('Double Side Tape') + 1] !== 'No') apps.push('Double Side Tape');
      result.specialApplications = apps;
    }
  }

  // 6. Brand Protection & FSC
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const bpIdx = texts.indexOf('Brand Protection Type:');
    if (bpIdx !== -1) {
      result.brandProtection = texts[bpIdx - 1] === 'Yes' ? 'Yes' : 'No';
    }
  }

  // 7. Manufacturing Notes / Special Instructions
  for (const p of pages) {
    const texts = p.map(t => t.text);
    const prodTokens = texts.filter(t => /VN Production|Chuan so mau|So theo|Follow|approved sample|In tren mat|Color reference|Color matching/i.test(t) && t.length > 12);
    if (prodTokens.length > 0) {
      result.specialInstructions = prodTokens.join('\n');
      break;
    }
  }

  return result;
}

module.exports = {
  extractPdf,
  parseSpecPdf,
  decodeAscii85
};
