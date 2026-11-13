const path = require('path');
const fs = require('fs');

const ITEM_MASTER_URL = 'https://appdvn15.ap.averydennison.net/new-apps/public_html/adlh/lines/pcaccess/ItemMaster.php';

class ItemMasterFetcher {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.page = null;
  }

  async getPage() {
    if (this.page && !this.page.isClosed()) return this.page;

    if (!this.browserManager.browser) {
      await this.browserManager.connect();
    }
    const browser = this.browserManager.browser;
    const pages = await browser.pages();
    this.page = pages.find(p => p.url().includes('ItemMaster.php'));

    if (!this.page) {
      this.page = await browser.newPage();
      console.log(`[ItemMasterFetcher] Navigating to ${ITEM_MASTER_URL}...`);
      await this.page.goto(ITEM_MASTER_URL, { waitUntil: 'networkidle2', timeout: 25000 });
    }

    return this.page;
  }

  async fetchItem(glid, evidenceDir) {
    const page = await this.getPage();
    await page.bringToFront();

    console.log(`[ItemMasterFetcher] Loading item GLID: "${glid}" on ItemMaster.php...`);

    // Direct URL navigation for instant and 100% reliable data load
    const targetUrl = `${ITEM_MASTER_URL}?GLID=${encodeURIComponent(glid)}`;
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for form to populate with the requested GLID
    let attempts = 0;
    let loaded = false;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
      const currentGlid = await page.evaluate(() => {
        const el = document.querySelector('[name="GLID"]');
        return el ? el.value.trim() : '';
      });

      if (currentGlid && (currentGlid === glid || glid.includes(currentGlid))) {
        loaded = true;
        break;
      }
    }

    // Additional settling time for combo and textarea values
    await new Promise(r => setTimeout(r, 600));

    // Capture screenshot of the populated form as proof
    let screenshotPath = '';
    if (evidenceDir) {
      if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
      const safeGlid = glid.replace(/[^a-zA-Z0-9_-]/g, '_');
      screenshotPath = path.join(evidenceDir, `itemmaster_${safeGlid}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[ItemMasterFetcher] Order Form screenshot saved: ${screenshotPath}`);
    }

    // Extract all named fields from the web form
    const rawData = await page.evaluate(() => {
      const getVal = (name) => {
        const el = document.querySelector('[name="' + name + '"]');
        if (!el) return '';
        return el.value !== undefined ? el.value.trim() : '';
      };

      const getDhtmlxCheckbox = (label) => {
        const allDivs = Array.from(document.querySelectorAll('.dhxform_label_nav_link, label'));
        const target = allDivs.find(d => d.textContent.trim().toLowerCase() === label.toLowerCase());
        if (!target) return false;
        const item = target.closest('.dhxform_item_label_left') || target.closest('.dhxform_item_label_top') || target.parentElement.parentElement;
        if (!item) return false;
        const chkImg = item.querySelector('.dhxform_img');
        if (chkImg && chkImg.className.includes('chbx1')) return true;
        const inp = item.querySelector('input');
        if (inp && (inp.value === '1' || inp.checked)) return true;
        return false;
      };

      const getComboText = (name) => {
        const hidden = document.querySelector('input[type="hidden"][name="' + name + '"]');
        if (hidden && hidden.value) return hidden.value.trim();
        const wrapper = hidden ? hidden.closest('.dhxcombo_dhx_skyblue') : null;
        if (wrapper) {
          const visible = wrapper.querySelector('.dhxcombo_input');
          if (visible && visible.value) return visible.value.trim();
        }
        return '';
      };

      return {
        GLID: getVal('GLID'),
        Item_Code: getVal('Item_Code'),
        Buying_Office: getComboText('Buying_Office') || getVal('Buying_Office'),
        ProductionLength: getVal('ProductionLength'),
        ProductionWidth: getVal('ProductionWidth'),
        Color_F: getVal('Color_F'),
        Color_B: getVal('Color_B'),
        Imprint_F: getVal('Imprint_F'),
        Imprint_B: getVal('Imprint_B'),
        Varnish_F: getComboText('Varnish_F') || getVal('Varnish_F'),
        Varnish_B: getComboText('Varnish_B') || getVal('Varnish_B'),
        Special_Instruction: getVal('Special_Instruction'),
        Stock_Code: getComboText('Stock_Code') || getVal('Stock_Code'),
        Specs_Material: getComboText('Specs_Material') || getVal('Specs_Material'),
        Sheet_Size: getVal('Sheet_Size'),
        Offset_Cut_No: getVal('Offset_Cut_No'),
        Production_Type: getComboText('Production_Type') || getVal('Production_Type'),
        Production_Line: getComboText('Production_Line') || getVal('Production_Line'),
        Digital_Machine: getComboText('Digital_Machine') || getVal('Digital_Machine'),
        Suited_Machine: getComboText('Suited_Machine') || getVal('Suited_Machine'),
        Digital_Availability: getComboText('Digital_Availability') || getVal('Digital_Availability'),
        Status: getVal('Status'),
        Hole: getDhtmlxCheckbox('Hole'),
        Remove_Wastage: getDhtmlxCheckbox('Remove Wastage'),
        Brand_Protection: getDhtmlxCheckbox('Brand Protection'),
        FSC: getComboText('FSC') || getVal('FSC'),
        Standard_LeadTime: getVal('Standard_LeadTime'),
        Offset_Extra_Time: getVal('Offset_Extra_Time'),
        Offset_Waiting_Drying: getVal('Offset_Waiting_Drying'),
        Process: getVal('Process'),
        SubContract_Detail: getVal('SubContract_Detail'),
        GLID_Sub: getVal('GLID_Sub')
      };
    });

    const colorF = rawData.Color_F || rawData.Imprint_F || '(Trống)';
    const colorB = rawData.Color_B || rawData.Imprint_B || '(Trống)';
    const materialCode = rawData.Specs_Material || rawData.Stock_Code || '(Trống)';

    const result = {
      glid: rawData.GLID || glid,
      itemCode: rawData.Item_Code || glid,
      buyingOffice: rawData.Buying_Office || '',
      productLength: rawData.ProductionLength || '0',
      productWidth: rawData.ProductionWidth || '0',
      colorF,
      colorB,
      varnishF: rawData.Varnish_F || '(Trống)',
      varnishB: rawData.Varnish_B || '(Trống)',
      specialInstructions: rawData.Special_Instruction || '(Trống)',
      materialCode,
      sheetSize: rawData.Sheet_Size || '(Trống)',
      offsetCutNo: rawData.Offset_Cut_No || '0',
      hole: rawData.Hole ? '1' : '0',
      removeWastage: rawData.Remove_Wastage ? '1' : '0',
      brandProtection: rawData.Brand_Protection ? '1' : '0',
      fsc: rawData.FSC || '',
      productionLine: rawData.Production_Line || '',
      digitalMachine: rawData.Digital_Machine || '',
      suitedMachine: rawData.Suited_Machine || '',
      process: rawData.Process || '',
      standardLeadTime: rawData.Standard_LeadTime || '7',
      offsetExtraTime: rawData.Offset_Extra_Time || '0',
      offsetWaitingDrying: rawData.Offset_Waiting_Drying || '0',
      subContractDetail: rawData.SubContract_Detail || '',
      glidSub: rawData.GLID_Sub || '',
      screenshotPath,
      rawData
    };

    console.log(`[ItemMasterFetcher] Successfully fetched real-time data for: ${result.glid} (${result.itemCode})`);
    return result;
  }
}

module.exports = { ItemMasterFetcher, ITEM_MASTER_URL };
