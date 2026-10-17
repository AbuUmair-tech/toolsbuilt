#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const SCREENSHOTS_DIR = path.join(ROOT, 'docs', 'screenshots', 'templates');

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

async function captureScreenshots() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const server = createServer();
  await new Promise(resolve => server.listen(8090, resolve));
  console.log('Template screenshot server listening on http://localhost:8090');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 1280, height: 800, name: '1280' },
    { width: 375, height: 812, name: '375' }
  ];

  const themes = ['light', 'dark'];

  const pagesToCapture = [
    { name: 'category-date-time', path: '/category/date-time/' },
    { name: 'all-tools-directory', path: '/tools/' },
    { name: 'tool-age-calculator', path: '/tools/age-calculator/' },
    { name: 'tool-discount-calculator', path: '/tools/discount-calculator/' }
  ];

  for (const pageInfo of pagesToCapture) {
    for (const vp of viewports) {
      for (const theme of themes) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height }
        });

        await page.goto(`http://localhost:8090${pageInfo.path}`, { waitUntil: 'networkidle' });
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          localStorage.setItem('theme', t);
        }, theme);

        await page.waitForTimeout(200);

        const filename = `${pageInfo.name}-${vp.name}-${theme}.png`;
        const filePath = path.join(SCREENSHOTS_DIR, filename);

        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Saved screenshot: ${filename}`);

        await page.close();
      }
    }
  }

  await browser.close();
  server.close();
  console.log(`\nAll screenshots successfully saved to docs/screenshots/templates/`);
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
