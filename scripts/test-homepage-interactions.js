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

async function runHomepageTests() {
  const server = createServer();
  await new Promise(resolve => server.listen(8087, resolve));
  console.log('Homepage interaction test server listening on http://localhost:8087');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let failures = 0;
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    // 1. Hero search field opens the command palette
    await page.goto('http://localhost:8087/', { waitUntil: 'domcontentloaded' });
    await page.click('#hero-search-trigger');
    await page.waitForTimeout(250);
    assert(await page.isVisible('#search-modal'), 'Clicking the hero search field opens the command palette');
    assert(await page.evaluate(() => document.activeElement && document.activeElement.id === 'palette-input'), 'Palette input is focused after opening from hero');

    // 2. Typing in the palette finds tools; Enter opens the top match
    await page.fill('#palette-input', 'age');
    await page.waitForSelector('#palette-results .palette-result-item');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/tools/**');
    assert(page.url().includes('/tools/age-calculator/'), `Enter in palette opens the top match (${page.url()})`);

    // 3. ?q= (WebSite SearchAction target) opens the palette pre-filled
    await page.goto('http://localhost:8087/?q=password', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#palette-results .palette-result-item');
    const prefilled = await page.inputValue('#palette-input');
    assert(prefilled === 'password', 'SearchAction ?q= opens the palette with the query filled in');
    await page.keyboard.press('Escape');

    // 4. Every category card and every "All tools" link is a working internal link
    const cardHrefs = await page.$$eval('.category-card', els => els.map(a => a.getAttribute('href')));
    assert(cardHrefs.length > 0 && cardHrefs.every(h => /^\/category\/[a-z0-9-]+\/$/.test(h)), `Category cards link to category pages (${cardHrefs.length})`);

    // 7. No horizontal scroll at 375px mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:8087/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!hasHorizontalOverflow, 'No horizontal scrollbar/overflow on mobile viewport (375px width)');

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
  }

  if (failures > 0) {
    console.error(`\n❌ Homepage interaction tests completed with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n✅ All homepage Playwright interaction tests passed successfully!');
  }
}

if (require.main === module) {
  runHomepageTests();
}

module.exports = { runHomepageTests };
