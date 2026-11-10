const fs = require('fs');
const path = require('path');

class Reporter {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  generateHtmlCard(itemData) {
    const rows = itemData.fields.map(f => {
      let statusBadge = '';
      let rowBg = '';
      if (f.match === true) {
        statusBadge = '<span style="background:#e6f4ea;color:#137333;padding:4px 10px;border-radius:4px;font-weight:700;font-size:12px;">MATCH</span>';
      } else if (f.match === false) {
        statusBadge = '<span style="background:#fce8e6;color:#c5221f;padding:4px 10px;border-radius:4px;font-weight:700;font-size:12px;">MISMATCH</span>';
        rowBg = 'background:#fff5f5;';
      } else {
        statusBadge = '<span style="background:#fef7e0;color:#b06000;padding:4px 10px;border-radius:4px;font-weight:700;font-size:12px;">CHECK</span>';
        rowBg = 'background:#fffdf0;';
      }

      const numBadge = f.isNum ? '<span style="background:#e8f0fe;color:#1a73e8;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;margin-left:6px;">SỐ</span>' : '';

      return `
        <tr style="${rowBg}">
          <td style="padding:10px 14px;font-weight:600;border-bottom:1px solid #e0e0e0;color:#202124;">${f.name} ${numBadge}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:13px;color:#1a73e8;white-space:pre-wrap;">${f.img}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-size:13px;color:#137333;white-space:pre-wrap;">${f.spec}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;text-align:center;">${statusBadge}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e0e0e0;font-size:12px;color:#5f6368;">${f.note || ''}</td>
        </tr>
      `;
    }).join('');

