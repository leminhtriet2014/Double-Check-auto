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

    console.log('Searching for 2-539037-000-00 ...');
    await frame.evaluate(() => {
      const input = document.getElementById('searchText');
      input.value = '2-539037-000-00';
      const chk = document.getElementById('searchRawText');
      if (chk) chk.checked = true;
      triggerSearch();
    });

    // Wait for results
    await new Promise(r => setTimeout(r, 6000));

    const results = await frame.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#results table tbody tr'));
      return rows.map(r => {
        const link = r.querySelector('.filename-cell a');
        return {
          id: r.dataset.fileId,
          name: link ? link.textContent : '',
          url: link ? link.href : ''
        };
      });
    });

    console.log('Search results count:', results.length);
    console.log(JSON.stringify(results, null, 2));

    await page.screenshot({ path: 'c:/Users/1221390/Desktop/Agent double check new item/search_result.png' });
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

