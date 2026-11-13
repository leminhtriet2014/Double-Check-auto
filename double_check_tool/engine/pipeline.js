const path = require('path');
const fs = require('fs');
const { BrowserManager } = require('./browser');
const { DriveSearcher } = require('./drive_searcher');
const { ItemMasterFetcher } = require('./item_master_fetcher');
const { parseSpecPdf } = require('./pdf_parser');
const { Comparator } = require('./comparator');
const { Reporter } = require('./reporter');
const { FolderScanner } = require('./folder_scanner');
const { TnfSheetChecker } = require('./tnf_sheet_checker');

class Pipeline {
  constructor(options = {}) {
    this.browserManager = new BrowserManager(options.port || 9222);
    this.driveSearcher = new DriveSearcher(this.browserManager);
    this.itemMasterFetcher = new ItemMasterFetcher(this.browserManager);
    this.comparator = new Comparator(options.rulesPath);
    this.reporter = new Reporter(this.browserManager);
    this.tnfChecker = new TnfSheetChecker();
    this.downloadDir = path.resolve(__dirname, '../../downloads');
    this.reportsBaseDir = path.resolve(__dirname, '../../reports');
    this.formCachePath = path.resolve(__dirname, '../config/form_cache.json');
    this.formCache = fs.existsSync(this.formCachePath) ? JSON.parse(fs.readFileSync(this.formCachePath, 'utf8')) : {};
  }

  async checkSingleItem(glid, reportDir, onProgress) {
    const log = (msg) => {
      console.log(`[Pipeline] ${msg}`);
      if (typeof onProgress === 'function') onProgress({ type: 'log', message: msg });
    };

    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    log(`>>> [Item: ${glid}] Tra cứu Real-time trên ItemMaster.php...`);
    let formData;
    try {
      formData = await this.itemMasterFetcher.fetchItem(glid, reportDir);
      log(`>>> [Item: ${glid}] Đã lấy dữ liệu từ ItemMaster: Item Code=${formData.itemCode}, BO=${formData.buyingOffice}`);
    } catch (err) {
      log(`>>> [Item: ${glid}] Lỗi khi tải từ ItemMaster (${err.message}). Thử dùng dữ liệu dự phòng...`);
      formData = this.formCache[glid] || {
        glid,
        itemCode: glid,
        buyingOffice: '',
        productLength: '0',
        productWidth: '0',
        colorF: '(Trống)',
        colorB: '(Trống)',
        varnishF: '(Trống)',
        varnishB: '(Trống)',
        specialInstructions: '(Trống)',
        materialCode: '(Trống)',
        sheetSize: '(Trống)',
        offsetCutNo: '0',
        hole: '0',
        removeWastage: '0',
        brandProtection: '0',
        fsc: '',
        process: '',
        standardLeadTime: '7'
      };
    }

    // Special Rule for THE NORTH FACE items:
    // Query Google Sheet: https://docs.google.com/spreadsheets/d/1HrjV58aQxDOWcQCovPNW2Rmy9uNXC3pSRE0NrRaFKA8/edit?gid=0#gid=0
    // Check GLID, Cover (X= in Sub Contract Details), and GLID Sub are on the same row.
    // Skip other field checks for TNF items.
    if (this.tnfChecker.isTnfItem(formData)) {
      log(`>>> [Item: ${glid}] Nhận diện item THE NORTH FACE -> Áp dụng đối soát Combo trên Google Sheet (TNF VN Combo Setup List)...`);
      try {
        const sheetRows = await this.tnfChecker.fetchRows(this.browserManager);
        const tnfResult = this.tnfChecker.checkCombo(formData, sheetRows);
        log(`>>> [Item: ${glid}] Kết quả đối soát TNF Combo: Trạng thái = ${tnfResult.status} (Hàng ${tnfResult.sheetRow || 'N/A'})`);

        const safeGlid = glid.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cardHtmlPath = path.join(reportDir, `report_${safeGlid}.html`);
        const cardImagePath = path.join(reportDir, `report_${safeGlid}.png`);

        const itemResult = {
          glid,
          itemCode: formData.itemCode || glid,
          status: tnfResult.status,
          specName: `Google Sheet (TNF VN Combo Setup List - Hàng ${tnfResult.sheetRow || 'Không tìm thấy'})`,
          itemMasterScreen: formData.screenshotPath || '',
          searchScreen: '',
          reportHtml: cardHtmlPath,
          reportImage: cardImagePath,
          fields: tnfResult.fields,
          formData
        };

        const html = this.reporter.generateHtmlCard(itemResult);
        fs.writeFileSync(cardHtmlPath, html, 'utf8');

        try {
          await this.reporter.renderCardImage(itemResult, cardImagePath);
          log(`>>> [Item: ${glid}] Đã tạo phiếu đối soát trực quan: ${path.basename(cardImagePath)}`);
        } catch (e) {
          log(`>>> [Item: ${glid}] Thông báo render thẻ: ${e.message}`);
        }

        return itemResult;
      } catch (sheetErr) {
        log(`>>> [Item: ${glid}] Cảnh báo lỗi đối soát Google Sheet TNF: ${sheetErr.message}`);
      }
    }

    // Step 2: Search Google Drive & capture screenshot
    log(`>>> [Item: ${glid}] Tìm kiếm VN Spec trên Google Drive...`);
    const searchRes = await this.driveSearcher.searchItem(glid, reportDir);
    log(`>>> [Item: ${glid}] Tìm thấy ${searchRes.files.length} files trên Drive. Trạng thái: "${searchRes.statusText}"`);

    if (!searchRes.specFile) {
      log(`>>> [Item: ${glid}] CẢNH BÁO: Không tìm thấy file VN Spec PDF trên Drive.`);
      const comparison = this.comparator.compareItem(formData, {});
      return {
        glid,
        itemCode: formData.itemCode || glid,
        status: 'CHECK',
        specName: 'Không tìm thấy file Spec trên Drive',
        itemMasterScreen: formData.screenshotPath || '',
        searchScreen: searchRes.screenshotPath || '',
        fields: comparison.fields,
        formData
      };
    }

    log(`>>> [Item: ${glid}] Chọn file Spec: "${searchRes.specFile.name}" (ID: ${searchRes.specFile.id})`);

    // Step 3: Download Spec PDF
    const specPdfPath = await this.driveSearcher.downloadSpec(searchRes.specFile.id, searchRes.specFile.name, this.downloadDir);

    // Step 4: Parse Spec PDF
    const specData = parseSpecPdf(specPdfPath, glid);
    if (!specData.itemCode) {
      const fnParts = searchRes.specFile.name.split('_');
      if (fnParts.length > 1 && !fnParts[0].match(/^[12]-\d{6}/)) {
        specData.itemCode = fnParts[0];
      }
    }
    if (!specData.itemCode && formData.itemCode) {
      specData.itemCode = formData.itemCode;
    }
    log(`>>> [Item: ${glid}] Bóc tách spec: GLID=${specData.glid}, Dài=${specData.productLength}, Rộng=${specData.productWidth}, Material=${specData.materialCode}`);

    // Step 5: Compare 11 Attributes
    const comparison = this.comparator.compareItem(formData, specData);
    log(`>>> [Item: ${glid}] Kết quả đối soát: ${comparison.status}`);

    // Step 6: Render visual comparison card PNG
    const cardImagePath = path.join(reportDir, `report_${glid}.png`);
    const itemResult = {
      glid,
      itemCode: formData.itemCode || specData.itemCode,
      status: comparison.status,
      specName: searchRes.specFile.name,
      itemMasterScreen: formData.screenshotPath || '',
      searchScreen: searchRes.screenshotPath || '',
      reportImage: cardImagePath,
      fields: comparison.fields,
      formData,
      specData
    };

    try {
      await this.reporter.renderCardImage(itemResult, cardImagePath);
      log(`>>> [Item: ${glid}] Đã tạo phiếu đối soát trực quan: ${path.basename(cardImagePath)}`);
    } catch (e) {
      log(`>>> [Item: ${glid}] Thông báo render thẻ: ${e.message}`);
    }

    return itemResult;
  }

