const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('ItemMaster.php')) || pages[pages.length - 1];

    console.log('Finding search input...');
    const searchInput = await page.$('.dhxtoolbar_input');
    if (!searchInput) {
      console.log('dhxtoolbar_input not found!');
      await browser.disconnect();
      return;
    }

    console.log('Typing GLID 1-350296-000-00...');
    await searchInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await searchInput.type('1-350296-000-00');
    await page.keyboard.press('Enter');

    console.log('Waiting 3 seconds for form to load...');
    await new Promise(r => setTimeout(r, 3000));

    // Get all named form elements
    const formData = await page.evaluate(() => {
      const all = {};
      const els = document.querySelectorAll('input, textarea, select');
      for (const el of els) {
        if (el.name && el.value) {
          all[el.name] = el.value;
        }
      }
      return all;
    });

    console.log('All Form Fields with values:', JSON.stringify(formData, null, 2));

    await page.screenshot({ path: 'item_master_filled.png' });
    console.log('Saved item_master_filled.png');

    await browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();
