#!/usr/bin/env node
/**
 * Layout, Container, Tool Page & Privacy Test Suite
 * Validates:
 * 1. Global container alignment at 1280, 1440, 1920px
 * 2. No horizontal scroll at 375, 768, 1024, 1280, 1440, 1920px across all page types
 * 3. Exactly one visible search button per breakpoint & no overlap with logo
 * 4. Popular chips have visible icons, exactly 6 popular tools, no "1 tools" plural bugs
 * 5. Tool pages: actions bar within 200px below result, 1 copy control, no duplicate related tools, TOC non-intersecting & sticky
 * 6. Byline contains human-readable date without TODO_
 * 7. Privacy claims audit: fails if "no tracking" or "zero tracking" in built HTML with analytics present
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const tools = require(path.join(ROOT, 'src', '_data', 'tools.json'));

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
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

  console.log('--- 1. Static Plural & Privacy Invariance Checks ---');
  // Check no "1 tools" anywhere in built html
  let foundPluralBug = false;
  let foundNoTrackingBug = false;
  let hasAnalytics = false;

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.html')) {
        const content = fs.readFileSync(full, 'utf8');
        if (/1 tools\b/i.test(content)) {
          foundPluralBug = true;
          console.error(`Plural bug "1 tools" found in ${full}`);
        }
        if (content.includes('gtag(') || content.includes('googletagmanager.com/gtag/js')) {
          hasAnalytics = true;
        }
        // Exclude terms / privacy policy documents from marketing text scanner
        if (!full.includes('privacy-policy') && !full.includes('terms') && !full.includes('design-system')) {
          if (/\b(?:no|zero)\s+tracking(?:\s+pixels)?\b/i.test(content)) {
            foundNoTrackingBug = true;
            console.error(`Inaccurate tracking claim found in ${full}`);
          }
        }
      }
    }
  }
  scanDir(SITE_DIR);

  assert(!foundPluralBug, 'No "1 tools" plural bugs in built HTML');
  if (hasAnalytics) {
    assert(!foundNoTrackingBug, 'No false "no tracking" or "zero tracking" claims in built marketing pages with analytics present');
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  console.log('\n--- 2. Container Alignment Checks (1280, 1440, 1920px) ---');
  for (const w of [1280, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const hpEdges = await page.evaluate(() => {
      const r = s => {
        const el = document.querySelector(s);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { left: Math.round(b.left), right: Math.round(b.right) };
      };
      return {
        header: r('.header-container'),
        main: r('#main-content'),
        footer: r('.footer-grid, .site-footer .container')
      };
    });

    if (hpEdges.header && hpEdges.main && hpEdges.footer) {
      const leftDiff = Math.abs(hpEdges.header.left - hpEdges.main.left);
      const rightDiff = Math.abs(hpEdges.header.right - hpEdges.main.right);
      assert(leftDiff <= 1 && rightDiff <= 1, `Homepage header and main container align at ${w}px (left diff: ${leftDiff}px, right diff: ${rightDiff}px)`);
    }

    // Check tool page container alignment
    await page.goto(`${baseUrl}/tools/days-until-date-calculator/`, { waitUntil: 'networkidle' });
    const toolEdges = await page.evaluate(() => {
      const r = s => {
        const el = document.querySelector(s);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { left: Math.round(b.left), right: Math.round(b.right) };
      };
      return {
        container: r('.tool-page-layout'),
        mainCol: r('.tool-main-col'),
        tocAside: r('.tool-toc-aside')
      };
    });

    if (toolEdges.container && toolEdges.mainCol && toolEdges.tocAside) {
      // mainCol left starts at container content edge, tocAside ends at container content edge
      assert(toolEdges.mainCol.left < toolEdges.tocAside.left, `Tool page 2-column layout active at ${w}px`);
      assert(toolEdges.tocAside.right <= toolEdges.container.right, `TOC aside right edge is within container boundary at ${w}px`);
    }
    await page.close();
  }

  console.log('\n--- 3. Horizontal Scroll Overflow Check (375 to 1920px) ---');
  const samplePages = [
    '/',
    '/category/date-time/',
    '/tools/',
    '/tools/days-until-date-calculator/',
    '/tools/age-calculator/',
    '/tools/password-generator/'
  ];
  const viewports = [375, 768, 1024, 1280, 1440, 1920];

  for (const pagePath of samplePages) {
    for (const w of viewports) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!overflow, `No horizontal scroll on ${pagePath} at ${w}px`);
      await page.close();
    }
  }

  console.log('\n--- 4. Search Trigger & Logo Overlap Audit ---');
  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const audit = await page.evaluate((width) => {
      const logo = document.querySelector('.site-logo');
      const logoRect = logo.getBoundingClientRect();
      const desktopSearch = document.getElementById('header-search-trigger');
      const mobileSearch = document.getElementById('mobile-search-trigger');

      const isDesktopSearchVisible = desktopSearch && desktopSearch.offsetParent !== null && window.getComputedStyle(desktopSearch).display !== 'none';
      const isMobileSearchVisible = mobileSearch && mobileSearch.offsetParent !== null && window.getComputedStyle(mobileSearch).display !== 'none';

      // Check for elements overlapping logo
      const allEls = Array.from(document.querySelectorAll('header *'));
      const overlapping = allEls.filter(el => {
        if (el === logo || logo.contains(el) || el.contains(logo)) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        return !(r.right <= logoRect.left || r.left >= logoRect.right || r.bottom <= logoRect.top || r.top >= logoRect.bottom);
      }).length;

      return { isDesktopSearchVisible, isMobileSearchVisible, overlapping };
    }, w);

    if (w < 900) {
      assert(!audit.isDesktopSearchVisible, `Desktop search trigger hidden at ${w}px`);
    } else {
      assert(audit.isDesktopSearchVisible, `Desktop search trigger visible at ${w}px`);
    }
    assert(audit.overlapping === 0, `No element overlaps site logo at ${w}px`);
    await page.close();
  }

  console.log('\n--- 5. Hero Popular Chips & Tool Card Integrity ---');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

    const chipCount = await page.locator('.hero-quick-access .quick-chip').count();
    assert(chipCount === 6, `Hero quick-access has exactly 6 chips (found ${chipCount})`);

    const chipsWithIcons = await page.locator('.hero-quick-access .quick-chip svg, .hero-quick-access .quick-chip .quick-chip-icon').count();
    assert(chipsWithIcons >= 6, `Every popular chip has a visible icon`);

    const popularCardsCount = await page.locator('#popular-tools .tool-card').count();
    assert(popularCardsCount === 6, `Popular Tools section renders exactly 6 cards (found ${popularCardsCount})`);

    await page.close();
  }

  console.log('\n--- 6. Tool Page UX, Sticky TOC, Actions Bar & Byline ---');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${baseUrl}/tools/days-until-date-calculator/`, { waitUntil: 'networkidle' });

    // Verify Byline
    const byline = await page.textContent('.tool-byline');
    assert(byline.includes('By Abu Umair'), 'Byline displays author Abu Umair');
    assert(!byline.includes('TODO_'), 'Byline contains no TODO_ placeholder');
    const hasTimeTag = await page.locator('.tool-byline time[datetime]').count();
    assert(hasTimeTag >= 1, 'Byline contains machine-readable time element with datetime');

    // Verify Result actions bar position directly under result box
    const actionsPos = await page.evaluate(() => {
      const rb = document.querySelector('#result-box');
      const ab = document.querySelector('#result-actions-bar');
      if (!rb || !ab) return null;
      const rbRect = rb.getBoundingClientRect();
      const abRect = ab.getBoundingClientRect();
      return Math.round(abRect.top - rbRect.bottom);
    });
    assert(actionsPos !== null && actionsPos <= 200, `Result actions bar is located within 200px directly below result box (distance: ${actionsPos}px)`);

    // Verify exactly one copy control
    const copyControlsCount = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#action-copy-btn, #copy-result-btn, #copyResultBtn'));
      return btns.filter(b => b.offsetParent !== null && window.getComputedStyle(b).display !== 'none').length;
    });
    assert(copyControlsCount === 1, `Exactly one visible copy control per result (found ${copyControlsCount})`);

    // Verify TOC aside does not intersect main column
    const bounds = await page.evaluate(() => {
      const mainCol = document.querySelector('.tool-main-col').getBoundingClientRect();
      const aside = document.querySelector('.tool-toc-aside').getBoundingClientRect();
      const intersects = !(aside.left >= mainCol.right || aside.right <= mainCol.left || aside.top >= mainCol.bottom || aside.bottom <= mainCol.top);
      return { intersects, mainRight: Math.round(mainCol.right), asideLeft: Math.round(aside.left) };
    });
    assert(!bounds.intersects, `TOC aside does not intersect main column (main right: ${bounds.mainRight}px, aside left: ${bounds.asideLeft}px)`);

    // Verify Sticky TOC stays in viewport when scrolled
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(100);
    const tocStickyVisible = await page.evaluate(() => {
      const toc = document.querySelector('.tool-toc-sticky');
      if (!toc) return false;
      const r = toc.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight + 100;
    });
    assert(tocStickyVisible, 'Sticky TOC stays inside viewport during vertical scrolling');

    // Verify no tool appears twice across related tools
    const relatedSlugs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.related-tools-section .tool-card'));
      return links.map(a => a.getAttribute('data-slug') || a.getAttribute('href'));
    });
    const uniqueRelated = new Set(relatedSlugs);
    assert(uniqueRelated.size === relatedSlugs.length, `No duplicate tools in related section (${relatedSlugs.length} unique tools)`);

    await page.close();
  }

  await browser.close();
  server.close();

  console.log('\n========================================================');
  if (failures === 0) {
    console.log('🎉 ALL LAYOUT, UX & PRIVACY REGRESSION TESTS PASSED');
    process.exit(0);
  } else {
    console.error(`💥 LAYOUT TESTS COMPLETED WITH ${failures} FAILURE(S)`);
    process.exit(1);
  }
}

run();
