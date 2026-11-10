const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const downloadPath = path.resolve('c:/Users/1221390/Desktop/Agent double check new item/downloads');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

    const page = await browser.newPage();
    const client = await page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
      eventsEnabled: true
    });

    console.log('Navigating to download URL...');
    const url = 'https://drive.google.com/uc?id=19Y1EnMRuyV1t3mS07NvQKCXh1ln9jf9P&export=download';
    
    // We can also trigger download by clicking or navigating
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      // Often times out because file download triggers download instead of navigation
      console.log('Goto finished or interrupted by download:', e.message);
    }

    // Wait for download to appear in folder
    console.log('Waiting for file in downloadPath...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const files = fs.readdirSync(downloadPath);
      const done = files.filter(f => !f.endsWith('.crdownload'));
      if (done.length > 0) {
        console.log('Downloaded files:', done);
        break;
      }
    }

    await page.close();
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

