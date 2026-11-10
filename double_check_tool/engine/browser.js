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
      console.warn(`Browser not reachable on port ${this.port}.`);
      throw new Error(`Chrome remote debugging port ${this.port} is not running. Please make sure Google Chrome is running with --remote-debugging-port=${this.port}`);
    }
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

