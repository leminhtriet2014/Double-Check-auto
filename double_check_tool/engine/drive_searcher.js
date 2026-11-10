const path = require('path');
const fs = require('fs');

class DriveSearcher {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  async searchItem(itemCode, evidenceDir) {
    const { page, frame } = await this.browserManager.getSearchFrame();

    console.log(`[DriveSearcher] Searching for item: "${itemCode}"...`);
    await frame.evaluate((code) => {
      const input = document.getElementById('searchText');
      input.value = code;
      const chk = document.getElementById('searchRawText');
      if (chk) chk.checked = true;
      triggerSearch();
    }, itemCode);

    // Wait for search response
    let attempts = 0;
    let files = [];
    let statusText = '';
    while (attempts < 25) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const state = await frame.evaluate(() => {
        const loading = document.querySelector('#results .loading');
        const rows = Array.from(document.querySelectorAll('#results table tbody tr'));
        const status = document.querySelector('#results .status-message');
        return {
          isLoading: !!loading,
          statusText: status ? status.innerText : '',
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
        statusText = state.statusText;
        break;
      }
    }

    // Capture evidence screenshot
    let screenshotPath = '';
    if (evidenceDir) {
      if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
      const safeItem = itemCode.replace(/[^a-zA-Z0-9_-]/g, '_');
      screenshotPath = path.join(evidenceDir, `search_${safeItem}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`[DriveSearcher] Evidence screenshot saved to: ${screenshotPath}`);
    }

    // Identify the spec file (exclude artwork files with 'AW' or 'AW.pdf')
    let specFile = null;
    const candidates = files.filter(f => !f.name.toLowerCase().includes('aw.pdf') && !f.name.toLowerCase().endsWith(' aw'));
    // Prioritize file having 'spec' or 'vn spec'
    specFile = candidates.find(f => f.name.toLowerCase().includes('spec')) || candidates[0] || null;

    return {
      itemCode,
      statusText,
      files,
      specFile,
      screenshotPath
    };
  }

  async downloadSpec(fileId, fileName, downloadDir) {
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
    const targetPath = path.join(downloadDir, fileName);

    if (fs.existsSync(targetPath)) {
      console.log(`[DriveSearcher] File already exists: ${fileName}`);
      return targetPath;
    }

    const browser = this.browserManager.browser;
    const page = await browser.newPage();
    const client = await page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
      eventsEnabled: true
    });

    const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    console.log(`[DriveSearcher] Initiating download: ${downloadUrl}`);

    try {
      await page.goto(downloadUrl, { timeout: 15000 });
    } catch (e) {
      // Direct file downloads often don't fire navigation finish
    }

    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 1000));
      if (fs.existsSync(targetPath)) {
        console.log(`[DriveSearcher] Successfully downloaded: ${fileName}`);
        break;
      }
    }

    await page.close();
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Failed to download spec file ${fileName} (id: ${fileId})`);
    }

    return targetPath;
  }
}

module.exports = { DriveSearcher };

