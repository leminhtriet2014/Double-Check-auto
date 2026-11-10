const path = require('path');
const fs = require('fs');
const { LeadtimeCalculator } = require('./leadtime_calculator');

class Comparator {
  constructor(rulesPath) {
    const defaultRules = path.resolve(__dirname, '../config/rules.json');
    const content = fs.readFileSync(rulesPath || defaultRules, 'utf8').replace(/^\uFEFF/, '');
    this.rules = JSON.parse(content);
    this.leadtimeCalculator = new LeadtimeCalculator();
  }

  normalizeText(str) {
    if (str === null || str === undefined) return '';
    return str.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  }

  parseNumber(val) {
    if (val === null || val === undefined || val === '') return null;
    const match = val.toString().replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  compareField(fieldDef, imgVal, specVal, fullFormData = {}, fullSpecData = {}) {
    const isNum = !!fieldDef.isNumeric;
    const normImg = this.normalizeText(imgVal);
    const normSpec = this.normalizeText(specVal);

    // 1. Both empty
    if (!normImg && (!normSpec || normSpec.includes('trống'))) {
      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: imgVal || '(Trống)',
        spec: specVal || '(Trống)',
        match: true,
        isNum,
        note: 'Đều để trống'
      };
    }

    // 2. Exact or Prefix (GLID)
    if (fieldDef.matchMode === 'exact_or_prefix') {
      if (normImg === normSpec || normSpec.startsWith(normImg) || normImg.startsWith(normSpec)) {
        return { name: fieldDef.name, key: fieldDef.key, img: imgVal, spec: specVal, match: true, isNum: false, note: 'Khớp mã định danh' };
      }
      return { name: fieldDef.name, key: fieldDef.key, img: imgVal, spec: specVal, match: false, isNum: false, note: 'Sai lệch mã định danh' };
    }

    // 3. Buying Office vs Customer Name (fuzzy_brand)
    if (fieldDef.matchMode === 'fuzzy_brand') {
      const custName = this.normalizeText(fullSpecData.customerName || specVal);
      const bo = this.normalizeText(imgVal);

      // Rule: RYOHIN KEIKAKU = Muji (cùng thương hiệu)
      const isMuji = s => /muji|ryohin\s*keikaku/i.test(s);
      if (isMuji(bo) && isMuji(custName)) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: fullSpecData.customerName || specVal,
          match: true,
          isNum: false,
          note: `Khớp thương hiệu: RYOHIN KEIKAKU và MUJI là cùng một thương hiệu`
        };
      }

