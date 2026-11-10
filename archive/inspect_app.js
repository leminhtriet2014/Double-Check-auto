const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('script.google.com')) || pages[0];
    console.log('Page Title:', await page.title());
    console.log('Page URL:', page.url());

    const frames = page.frames();
    console.log('Frames count:', frames.length);
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      console.log(`Frame ${i}: name="${f.name()}", url="${f.url()}"`);
      try {
        const inputs = await f.$$eval('input, select, button', els => els.map(e => ({
          tag: e.tagName,
          id: e.id,
          placeholder: e.placeholder,
          type: e.type,
          value: e.value,
          text: e.innerText
        })));
        if (inputs.length > 0) {
          console.log(`  Inputs in Frame ${i}:`, JSON.stringify(inputs, null, 2));
        }
      } catch (err) {
        console.log(`  Could not read inputs in Frame ${i}:`, err.message);
      }
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Inspection error:', err);
  }
})();

