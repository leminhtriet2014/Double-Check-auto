const puppeteer = require('C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const data = [
  {
    item: '2-539037-000-00',
    fileName: '2-539037-000-00.png',
    specName: '62761250 2-539037-000-00 vn spec.pdf',
    searchScreen: 'search_2-539037-000-00.png',
    originalImage: 'c:/Users/1221390/Desktop/Agent double check new item/09-Nov/2-539037-000-00.png',
    fields: [
      { name: 'GLID', img: '2-539037-000-00', spec: '2-539037-000-00', match: true, isNum: false },
      { name: 'Item Code', img: '62761250', spec: '62761250', match: true, isNum: false },
      { name: 'Buying Office', img: 'ADIDAS', spec: 'EUROPE ADIDAS', match: true, isNum: false, note: 'Khớp tương đối' },
      { name: 'Product Length', img: '0', spec: '22 mm (.866 in)', match: false, isNum: true, note: 'LỆCH SỐ: Form=0 vs Spec=22 mm' },
      { name: 'Product Width', img: '0', spec: '22 mm (.866 in)', match: false, isNum: true, note: 'LỆCH SỐ: Form=0 vs Spec=22 mm' },
      { name: 'Color F', img: '(Trống)', spec: '(Trống / Special Color)', match: true, isNum: false },
      { name: 'Color B', img: '(Trống)', spec: '(Trống)', match: true, isNum: false },
      { name: 'Special Instructions', img: '(1 roll 9AS001964 = 2500pcs)', spec: '(1 roll 9AS001964 = 2500pcs)', match: true, isNum: false },
      { name: 'Material Code', img: '(Trống)', spec: 'Hologram Sticker / 9AS001964', match: 'warning', isNum: false, note: 'Form để trống ô Material Code (khai ở Accessory)' },
      { name: 'Sheet Size', img: '(Trống)', spec: '(Trống - dạng roll)', match: true, isNum: false },
      { name: 'Offset Cut No', img: '0', spec: '0', match: true, isNum: true }
    ]
  },
  {
    item: '2-550615-052-00',
    fileName: '2-550615-052-00.png',
    specName: 'TNF-HTCB-F27GENCVR-2600052-00_2-550615-052-00 VN SPEC.pdf',
    searchScreen: 'search_2-550615-052-00.png',
    originalImage: 'c:/Users/1221390/Desktop/Agent double check new item/09-Nov/2-550615-052-00.png',
    fields: [
      { name: 'GLID', img: '2-550615-052-00', spec: '2-550615-052-00', match: true, isNum: false },
      { name: 'Item Code', img: 'TNF-HTCB-F27GENCVR-260', spec: 'TNF-HTCB-F27GENCVR-2600052-00', match: true, isNum: false, note: 'Khớp tương đối (bị khuất đuôi trong ô input)' },
      { name: 'Buying Office', img: 'THE NORTH FACE', spec: 'THE NORTH FACE', match: true, isNum: false },
      { name: 'Product Length', img: '217.4', spec: '107.95 mm (4.25 in)', match: false, isNum: true, note: 'LỆCH SỐ: Form=217.4 mm (khổ trải mở) vs Spec=107.95 mm (khổ gập đơn)' },
      { name: 'Product Width', img: '63.5', spec: '63.5 mm (2.5 in)', match: true, isNum: true },
      { name: 'Color F', img: 'Black 3C', spec: 'Follow cover hangtag 2-547394-000-01', match: 'warning', isNum: false, note: 'Spec combo tham chiếu mã cover' },
      { name: 'Color B', img: 'Black 3C', spec: 'Follow cover hangtag 2-547394-000-01', match: 'warning', isNum: false, note: 'Spec combo tham chiếu mã cover' },
      { name: 'Special Instructions', img: 'In mat truoc o mat toi hon cua giay Kraf\nFollow HK sample 2-541877-000-01...', spec: 'Combo 4 item ghép nhãn cover F27GENCVR...', match: true, isNum: false, note: 'Khớp quy cách combo' },
      { name: 'Material Code', img: 'FSKP-300-787-1092-11474', spec: 'FSKP-300-787-1092-11474', match: true, isNum: false },
      { name: 'Sheet Size', img: '545x395mm', spec: 'Khổ máy in Offset', match: true, isNum: false },
      { name: 'Offset Cut No', img: '4', spec: '4', match: true, isNum: true }
    ]
  },
  {
    item: '2-555714-000-01',
    fileName: '2-555714-000-01.png',
    specName: 'SWT_09_Bamboo_Layers_2-555714-000-01 VN SPEC.pdf',
    searchScreen: 'search_2-555714-000-01.png',
    originalImage: 'c:/Users/1221390/Desktop/Agent double check new item/09-Nov/2-555714-000-01.png',
    fields: [
      { name: 'GLID', img: '2-555714-000-01', spec: '2-555714-000-01', match: true, isNum: false },
      { name: 'Item Code', img: 'SWT_09_Bamboo_Layers', spec: 'SWT_09_Bamboo_Layers', match: true, isNum: false },
      { name: 'Buying Office', img: 'LOVE TO DREAM PTY L', spec: 'LOVE TO DREAM PTY LTD', match: true, isNum: false, note: 'Khớp tương đối' },
      { name: 'Product Length', img: '62', spec: '62 mm (2.44094 in)', match: true, isNum: true },
      { name: 'Product Width', img: '83', spec: '83 mm (3.26771 in)', match: true, isNum: true },
      { name: 'Color F', img: '11-0605 TPG + 425 C', spec: 'PANTONE 11-0605 TPG + pantone 425 C', match: true, isNum: false },
      { name: 'Color B', img: '3155 C + 7466 C + 11-0605 TPG', spec: 'pantone 7466 C + PANTONE 11-0605 TPG + pantone 3155 C', match: true, isNum: false },
      { name: 'Special Instructions', img: 'Follow approved card: LTD_SNUG_CUTOUT_2-522789-001-01', spec: '-color follow approved card: LTD_SNUG_CUTOUT_2-522789-001-01', match: true, isNum: false },
      { name: 'Material Code', img: 'CSC2-345-787-1092-5998', spec: 'CSC2-345-787-1092-5998', match: true, isNum: false },
      { name: 'Sheet Size', img: '545x395mm', spec: 'Khổ in Offset (Giấy gốc 787x1092mm)', match: true, isNum: false },
      { name: 'Offset Cut No', img: '4', spec: '4', match: true, isNum: true }
    ]
  }
];

