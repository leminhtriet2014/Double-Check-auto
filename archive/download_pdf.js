const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('script.google.com')) || pages[0];

    const url = 'https://drive.google.com/uc?id=19Y1EnMRuyV1t3mS07NvQKCXh1ln9jf9P&export=download';
    console.log('Downloading file from:', url);

    const base64Data = await page.evaluate(async (downloadUrl) => {
      const resp = await fetch(downloadUrl);
      const arrayBuffer = await resp.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }, url);

    const buf = Buffer.from(base64Data, 'base64');
    fs.writeFileSync('c:/Users/1221390/Desktop/Agent double check new item/sample_spec.pdf', buf);
    console.log('Downloaded sample_spec.pdf successfully! Size:', buf.length, 'bytes');

    await browser.disconnect();
  } catch (err) {
    console.error('Error downloading:', err);
  }
})();

