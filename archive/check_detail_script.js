const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('ItemMaster.php')) || pages[0];

    const detailScript = await page.evaluate(() => {
      // Look for function attached to Detail button
      // In dhtmlxForm, events are attached via form.attachEvent("onButtonClick", ...)
      // Let's inspect window functions or form instance
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).filter(s => s.includes('Detail') || s.includes('Process'));
      return scripts.map(s => s.slice(0, 300));
    });

    console.log('Scripts mentioning Detail/Process count:', detailScript.length);
    if (detailScript.length > 0) {
      console.log('Sample:', detailScript[0]);
    }

    // Let's also check if there is an iframe or hidden div for Detail
    const detailDivs = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, form')).filter(d => (d.id && d.id.toLowerCase().includes('detail')) || (d.className && d.className.toLowerCase().includes('detail')));
      return allDivs.map(d => ({ id: d.id, className: d.className }));
    });
    console.log('Detail elements:', detailDivs);

    await browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();

