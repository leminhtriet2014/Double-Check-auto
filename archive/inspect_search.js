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

    const info = await frame.evaluate(() => {
      const input = document.getElementById('searchText');
      return {
        html: input ? input.outerHTML : null,
        parentHtml: input && input.parentElement ? input.parentElement.outerHTML : null,
        scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText.slice(0, 300))
      };
    });

    console.log('Search input outerHTML:', info.html);
    console.log('Parent outerHTML:', info.parentHtml);
    console.log('Inline scripts count:', info.scripts.length);
    if (info.scripts.length > 0) {
      console.log('First script preview:', info.scripts[info.scripts.length - 1].slice(0, 500));
    }
    await browser.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();