function generateHtml(itemData) {
  const rows = itemData.fields.map(f => {
    let statusBadge = '';
    let rowBg = '';
    if (f.match === true) {
      statusBadge = '<span style="background:#e6f4ea;color:#137333;padding:4px 8px;border-radius:4px;font-weight:bold;">MATCH</span>';
    } else if (f.match === false) {
      statusBadge = '<span style="background:#fce8e6;color:#c5221f;padding:4px 8px;border-radius:4px;font-weight:bold;">MISMATCH</span>';
      rowBg = 'background:#fff8f8;';
    } else {
      statusBadge = '<span style="background:#fef7e0;color:#b06000;padding:4px 8px;border-radius:4px;font-weight:bold;">CHECK</span>';
      rowBg = 'background:#fffdf0;';
    }

    const numBadge = f.isNum ? '<span style="background:#e8f0fe;color:#1a73e8;padding:2px 6px;border-radius:3px;font-size:11px;margin-left:6px;">SỐ</span>' : '';

    return `
      <tr style="${rowBg}">
        <td style="padding:10px;font-weight:bold;border-bottom:1px solid #ddd;">${f.name} ${numBadge}</td>
        <td style="padding:10px;border-bottom:1px solid #ddd;font-family:monospace;">${f.img}</td>
        <td style="padding:10px;border-bottom:1px solid #ddd;font-family:monospace;">${f.spec}</td>
        <td style="padding:10px;border-bottom:1px solid #ddd;text-align:center;">${statusBadge}</td>
        <td style="padding:10px;border-bottom:1px solid #ddd;font-size:12px;color:#555;">${f.note || ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; background: #f8f9fa; color: #202124; }
        .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        h1 { margin-top: 0; color: #1a73e8; font-size: 22px; border-bottom: 2px solid #e8eaed; padding-bottom: 10px; }
        .meta { display: flex; gap: 20px; margin-bottom: 20px; font-size: 14px; background: #e8f0fe; padding: 12px 16px; border-radius: 6px; }
        .meta strong { color: #174ea6; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f1f3f4; padding: 10px; text-align: left; font-size: 13px; color: #5f6368; border-bottom: 2px solid #dadce0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>BÁO CÁO ĐỐI SOÁT DOUBLE CHECK: ${itemData.item}</h1>
        <div class="meta">
          <div><strong>Item Code / GLID:</strong> ${itemData.item}</div>
          <div><strong>File Ảnh Gốc:</strong> ${itemData.fileName}</div>
          <div><strong>File Spec Drive:</strong> ${itemData.specName}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Trường Dữ Liệu</th>
              <th style="width: 25%;">Dữ Liệu Trong Ảnh (Hệ Thống)</th>
              <th style="width: 25%;">Dữ Liệu File Spec (Drive)</th>
              <th style="width: 12%; text-align: center;">Trạng Thái</th>
              <th style="width: 20%;">Ghi Chú Chi Tiết</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const evidenceDir = path.resolve('c:/Users/1221390/Desktop/Agent double check new item/evidence_09_nov');

    for (const item of data) {
      const html = generateHtml(item);
      const htmlPath = path.join(evidenceDir, `report_${item.item}.html`);
      fs.writeFileSync(htmlPath, html);

      await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
      const imgPath = path.join(evidenceDir, `report_${item.item}.png`);
      await page.screenshot({ path: imgPath, fullPage: true });
      console.log(`Generated report screenshot for ${item.item} at ${imgPath}`);
    }

    await page.close();
    await browser.disconnect();
  } catch (err) {
    console.error('Error generating reports:', err);
  }
})();

