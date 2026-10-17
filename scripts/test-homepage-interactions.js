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

    // 1. Initial State & No recent tools
    await page.goto('http://localhost:8087/', { waitUntil: 'domcontentloaded' });
    const recentSecHidden = await page.$eval('#recent-tools-section', el => el.hasAttribute('hidden'));
    assert(recentSecHidden, 'Recently Used section is hidden by default when localStorage is empty');

    // 2. Hero Search Filters Grid ("age" shows Age Calculator and hides unrelated tools)
    const searchInput = page.locator('#tool-search');
    await searchInput.fill('age');
    await page.waitForTimeout(200);

    const ageCardVisible = await page.$eval('.category-section .tool-card[data-slug="age-calculator"]', el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none';
    });
    const discountCardHidden = await page.$eval('.category-section .tool-card[data-slug="discount-calculator"]', el => {
      const style = window.getComputedStyle(el);
      return style.display === 'none';
    });
    assert(ageCardVisible, 'Hero search "age" keeps Age Calculator visible');
    assert(discountCardHidden, 'Hero search "age" hides Discount Calculator');

    // 3. Enter opens top match
    await searchInput.press('Enter');
    await page.waitForURL('**/tools/age-calculator/**');
    const onAgePage = page.url().includes('/tools/age-calculator/');
    assert(onAgePage, 'Pressing Enter on hero search navigates to the top matched tool (/tools/age-calculator/)');
    await page.waitForTimeout(300);

    // 4. Return to homepage, verify recent tools section appears
    await page.goto('http://localhost:8087/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const recentSecVisible = await page.$eval('#recent-tools-section', el => !el.hasAttribute('hidden'));
    const recentCardsCount = await page.$$eval('#recent-tools-grid .tool-card', cards => cards.length);
    assert(recentSecVisible && recentCardsCount >= 1, `Recent tools row appears after visiting a tool page (${recentCardsCount} items)`);

    // 5. Clear recent tools button
    const clearBtn = page.locator('#clear-recent-tools');
    await clearBtn.click();
    await page.waitForTimeout(100);
    const recentCleared = await page.$eval('#recent-tools-section', el => el.hasAttribute('hidden'));
    assert(recentCleared, 'Clicking "Clear recent" hides the recently used section');

    // 6. Jump-bar links scroll to the right sections
    const textJumpPill = page.locator('.jump-pill[data-cat="text"]');
    await textJumpPill.click();
    await page.waitForTimeout(600);
    const catTextSection = await page.$eval('#cat-text', el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= 250;
    });
    assert(catTextSection, 'Clicking category jump pill scrolls to the correct section (#cat-text)');

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