  async runFolder(folderNameOrPath, onProgress) {
    const log = (msg) => {
      console.log(`[Pipeline] ${msg}`);
      if (typeof onProgress === 'function') onProgress({ type: 'log', message: msg });
    };

    let folderPath = folderNameOrPath;
    if (!path.isAbsolute(folderPath)) {
      folderPath = path.resolve(__dirname, '../../', folderNameOrPath);
    }
    const folderName = path.basename(folderPath);

    log(`Bắt đầu đối soát theo thư mục: "${folderName}" (${folderPath})`);

    // 1. Scan folder
    const items = FolderScanner.scan(folderPath);
    log(`Tìm thấy ${items.length} items trong thư mục.`);

    const reportDir = path.join(this.reportsBaseDir, folderName);
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    // Connect to browser
    await this.browserManager.connect();
    log(`Đã kết nối vào phiên Google Chrome thành công.`);

    const results = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemProgress = `[${i + 1}/${items.length}]`;
      log(`\n--------------------------------------------------------------`);
      log(`${itemProgress} Đang xử lý GLID: ${it.glid} (File gốc: ${it.fileName})`);

      try {
        const itemRes = await this.checkSingleItem(it.glid, reportDir, onProgress);
        itemRes.folderName = folderName;
        itemRes.imagePath = it.filePath;
        results.push(itemRes);
      } catch (err) {
        console.error(`Error processing ${it.glid}:`, err);
        log(`${itemProgress} LỖI: ${err.message}`);
        results.push({
          glid: it.glid,
          itemCode: it.rawName,
          status: 'MISMATCH',
          specName: 'Lỗi trong quá trình đối soát',
          error: err.message,
          fields: []
        });
      }
    }

    // Generate folder-level HTML dashboard
    const htmlReport = this.reporter.generateFolderReportHtml(folderName, results);
    const htmlReportPath = path.join(reportDir, 'index.html');
    fs.writeFileSync(htmlReportPath, htmlReport, 'utf8');

    // Save JSON summary
    const summaryJsonPath = path.join(reportDir, 'summary.json');
    fs.writeFileSync(summaryJsonPath, JSON.stringify({
      folderName,
      timestamp: new Date().toISOString(),
      totalItems: results.length,
      matched: results.filter(r => r.status === 'MATCH').length,
      mismatched: results.filter(r => r.status === 'MISMATCH').length,
      checks: results.filter(r => r.status === 'CHECK').length,
      items: results
    }, null, 2), 'utf8');

    log(`\n==============================================================`);
    log(`Đã hoàn tất đối soát cho thư mục "${folderName}".`);
    log(`Báo cáo HTML: ${htmlReportPath}`);
    log(`==============================================================`);
    await this.browserManager.disconnect();

    return {
      folderName,
      reportDir,
      htmlReportPath,
      summaryJsonPath,
      results
    };
  }
}

module.exports = { Pipeline };
