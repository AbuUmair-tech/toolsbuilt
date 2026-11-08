#!/usr/bin/env node
/**
 * Captures the header language picker, open, on desktop and phone in light and dark themes.
 *
 * Usage: node scripts/capture-i18n-screenshots.js [baseUrl]
 *   baseUrl  defaults to http://localhost:8080 (npm run dev). To show every language in the
 *            list rather than only the enabled ones, build or serve with I18N_MENU_PREVIEW=1.
 *
 * Output: docs/screenshots/i18n/language-menu-<width>-<theme>.png
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'i18n');
const BASE_URL = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const VIEWPORTS = [
  { width: 1280, height: 720, mobile: false },
  { width: 375, height: 812, mobile: true }
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.mobile,
          hasTouch: vp.mobile,
          colorScheme: theme,
          deviceScaleFactor: 1
        });
        // Hide the cookie banner and keep the chosen theme
        await context.addInitScript(t => {
          try {
            localStorage.setItem('tb_cookie_consent', 'rejected');
            localStorage.setItem('theme', t);
          } catch (e) {}
        }, theme);
        const page = await context.newPage();
        await page.goto(`${BASE_URL}/tools/percentage-change-calculator/`, { waitUntil: 'networkidle' });
        await page.click('#language-menu-trigger');
        await page.waitForSelector('#language-menu-panel:not([hidden])');
        const file = path.join(OUT_DIR, `language-menu-${vp.width}-${theme}.png`);
        await page.screenshot({ path: file, clip: vp.mobile ? undefined : { x: 0, y: 0, width: vp.width, height: 560 } });
        console.log(`Saved ${path.relative(ROOT, file)}`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
