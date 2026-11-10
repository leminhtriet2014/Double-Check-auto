const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const imPage = pages.find(p => p.url().includes('ItemMaster.php')) || pages[pages.length - 1];

    const searchInput = await imPage.$('.dhxtoolbar_input');
    await searchInput.click();
    await imPage.keyboard.down('Control');
    await imPage.keyboard.press('KeyA');
    await imPage.keyboard.up('Control');
    await imPage.keyboard.press('Backspace');
    await searchInput.type('2-456230-007-01');
    await imPage.keyboard.press('Enter');

    console.log('Waiting 3s for 2-456230-007-01 to load...');
    await new Promise(r => setTimeout(r, 3000));

    const formData = await imPage.evaluate(() => {
      const all = {};
      const els = document.querySelectorAll('input, textarea, select');
      for (const el of els) {
        if (el.name && el.value) all[el.name] = el.value;
      }
      // Also get checkbox states
      const checkboxes = {};
      for (const el of els) {
        if (el.type === 'checkbox') checkboxes[el.name || el.id] = el.checked;
      }
      return { fields: all, checkboxes };
    });

    console.log('=== ItemMaster Data for 2-456230-007-01 ===');
    console.log(JSON.stringify(formData, null, 2));

    await imPage.screenshot({ path: 'archive/itemmaster_2-456230.png', fullPage: true });

    // Also search Drive for 2-456230-007-01
    const drivePage = pages.find(p => p.url().includes('script.google.com'));
    if (drivePage) {
      const frame = drivePage.frames().find(f => f.name() === 'userHtmlFrame');
      if (frame) {
        await frame.evaluate((code) => {
          const input = document.getElementById('searchText');
          input.value = code;
          const chk = document.getElementById('searchRawText');
          if (chk) chk.checked = true;
          triggerSearch();
        }, '2-456230-007-01');

        await new Promise(r => setTimeout(r, 4000));

        const driveResults = await frame.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('#results table tbody tr'));
          return rows.map(r => ({
            id: r.dataset.fileId,
            name: r.querySelector('.filename-cell a') ? r.querySelector('.filename-cell a').textContent.trim() : ''
          }));
        });

        console.log('=== Drive Search Results for 2-456230-007-01 ===');
        console.log(JSON.stringify(driveResults, null, 2));
      }
    }

    await browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();

