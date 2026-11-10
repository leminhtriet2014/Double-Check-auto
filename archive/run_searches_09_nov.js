const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('script.google.com')) || pages[0];
    const frame = page.frames().find(f => f.name() === 'userHtmlFrame');

    const evidenceDir = path.resolve('c:/Users/1221390/Desktop/Agent double check new item/evidence_09_nov');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

    const searchSummary = [];

    for (const item of items) {
      console.log(`\n================ Searching: ${item} ================`);
      await frame.evaluate((code) => {
        const input = document.getElementById('searchText');
        input.value = code;
        const chk = document.getElementById('searchRawText');
        if (chk) chk.checked = true;
        triggerSearch();
      }, item);

      // Wait for search response
      let attempts = 0;
      let files = [];
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
        const state = await frame.evaluate(() => {
          const loading = document.querySelector('#results .loading');
          const error = document.querySelector('#results .error');
          const status = document.querySelector('#results .status-message');
          const rows = Array.from(document.querySelectorAll('#results table tbody tr'));
          return {
            isLoading: !!loading,
            statusText: status ? status.innerText : '',
            rowsCount: rows.length,
            files: rows.map(r => {
              const link = r.querySelector('.filename-cell a');
              return {
                id: r.dataset.fileId,
                name: link ? link.textContent.trim() : '',
                url: link ? link.href : '',
                updated: r.children[2] ? r.children[2].textContent.trim() : '',
                owner: r.children[3] ? r.children[3].textContent.trim() : ''
              };
            })
          };
        });

        if (!state.isLoading && (state.files.length > 0 || state.statusText.includes('No files found') || state.statusText.includes('total'))) {
          files = state.files;
          console.log(`Found ${files.length} files. Status: "${state.statusText}"`);
          break;
        }
      }

      // Take screenshot of search results
      const screenshotPath = path.join(evidenceDir, `search_${item}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved to: ${screenshotPath}`);

      searchSummary.push({
        item,
        files,
        screenshot: screenshotPath
      });
    }

    fs.writeFileSync(path.join(evidenceDir, 'search_summary.json'), JSON.stringify(searchSummary, null, 2));
    console.log('\nSearch Summary saved to search_summary.json');

    await browser.disconnect();
  } catch (err) {
    console.error('Error during search:', err);
  }
})();

