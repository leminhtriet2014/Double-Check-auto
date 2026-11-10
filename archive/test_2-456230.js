const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('ItemMaster.php')) || pages[0];

    const targetUrl = 'https://appdvn15.ap.averydennison.net/new-apps/public_html/adlh/lines/pcaccess/ItemMaster.php?GLID=2-456230-007-01';
    console.log('Navigating to:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const formData = await page.evaluate(() => {
      const all = {};
      const els = document.querySelectorAll('input, textarea, select');
      for (const el of els) {
        if (el.name) {
          if (el.type === 'checkbox') all[el.name] = el.checked;
          else if (el.value) all[el.name] = el.value;
        }
      }
      return all;
    });

    console.log('=== ItemMaster Data for 2-456230-007-01 ===');
    console.log(JSON.stringify(formData, null, 2));

    await page.screenshot({ path: 'archive/itemmaster_2-456230-007-01.png', fullPage: true });
    console.log('Saved screenshot to archive/itemmaster_2-456230-007-01.png');

    await browser.disconnect();
  } catch (err) {
    console.error(err);
  }
})();

