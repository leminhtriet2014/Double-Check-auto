const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('ItemMaster.php')) || pages[0];

    // Find Detail button near Process
    const btnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="button"], div.dhxform_btn, a'));
      const detail = btns.filter(b => (b.innerText || b.value || '').trim().toLowerCase().includes('detail'));
      return detail.map(b => ({
        tag: b.tagName,
        text: (b.innerText || b.value || '').trim(),
        id: b.id,
        className: b.className,
        onclick: b.getAttribute('onclick')
      }));
    });

    console.log('Detail buttons found:', btnInfo);

    // Let's click the Detail button
    const detailBtnEl = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="button"], div.dhxform_btn'));
      return btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('detail'));
    });

    if (detailBtnEl) {
      console.log('Clicking Detail button...');
      await detailBtnEl.click();
      await new Promise(r => setTimeout(r, 2000));

      const modalOrWindow = await page.evaluate(() => {
        // Find visible windows / dhtmlx windows
        const dhxWins = Array.from(document.querySelectorAll('.dhtmlx_window_active, .dhxwin_active, .dhx_modal_cover, div[class*="window"]'));
        const text = dhxWins.map(w => w.innerText).join('\n---\n');
        return { count: dhxWins.length, text };
      });
      console.log('Modal after Detail click:', modalOrWindow);
      await page.screenshot({ path: 'archive/itemmaster_detail_popup.png' });
      console.log('Saved archive/itemmaster_detail_popup.png');
    }

    await browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();

