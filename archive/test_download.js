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

    const downloadDetails = await frame.evaluate(() => {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getFileDownloadDetails('19Y1EnMRuyV1t3mS07NvQKCXh1ln9jf9P');
      });
    });

    console.log('Download details:', downloadDetails);
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

