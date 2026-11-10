const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('script.google.com')) || pages[0];
    const frame = page.frames().find(f => f.name() === 'userHtmlFrame');

    const fnStr = await frame.evaluate(() => {
      return typeof displayResults !== 'undefined' ? displayResults.toString() : 'not defined';
    });
    console.log('displayResults code:\n', fnStr);
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

