const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const SCREENSHOTS_DIR = path.join(ROOT, 'docs', 'screenshots', 'homepage');

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
  await new Promise(resolve => server.listen(8088, resolve));
  console.log('Screenshot capture server listening on http://localhost:8088');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 1280, height: 800, name: '1280' },
    { width: 375, height: 812, name: '375' }
  ];

  const themes = ['light', 'dark'];

  try {
    for (const vp of viewports) {
      for (const th of themes) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        
        await page.goto('http://localhost:8088/', { waitUntil: 'networkidle' });
        await page.evaluate((theme) => {
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('theme', theme);
        }, th);
        await page.waitForTimeout(150);

        // 1. Full page screenshot
        const fullPath = path.join(SCREENSHOTS_DIR, `homepage-${vp.name}-${th}-full.png`);
        await page.screenshot({ path: fullPath, fullPage: true });
        console.log(`Saved: ${fullPath}`);

        // 2. Hero only screenshot
        const heroElement = await page.$('.hero-section');
        if (heroElement) {
          const heroPath = path.join(SCREENSHOTS_DIR, `homepage-${vp.name}-${th}-hero.png`);
          await heroElement.screenshot({ path: heroPath });
          console.log(`Saved: ${heroPath}`);
        }

        await page.close();
      }
    }
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    await browser.close();
    server.close();
    console.log('Screenshot capture complete!');
  }
}

if (require.main === module) {
  captureScreenshots();
}

module.exports = { captureScreenshots };
