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

async function runTests() {
  const server = createServer();
  await new Promise(resolve => server.listen(8086, resolve));
  console.log('Interaction test server listening on http://localhost:8086');

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

  async function isFocused(locator) {
    return await locator.evaluate(el => el === document.activeElement);
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Navigation & Command Palette (1280px)
    // -------------------------------------------------------------
    console.log('\n--- Running Desktop Interactions (1280px) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://localhost:8086/', { waitUntil: 'networkidle' });

    // Mega-Menu test
    const megaTrigger = desktopPage.locator('#mega-menu-trigger');
    const megaPanel = desktopPage.locator('#tools-mega-menu');
    assert(await megaTrigger.isVisible(), 'Desktop Tools mega-menu trigger is visible');
    await megaTrigger.click();
    await desktopPage.waitForTimeout(150);
    assert(await megaPanel.isVisible(), 'Clicking Tools trigger opens mega-menu panel');
    assert(await megaTrigger.getAttribute('aria-expanded') === 'true', 'Mega-menu trigger has aria-expanded="true"');
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(150);
    assert(!(await megaPanel.isVisible()), 'Pressing Escape closes mega-menu');

    // Search Trigger button click
    const searchTrigger = desktopPage.locator('#header-search-trigger');
    const searchModal = desktopPage.locator('#search-modal');
    const paletteInput = desktopPage.locator('#palette-input');

    await searchTrigger.click();
    await desktopPage.waitForTimeout(250);
    assert(await searchModal.isVisible(), 'Clicking search trigger button opens Command Palette dialog');
    assert(await isFocused(paletteInput), 'Search input is automatically focused on open');

    // Close with Escape and verify focus restoration
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(250);
    assert(!(await searchModal.isVisible()), 'Pressing Escape closes Command Palette dialog');
    assert(await isFocused(searchTrigger), 'Focus is restored to the search trigger button after close');

    // Global keyboard shortcut Ctrl+K
    await desktopPage.keyboard.press('Control+k');
    await desktopPage.waitForTimeout(250);
    assert(await searchModal.isVisible(), 'Pressing Ctrl+K opens Command Palette');
    assert(await isFocused(paletteInput), 'Input focused after Ctrl+K');

    // Search ranking test: typing "age"
    await paletteInput.fill('age');
    await desktopPage.waitForTimeout(300);
    const results = desktopPage.locator('#palette-results .palette-result-item');
    const count = await results.count();
    assert(count > 0, `Search results populated for "age" (${count} found)`);

    const firstResultTitle = await results.first().locator('.palette-result-name').textContent();
    assert(
      firstResultTitle.toLowerCase().includes('age calculator'),
      `Typing "age" ranks "Age Calculator" as #1 result (got "${firstResultTitle}")`
    );

    // Keyboard navigation in results
    await desktopPage.keyboard.press('ArrowDown');
    await desktopPage.waitForTimeout(100);
    if (count > 1) {
      const secondOpt = results.nth(1);
      assert(await secondOpt.getAttribute('aria-selected') === 'true', 'ArrowDown moves aria-selected to second result');
    }

    // Close palette
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(250);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 2: Mobile Drawer & Focus Trap (375px)
    // -------------------------------------------------------------
    console.log('\n--- Running Mobile Drawer Interactions (375px) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 }
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:8086/', { waitUntil: 'networkidle' });

    const hamburger = mobilePage.locator('#mobile-menu-trigger');
    const drawer = mobilePage.locator('#mobile-drawer');
    const drawerCloseBtn = mobilePage.locator('#mobile-drawer-close');

    assert(await hamburger.isVisible(), 'Hamburger menu button is visible at 375px');
    await hamburger.click();
    await mobilePage.waitForTimeout(300);

    assert(await drawer.isVisible(), 'Clicking hamburger opens mobile drawer');
    assert(await drawer.getAttribute('aria-modal') === 'true', 'Mobile drawer has aria-modal="true"');
    assert(await isFocused(drawerCloseBtn), 'Close button receives initial focus in drawer');

    // Focus trap test inside mobile drawer
    // Press Tab multiple times and verify activeElement stays inside #mobile-drawer
    let trapEscaped = false;
    for (let i = 0; i < 15; i++) {
      await mobilePage.keyboard.press('Tab');
      const isInside = await mobilePage.evaluate(() => {
        const active = document.activeElement;
        const drawerEl = document.getElementById('mobile-drawer');
        return drawerEl && drawerEl.contains(active);
      });
      if (!isInside) {
        trapEscaped = true;
        assert(false, `Focus escaped mobile drawer on Tab press #${i + 1}`);
        break;
      }
    }
    if (!trapEscaped) {
      assert(true, 'Focus trap successfully keeps Tab navigation inside mobile drawer');
    }

    // Accordion inside drawer
    const catAccordion = mobilePage.locator('#mobile-cat-btn-date-time');
    const catContent = mobilePage.locator('#mobile-cat-panel-date-time');
    assert(await catAccordion.isVisible(), 'Date & Time category accordion is present in drawer');
    await catAccordion.click();
    await mobilePage.waitForTimeout(150);
    assert(await catContent.isVisible(), 'Clicking category accordion expands tool list');
    assert(await catAccordion.getAttribute('aria-expanded') === 'true', 'Accordion trigger has aria-expanded="true"');

    // Close drawer with Escape and verify focus restoration
    await mobilePage.keyboard.press('Escape');
    await mobilePage.waitForTimeout(300);
    assert(!(await drawer.isVisible()), 'Pressing Escape closes mobile drawer');
    assert(await isFocused(hamburger), 'Focus returns to hamburger trigger button after drawer closes');

    await mobileContext.close();

  } finally {
    await browser.close();
    server.close();
  }

  if (failures > 0) {
    console.error(`\n💥 ${failures} interaction test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PLAYWRIGHT INTERACTION TESTS PASSED (0 FAILURES)');
  }
}

runTests().catch(err => {
  console.error('Fatal error during interaction tests:', err);
  process.exit(1);
});
