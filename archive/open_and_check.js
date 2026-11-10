const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages[pages.length - 1] || await browser.newPage();
    console.log('Navigating to google.com to check auth state...');
    await page.goto('https://accounts.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('Google URL:', page.url());
    console.log('Google Title:', await page.title());
    await page.screenshot({ path: 'c:/Users/1221390/Desktop/Agent double check new item/real_chrome_screen.png' });
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

