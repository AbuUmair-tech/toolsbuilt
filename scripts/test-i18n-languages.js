#!/usr/bin/env node
/**
 * Playwright tests for every enabled non-English language:
 * - homepage: <html lang/dir>, translated H1
 * - percentage-change-calculator: a calculation shows the translated result header and numbers
 *   formatted for the language; an invalid input shows the translated error
 * - word-counter: the reading time uses the language's format
 * - loan-emi-calculator: the result sentence is the translated one
 * - the language dropdown switches to English and back
 * Optional: --screenshots es,ar,ur saves 375px and 1280px screenshots of the homepage and a tool
 * into docs/screenshots/i18n/.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const i18nData = require('./i18n-data.js');
const { loadLanguages } = require('./i18n.js');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const SHOT_DIR = path.join(ROOT, 'docs', 'screenshots', 'i18n');
const args = process.argv.slice(2);
const shotLangs = args.includes('--screenshots') ? args[args.indexOf('--screenshots') + 1].split(',') : [];

const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
function createServer() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (p.endsWith('/')) p += 'index.html';
    else if (!path.extname(p)) p += '/index.html';
    const f = path.join(SITE_DIR, p);
    if (f.startsWith(SITE_DIR) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}

let failures = 0;
function assert(ok, message) {
  if (ok) console.log(`✅ PASS: ${message}`);
  else { console.error(`❌ FAIL: ${message}`); failures++; }
}

const text = html => String(html).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "{{s}} sec" -> /^\d+ sec$/ with each placeholder matching anything
const templateRe = tpl => new RegExp(`^${escapeRe(text(tpl)).replace(/\\\{\\\{\w+\\\}\\\}/g, '.+?')}$`);

async function run() {
  const languages = loadLanguages().filter(l => l.enabled && l.code !== 'en');
  if (!languages.length) {
    console.log('ℹ️  No non-English language is enabled: nothing to test');
    console.log('Language page tests PASSED');
    return;
  }
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    for (const lang of languages) {
      const code = lang.code;
      const prefix = `/${lang.prefix}`;
      const intl = lang.intlLocale || code;
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
      await context.addInitScript(() => { try { localStorage.setItem('tb_cookie_consent', 'rejected'); } catch (e) {} });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));

      // Homepage
      await page.goto(`${base}${prefix}/`, { waitUntil: 'networkidle' });
      assert(await page.getAttribute('html', 'lang') === lang.hreflang && await page.getAttribute('html', 'dir') === lang.dir,
        `${code}: homepage has lang="${lang.hreflang}" dir="${lang.dir}"`);
      const home = i18nData.page(code, 'home');
      assert(text(await page.innerHTML('#hero-title')) === text(home.body.text['hero-title']), `${code}: homepage H1 is translated`);

      // Percentage change calculator
      const pcc = i18nData.tool(code, 'percentage-change-calculator').client;
      await page.goto(`${base}${prefix}/tools/percentage-change-calculator/`, { waitUntil: 'networkidle' });
      await page.fill('#m1-old-val', '1200');
      await page.fill('#m1-new-val', '1500');
      await page.click('#mode-1-form button[type=submit]');
      await page.waitForTimeout(250);
      assert(await page.textContent('#result-header-text') === pcc.result.headerMode1, `${code}: percentage result header is translated`);
      const expected = new Intl.NumberFormat(intl).format(1200);
      const firstStat = (await page.textContent('.result-stat-value')).trim();
      assert(firstStat === expected, `${code}: 1200 is formatted for ${intl} ("${firstStat}", expected "${expected}")`);
      await page.fill('#m1-old-val', '');
      await page.dispatchEvent('#m1-old-val', 'input');
      await page.click('#mode-1-form button[type=submit]');
      await page.waitForTimeout(250);
      assert((await page.textContent('#error-box')).trim() === pcc.errors.mode1Fields, `${code}: validation error is translated`);

      // Word counter
      const wc = i18nData.tool(code, 'word-counter').client;
      await page.goto(`${base}${prefix}/tools/word-counter/`, { waitUntil: 'networkidle' });
      await page.fill('#text-input', Array(300).fill('word').join(' '));
      await page.waitForTimeout(400);
      const reading = (await page.textContent('#stat-reading-time')).trim();
      assert([wc.time.sec, wc.time.minSec, wc.time.zero].some(t => templateRe(t).test(reading)), `${code}: reading time uses the translated format ("${reading}")`);

      // Loan EMI
      const loan = i18nData.tool(code, 'loan-emi-calculator').client;
      await page.goto(`${base}${prefix}/tools/loan-emi-calculator/`, { waitUntil: 'networkidle' });
      await page.fill('#loan-amount', '100000');
      await page.fill('#interest-rate', '10');
      await page.fill('#tenure-value', '5');
      await page.click('#calculator-form button[type=submit]');
      await page.waitForTimeout(300);
      const primary = (await page.textContent('#result-primary-text')).trim();
      assert(templateRe(loan.result.primary).test(primary), `${code}: loan result sentence is translated ("${primary}")`);

      // Dropdown: to English and back
      await page.goto(`${base}${prefix}/tools/percentage-change-calculator/`, { waitUntil: 'networkidle' });
      await page.click('#language-menu-trigger');
      await Promise.all([page.waitForURL(`${base}/tools/percentage-change-calculator/`), page.click('#language-options [data-locale="en"]')]);
      assert(await page.getAttribute('html', 'lang') === 'en', `${code}: dropdown switches to English`);
      await page.click('#language-menu-trigger');
      await Promise.all([page.waitForURL(`${base}${prefix}/tools/percentage-change-calculator/`), page.click(`#language-options [data-locale="${code}"]`)]);
      assert(await page.getAttribute('html', 'lang') === lang.hreflang, `${code}: dropdown switches back`);

      assert(errors.length === 0, `${code}: no script errors${errors.length ? ` (${errors.slice(0, 2).join(' | ')})` : ''}`);
      await context.close();
    }

    if (shotLangs.length) {
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      for (const code of shotLangs) {
        const lang = languages.find(l => l.code === code);
        if (!lang) continue;
        for (const width of [375, 1280]) {
          const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, isMobile: width === 375, deviceScaleFactor: 1 });
          await context.addInitScript(() => { try { localStorage.setItem('tb_cookie_consent', 'rejected'); } catch (e) {} });
          const page = await context.newPage();
          for (const [name, url] of [['home', '/'], ['percentage-change-calculator', '/tools/percentage-change-calculator/']]) {
            await page.goto(`${base}/${lang.prefix}${url}`, { waitUntil: 'networkidle' });
            const file = path.join(SHOT_DIR, `${code}-${name}-${width}.png`);
            await page.screenshot({ path: file, fullPage: false });
            console.log(`Saved ${path.relative(ROOT, file)}`);
          }
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures) {
    console.error(`💥 Language page tests FAILED (${failures})`);
    process.exit(1);
  }
  console.log('Language page tests PASSED');
}

run().catch(err => { console.error(err); process.exit(1); });
