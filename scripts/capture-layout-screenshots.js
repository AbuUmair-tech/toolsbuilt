const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'global-layout');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function createServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
  };

  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0].split('#')[0];
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    } else if (!path.extname(reqPath)) {
      reqPath += '/index.html';
    }

    const filePath = path.join(SITE_DIR, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });
}

async function capture() {
  const server = createServer();
  await new Promise(resolve => server.listen(8088, resolve));
  console.log('Screenshot server listening on http://localhost:8088');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const themes = ['light', 'dark'];

  try {
    for (const theme of themes) {
      // 1. Homepage & Tool Page (Desktop 1280px)
      const dContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        colorScheme: theme
      });
      const dPage = await dContext.newPage();
      await dPage.addInitScript((th) => {
        try {
          localStorage.setItem('theme', th);
          document.documentElement.setAttribute('data-theme', th);
        } catch (e) {}
      }, theme);

      // Homepage (1280px)
      await dPage.goto('http://localhost:8088/', { waitUntil: 'networkidle' });
      await dPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await dPage.waitForTimeout(200);
      await dPage.screenshot({ path: path.join(OUT_DIR, `homepage-1280-${theme}.png`), fullPage: true });
      console.log(`Captured: homepage-1280-${theme}.png`);

      // Tool: Age Calculator (1280px)
      await dPage.goto('http://localhost:8088/tools/age-calculator/', { waitUntil: 'networkidle' });
      await dPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await dPage.waitForTimeout(200);
      await dPage.screenshot({ path: path.join(OUT_DIR, `tool-age-calculator-1280-${theme}.png`), fullPage: true });
      console.log(`Captured: tool-age-calculator-1280-${theme}.png`);

      // Mega-Menu Open (1280px)
      await dPage.goto('http://localhost:8088/', { waitUntil: 'networkidle' });
      await dPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await dPage.click('#mega-menu-trigger');
      await dPage.waitForTimeout(200);
      await dPage.screenshot({ path: path.join(OUT_DIR, `mega-menu-1280-${theme}.png`) });
      console.log(`Captured: mega-menu-1280-${theme}.png`);

      // Command Palette: Empty State (1280px)
      await dPage.keyboard.press('Escape');
      await dPage.click('#header-search-trigger');
      await dPage.waitForTimeout(200);
      await dPage.screenshot({ path: path.join(OUT_DIR, `command-palette-empty-1280-${theme}.png`) });
      console.log(`Captured: command-palette-empty-1280-${theme}.png`);

      // Command Palette: Results State (1280px)
      await dPage.fill('#palette-input', 'age');
      await dPage.waitForTimeout(300);
      await dPage.screenshot({ path: path.join(OUT_DIR, `command-palette-results-1280-${theme}.png`) });
      console.log(`Captured: command-palette-results-1280-${theme}.png`);

      await dContext.close();

      // 2. Mobile (375px)
      const mContext = await browser.newContext({
        viewport: { width: 375, height: 812 },
        colorScheme: theme
      });
      const mPage = await mContext.newPage();
      await mPage.addInitScript((th) => {
        try {
          localStorage.setItem('theme', th);
          document.documentElement.setAttribute('data-theme', th);
        } catch (e) {}
      }, theme);

      // Homepage (375px)
      await mPage.goto('http://localhost:8088/', { waitUntil: 'networkidle' });
      await mPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await mPage.waitForTimeout(200);
      await mPage.screenshot({ path: path.join(OUT_DIR, `homepage-375-${theme}.png`), fullPage: true });
      console.log(`Captured: homepage-375-${theme}.png`);

      // Tool: Age Calculator (375px)
      await mPage.goto('http://localhost:8088/tools/age-calculator/', { waitUntil: 'networkidle' });
      await mPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await mPage.waitForTimeout(200);
      await mPage.screenshot({ path: path.join(OUT_DIR, `tool-age-calculator-375-${theme}.png`), fullPage: true });
      console.log(`Captured: tool-age-calculator-375-${theme}.png`);

      // Mobile Drawer Open (375px)
      await mPage.goto('http://localhost:8088/', { waitUntil: 'networkidle' });
      await mPage.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
      await mPage.click('#mobile-menu-trigger');
      await mPage.waitForTimeout(300);
      // Also open Date & Time category in drawer
      await mPage.click('#mobile-cat-btn-date-time');
      await mPage.waitForTimeout(200);
      await mPage.screenshot({ path: path.join(OUT_DIR, `mobile-drawer-375-${theme}.png`) });
      console.log(`Captured: mobile-drawer-375-${theme}.png`);

      // Mobile Command Palette Results (375px)
      await mPage.keyboard.press('Escape');
      await mPage.waitForTimeout(200);
      await mPage.click('#mobile-menu-trigger');
      await mPage.waitForTimeout(200);
      await mPage.click('#mobile-search-trigger');
      await mPage.waitForTimeout(300);
      await mPage.fill('#palette-input', 'date');
      await mPage.waitForTimeout(300);
      await mPage.screenshot({ path: path.join(OUT_DIR, `command-palette-results-375-${theme}.png`) });
      console.log(`Captured: command-palette-results-375-${theme}.png`);

      await mContext.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nAll visual audit screenshots successfully saved in ${OUT_DIR}`);
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
