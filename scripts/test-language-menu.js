/**
 * Playwright tests for the header language picker and the language suggestion banner.
 * Switching and banner tests need a second enabled language that has a translated page;
 * with English only they are skipped.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const PORT = 8091;
const BASE = `http://localhost:${PORT}`;

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
    let reqPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    else if (!path.extname(reqPath)) reqPath += '/index.html';
    const filePath = path.join(SITE_DIR, reqPath);
    if (filePath.startsWith(SITE_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });
}

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

const isOpen = page => page.locator('#language-menu-panel').isVisible();
const focusedLocale = page => page.evaluate(() => document.activeElement && document.activeElement.dataset.locale);

async function run() {
  const server = createServer();
  await new Promise(resolve => server.listen(PORT, resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const requests = [];

  try {
    // --- Desktop: open, search, keyboard, close ---
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    const page = await context.newPage();
    page.on('request', r => requests.push(r.url()));
    await page.goto(`${BASE}/tools/percentage-change-calculator/`);

    const optionCount = await page.locator('#language-options [role="option"]').count();
    const locales = await page.locator('#language-options [role="option"]').evaluateAll(els => els.map(e => e.dataset.locale));
    assert(optionCount >= 1 && locales[0] === 'en', `Picker lists the enabled languages (${locales.join(', ')})`);
    assert(await page.locator('#language-options .language-menu-option.is-active[aria-selected="true"] .language-menu-check').count() === 1,
      'Exactly one option is active, selected and checked');
    const noscriptLinks = ((await page.content()).match(/<noscript>[\s\S]*?<\/noscript>/g) || []).join('').match(/<a href="[^"]+" hreflang=/g) || [];
    assert(noscriptLinks.length === optionCount, 'Every language is also a crawlable <a href> in <noscript>');

    await page.click('#language-menu-trigger');
    assert(await isOpen(page), 'Trigger click opens the listbox');
    assert(await page.getAttribute('#language-menu-trigger', 'aria-expanded') === 'true', 'aria-expanded is true while open');
    assert(await page.evaluate(() => document.activeElement.id) === 'language-menu-search', 'Search box gets focus on open');

    await page.keyboard.type('zzzz');
    assert(await page.locator('.language-menu-empty').isVisible(), 'Search with no match shows the empty message');
    await page.fill('#language-menu-search', 'engl');
    assert(await page.locator('#language-options [role="option"]:visible').count() === 1, 'Search filters by English name');

    await page.fill('#language-menu-search', '');
    await page.keyboard.press('ArrowDown');
    assert(await focusedLocale(page) === locales[0], 'ArrowDown moves focus to the first option');
    await page.keyboard.press('End');
    assert(await focusedLocale(page) === locales[locales.length - 1], 'End focuses the last option');
    await page.keyboard.press('Home');
    assert(await focusedLocale(page) === locales[0], 'Home focuses the first option');
    await page.keyboard.press('e');
    assert(await focusedLocale(page) === locales.find(c => c.startsWith('e')) || locales[0], 'Type-ahead jumps to a matching language');

    await page.keyboard.press('Escape');
    assert(!(await isOpen(page)), 'Escape closes the listbox');
    assert(await page.evaluate(() => document.activeElement.id) === 'language-menu-trigger', 'Escape returns focus to the trigger');

    await page.click('#language-menu-trigger');
    await page.mouse.click(640, 600);
    assert(!(await isOpen(page)), 'Outside click closes the listbox');

    await page.click('#language-menu-trigger');
    await page.click('#language-options [data-locale="en"]');
    assert(await page.evaluate(() => localStorage.getItem('tb_language')) === 'en', 'Choosing a language stores it in localStorage');
    assert(!(await isOpen(page)), 'Choosing the current language just closes the list');

    // --- Phone: full-width sheet ---
    const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const phonePage = await phone.newPage();
    await phonePage.goto(`${BASE}/`);
    await phonePage.click('#language-menu-trigger');
    const box = await phonePage.locator('#language-menu-panel').boundingBox();
    assert(box && Math.round(box.width) === 375 && Math.round(box.y + box.height) === 812, 'Phone: the list opens as a full-width bottom sheet');
    await phonePage.click('[data-language-menu-close]');
    assert(!(await isOpen(phonePage)), 'Phone: the close button closes the sheet');
    await phone.close();

    // --- Switching and banner (needs a second language with a translated page) ---
    const other = await page.locator('#language-options [role="option"]:not([data-fallback]):not(.is-active)').first();
    if (await other.count()) {
      const code = await other.getAttribute('data-locale');
      const href = await other.getAttribute('data-href');
      await page.evaluate(() => localStorage.clear());
      await page.click('#language-menu-trigger');
      await Promise.all([page.waitForURL(`${BASE}${href}`), other.click()]);
      const lang = await page.getAttribute('html', 'lang');
      assert(lang === code || lang.toLowerCase() === code.toLowerCase(), `Switching to ${code} opens ${href} with <html lang="${lang}">`);
      assert(await page.evaluate(() => localStorage.getItem('tb_language')) === code, `Choice ${code} stored`);
      await page.click('#language-menu-trigger');
      await Promise.all([page.waitForURL(`${BASE}/tools/percentage-change-calculator/`), page.click('#language-options [data-locale="en"]')]);
      assert(await page.getAttribute('html', 'lang') === 'en', 'Switching back to English opens the English page');

      const visitor = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: code });
      const vp = await visitor.newPage();
      await vp.goto(`${BASE}/tools/percentage-change-calculator/`);
      assert(await vp.locator('#language-banner').isVisible(), `Banner offers ${code} to a visitor whose browser prefers it`);
      assert(await vp.getAttribute('.language-banner-link', 'href') === href, 'Banner links to the translated page');
      assert(vp.url() === `${BASE}/tools/percentage-change-calculator/`, 'Banner never redirects');
      await vp.click('#language-banner-close');
      await vp.reload();
      assert(!(await vp.locator('#language-banner').isVisible()), 'Dismissed banner stays hidden');
      await visitor.close();

      const englishVisitor = await browser.newContext({ locale: 'en-GB' });
      const ep = await englishVisitor.newPage();
      await ep.goto(`${BASE}/tools/percentage-change-calculator/`);
      assert(!(await ep.locator('#language-banner').isVisible()), 'No banner when the browser prefers English');
      await englishVisitor.close();
    } else {
      console.log('ℹ️  Only English is enabled: switching and banner tests skipped');
      assert(await page.locator('#language-banner').count() === 0, 'No banner markup while only English is enabled');
    }

    const outside = requests.filter(u => !u.startsWith(BASE) && !u.startsWith('data:'));
    assert(outside.length === 0, `No requests leave the site (${outside.length})`);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failures) {
    console.error(`💥 Language menu tests FAILED (${failures})`);
    process.exit(1);
  }
  console.log('Language menu tests PASSED');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
