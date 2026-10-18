const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

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
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    else if (!path.extname(reqPath)) reqPath += '/index.html';
    const filePath = path.join(SITE_DIR, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

async function run() {
  const server = createServer();
  await new Promise(r => server.listen(8091, r));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  const widths = [1280, 1440, 1920];
  console.log('\n--- HOMEPAGE EDGES CHECK ---');
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('http://localhost:8091/', { waitUntil: 'networkidle' });
    const edges = await page.evaluate(() => {
      const get = s => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
      };
      return {
        header: get('.header-container'),
        main: get('#main-content'),
        hero: get('.hero-section'),
        popular: get('#popular-tools'),
        footer: get('.footer-container, .site-footer .container')
      };
    });
    console.log(`Viewport ${w}px:`, edges);
    await page.close();
  }

  console.log('\n--- TOOL PAGE EDGES CHECK ---');
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto('http://localhost:8091/tools/days-until-date-calculator/', { waitUntil: 'networkidle' });
    const edges = await page.evaluate(() => {
      const get = s => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
      };
      return {
        header: get('.header-container'),
        container: get('.tool-page-layout'),
        mainCol: get('.tool-main-col'),
        tocAside: get('.tool-toc-aside'),
        footer: get('.footer-container, .site-footer .container')
      };
    });
    console.log(`Viewport ${w}px:`, edges);
    await page.close();
  }

  await browser.close();
  server.close();
}
run();
