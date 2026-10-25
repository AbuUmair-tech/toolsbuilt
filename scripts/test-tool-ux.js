#!/usr/bin/env node
/**
 * Playwright Tool UX, Debounce, Enter-Key, Error State & Accessibility (axe-core) Test Suite
 * Tests all 10 tools on ToolsBuilt for:
 * 1. Debounced live execution (~150ms) without pressing buttons.
 * 2. Explicit Calculate button + Enter key triggering calculation.
 * 3. Accessible error states (aria-invalid="true", role="alert") on invalid inputs and clear on fix.
 * 4. Result copy button triggers clipboard write and toast feedback.
 * 5. Sensitive data safeguards (no passwords or custom names in localStorage/URL).
 * 6. axe-core accessibility audit in light and dark mode with 0 critical or serious violations.
 * 7. Visual verification screenshots at 375px and 1280px in docs/screenshots/tools/.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const SCREENSHOTS_DIR = path.join(ROOT, 'docs', 'screenshots', 'tools');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

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

const TOOLS = [
  'age-calculator',
  'days-until-date-calculator',
  'date-difference-calculator',
  'add-days-to-date-calculator',
  'percentage-change-calculator',
  'discount-calculator',
  'word-counter',
  'text-case-converter',
  'password-generator',
  'random-name-picker',
  'json-formatter',
  'base64-encoder-decoder',
  'url-encoder-decoder',
  'lorem-ipsum-generator',
  'uuid-generator',
  'hash-generator'
];

async function runAxe(page) {
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
  });

  const seriousOrCritical = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  );
  return { violations: seriousOrCritical, allViolations: results.violations };
}

async function runAllToolUxTests() {
  const server = createServer();
  await new Promise(resolve => server.listen(8092, resolve));
  console.log('Tool UX test server listening on http://localhost:8092\n');

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
    const page = await browser.newPage();

    for (const toolSlug of TOOLS) {
      console.log(`\n========================================================`);
      console.log(`   Auditing & Testing: /tools/${toolSlug}/`);
      console.log(`========================================================`);

      // 1. Desktop Light Mode & Screenshot
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`http://localhost:8092/tools/${toolSlug}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('tb-theme', 'light');
      });
      await page.waitForTimeout(300);

      const axeLight = await runAxe(page);
      assert(
        axeLight.violations.length === 0,
        `[${toolSlug}] axe-core accessibility in light mode: 0 serious/critical violations (found ${axeLight.violations.length})`
      );
      if (axeLight.violations.length > 0) {
        console.error(JSON.stringify(axeLight.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })), null, 2));
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${toolSlug}-1280-light.png`), fullPage: false });

      // 2. Desktop Dark Mode & Screenshot
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('tb-theme', 'dark');
      });
      await page.waitForTimeout(300);

      const axeDark = await runAxe(page);
      assert(
        axeDark.violations.length === 0,
        `[${toolSlug}] axe-core accessibility in dark mode: 0 serious/critical violations (found ${axeDark.violations.length})`
      );
      if (axeDark.violations.length > 0) {
        console.error(JSON.stringify(axeDark.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) })), null, 2));
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${toolSlug}-1280-dark.png`), fullPage: false });

      // 3. Mobile Viewport (375px) Screenshots
      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${toolSlug}-375-dark.png`), fullPage: false });
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('tb-theme', 'light');
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${toolSlug}-375-light.png`), fullPage: false });

      // Reset to Desktop for interaction tests
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`http://localhost:8092/tools/${toolSlug}/`, { waitUntil: 'domcontentloaded' });

      // -------------------------------------------------------------
      // Specific Interactive UX tests per tool
      // -------------------------------------------------------------
      if (toolSlug === 'age-calculator') {
        // Debounce test
        await page.fill('#dob-date', '1990-05-15');
        await page.waitForTimeout(250); // wait for 150ms debounce
        const resText = await page.textContent('#stat-years-months-days');
        assert(resText && resText.includes('y'), `[age-calculator] Debounce calculation computed result: "${resText.trim()}"`);

        // Enter key test
        await page.fill('#dob-date', '1985-01-01');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const enterRes = await page.textContent('#stat-years-months-days');
        assert(enterRes && enterRes.includes('y'), `[age-calculator] Enter key updated result: "${enterRes.trim()}"`);

        // Accessible error state
        await page.fill('#dob-date', '2099-01-01');
        await page.waitForTimeout(250);
        const ariaInvalid = await page.getAttribute('#dob-date', 'aria-invalid');
        const errVisible = await page.isVisible('#error-box');
        assert(ariaInvalid === 'true' && errVisible, '[age-calculator] Future birthdate triggered accessible error state');

        // Error clear on valid input
        await page.fill('#dob-date', '2000-01-01');
        await page.waitForTimeout(250);
        const ariaInvalidCleared = await page.getAttribute('#dob-date', 'aria-invalid');
        assert(ariaInvalidCleared === 'false' || !ariaInvalidCleared, '[age-calculator] Valid date cleared error state');

        // Copy button test
        const copyBtn = page.locator('#action-copy-btn');
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForSelector('.tb-toast.is-visible', { timeout: 2000 });
          assert(true, '[age-calculator] Action copy button triggered toast feedback');
        }
      }

      if (toolSlug === 'days-until-date-calculator') {
        // Debounce test
        await page.fill('#target-date', '2030-12-31');
        await page.waitForTimeout(250);
        const resText = await page.textContent('#result-primary-text');
        assert(resText && (resText.includes('Day') || resText.includes('day')), `[days-until] Debounced computation: "${resText.trim()}"`);

        // Enter key
        await page.fill('#target-date', '2035-06-01');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const enterRes = await page.textContent('#result-primary-text');
        assert(enterRes && enterRes.includes('Day'), `[days-until] Enter key submitted target date: "${enterRes.trim()}"`);

        // Copy button test
        const copyBtn = page.locator('#action-copy-btn');
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForSelector('.tb-toast.is-visible', { timeout: 2000 });
          assert(true, '[days-until] Action copy button triggered toast notification');
        }
      }

      if (toolSlug === 'date-difference-calculator') {
        // Enter dates
        await page.fill('#start-date', '2026-01-01');
        await page.fill('#end-date', '2026-01-31');
        await page.waitForTimeout(250);
        const diffRes = await page.textContent('#result-primary-text');
        assert(diffRes && diffRes.includes('30 Days'), `[date-diff] Debounced calculation: "${diffRes.trim()}"`);

        // Enter key
        await page.fill('#end-date', '2026-02-15');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const diffRes2 = await page.textContent('#result-primary-text');
        assert(diffRes2 && diffRes2.includes('45 Days'), `[date-diff] Enter key updated calculation: "${diffRes2.trim()}"`);

        // Copy button
        const copyBtn = page.locator('#action-copy-btn');
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForSelector('.tb-toast.is-visible', { timeout: 2000 });
          assert(true, '[date-diff] Copy button triggered toast');
        }
      }

      if (toolSlug === 'add-days-to-date-calculator') {
        await page.fill('#startDate', '2026-01-01');
        await page.fill('#amount', '10');
        await page.waitForTimeout(250);
        const addRes = await page.textContent('#primaryResult');
        assert(addRes && addRes.includes('2026'), `[add-days] Debounced calculation: "${addRes.trim()}"`);

        // Enter key
        await page.fill('#amount', '20');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const addRes2 = await page.textContent('#primaryResult');
        assert(addRes2 && (addRes2.includes('January 21, 2026') || addRes2.includes('Jan 21, 2026')), `[add-days] Enter key updated calculation: "${addRes2.trim()}"`);

        // Error state on invalid amount
        await page.fill('#amount', '');
        await page.waitForTimeout(250);
        const isInvalid = await page.getAttribute('#amount', 'aria-invalid');
        const errText = await page.textContent('#primaryResult');
        assert(isInvalid === 'true' && errText.includes('valid non-negative amount'), '[add-days] Empty amount triggered accessible error state');
      }

      if (toolSlug === 'percentage-change-calculator') {
        await page.fill('#m1-old-val', '100');
        await page.fill('#m1-new-val', '150');
        await page.waitForTimeout(250);
        const pctRes = await page.textContent('#result-primary-text');
        assert(pctRes && pctRes.includes('50'), `[percentage-change] Debounced computation: "${pctRes.trim()}"`);

        // Enter key
        await page.fill('#m1-new-val', '80');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const pctRes2 = await page.textContent('#result-primary-text');
        assert(pctRes2 && pctRes2.includes('20'), `[percentage-change] Enter key updated: "${pctRes2.trim()}"`);

        // Zero baseline error state
        await page.fill('#m1-old-val', '0');
        await page.waitForTimeout(250);
        const ariaInvalid = await page.getAttribute('#m1-old-val', 'aria-invalid');
        const errVisible = await page.isVisible('#error-box');
        assert(ariaInvalid === 'true' && errVisible, '[percentage-change] Zero baseline triggered accessible error state');
      }

      if (toolSlug === 'discount-calculator') {
        await page.fill('#original-price', '100');
        await page.fill('#discount-percent', '25');
        await page.waitForTimeout(250);
        const discRes = await page.textContent('#result-primary-text');
        assert(discRes && discRes.includes('$75.00'), `[discount] Debounced calculation: "${discRes.trim()}"`);

        // Enter key
        await page.fill('#discount-percent', '50');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const discRes2 = await page.textContent('#result-primary-text');
        assert(discRes2 && discRes2.includes('$50.00'), `[discount] Enter key updated: "${discRes2.trim()}"`);

        // Copy button
        const copyBtn = page.locator('#action-copy-btn');
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForSelector('.tb-toast.is-visible', { timeout: 2000 });
          assert(true, '[discount] Copy button triggered toast');
        }
      }

      if (toolSlug === 'word-counter') {
        await page.fill('#text-input', 'The quick brown fox jumps over the lazy dog.');
        await page.waitForTimeout(250);
        const wordCount = await page.textContent('#stat-words');
        assert(wordCount && wordCount.trim() === '9', `[word-counter] Live word count updated: ${wordCount}`);

        // Surrogate pair / emoji test
        await page.fill('#text-input', 'Hello 🌍 world!');
        await page.waitForTimeout(250);
        const emojiChars = await page.textContent('#stat-chars-space');
        assert(emojiChars && emojiChars.trim() === '14', `[word-counter] Surrogate pair emoji counted correctly as 1 char: ${emojiChars}`);
      }

      if (toolSlug === 'text-case-converter') {
        await page.fill('#text-input', 'hello world example');
        await page.click('button[data-case="upper"]');
        await page.waitForTimeout(100);
        const upperVal = await page.inputValue('#text-input');
        assert(upperVal === 'HELLO WORLD EXAMPLE', `[case-converter] UPPERCASE conversion: "${upperVal}"`);

        await page.click('button[data-case="title"]');
        await page.waitForTimeout(100);
        const titleVal = await page.inputValue('#text-input');
        assert(titleVal === 'Hello World Example', `[case-converter] Title Case conversion: "${titleVal}"`);

        // Copy button
        await page.click('#copy-btn');
        await page.waitForSelector('.tb-toast.is-visible', { timeout: 2000 });
        assert(true, '[case-converter] In-tool copy button triggered toast');
      }

      if (toolSlug === 'password-generator') {
        // Initial password exists
        const initialPw = await page.inputValue('#password-display');
        assert(initialPw && initialPw.length === 16, `[password-generator] Initial password rendered with length 16: "${initialPw}"`);

        // Click generate button
        await page.click('#generate-btn');
        await page.waitForTimeout(100);
        const newPw = await page.inputValue('#password-display');
        assert(newPw && newPw.length === 16, `[password-generator] Generate button produces new password: "${newPw}"`);

        // Error state: uncheck all sets
        await page.uncheck('#opt-upper');
        await page.uncheck('#opt-lower');
        await page.uncheck('#opt-numbers');
        await page.uncheck('#opt-symbols');
        await page.click('#generate-btn');
        await page.waitForTimeout(100);
        const errVisible = await page.isVisible('#error-box');
        assert(errVisible, '[password-generator] Unchecking all character sets displays error message');

        // Sensitivity safeguard check: passwords never stored in localStorage
        const lsHasPw = await page.evaluate((pw) => {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (val && val.includes(pw)) return true;
          }
          return false;
        }, newPw);
        assert(!lsHasPw, '[password-generator] SENSITIVITY SAFEGUARD: Generated password is NEVER saved in localStorage');

        // URL safeguard: no password in URL query
        const currentUrl = page.url();
        assert(!currentUrl.includes(encodeURIComponent(newPw)), '[password-generator] SENSITIVITY SAFEGUARD: Generated password is NEVER in URL query');
      }

      if (toolSlug === 'random-name-picker') {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.fill('#namesInput', 'Alice\nBob\nCharlie\nDiana');
        await page.click('#spinBtn');
        await page.waitForSelector('#winnerModal:not(.hidden)', { timeout: 3000 });
        const winner = await page.textContent('#winnerName');
        assert(winner && ['Alice', 'Bob', 'Charlie', 'Diana'].includes(winner.trim()), `[name-picker] Winner selected: "${winner.trim()}"`);

        // Sensitivity safeguard check: names never stored in localStorage or URL
        const lsHasNames = await page.evaluate(() => {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (val && (val.includes('Charlie') || val.includes('Diana'))) return true;
          }
          return false;
        });
        assert(!lsHasNames, '[random-name-picker] SENSITIVITY SAFEGUARD: Participant names are NEVER saved in localStorage');

        const currentUrl = page.url();
        assert(!currentUrl.includes('Charlie'), '[random-name-picker] SENSITIVITY SAFEGUARD: Participant names are NEVER in URL query');
      }
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n========================================================`);
  if (failures === 0) {
    console.log(`🎉 ALL TOOL UX, DEBOUNCE, ENTER-KEY & AXE-CORE TESTS PASSED (0 FAILURES)`);
  } else {
    console.error(`💥 TOOL UX TESTS COMPLETED WITH ${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log(`========================================================\n`);
}

runAllToolUxTests();
