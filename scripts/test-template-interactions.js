#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const CATEGORIES_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'categories.json'), 'utf8'));

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

async function runTemplateInteractionTests() {
  const server = createServer();
  await new Promise(resolve => server.listen(8089, resolve));
  console.log('Template interaction test server listening on http://localhost:8089');

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

    // -------------------------------------------------------------
    // Test 1: Age Calculator Calculation + Result Actions Bar + Toast
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Age Calculator Calculation & Actions Bar ---');
    await page.goto('http://localhost:8089/tools/age-calculator/', { waitUntil: 'domcontentloaded' });
    
    // Fill birthdate and today's target date
    await page.fill('#dob-date', '1995-05-15');
    await page.fill('#target-date', '2025-05-15');
    await page.click('button[type="submit"]');

    const ageResultText = await page.textContent('#stat-years-months-days');
    assert(ageResultText && ageResultText.includes('30y'), `Age calculator computes result: "${ageResultText}"`);

    // Result Actions Bar should become active and unhidden
    const isActionsBarVisible = await page.isVisible('#result-actions-bar');
    assert(isActionsBarVisible, 'Result actions bar is visible after calculation');

    // Click Copy Result button and check Toast
    await page.click('#action-copy-btn');
    await page.waitForTimeout(300);
    const toastVisible = await page.isVisible('#tb-toast.is-visible');
    const toastText = await page.textContent('#tb-toast');
    assert(toastVisible && toastText.includes('copied'), `Toast appears upon copying: "${toastText}"`);

    // Click Reset button and verify fields reset and result hidden
    await page.click('#action-reset-btn');
    await page.waitForTimeout(100);
    const isResultBoxHidden = await page.isHidden('#result-box');
    assert(isResultBoxHidden, 'Reset clears age calculation output and hides result box');

    // -------------------------------------------------------------
    // Test 2: Discount Calculator Calculation
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Discount Calculator Calculation ---');
    await page.goto('http://localhost:8089/tools/discount-calculator/', { waitUntil: 'domcontentloaded' });

    await page.fill('#original-price', '100');
    await page.fill('#discount-percent', '25');
    await page.click('button[type="submit"]');

    const finalPrice = await page.textContent('#stat-final-price');
    const totalSaved = await page.textContent('#stat-total-saved');
    assert(finalPrice && finalPrice.includes('$75.00'), `Discount calculation: final price is ${finalPrice}`);
    assert(totalSaved && totalSaved.includes('$25.00'), `Discount calculation: total saved is ${totalSaved}`);

    const discountActionsVisible = await page.isVisible('#result-actions-bar');
    assert(discountActionsVisible, 'Result actions bar is visible on discount calculation');

    // -------------------------------------------------------------
    // Test 3: Password Generator Regenerate & Length
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Password Generator Interaction ---');
    await page.goto('http://localhost:8089/tools/password-generator/', { waitUntil: 'domcontentloaded' });

    // Initial password generated on load
    const initialPassword = await page.inputValue('#password-display');
    assert(initialPassword && initialPassword.length >= 12, `Initial password generated with length ${initialPassword.length}`);

    // Regenerate password
    await page.click('#generate-btn');
    const newPassword = await page.inputValue('#password-display');
    assert(newPassword && newPassword.length >= 12, `Regenerated password produced: length ${newPassword.length}`);

    // -------------------------------------------------------------
    // Test 4: Category Hub Page (/category/date-time/)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Category Hub Page (/category/date-time/) ---');
    await page.goto('http://localhost:8089/category/date-time/', { waitUntil: 'domcontentloaded' });

    const catTitle = await page.textContent('.category-hero-title');
    assert(catTitle.includes('Free Date & Time Tools'), `Category title renders: "${catTitle}"`);

    const toolCardsCount = await page.locator('.category-tools-section .tool-card').count();
    assert(toolCardsCount >= 4, `Category hub renders all tools in category (${toolCardsCount} cards)`);

    const guideGridCount = await page.locator('.guide-grid .guide-card').count();
    assert(guideGridCount >= 2, `How to choose guide rendered with ${guideGridCount} cards`);

    const otherCatsCount = await page.locator('.other-categories-grid .other-cat-card').count();
    assert(otherCatsCount === 4, `Other categories section links to the other 4 categories (${otherCatsCount} cards)`);

    // -------------------------------------------------------------
    // Test 5: All Tools Directory (/tools/) Dynamic Filtering & Search
    // -------------------------------------------------------------
    console.log('\n--- Test 5: All Tools Directory (/tools/) Filtering ---');
    await page.goto('http://localhost:8089/tools/', { waitUntil: 'domcontentloaded' });

    const totalChips = await page.locator('.directory-filter-bar .tool-filter-chip').count();
    const expectedChips = CATEGORIES_DATA.length + 1;
    assert(totalChips === expectedChips, `Directory page has ${expectedChips} filter chips (All + ${CATEGORIES_DATA.length} categories)`);

    // Filter by 'math-finance'
    await page.click('.tool-filter-chip[data-category="math-finance"]');
    const mathVisible = await page.isVisible('#cat-block-math-finance');
    const dateTimeVisible = await page.isVisible('#cat-block-date-time');
    assert(mathVisible && !dateTimeVisible, 'Clicking Math & Finance chip isolates math category and hides others');

    // Reset back to All Tools
    await page.click('.tool-filter-chip[data-category="all"]');
    const allMathVisible = await page.isVisible('#cat-block-math-finance');
    const allDateTimeVisible = await page.isVisible('#cat-block-date-time');
    assert(allMathVisible && allDateTimeVisible, 'Clicking All Tools chip restores all category blocks');

    // Live search query
    await page.fill('#directory-search', 'password');
    const secVisible = await page.isVisible('#cat-block-security');
    const dateVisibleAfterSearch = await page.isVisible('#cat-block-date-time');
    assert(secVisible && !dateVisibleAfterSearch, 'Searching "password" shows security category and hides non-matching blocks');

    // Search query with no matches
    await page.fill('#directory-search', 'nonexistentqueryxyz');
    const noResultsVisible = await page.isVisible('#directory-no-results');
    assert(noResultsVisible, 'Searching non-existent query displays #directory-no-results state');

    // Clear search with Escape key
    await page.keyboard.press('Escape');
    const noResultsHiddenAfterEsc = await page.isHidden('#directory-no-results');
    assert(noResultsHiddenAfterEsc, 'Pressing Escape clears query and hides no-results panel');

  } catch (err) {
    console.error('Test execution error:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n========================================================');
  if (failures === 0) {
    console.log('🎉 ALL PLAYWRIGHT TEMPLATE & DIRECTORY TESTS PASSED');
    process.exit(0);
  } else {
    console.error(`💥 PLAYWRIGHT TESTS FAILED WITH ${failures} FAILURE(S)`);
    process.exit(1);
  }
}

runTemplateInteractionTests();
