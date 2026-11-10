const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    console.log(`Connected! Open tabs count: ${pages.length}`);
    for (let i = 0; i < pages.length; i++) {
      console.log(`Tab ${i}: ${await pages[i].title()} | ${pages[i].url()}`);
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error connecting:', err);
  }
})();

