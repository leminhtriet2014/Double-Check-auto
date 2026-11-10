const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto('file:///C:/Users/1221390/Desktop/Agent double check new item/downloads/62761250 2-539037-000-00 vn spec.pdf', {
      waitUntil: 'networkidle2'
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'c:/Users/1221390/Desktop/Agent double check new item/pdf_render.png', fullPage: true });
    console.log('Rendered PDF to pdf_render.png');
    await page.close();
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

