const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Simple static file server
function createServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
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

  return server;
}

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'age-calculator', path: '/tools/age-calculator/' },
  { name: 'password-generator', path: '/tools/password-generator/' },
  { name: 'about', path: '/about/' },
  { name: 'design-system', path: '/design-system/' }
];

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '1280', width: 1280, height: 900 }
];

const THEMES = ['light', 'dark'];

async function run() {
  const server = createServer();
  await new Promise(resolve => server.listen(8085, resolve));
  console.log('Static server listening on http://localhost:8085');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const pageInfo of PAGES) {
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme
          });
          const page = await context.newPage();

          // Set localStorage theme if specified
          await page.addInitScript((th) => {
            try {
              localStorage.setItem('tb-theme', th);
              document.documentElement.setAttribute('data-theme', th);
            } catch (e) {}
          }, theme);

          const url = `http://localhost:8085${pageInfo.path}`;
          console.log(`Capturing ${pageInfo.name} at ${vp.width}px in ${theme} mode (${url})...`);
          await page.goto(url, { waitUntil: 'networkidle' });

          // Ensure data-theme is set on root and page is at top
          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th);
            window.scrollTo(0, 0);
          }, theme);

          await page.waitForTimeout(300);

          const filename = `${pageInfo.name}-${vp.name}-${theme}.png`;
          const filePath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filePath, fullPage: true });
          console.log(`  Saved: ${filePath}`);

          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('All screenshots captured successfully in docs/screenshots/');
}

run().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
