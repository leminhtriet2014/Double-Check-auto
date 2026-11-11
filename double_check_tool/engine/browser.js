const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Locate puppeteer from local node_modules or global/cache fallback
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  const npxPuppeteerPath = 'C:/Users/1221390/AppData/Local/npm-cache/_npx/ab5cd9f6d13a2312/node_modules/puppeteer';
  if (fs.existsSync(npxPuppeteerPath)) {
    puppeteer = require(npxPuppeteerPath);
  } else {
    try {
      puppeteer = require('puppeteer-core');
    } catch (errCore) {
      console.error('Puppeteer not found. Please run "npm install puppeteer" in double_check_tool directory.');
    }
  }
}

const DEFAULT_PORT = 9222;
const USER_DATA_DIR = path.resolve(__dirname, '../../puppeteer_profile');
const WEB_APP_URL = 'https://script.google.com/a/macros/ap.averydennison.com/s/AKfycbxLH9vhzIGH6esLl33mvsHfXt9M5T9CoeP3wX9hECjdKgCjrVXmpvp_tVVj4xp7f7Zxjg/exec';

class BrowserManager {
  constructor(port = DEFAULT_PORT) {
    this.port = port;
    this.browser = null;
  }

  async connect() {
    try {
      this.browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${this.port}`,
        defaultViewport: null
      });
      return this.browser;
    } catch (err) {
      console.warn(`Browser not reachable on port ${this.port}. Attempting auto-start Chrome...`);
      const started = await this.tryAutoStartChrome();
      if (started) {
        return this.browser;
      }
      throw new Error(`Chrome remote debugging port ${this.port} is not running.\n👉 Vui lòng nhấp đúp chạy file "1_Open_Chrome_Debug.bat" trên màn hình để mở Chrome trước khi chạy đối soát!`);
    }
  }

  async tryAutoStartChrome() {
    const candidatePaths = [
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];
    const chromeExe = candidatePaths.find(p => fs.existsSync(p));
    if (!chromeExe) return false;

    try {
      const args = [
        `--remote-debugging-port=${this.port}`,
        `--user-data-dir=${USER_DATA_DIR}`,
        '--remote-allow-origins=*',
        '--no-first-run',
        '--no-default-browser-check',
        WEB_APP_URL
      ];
      const child = spawn(chromeExe, args, {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Poll for up to 6 seconds for Chrome to start and open debug port
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500));
        try {
          this.browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${this.port}`,
            defaultViewport: null
          });
          if (this.browser) {
            console.log(`Successfully auto-started Chrome and connected on port ${this.port}`);
            return true;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Failed to auto-start Chrome:', e.message);
    }
    return false;
  }

  async getSearchFrame() {
    if (!this.browser) await this.connect();
    const pages = await this.browser.pages();
    let page = pages.find(p => p.url().includes('script.google.com'));
    
    if (!page) {
      console.log('Google Apps Script tab not found, navigating existing or new tab...');
      page = pages[0] || await this.browser.newPage();
      await page.goto(WEB_APP_URL, { waitUntil: 'networkidle2' });
    }

    // Wait for the iframe
    let frame = null;
    for (let i = 0; i < 15; i++) {
      frame = page.frames().find(f => f.name() === 'userHtmlFrame');
      if (frame) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!frame) {
      throw new Error('userHtmlFrame not found on Google Apps Script page. Please ensure you are logged into your Google account.');
    }

    return { page, frame };
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
    }
  }
}

module.exports = { BrowserManager, puppeteer };

