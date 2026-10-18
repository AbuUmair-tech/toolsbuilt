/**
 * Layout measurement script — prints bounding rects of key elements
 * at 1280, 1440 and 1920px on homepage and days-until tool page.
 * Usage: node scripts/measure-layout.js
 */
'use strict';
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal static file server
function serve() {
  const siteDir = path.join(__dirname, '../_site');
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.join(siteDir, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

async function measurePage(page, url, label) {
  await page.goto(url, { waitUntil: 'networkidle' });
  return page.evaluate((lbl) => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width), top: Math.round(b.top) };
    };
    return {
      label: lbl,
      headerInner: r(document.querySelector('.header-container, .header-inner')),
      heroSection: r(document.querySelector('.hero-section')),
      popularSection: r(document.querySelector('.popular-section')),
      allToolsWrapper: r(document.querySelector('.all-tools-wrapper')),
      mainContent: r(document.querySelector('#main-content')),
      footerInner: r(document.querySelector('.site-footer .container, .footer-inner, .site-footer .footer-grid')),
      breadcrumb: r(document.querySelector('.breadcrumb')),
      h1: r(document.querySelector('h1')),
      calcCard: r(document.querySelector('.tool-workspace, .tool-container, .calculator-card')),
      tocAside: r(document.querySelector('.tool-toc-aside')),
      toolMainCol: r(document.querySelector('.tool-main-col')),
    };
  }, label);
}

(async () => {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();

  const pages = [
    ['homepage', '/'],
    ['days-until', '/tools/days-until-date-calculator/'],
  ];
  const widths = [1280, 1440, 1920];

  console.log('\n=== LAYOUT MEASUREMENTS (before fixes) ===\n');
  console.log(
    'Label'.padEnd(28) +
    'Element'.padEnd(22) +
    'Left'.padStart(6) +
    'Right'.padStart(7) +
    'Width'.padStart(7)
  );
  console.log('-'.repeat(70));

  for (const [label, pagePath] of pages) {
    for (const w of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const pg = await ctx.newPage();
      const data = await measurePage(pg, `http://localhost:${port}${pagePath}`, `${label}@${w}`);
      const lbl = data.label.padEnd(28);
      const keys = ['headerInner','heroSection','popularSection','mainContent','footerInner','breadcrumb','calcCard','tocAside','toolMainCol'];
      for (const k of keys) {
        const v = data[k];
        if (v) {
          console.log(lbl + k.padEnd(22) + String(v.left).padStart(6) + String(v.right).padStart(7) + String(v.width).padStart(7));
        }
      }
      console.log('');
      await ctx.close();
    }
  }

  await browser.close();
  server.close();
})();