    let overallBadge = '';
    if (itemData.status === 'MATCH') {
      overallBadge = '<span style="background:#137333;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700;font-size:14px;">100% MATCH</span>';
    } else if (itemData.status === 'MISMATCH') {
      overallBadge = '<span style="background:#c5221f;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700;font-size:14px;">HAS MISMATCH</span>';
    } else {
      overallBadge = '<span style="background:#f29900;color:#fff;padding:6px 14px;border-radius:6px;font-weight:700;font-size:14px;">NEEDS REVIEW</span>';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; background: #f8f9fa; color: #202124; }
          .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #dadce0; max-width: 1200px; margin: 0 auto; }
          .header { background: #1a73e8; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
          .header h2 { margin: 0; font-size: 20px; font-weight: 600; }
          .header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; }
          .meta-box { background: #e8f0fe; padding: 14px 24px; font-size: 13px; color: #174ea6; border-bottom: 1px solid #d2e3fc; display: flex; flex-wrap: wrap; gap: 20px; }
          .meta-box span { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f1f3f4; padding: 12px 14px; font-size: 12px; font-weight: 700; color: #5f6368; text-transform: uppercase; border-bottom: 2px solid #dadce0; }
          .footer { padding: 14px 24px; background: #f8f9fa; border-top: 1px solid #dadce0; font-size: 12px; color: #70757a; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <h2>Đối Soát Chi Tiết: ${itemData.itemCode || itemData.glid}</h2>
              <div class="subtitle">GLID: <b>${itemData.glid}</b> &bull; File: <b>${itemData.specName || 'VN SPEC'}</b></div>
            </div>
            <div>${overallBadge}</div>
          </div>
          <div class="meta-box">
            <div><span>Thư mục:</span> ${itemData.folderName || 'N/A'}</div>
            <div><span>File Ảnh Gốc:</span> ${path.basename(itemData.imagePath || '')}</div>
            <div><span>Drive Spec:</span> ${itemData.specName || 'Chưa tìm thấy'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:18%;">Trường Dữ Liệu</th>
                <th style="width:22%;">Order Form (ItemMaster Realtime)</th>
                <th style="width:22%;">VN SPEC (Trên Drive)</th>
                <th style="width:10%;text-align:center;">Trạng Thái</th>
                <th style="width:28%;">Ghi Chú Đối Soát</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="footer">
            <div>Avery Dennison QA Double-Check Automated Tool &bull; Powered by Antigravity</div>
            <div>Thời gian đối soát: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async renderCardImage(itemData, outputPath) {
    const html = this.generateHtmlCard(itemData);
    const browser = this.browserManager.browser;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const cardEl = await page.$('.card');
    if (cardEl) {
      await cardEl.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath, fullPage: true });
    }
    await page.close();
    return outputPath;
  }

  generateFolderReportHtml(folderName, items) {
    const total = items.length;
    const matches = items.filter(i => i.status === 'MATCH').length;
    const mismatches = items.filter(i => i.status === 'MISMATCH').length;
    const checks = items.filter(i => i.status === 'CHECK').length;

    const cardsHtml = items.map(item => {
      let statusColor = '#137333';
      let statusBg = '#e6f4ea';
      let statusText = '100% MATCH';
      if (item.status === 'MISMATCH') {
        statusColor = '#c5221f';
        statusBg = '#fce8e6';
        statusText = 'LỆCH DỮ LIỆU';
      } else if (item.status === 'CHECK') {
        statusColor = '#b06000';
        statusBg = '#fef7e0';
        statusText = 'CẦN XÁC NHẬN';
      }

      const rows = item.fields.map(f => {
        let fBadge = f.match === true ? '<span style="color:#137333;font-weight:bold;">MATCH</span>' :
                     f.match === false ? '<span style="color:#c5221f;font-weight:bold;">MISMATCH</span>' :
                     '<span style="color:#b06000;font-weight:bold;">CHECK</span>';
        const numTag = f.isNum ? '<span style="background:#e8f0fe;color:#1a73e8;padding:1px 4px;border-radius:2px;font-size:10px;">SỐ</span>' : '';
        return `
          <tr style="${f.match === false ? 'background:#fff8f8;' : ''}">
            <td style="padding:6px 10px;font-size:12px;font-weight:600;">${f.name} ${numTag}</td>
            <td style="padding:6px 10px;font-size:12px;font-family:monospace;">${f.img}</td>
            <td style="padding:6px 10px;font-size:12px;font-family:monospace;">${f.spec}</td>
            <td style="padding:6px 10px;font-size:11px;text-align:center;">${fBadge}</td>
            <td style="padding:6px 10px;font-size:11px;color:#555;">${f.note || ''}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="background:#fff;border-radius:10px;border:1px solid #dadce0;margin-bottom:24px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="padding:14px 20px;background:#f8f9fa;border-bottom:1px solid #dadce0;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="font-size:16px;font-weight:bold;color:#202124;">${item.itemCode || item.glid}</span>
              <span style="color:#5f6368;font-size:13px;margin-left:12px;">GLID: <b>${item.glid}</b></span>
            </div>
            <span style="background:${statusBg};color:${statusColor};padding:4px 12px;border-radius:6px;font-weight:bold;font-size:13px;">${statusText}</span>
          </div>
          <div style="padding:12px 20px;font-size:12px;color:#555;background:#fafbfc;border-bottom:1px solid #eee;">
            <span>Spec File: <b>${item.specName || 'N/A'}</b></span>
            ${item.searchScreen ? `<span style="margin-left:20px;"><a href="${path.basename(item.searchScreen)}" target="_blank" style="color:#1a73e8;text-decoration:none;">Xem ảnh chụp màn hình tìm kiếm &rarr;</a></span>` : ''}
            ${item.reportImage ? `<span style="margin-left:20px;"><a href="${path.basename(item.reportImage)}" target="_blank" style="color:#1a73e8;text-decoration:none;">Xem ảnh phiếu đối soát &rarr;</a></span>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f1f3f4;border-bottom:1px solid #dadce0;font-size:11px;color:#5f6368;text-transform:uppercase;">
                <th style="padding:8px 10px;text-align:left;">Trường Dữ Liệu</th>
                <th style="padding:8px 10px;text-align:left;">Order Form (Ảnh)</th>
                <th style="padding:8px 10px;text-align:left;">VN SPEC (Drive)</th>
                <th style="padding:8px 10px;text-align:center;">Kết Quả</th>
                <th style="padding:8px 10px;text-align:left;">Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo Cáo Đối Soát: Thư Mục ${folderName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background:#f4f6f8; margin:0; padding:24px; color:#202124; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header-box { background:#1a73e8; color:#fff; padding:24px; border-radius:12px; margin-bottom:24px; }
          .stats-row { display:flex; gap:16px; margin-top:16px; }
          .stat-pill { background:rgba(255,255,255,0.18); padding:10px 18px; border-radius:8px; font-size:14px; }
          .stat-num { font-size:22px; font-weight:bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-box">
            <h1 style="margin:0;font-size:24px;">Báo Cáo Đối Soát: Thư Mục ${folderName}</h1>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">Quy trình tự động đối soát 11 trường thông tin giữa Form ảnh đơn hàng và VN Spec trên Drive</div>
            <div class="stats-row">
              <div class="stat-pill"><div class="stat-num">${total}</div>Tổng số items</div>
              <div class="stat-pill" style="background:rgba(52,168,83,0.3);"><div class="stat-num">${matches}</div>Khớp 100% (Match)</div>
              <div class="stat-pill" style="background:rgba(234,67,53,0.3);"><div class="stat-num">${mismatches}</div>Lệch dữ liệu (Mismatch)</div>
              <div class="stat-pill" style="background:rgba(251,188,4,0.3);"><div class="stat-num">${checks}</div>Cần xác nhận (Check)</div>
            </div>
          </div>
          <div>${cardsHtml}</div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = { Reporter };