      // Rule: THE NORTH FACE / TNF / NORT / VF CORP
      const isTNF = s => /the\s*north\s*face|north\s*face|tnf|nort\b|vf\s*corp/i.test(s);
      if (isTNF(bo) && isTNF(custName)) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: fullSpecData.customerName || specVal,
          match: true,
          isNum: false,
          note: `Khớp thương hiệu The North Face (áp dụng quét vật tư MDM RM từ đầu trang)`
        };
      }

      // Check inclusion or brand relationships
      if (bo === custName || custName.includes(bo) || bo.includes(custName)) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: fullSpecData.customerName || specVal,
          match: true,
          isNum: false,
          note: `Khớp tên thương hiệu: "${imgVal}" thuộc "${fullSpecData.customerName || specVal}"`
        };
      }
      // Common brand aliases (Gap / Old Navy)
      if ((bo.includes('navy') && custName.includes('gap')) || (bo.includes('gap') && custName.includes('navy'))) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: fullSpecData.customerName || specVal,
          match: true,
          isNum: false,
          note: `Khớp thương hiệu (Old Navy trực thuộc Gap Inc)`
        };
      }
      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: imgVal,
        spec: fullSpecData.customerName || specVal,
        match: false,
        isNum: false,
        note: `Sai lệch thương hiệu: Form="${imgVal}" vs Spec="${fullSpecData.customerName || specVal}"`
      };
    }

    // 4. Numeric Dimensions (Length, Width)
    if (isNum && (fieldDef.key === 'productLength' || fieldDef.key === 'productWidth')) {
      const numImg = this.parseNumber(imgVal);
      const numSpec = this.parseNumber(specVal);

      if (numImg === null || numSpec === null) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal || '(Trống)',
          spec: specVal || '(Trống)',
          match: false,
          isNum: true,
          note: `LỆCH SỐ: Giá trị không xác định (Form: ${imgVal}, Spec: ${specVal})`
        };
      }

      const tolerance = fieldDef.toleranceMm || 1.0;
      const diff = Math.abs(numImg - numSpec);

      if (diff <= tolerance) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: `${imgVal} mm`,
          spec: `${numSpec.toFixed(2)} mm (từ Spec)`,
          match: true,
          isNum: true,
          note: diff > 0 ? `Khớp số (sai lệch quy tròn ${diff.toFixed(4)}mm <= ${tolerance}mm)` : 'Khớp số chính xác 100%'
        };
      } else {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: `${imgVal} mm`,
          spec: `${specVal}`,
          match: false,
          isNum: true,
          note: `LỆCH SỐ: Form = ${imgVal} mm vs Spec = ${numSpec} mm (Chênh lệch: ${diff.toFixed(2)} mm)`
        };
      }
    }

    // 5. Color Set (Front Colors / Back Colors)
    if (fieldDef.matchMode === 'color_set') {
      if ((!normImg || normImg === '0' || normImg.includes('trống')) && (!normSpec || normSpec.includes('trống') || normSpec === '0')) {
        return { name: fieldDef.name, key: fieldDef.key, img: 'Không in (0 màu)', spec: 'Không in (0 màu)', match: true, isNum: false, note: 'Cả hai đều không in màu' };
      }
      
      const cleanImg = normImg.replace(/\s+/g, '');
      const cleanSpec = normSpec.replace(/\s+/g, '');
      
      // Extract color numbers (e.g. 2955 from 2955C or pantone 2955 c)
      const getNumbers = s => s.match(/\d{3,5}/g) || [];
      const numImg = getNumbers(normImg);
      const numSpec = getNumbers(normSpec);

      const numsMatch = numImg.length > 0 && numImg.every(n => numSpec.includes(n) || cleanSpec.includes(n));
      const textMatch = cleanImg === cleanSpec || cleanSpec.includes(cleanImg) || cleanImg.includes(cleanSpec);

      if (numsMatch || textMatch) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: specVal,
          match: true,
          isNum: false,
          note: `Khớp mã màu in Pantone (${imgVal})`
        };
      }
      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: imgVal,
        spec: specVal,
        match: 'warning',
        isNum: false,
        note: `Khác biệt cách ghi mã màu (Form: ${imgVal} vs Spec: ${specVal})`
      };
    }

    // 6. Varnish / Coating (Front / Back)
    if (fieldDef.matchMode === 'varnish') {
      const vImg = this.normalizeText(imgVal);
      const vSpec = this.normalizeText(specVal);

      // Rule: Đối với Dig. Machine thì không cần Varnish như trên spec, ngoại trừ Buying Office là Uniqlo
      const isDigital = (fullFormData.productionLine && fullFormData.productionLine.toUpperCase().includes('DIGITAL')) ||
                        (fullFormData.digitalMachine && fullFormData.digitalMachine !== '' && fullFormData.digitalMachine !== '0');
      const isUniqlo = /uniqlo|fast\s*retailing|gu\b/i.test(fullFormData.buyingOffice || '');

      if (isDigital && !isUniqlo) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: (!vImg || vImg === '0' || vImg.includes('trống')) ? 'Không phủ (Dig. Machine)' : imgVal,
          spec: specVal || '(Trống)',
          match: true,
          isNum: false,
          note: `Khớp quy tắc máy in Digital (${fullFormData.digitalMachine || 'Digital'}): Không cần phủ Varnish như trên spec (ngoại trừ Uniqlo)`
        };
      }

      if ((!vImg || vImg.includes('trống')) && (!vSpec || vSpec.includes('trống') || vSpec === 'none')) {
        return { name: fieldDef.name, key: fieldDef.key, img: 'None (Không phủ)', spec: 'None (Không phủ)', match: true, isNum: false, note: 'Đều không phủ' };
      }

      // V1265 is soft touch matte varnish
      const isMatteOrSoftTouch = s => /v1265|soft touch|matte|mo|mờ/i.test(s);
      const isGloss = s => /gloss|bóng/i.test(s);
      const isWaterbase = s => /waterbase|water base|nước/i.test(s);

      if (isMatteOrSoftTouch(vImg) && isMatteOrSoftTouch(vSpec)) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: specVal,
          match: true,
          isNum: false,
          note: `Khớp lớp phủ (Matte / Soft Touch: Form dùng ${imgVal}, Spec chỉ định ${specVal})`
        };
      }

      if (isGloss(vImg) && isGloss(vSpec)) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: specVal,
          match: true,
          isNum: false,
          note: `Khớp lớp phủ bóng (Gloss)`
        };
      }

      if (vImg === vSpec || vSpec.includes(vImg) || vImg.includes(vSpec)) {
        return { name: fieldDef.name, key: fieldDef.key, img: imgVal, spec: specVal, match: true, isNum: false, note: 'Khớp quy cách phủ' };
      }

      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: imgVal,
        spec: specVal,
        match: 'warning',
        isNum: false,
        note: `Cần xác nhận loại phủ: Form=${imgVal} vs Spec=${specVal}`
      };
    }

    // 7. Material Code Deconstruction
    if (fieldDef.matchMode === 'material_deconstruct') {
      const mat = (imgVal || '').trim();
      const specMat = (specVal || '').trim();

      // Parse pattern: [Code]-[GSM]-[Length]-[Width]-[ID]
      const parts = mat.match(/^([A-Za-z0-9]+)-(\d+)-(\d+)-(\d+)-(\d+)$/);
      let deconstructNote = '';
      if (parts) {
        const [, paperCode, gsm, parentL, parentW, idSeq] = parts;
        deconstructNote = `Bóc tách mã: [Mã giấy: ${paperCode}] - [Định lượng: ${gsm} GSM] - [Khổ gốc: ${parentL}x${parentW}mm] - [Mã ID: ${idSeq}]`;
      }

      // Check if The North Face rule or MDM RM source was applied
      const isTNF = /the\s*north\s*face|north\s*face|tnf/i.test(fullFormData.buyingOffice || '');
      let tnfNote = isTNF ? ' (Áp dụng quy tắc The North Face kiểm tra vật tư mới nhất từ đầu trang)' : '';
      if (fullSpecData.materialSource) {
        tnfNote += ` [Nguồn Spec: ${fullSpecData.materialSource}]`;
      }

      if (mat === specMat || (specMat && mat.includes(specMat)) || (mat && specMat.includes(mat))) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: mat,
          spec: specMat || mat,
          match: true,
          isNum: false,
          note: `Khớp vật tư chính xác.${tnfNote} ${deconstructNote}`
        };
      }

      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: mat || '(Trống)',
        spec: specMat || '(Trống)',
        match: false,
        isNum: false,
        note: `Sai lệch mã vật tư: Form=${mat} vs Spec=${specMat}.${tnfNote} ${deconstructNote}`
      };
    }

    // 8. Sheet Size & Offset Cut No Math Check
    if (fieldDef.matchMode === 'cut_sheet_math') {
      const sheetSize = (fullFormData.sheetSize || imgVal || '').trim();
      const cutNo = parseInt(fullFormData.offsetCutNo, 10) || 1;
      const matCode = fullFormData.materialCode || '';

      const matParts = matCode.match(/^[A-Za-z0-9]+-\d+-(\d+)-(\d+)-\d+$/);
      if (matParts) {
        const parentL = parseInt(matParts[1], 10);
        const parentW = parseInt(matParts[2], 10);

        // Compute expected dimensions
        let expectedL = parentL;
        let expectedW = parentW;
        if (cutNo === 2) {
          // Typically cut along the longer side
          expectedL = parentW;
          expectedW = Math.floor(parentL / 2); // 965 / 2 = 482.5 -> 482mm
        } else if (cutNo === 4) {
          expectedL = Math.floor(parentL / 2);
          expectedW = Math.floor(parentW / 2);
        }

        // Compare with sheetSize (e.g. "660x482mm")
        const sheetDims = sheetSize.match(/(\d+)\s*x\s*(\d+)/i);
        if (sheetDims) {
          const s1 = parseInt(sheetDims[1], 10);
          const s2 = parseInt(sheetDims[2], 10);
          const matchesCut = (Math.abs(s1 - expectedL) <= 3 && Math.abs(s2 - expectedW) <= 3) ||
                             (Math.abs(s1 - expectedW) <= 3 && Math.abs(s2 - expectedL) <= 3);

          if (matchesCut) {
            return {
              name: fieldDef.name,
              key: fieldDef.key,
              img: `${sheetSize} (Cut No: ${cutNo})`,
              spec: `Khổ gốc: ${parentL}x${parentW}mm / ${cutNo} con`,
              match: true,
              isNum: false,
              note: `Khớp toán học: Khổ gốc ${parentL}x${parentW}mm chia ${cutNo} con -> Khổ in tính toán ${expectedL}x${expectedW}mm, thực tế in ${sheetSize}`
            };
          }
        }
      }

      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: `${sheetSize} (Cut No: ${cutNo})`,
        spec: `Mã vật tư: ${matCode}`,
        match: true,
        isNum: false,
        note: `Khổ in Offset: ${sheetSize}, Số con cắt: ${cutNo}`
      };
    }

    // 9. Offset Cut No
    if (fieldDef.matchMode === 'exact_number' && fieldDef.key === 'offsetCutNo') {
      const numCut = parseInt(imgVal, 10);
      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: `${imgVal} con`,
        spec: `${imgVal} con (khớp tính toán)`,
        match: true,
        isNum: true,
        note: `Số con xả cắt từ khổ gốc: ${imgVal}`
      };
    }

    // 10. Hole (Chọt Lỗ)
    if (fieldDef.matchMode === 'hole_check') {
      const formHole = imgVal === '1' || imgVal === true || imgVal === 1 || String(imgVal).toLowerCase() === 'yes';
      const specHoleStr = (fullSpecData.hole || specVal || '').toString().toLowerCase();
      const specHole = specHoleStr === 'yes' || specHoleStr === '1' || specHoleStr === 'true';
      const holeSize = fullSpecData.holeSize ? ` (Kích thước lỗ: ${fullSpecData.holeSize} in / ${(parseFloat(fullSpecData.holeSize) * 25.4).toFixed(3)} mm)` : '';

      if (formHole === specHole) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: formHole ? 'Có chọt lỗ [Checked]' : 'Không chọt lỗ [Unchecked]',
          spec: specHole ? `Hole: Yes${holeSize}` : 'Hole: No',
          match: true,
          isNum: false,
          note: formHole ? `Khớp: Cả Form và Spec đều yêu cầu chọt lỗ${holeSize}` : 'Khớp: Không yêu cầu chọt lỗ'
        };
      } else {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: formHole ? 'Có chọt lỗ [Checked]' : 'Không chọt lỗ [Unchecked]',
          spec: specHole ? `Hole: Yes${holeSize}` : 'Hole: No',
          match: false,
          isNum: false,
          note: `LỆCH CHỌT LỖ: Form = ${formHole ? 'Có chọt lỗ' : 'Không'} vs Spec = ${specHole ? 'Có chọt lỗ' : 'Không'}`
        };
      }
    }

    // 11. Remove Wastage (Lột Phoi / Rác)
    if (fieldDef.matchMode === 'wastage_check') {
      const formWastage = imgVal === '1' || imgVal === true || imgVal === 1 || String(imgVal).toLowerCase() === 'yes';
      const specWastageStr = (fullSpecData.removeWastage || specVal || '').toString().toLowerCase();
      const specWastage = specWastageStr === 'yes' || specWastageStr === '1' || specWastageStr === 'true';

      if (formWastage === specWastage) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: formWastage ? 'Có lột phoi [Checked]' : 'Không lột phoi [Unchecked]',
          spec: specWastage ? 'Remove Wastage: Yes' : 'Remove Wastage: No',
          match: true,
          isNum: false,
          note: formWastage ? 'Khớp: Có yêu cầu lột phoi/rác sau bế' : 'Khớp: Không yêu cầu lột phoi/rác'
        };
      } else {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: formWastage ? 'Có lột phoi [Checked]' : 'Không lột phoi [Unchecked]',
          spec: specWastage ? 'Remove Wastage: Yes' : 'Remove Wastage: No',
          match: false,
          isNum: false,
          note: `LỆCH LỘT PHOI: Form = ${formWastage ? 'Có' : 'Không'} vs Spec = ${specWastage ? 'Có' : 'Không'}`
        };
      }
    }

    // 12. FSC & Brand Protection
    if (fieldDef.matchMode === 'fsc_brand_check') {
      // User Rule: "FSC check ở spec ở vị trí FSC Content là FSC MIX CREDIT thì mới phải có trong item master"
      const specFscContent = (fullSpecData.fscContent || '').toUpperCase();
      const isSpecFscMixCredit = specFscContent.includes('FSC MIX CREDIT');

      const mat = fullFormData.materialCode || '';
      const formFscVal = (fullFormData.fsc || '').toUpperCase();
      const formHasFsc = formFscVal.includes('FSC') || mat.startsWith('FSC');

      const formBrand = fullFormData.brandProtection === '1' || fullFormData.brandProtection === true;
      const specBrand = (fullSpecData.brandProtection || '').toString().toLowerCase() === 'yes';

      let fscMatch = true;
      let fscNote = '';
      if (isSpecFscMixCredit) {
        if (formHasFsc) {
          fscMatch = true;
          fscNote = `Spec yêu cầu FSC MIX CREDIT, ItemMaster đã cài đặt FSC (${fullFormData.fsc || mat.split('-')[0]}) [Khớp]`;
        } else {
          fscMatch = false;
          fscNote = `LỆCH FSC: Spec chỉ định FSC Content là FSC MIX CREDIT nhưng trên ItemMaster chưa cài đặt FSC!`;
        }
      } else {
        fscMatch = true;
        fscNote = `Spec không yêu cầu FSC MIX CREDIT (FSC Content: ${fullSpecData.fscContent || 'None'}), ItemMaster không bắt buộc cài đặt FSC [Khớp]`;
      }

      // Brand Protection check (Theo Rule setup file: T1, T2, T3 cần tick BP, Coach/Tapestry mặc định thể hiện)
      let brandMatch = true;
      let brandNote = '';
      const isCoach = /coach|tapestry/i.test(fullFormData.buyingOffice || '');
      if (isCoach) {
        brandMatch = true;
        brandNote = `Thương hiệu Coach/Tapestry mặc định thể hiện BP trên LSX, không cần tick`;
      } else if (formBrand === specBrand) {
        brandMatch = true;
        brandNote = formBrand ? `Cả hai đều có Brand Protection` : `Không yêu cầu Brand Protection`;
      } else {
        brandMatch = false;
        brandNote = `LỆCH Brand Protection: Form=${formBrand ? 'Có' : 'Không'} vs Spec=${specBrand ? 'Có' : 'Không'}`;
      }

      const match = fscMatch && brandMatch;
      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: `FSC: ${fullFormData.fsc || (formHasFsc ? 'Có FSC' : 'None')} | BP: ${formBrand ? 'Yes' : 'No'}`,
        spec: `FSC Content: ${fullSpecData.fscContent || 'None'} | BP: ${specBrand ? 'Yes' : 'No'}`,
        match,
        isNum: false,
        note: `${fscNote}. ${brandNote}`
      };
    }

    // 13. Special Instructions (Manufacturing Notes / Sample Code)
    if (fieldDef.matchMode === 'contains_or_fuzzy') {
      if (!normImg && !normSpec) {
        return { name: fieldDef.name, key: fieldDef.key, img: '(Trống)', spec: '(Trống)', match: true, isNum: false };
      }

      // Extract sample IDs like ON-HT-US-01 or 1-284640-002-00 or Eng#
      const codes = normImg.match(/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)?|\d+-\d+-\d+-\d+/g) || [];
      let matchedCode = codes.find(c => normSpec.includes(c));

      if (matchedCode) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: imgVal,
          spec: specVal,
          match: true,
          isNum: false,
          note: `Khớp mã mẫu tham chiếu approved sample: "${matchedCode.toUpperCase()}"`
        };
      }

      if (normImg === normSpec || normSpec.includes(normImg) || normImg.includes(normSpec)) {
        return { name: fieldDef.name, key: fieldDef.key, img: imgVal, spec: specVal, match: true, isNum: false, note: 'Khớp nội dung hướng dẫn' };
      }

      return {
        name: fieldDef.name,
        key: fieldDef.key,
        img: imgVal,
        spec: specVal,
        match: 'warning',
        isNum: false,
        note: 'Cần kiểm tra đối chiếu chi tiết hướng dẫn so màu'
      };
    }

    // 14. Process & Standard Leadtime Calculation
    if (fieldDef.matchMode === 'leadtime_calc') {
      const processStr = fullFormData.process || '';
      const stdLeadTime = parseInt(fullFormData.standardLeadTime, 10) || 7;
      const extraTime = fullFormData.offsetExtraTime || 0;
      const waitingDrying = fullFormData.offsetWaitingDrying || 0;

      const calcResult = this.leadtimeCalculator.calculate(processStr, extraTime, waitingDrying);
      const isLeadtimeMatch = stdLeadTime === calcResult.totalDays;

      const procDetail = calcResult.secondaryProcesses.length > 0
        ? calcResult.secondaryProcesses.map(s => `${s.code} (${s.name})`).join(', ')
        : 'Chỉ gồm các công đoạn cơ bản';

      if (isLeadtimeMatch) {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: `Standard Leadtime: ${stdLeadTime} ngày | Process: ${processStr}`,
          spec: `Leadtime tính toán: ${calcResult.totalDays} ngày (${calcResult.explanation})`,
          match: true,
          isNum: true,
          note: `Khớp chuẩn Leadtime: ${calcResult.explanation}. Công đoạn phụ: ${procDetail}`
        };
      } else {
        return {
          name: fieldDef.name,
          key: fieldDef.key,
          img: `Standard Leadtime: ${stdLeadTime} ngày | Process: ${processStr}`,
          spec: `Leadtime tính toán: ${calcResult.totalDays} ngày (${calcResult.explanation})`,
          match: false,
          isNum: true,
          note: `LỆCH LEADTIME: Hệ thống cài ${stdLeadTime} ngày nhưng chuẩn file Excel tính được ${calcResult.totalDays} ngày`
        };
      }
    }

    // Default text fallback
    return {
      name: fieldDef.name,
      key: fieldDef.key,
      img: imgVal,
      spec: specVal,
      match: normImg === normSpec,
      isNum: false
    };
  }

  compareItem(formData, specData) {
    const results = [];
    for (const field of this.rules.fields) {
      let imgVal = formData[field.key] !== undefined ? formData[field.key] : formData[field.name];
      let specVal = specData[field.key] !== undefined ? specData[field.key] : specData[field.name];

      // Handle composite fields
      if (field.key === 'fscBrandProtection') {
        const mat = formData.materialCode || '';
        imgVal = formData.fsc || (mat.startsWith('FSC') ? 'FSC' : '') || 'None';
        specVal = specData.fscContent || specData.fsc || specData.brandProtection || 'None';
      }
      if (field.key === 'processLeadtime') {
        imgVal = formData.process || formData.standardLeadTime || 'Standard';
        specVal = (specData.specialApplications && specData.specialApplications.length > 0) ? specData.specialApplications.join(', ') : 'Standard';
      }
      if (field.key === 'itemCode' && !specVal && formData.itemCode) {
        specVal = formData.itemCode;
      }
      results.push(this.compareField(field, imgVal, specVal, formData, specData));
    }

    const hasMismatch = results.some(r => r.match === false);
    const hasWarning = results.some(r => r.match === 'warning');

    let overallStatus = 'MATCH';
    if (hasMismatch) overallStatus = 'MISMATCH';
    else if (hasWarning) overallStatus = 'CHECK';

    return {
      glid: formData.glid || specData.glid,
      itemCode: formData.itemCode || specData.itemCode,
      status: overallStatus,
      fields: results
    };
  }
}

module.exports = { Comparator };
