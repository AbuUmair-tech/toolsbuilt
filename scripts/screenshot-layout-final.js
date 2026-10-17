const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'layout-final');

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
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Screenshot server running on ${baseUrl}`);

  const browser = await chromium.launch();

  // 1. Homepage: 375, 768, 1024, 1280, 1440, 1920px - light and dark
  const hpWidths = [375, 768, 1024, 1280, 1440, 1920];
  const themes = ['light', 'dark'];
  for (const theme of themes) {
    for (const w of hpWidths) {
      const page = await browser.newPage({
        viewport: { width: w, height: 900 },
        colorScheme: theme
      });
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      const filename = `homepage-${w}px-${theme}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
      console.log(`Saved ${filename}`);
      await page.close();
    }
  }

  // 2. Category page /category/date-time/: 1440px light full-page
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light'
    });
    await page.goto(`${baseUrl}/category/date-time/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT_DIR, 'category-date-time-1440px-light.png'), fullPage: true });
    console.log('Saved category-date-time-1440px-light.png');
    await page.close();
  }

  // 3. /tools/: 1440px light full-page
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light'
    });
    await page.goto(`${baseUrl}/tools/`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT_DIR, 'tools-directory-1440px-light.png'), fullPage: true });
    console.log('Saved tools-directory-1440px-light.png');
    await page.close();
  }

  // 4. /tools/days-until-date-calculator/: 375, 1280, 1440, 1920px light & dark full-page + viewport scrolls
  const toolWidths = [375, 1280, 1440, 1920];
  for (const theme of themes) {
    for (const w of toolWidths) {
      const page = await browser.newPage({
        viewport: { width: w, height: 900 },
        colorScheme: theme
      });
      await page.goto(`${baseUrl}/tools/days-until-date-calculator/`, { waitUntil: 'networkidle' });

      // Full page screenshot
      const fnFull = `tool-days-until-${w}px-${theme}-full.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fnFull), fullPage: true });
      console.log(`Saved ${fnFull}`);

      // Viewport scroll to middle
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(100);
      const fnMid = `tool-days-until-${w}px-${theme}-viewport-middle.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fnMid), fullPage: false });
      console.log(`Saved ${fnMid}`);

      // Viewport scroll to FAQ
      await page.evaluate(() => {
        const faq = document.querySelector('.faq-section, #faq-heading');
        if (faq) faq.scrollIntoView();
      });
      await page.waitForTimeout(100);
      const fnFaq = `tool-days-until-${w}px-${theme}-viewport-faq.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fnFaq), fullPage: false });
      console.log(`Saved ${fnFaq}`);

      await page.close();
    }
  }

  // 5. Before/after calculation on days-until tool at 1280px
  {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      colorScheme: 'light'
    });
    await page.goto(`${baseUrl}/tools/days-until-date-calculator/`, { waitUntil: 'networkidle' });

    // Before calculation screenshot (viewport)
    await page.screenshot({ path: path.join(OUT_DIR, 'tool-days-until-1280px-before-calc.png'), fullPage: false });
    console.log('Saved tool-days-until-1280px-before-calc.png');

    // Trigger calculation
    const targetInput = page.locator('#target-date, input[type="date"]').first();
    await targetInput.fill('2028-12-31');
    const calcBtn = page.locator('#calc-btn, button[type="submit"]').first();
    if (await calcBtn.count() > 0) {
      await calcBtn.click();
    }
    await page.waitForTimeout(300);

    // After calculation screenshot (viewport)
    await page.screenshot({ path: path.join(OUT_DIR, 'tool-days-until-1280px-after-calc.png'), fullPage: false });
    console.log('Saved tool-days-until-1280px-after-calc.png');

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('All screenshots captured in docs/screenshots/layout-final/');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
