const path = require('path');
const fs = require('fs');

const TNF_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HrjV58aQxDOWcQCovPNW2Rmy9uNXC3pSRE0NrRaFKA8/edit?gid=0#gid=0';
const TNF_CSV_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1HrjV58aQxDOWcQCovPNW2Rmy9uNXC3pSRE0NrRaFKA8/export?format=csv&gid=0';

class TnfSheetChecker {
  constructor() {
    this.cachedRows = null;
    this.lastFetched = 0;
    this.cacheTtlMs = 10 * 60 * 1000; // 10 minutes cache
    this.localBackupPath = path.resolve(__dirname, '../../scratch/tnf_sheet.csv');
  }

  // Parse a CSV line taking quotes into account
  parseCsvLine(text) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  async fetchRows(browserManager) {
    const now = Date.now();
    if (this.cachedRows && (now - this.lastFetched < this.cacheTtlMs)) {
      return this.cachedRows;
    }

    let csvText = '';
    try {
      console.log('[TnfSheetChecker] Đang truy vấn Google Sheet TNF Combo List qua Chrome (Read-only)...');
      const browser = await browserManager.connect();
      const page = await browser.newPage();
      
      // Navigate to the edit URL first with domcontentloaded to ensure session cookies and permissions are loaded
      await page.goto(TNF_SHEET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Fetch the CSV directly within page context
      csvText = await page.evaluate(async (exportUrl) => {
        const res = await fetch(exportUrl);
        return await res.text();
      }, TNF_CSV_EXPORT_URL);

      await page.close();

      if (csvText && csvText.length > 500) {
        // Save local backup copy for emergency offline fallback
        try {
          const dir = path.dirname(this.localBackupPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(this.localBackupPath, csvText, 'utf8');
        } catch (e) {}
      }
    } catch (err) {
      console.warn(`[TnfSheetChecker] Cảnh báo khi tải từ Google Sheet: ${err.message}. Thử dùng file đệm...`);
      if (fs.existsSync(this.localBackupPath)) {
        csvText = fs.readFileSync(this.localBackupPath, 'utf8');
      } else {
        throw new Error(`Không thể kết nối tới Google Sheet TNF và chưa có dữ liệu đệm: ${err.message}`);
      }
    }

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    this.cachedRows = lines.map(l => this.parseCsvLine(l));
    this.lastFetched = Date.now();
    console.log(`[TnfSheetChecker] Đã tải ${this.cachedRows.length} dòng từ Google Sheet TNF Combo List.`);
    return this.cachedRows;
  }

  isTnfItem(formData) {
    const bo = (formData.buyingOffice || '').toLowerCase();
    const itemCode = (formData.itemCode || '').toLowerCase();
    const glid = (formData.glid || '').trim();
    return bo.includes('the north face') || 
           bo.includes('north face') || 
           bo.includes('tnf') || 
           itemCode.startsWith('tnf-') ||
           glid.startsWith('2-550615');
  }

  checkCombo(formData, rows) {
    const glid = (formData.glid || '').trim();
    const subContract = formData.subContractDetail || '';
    const glidSubRaw = formData.glidSub || '';

    // 1. Extract cover code after X= in Sub Contract Details
    const xMatch = subContract.match(/X\s*=\s*(\d+-\d+-\d+-\d+)/i);
    const coverCode = xMatch ? xMatch[1].trim() : '';

    // 2. Extract all GLID Sub codes
    const subCodes = (glidSubRaw.match(/\d+-\d+-\d+-\d+/g) || []).map(s => s.trim());

    // 3. Find row in sheet
    let targetRow = null;
    let targetRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Col 3 is Local GLID#
      if (row[3] === glid || row.includes(glid)) {
        targetRow = row;
        targetRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (!targetRow) {
      return {
        glid,
        itemCode: formData.itemCode || glid,
        status: 'MISMATCH',
        sheetRow: null,
        fields: [
          {
            name: 'Buying Office / Khách hàng',
            key: 'buyingOffice',
            img: formData.buyingOffice || 'THE NORTH FACE',
            spec: 'THE NORTH FACE',
            match: true,
            isNum: false,
            note: 'Áp dụng quy tắc kiểm tra combo The North Face trên Google Sheet'
          },
          {
            name: 'Mã GLID chính trên Sheet',
            key: 'glid',
            img: glid,
            spec: 'Không tìm thấy trên Google Sheet',
            match: false,
            isNum: false,
            note: `Mã GLID "${glid}" không tồn tại trên bảng TNF VN Combo Setup List`
          },
          {
            name: 'Sub Contract Details (Mã Cover X=)',
            key: 'coverCode',
            img: coverCode ? `X=${coverCode}` : '(Trống)',
            spec: '(Chưa xác định dòng)',
            match: false,
            isNum: false,
            note: 'Không thể đối soát do chưa có dòng tương ứng'
          },
          {
            name: 'GLID Sub (Mã nhãn phụ/Insert)',
            key: 'glidSub',
            img: subCodes.join('; ') || '(Trống)',
            spec: '(Chưa xác định dòng)',
            match: false,
            isNum: false,
            note: 'Không thể đối soát do chưa có dòng tương ứng'
          },
          {
            name: 'Quy cách Combo (Ship cùng nhãn)',
            key: 'comboShipment',
            img: 'Phải ship cùng combo',
            spec: 'Không tìm thấy dòng combo',
            match: false,
            isNum: false,
            note: `Không thể giao hàng combo do mã ${glid} chưa được khai báo trên Sheet`
          }
        ]
      };
    }

    // Sheet row values
    const sheetComboCode = targetRow[2] || '';
    const sheetCoverGlid = targetRow[10] || '';
    
    // Inserts on sheet: Col 12, 14, 16, 18, 20, 22
    const sheetInsertGlids = [
      targetRow[12],
      targetRow[14],
      targetRow[16],
      targetRow[18],
      targetRow[20],
      targetRow[22]
    ].filter(g => g && g.trim().length > 0);

    const sheetPcs = targetRow[51] || '';

    // Check 1: Cover match
    let coverMatch = false;
    let coverNote = '';
    if (!coverCode && !sheetCoverGlid) {
      coverMatch = true;
      coverNote = 'Cả hai đều không có Cover';
    } else if (coverCode && sheetCoverGlid) {
      coverMatch = (coverCode === sheetCoverGlid);
      coverNote = coverMatch 
        ? `Khớp mã Cover: "${coverCode}" trùng với cột Cover trên hàng ${targetRowIndex}`
        : `LỆCH MÃ COVER: ItemMaster khai X=${coverCode} nhưng trên Sheet hàng ${targetRowIndex} là ${sheetCoverGlid}`;
    } else if (coverCode && !sheetCoverGlid) {
      coverMatch = false;
      coverNote = `ItemMaster có X=${coverCode} nhưng trên Sheet hàng ${targetRowIndex} để trống cột Cover`;
    } else {
      coverMatch = false;
      coverNote = `ItemMaster không có X= nhưng trên Sheet hàng ${targetRowIndex} có Cover ${sheetCoverGlid}`;
    }

    // Check 2: Sub GLIDs match (all subCodes must be present in sheetInsertGlids)
    let subsMatch = true;
    let missingSubs = [];
    for (const sc of subCodes) {
      if (!sheetInsertGlids.includes(sc) && !targetRow.includes(sc)) {
        subsMatch = false;
        missingSubs.push(sc);
      }
    }

    let subNote = '';
    if (subCodes.length === 0 && sheetInsertGlids.length === 0) {
      subsMatch = true;
      subNote = 'Không có nhãn phụ (đều để trống)';
    } else if (subsMatch) {
      subNote = `Khớp toàn bộ ${subCodes.length} mã nhãn phụ trên hàng ${targetRowIndex}: [${subCodes.join(', ')}]`;
    } else {
      subNote = `LỆCH NHÃN PHỤ: Các mã [${missingSubs.join(', ')}] không nằm trên cùng hàng ${targetRowIndex} với GLID chính!`;
    }

    // Check 3: Same row shipment
    const allMatch = coverMatch && subsMatch;
    const shipmentNote = allMatch
      ? `HỢP LỆ (SHIP CÙNG NHÃN): GLID chính (${glid}), Cover (${coverCode}) và GLID Sub (${subCodes.join(', ')}) đều cùng nằm trên Hàng ${targetRowIndex} của Google Sheet.`
      : `KHÔNG HỢP LỆ: Các nhãn không nằm cùng 1 hàng trên Google Sheet (không thể ship cùng combo).`;

    return {
      glid,
      itemCode: formData.itemCode || glid,
      status: allMatch ? 'MATCH' : 'MISMATCH',
      sheetRow: targetRowIndex,
      fields: [
        {
          name: 'Buying Office / Khách hàng',
          key: 'buyingOffice',
          img: formData.buyingOffice || 'THE NORTH FACE',
          spec: 'THE NORTH FACE',
          match: true,
          isNum: false,
          note: 'Áp dụng quy tắc kiểm tra cấu trúc Combo The North Face trên Google Sheet'
        },
        {
          name: 'Mã GLID chính trên Sheet',
          key: 'glid',
          img: glid,
          spec: `Hàng ${targetRowIndex} (Combo: ${sheetComboCode || formData.itemCode})`,
          match: true,
          isNum: false,
          note: `Tìm thấy trên Google Sheet tại hàng ${targetRowIndex}`
        },
        {
          name: 'Sub Contract Details (Mã Cover X=)',
          key: 'coverCode',
          img: coverCode ? `X=${coverCode}` : '(Trống)',
          spec: sheetCoverGlid || '(Trống)',
          match: coverMatch,
          isNum: false,
          note: coverNote
        },
        {
          name: 'GLID Sub (Mã nhãn phụ/Insert)',
          key: 'glidSub',
          img: subCodes.join('; ') || '(Trống)',
          spec: sheetInsertGlids.join('; ') || '(Trống)',
          match: subsMatch,
          isNum: false,
          note: subNote
        },
        {
          name: 'Số lượng nhãn Combo (SET pcs)',
          key: 'setQuantity',
          img: `Gồm ${1 + subCodes.length} item`,
          spec: sheetPcs ? `${sheetPcs} pcs` : '(Trống)',
          match: true,
          isNum: true,
          note: `Số lượng thành phần nhãn combo: ${sheetPcs || (1 + subCodes.length)} nhãn`
        },
        {
          name: 'Quy cách Combo (Ship cùng nhãn)',
          key: 'comboShipment',
          img: `Phải ship cùng hàng trên Sheet`,
          spec: `Hàng ${targetRowIndex}`,
          match: allMatch,
          isNum: false,
          note: shipmentNote
        }
      ]
    };
  }
}

module.exports = { TnfSheetChecker, TNF_SHEET_URL };
