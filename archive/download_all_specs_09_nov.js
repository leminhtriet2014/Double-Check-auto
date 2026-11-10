const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const specsToDownload = [
  {
    id: '1Su4XA8MP7w66aNaSBRtWv2RNyIjUzyLb',
    item: '2-550615-052-00',
    name: 'TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf'
  },
  {
    id: '1FTak96Kg3HhjrPbluVIGP75ccP_1HbOM',
    item: '2-555714-000-01',
    name: 'SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf'
  }
];

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

function parsePdfText(filePath) {
  const content = fs.readFileSync(filePath, 'latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let allStrings = [];
  while ((match = streamRegex.exec(content)) !== null) {
    try {
      const rawStream = match[1];
      const a85 = decodeAscii85(rawStream);
      const inflated = zlib.inflateSync(a85);
      const text = inflated.toString('latin1');
      
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let sMatch;
      while ((sMatch = tjRegex.exec(text)) !== null) {
        allStrings.push(sMatch[1]);
      }
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      while ((sMatch = tjArrayRegex.exec(text)) !== null) {
        const inner = sMatch[1];
        const strMatches = inner.match(/\((.*?)\)/g);
        if (strMatches) {
          allStrings.push(strMatches.map(m => m.slice(1, -1)).join(''));
        }
      }
    } catch (e) {
      // Stream could be uncompressed or different filter
    }
  }
  return allStrings;
}

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    const downloadDir = path.resolve('c:/Users/1221390/Desktop/Agent double check new item/downloads');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    for (const spec of specsToDownload) {
      console.log(`\nDownloading ${spec.name} ...`);
      const targetPath = path.join(downloadDir, spec.name);
      if (!fs.existsSync(targetPath)) {
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        await client.send('Browser.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: downloadDir,
          eventsEnabled: true
        });

        const url = `https://drive.google.com/uc?id=${spec.id}&export=download`;
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        } catch (e) {}

        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 1000));
          if (fs.existsSync(targetPath)) {
            console.log(`Downloaded ${spec.name}`);
            break;
          }
        }
        await page.close();
      } else {
        console.log(`${spec.name} already exists.`);
      }

      if (fs.existsSync(targetPath)) {
        const extracted = parsePdfText(targetPath);
        console.log(`Extracted ${extracted.length} tokens for ${spec.name}`);
        const dumpPath = path.join(downloadDir, `${spec.item}_spec_tokens.json`);
        fs.writeFileSync(dumpPath, JSON.stringify(extracted, null, 2));
      } else {
        console.error(`Failed to download ${spec.name}`);
      }
    }

    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

