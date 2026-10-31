const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const CATEGORIES_DATA = require(path.join(__dirname, '..', 'src', '_data', 'categories.json'));

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

    // Header: Home, All Tools and Categories dropdowns, About, Contact; theme toggle and search
    for (const href of ['/', '/about/', '/contact/']) {
      assert(await desktopPage.locator(`#main-nav a.nav-link[href="${href}"]`).isVisible(), `Desktop header shows ${href} link`);
    }
    assert(await desktopPage.locator('#theme-toggle').isVisible(), 'Desktop header shows theme toggle');
    const headerHeight = await desktopPage.$eval('#site-header', el => el.getBoundingClientRect().height);
    assert(headerHeight <= 80, `Header is one row (${Math.round(headerHeight)}px tall)`);

    // Dropdowns: open with the keyboard, list every category, close on Escape and outside click
    const catMenu = desktopPage.locator('details.nav-menu').nth(1);
    await catMenu.locator('summary').focus();
    await desktopPage.keyboard.press('Enter');
    assert(await catMenu.evaluate(d => d.open), 'Categories dropdown opens with Enter');
    const catLinks = await catMenu.locator('.nav-menu-link').count();
    assert(catLinks === CATEGORIES_DATA.length, `Categories dropdown lists every category (${catLinks})`);
    await desktopPage.keyboard.press('Escape');
    assert(!(await catMenu.evaluate(d => d.open)), 'Escape closes the dropdown');
    assert(await catMenu.locator('summary').evaluate(el => el === document.activeElement), 'Focus returns to the dropdown trigger');
    const toolsMenu = desktopPage.locator('details.nav-menu').first();
    await toolsMenu.locator('summary').click();
    assert(await toolsMenu.evaluate(d => d.open) && await toolsMenu.locator('a[href="/tools/"]').isVisible(), 'All Tools dropdown shows "View all tools"');
    await desktopPage.mouse.click(5, 400);
    assert(!(await toolsMenu.evaluate(d => d.open)), 'Clicking outside closes the dropdown');

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

    // Menu is a plain list: every category plus All tools, Blog, About
    const menuHrefs = await drawer.locator('a.mobile-drawer-link').evaluateAll(els => els.map(a => a.getAttribute('href')));
    const expectedHrefs = ['/', '/tools/', '/about/', '/contact/', ...CATEGORIES_DATA.map(c => `/category/${c.slug}/`)];
    const missingHrefs = expectedHrefs.filter(h => !menuHrefs.includes(h));
    assert(missingHrefs.length === 0, `Mobile menu lists Home, All Tools, every category, About and Contact (missing: ${missingHrefs.join(', ') || 'none'})`);

    // Close drawer with Escape and verify focus restoration
    await mobilePage.keyboard.press('Escape');
    await mobilePage.waitForTimeout(300);
    assert(!(await drawer.isVisible()), 'Pressing Escape closes mobile drawer');
    assert(await isFocused(hamburger), 'Focus returns to hamburger trigger button after drawer closes');

    // Header search icon opens the palette on mobile
    const mobileSearch = mobilePage.locator('#mobile-search-trigger');
    assert(await mobileSearch.isVisible(), 'Mobile header shows search icon');
    await mobileSearch.click();
    await mobilePage.waitForTimeout(250);
    assert(await mobilePage.locator('#search-modal').isVisible(), 'Mobile search icon opens Command Palette');
    await mobilePage.keyboard.press('Escape');

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
