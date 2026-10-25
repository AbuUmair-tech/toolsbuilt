#!/usr/bin/env node
/**
 * Comprehensive Automated Verification Suite for ToolsBuilt.com
 * Tests Eleventy staging and production builds, link/schema integrity,
 * HTML comment artifacts, mathematical formulas, date boundaries,
 * password generator crypto/uniformity, text counters, and JS syntax.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('========================================================');
console.log('   ToolsBuilt.com Comprehensive Test & Audit Suite      ');
console.log('========================================================\n');

// -----------------------------------------------------------------
// Test 1: Staging Build & Link/Quality Checker
// -----------------------------------------------------------------
console.log('--- 1. Staging Build & Quality Checker ---');
try {
  const stagingEnv = { ...process.env };
  delete stagingEnv.SITE_ENV;
  delete stagingEnv.NODE_ENV;

  console.log('Cleaning _site and building staging site (npx @11ty/eleventy)...');
  fs.rmSync(path.join(ROOT, '_site'), { recursive: true, force: true });
  execSync('npx @11ty/eleventy', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: stagingEnv
  });

  console.log('Running check-links.js in staging mode...');
  const stagingOutput = execSync('node scripts/check-links.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: stagingEnv
  });

  assert(
    stagingOutput.includes('All checks passed! No errors or warnings found.'),
    'Staging build: all checks passed (pages have noindex, robots.txt disallows all)'
  );

  const stagingDsHtml = fs.readFileSync(path.join(ROOT, '_site', 'design-system', 'index.html'), 'utf8');
  assert(
    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i.test(stagingDsHtml),
    'Staging build: /design-system/ has required noindex meta tag'
  );
} catch (e) {
  const output = (e.stdout || '') + (e.stderr || '');
  assert(false, `Staging build or check-links failed: ${e.message}${output ? '\n' + output : ''}`);
}

// -----------------------------------------------------------------
// Test 2: Production Build & Link/Quality Checker
// -----------------------------------------------------------------
console.log('\n--- 2. Production Build & Quality Checker ---');
try {
  const prodEnv = { ...process.env, SITE_ENV: 'production' };

  console.log('Cleaning _site and building production site (SITE_ENV=production npx @11ty/eleventy)...');
  fs.rmSync(path.join(ROOT, '_site'), { recursive: true, force: true });
  execSync('SITE_ENV=production npx @11ty/eleventy', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: prodEnv
  });

  console.log('Running check-links.js in production mode...');
  const prodOutput = execSync('SITE_ENV=production node scripts/check-links.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: prodEnv
  });

  assert(
    prodOutput.includes('All checks passed! No errors or warnings found.'),
    'Production build: all checks passed (no pages have noindex, robots.txt allows all)'
  );

  const prodDsHtml = fs.readFileSync(path.join(ROOT, '_site', 'design-system', 'index.html'), 'utf8');
  assert(
    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i.test(prodDsHtml),
    'Production build: /design-system/ has required noindex meta tag'
  );

  const sitemapXml = fs.readFileSync(path.join(ROOT, '_site', 'sitemap.xml'), 'utf8');
  assert(
    !sitemapXml.includes('design-system'),
    'Production build: /design-system/ is excluded from sitemap.xml'
  );
} catch (e) {
  const output = (e.stdout || '') + (e.stderr || '');
  assert(false, `Production build or check-links failed: ${e.message}${output ? '\n' + output : ''}`);
}

// -----------------------------------------------------------------
// Test 3: Raw `-->` HTML Artifact Audit in _site/
// -----------------------------------------------------------------
console.log('\n--- 3. Raw `-->` HTML Rendering Artifact Check ---');
function collectHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const siteDir = path.join(ROOT, '_site');
const htmlFiles = collectHtmlFiles(siteDir);
let rawArtifactsFound = 0;
for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Check for nested comments or naked comment endings outside comments
  // Simulate standard HTML parser tokenizer
  let inComment = false;
  let i = 0;
  while (i < content.length) {
    if (!inComment && content.startsWith('<!--', i)) {
      inComment = true;
      i += 4;
    } else if (inComment && content.startsWith('-->', i)) {
      inComment = false;
      i += 3;
    } else if (!inComment && content.startsWith('-->', i)) {
      console.error(`Found raw --> in ${path.relative(ROOT, file)} at offset ${i}`);
      rawArtifactsFound++;
      i += 3;
    } else {
      i++;
    }
  }
}
assert(rawArtifactsFound === 0, `No raw '-->' text artifacts across ${htmlFiles.length} HTML files in _site/`);

// -----------------------------------------------------------------
// Test 4: Date Arithmetic & Month Clamping Tests
// -----------------------------------------------------------------
console.log('\n--- 4. Date Arithmetic & Boundary Calculations ---');

function addMonthsClamped(date, monthsToAdd) {
  const startYear = date.getFullYear();
  const startMonth = date.getMonth();
  const startDay = date.getDate();
  const totalMonths = startYear * 12 + startMonth + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(startDay, maxDay);
  return new Date(targetYear, targetMonth, targetDay);
}

// Jan 31 + 1 month in non-leap year (2026) -> Feb 28, 2026
const jan31_2026 = new Date(2026, 0, 31);
const feb_2026 = addMonthsClamped(jan31_2026, 1);
assert(feb_2026.getFullYear() === 2026 && feb_2026.getMonth() === 1 && feb_2026.getDate() === 28,
  'Jan 31 2026 + 1 month = Feb 28 2026 (non-leap year)');

// Jan 31 + 1 month in leap year (2028) -> Feb 29, 2028
const jan31_2028 = new Date(2028, 0, 31);
const feb_2028 = addMonthsClamped(jan31_2028, 1);
assert(feb_2028.getFullYear() === 2028 && feb_2028.getMonth() === 1 && feb_2028.getDate() === 29,
  'Jan 31 2028 + 1 month = Feb 29 2028 (leap year)');

// Feb 29 2028 + 1 year -> Feb 28 2029
const feb29_2028 = new Date(2028, 1, 29);
const feb_2029 = addMonthsClamped(feb29_2028, 12);
assert(feb_2029.getFullYear() === 2029 && feb_2029.getMonth() === 1 && feb_2029.getDate() === 28,
  'Feb 29 2028 + 1 year = Feb 28 2029');

// Dec 31 2026 + 2 months -> Feb 28 2027
const dec31_2026 = new Date(2026, 11, 31);
const feb_2027 = addMonthsClamped(dec31_2026, 2);
assert(feb_2027.getFullYear() === 2027 && feb_2027.getMonth() === 1 && feb_2027.getDate() === 28,
  'Dec 31 2026 + 2 months = Feb 28 2027');

// Business days: 12 Oct 2026 (Mon) minus 30 business days = Mon 31 Aug 2026
function subtractBusinessDays(startDate, count) {
  const cur = new Date(startDate);
  let subtracted = 0;
  while (subtracted < count) {
    cur.setDate(cur.getDate() - 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) subtracted++;
  }
  return cur;
}
const bdayTest1 = subtractBusinessDays(new Date(2026, 9, 12), 30);
assert(bdayTest1.getFullYear() === 2026 && bdayTest1.getMonth() === 7 && bdayTest1.getDate() === 31,
  '12 Oct 2026 minus 30 business days = Mon 31 Aug 2026');

// Fri 9 Oct 2026 + 5 business days = Fri 16 Oct 2026
function addBusinessDays(startDate, count) {
  const cur = new Date(startDate);
  let added = 0;
  while (added < count) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return cur;
}
const bdayTest2 = addBusinessDays(new Date(2026, 9, 9), 5);
assert(bdayTest2.getFullYear() === 2026 && bdayTest2.getMonth() === 9 && bdayTest2.getDate() === 16,
  'Fri 9 Oct 2026 + 5 business days = Fri 16 Oct 2026');

// -----------------------------------------------------------------
// Test 5: Password Generator Crypto & Unbiased Generation
// -----------------------------------------------------------------
console.log('\n--- 5. Password Generator Guarantees & Rejection Sampling ---');

const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CHARS_NUMBERS = '0123456789';
const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const crypto = require('crypto');
function getSecureRandomIndex(poolLength) {
  if (poolLength <= 1) return 0;
  const maxValid = Math.floor(0x100000000 / poolLength) * poolLength;
  const buffer = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < maxValid) {
      return buffer[0] % poolLength;
    }
  }
}

function generateTestPassword(length, sets) {
  const activeSets = sets.filter(s => s.length > 0);
  const charPool = activeSets.join('');
  const passwordChars = [];

  for (let i = 0; i < Math.min(activeSets.length, length); i++) {
    const set = activeSets[i];
    passwordChars.push(set.charAt(getSecureRandomIndex(set.length)));
  }
  while (passwordChars.length < length) {
    passwordChars.push(charPool.charAt(getSecureRandomIndex(charPool.length)));
  }
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }
  return passwordChars.join('');
}

// Generate 50 passwords with all 4 sets enabled at length 16
let allSetsSatisfied = true;
for (let i = 0; i < 50; i++) {
  const pw = generateTestPassword(16, [CHARS_UPPER, CHARS_LOWER, CHARS_NUMBERS, CHARS_SYMBOLS]);
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw);
  if (!hasUpper || !hasLower || !hasNum || !hasSym || pw.length !== 16) {
    allSetsSatisfied = false;
    break;
  }
}
assert(allSetsSatisfied, '100% of generated passwords strictly contain all 4 selected character sets');

// Verify rejection sampling distribution (uniformity)
const buckets = new Array(5).fill(0);
const samples = 20000;
for (let i = 0; i < samples; i++) {
  buckets[getSecureRandomIndex(5)]++;
}
const expected = samples / 5;
const maxDeviation = Math.max(...buckets.map(b => Math.abs(b - expected) / expected));
assert(maxDeviation < 0.05, `Rejection sampling uniformity test passed (max deviation ${(maxDeviation * 100).toFixed(2)}% < 5%)`);

// -----------------------------------------------------------------
// Test 6: Mathematical & Financial Calculators
// -----------------------------------------------------------------
console.log('\n--- 6. Math & Financial Calculator Formulas ---');

// Percentage Change Mode 1: ((New - Old) / |Old|) * 100
function calcPercentChange(oldVal, newVal) {
  if (oldVal === 0) return { error: 'Division by zero' };
  const diff = newVal - oldVal;
  return { change: (diff / Math.abs(oldVal)) * 100 };
}
assert(calcPercentChange(100, 150).change === 50, 'Percentage increase: 100 to 150 = +50%');
assert(calcPercentChange(100, 50).change === -50, 'Percentage decrease: 100 to 50 = -50%');
assert(calcPercentChange(-100, -50).change === 50, 'Negative baseline: -100 to -50 = +50%');
assert(calcPercentChange(0, 50).error === 'Division by zero', 'Division by zero handled safely');

// Discount Calculator: Stacked discounts and tax
function calcDiscount(orig, d1, d2, tax) {
  const afterD1 = orig - (orig * d1) / 100;
  const afterD2 = afterD1 - (afterD1 * d2) / 100;
  const taxAmt = (afterD2 * tax) / 100;
  return afterD2 + taxAmt;
}
const finalPrice = calcDiscount(100, 20, 10, 5); // 100 -> 80 -> 72 -> 72 + 3.60 = 75.60
assert(Math.abs(finalPrice - 75.60) < 0.001, 'Stacked discount (20% + 10%) with 5% tax on $100 = $75.60');

// -----------------------------------------------------------------
// Test 7: Text Tools
// -----------------------------------------------------------------
console.log('\n--- 7. Text Counter & Case Converter ---');

function countWordsAndChars(text) {
  const charWith = text.length;
  const charNo = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
  return { words, charWith, charNo, sentences };
}
const textStats = countWordsAndChars('Hello world! This is ToolsBuilt.');
assert(textStats.words === 5 && textStats.sentences === 2 && textStats.charNo === 28,
  'Word, sentence, and character counts are accurate');

// -----------------------------------------------------------------
// Test 8: JavaScript Syntax Compilation Check
// -----------------------------------------------------------------
console.log('\n--- 8. JavaScript Syntax Compilation Check ---');
try {
  execSync('node -c src/assets/js/*.js src/tools/*/script.js', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });

  // In addition, explicitly compile each file individually to guarantee full coverage
  const jsFiles = [];
  const assetsJsDir = path.join(ROOT, 'src', 'assets', 'js');
  if (fs.existsSync(assetsJsDir)) {
    fs.readdirSync(assetsJsDir).filter(f => f.endsWith('.js')).forEach(f => {
      jsFiles.push(path.join('src', 'assets', 'js', f));
    });
  }
  const toolsDir = path.join(ROOT, 'src', 'tools');
  if (fs.existsSync(toolsDir)) {
    fs.readdirSync(toolsDir, { withFileTypes: true }).forEach(d => {
      if (d.isDirectory()) {
        const scriptFile = path.join('src', 'tools', d.name, 'script.js');
        if (fs.existsSync(path.join(ROOT, scriptFile))) {
          jsFiles.push(scriptFile);
        }
      }
    });
  }
  for (const file of jsFiles) {
    execSync(`node -c "${file}"`, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  }

  assert(jsFiles.length > 0, `All JavaScript files (${jsFiles.length}) in src/assets/js/*.js and src/tools/*/script.js passed syntax compilation`);
} catch (e) {
  assert(false, `JS syntax compilation failed: ${e.message}`);
}

// -----------------------------------------------------------------
// Test 9: WCAG AA Color Contrast Verification
// -----------------------------------------------------------------
console.log('\n--- 9. WCAG AA Color Contrast Verification ---');
try {
  const contrastOutput = execSync('node scripts/check-contrast.js', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  assert(contrastOutput.includes('ALL WCAG AA CONTRAST CHECKS PASSED'), 'WCAG AA contrast: all token color pairs pass AA standards');
} catch (e) {
  assert(false, `WCAG AA contrast check failed: ${e.message}\n${e.stdout || ''}`);
}

// -----------------------------------------------------------------
// Test 10: CSS Performance & Size Budget Check
// -----------------------------------------------------------------
console.log('\n--- 10. CSS Size Budget & Performance Check ---');
const zlib = require('zlib');
const cssDir = path.join(ROOT, '_site', 'assets', 'css');
let mainCssFile = null;
if (fs.existsSync(cssDir)) {
  const files = fs.readdirSync(cssDir);
  mainCssFile = files.find(f => /^main\.[a-f0-9]+\.css$/.test(f));
}
if (!mainCssFile) {
  assert(false, 'Hashed main CSS bundle (main.[hash].css) not found in _site/assets/css/');
} else {
  const cssContent = fs.readFileSync(path.join(cssDir, mainCssFile));
  const gzipped = zlib.gzipSync(cssContent);
  const sizeKb = (cssContent.length / 1024).toFixed(2);
  const gzSizeKb = (gzipped.length / 1024).toFixed(2);
  console.log(`Main CSS bundle: ${mainCssFile} (${sizeKb} KB minified, ${gzSizeKb} KB gzipped)`);
  assert(gzipped.length <= 30 * 1024, `CSS size budget: ${gzSizeKb} KB <= 30 KB gzipped limit (target < 25 KB)`);
}

// -----------------------------------------------------------------
// Test 11: Design System Navigation Exclusion Check
// -----------------------------------------------------------------
console.log('\n--- 11. Design System Navigation Check ---');
const indexHtml = fs.readFileSync(path.join(ROOT, '_site', 'index.html'), 'utf8');
const headerNavRegex = /<header[\s\S]*?<\/header>/i;
const footerNavRegex = /<footer[\s\S]*?<\/footer>/i;
const headerHtml = (indexHtml.match(headerNavRegex) || [''])[0];
const footerHtml = (indexHtml.match(footerNavRegex) || [''])[0];
assert(!headerHtml.includes('/design-system') && !footerHtml.includes('/design-system'),
  'Design system page does not appear in site navigation');

// -----------------------------------------------------------------
// Test 12: Playwright Global Layout & Interaction Tests
// -----------------------------------------------------------------
console.log('\n--- 12. Playwright Global Layout & Interaction Tests ---');
try {
  const interactionOutput = execSync('node scripts/test-interactions.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    interactionOutput.includes('ALL PLAYWRIGHT INTERACTION TESTS PASSED'),
    'Playwright interactions: Ctrl+K, search ranking, focus restoration, mobile drawer, focus trap'
  );
} catch (e) {
  assert(false, `Playwright interaction tests failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 13: Homepage Structure, Schema & Registry Data Integrity
// -----------------------------------------------------------------
console.log('\n--- 13. Homepage Structure, Schema & Data Integrity ---');
try {
  const hpOutput = execSync('node scripts/check-homepage.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    hpOutput.includes('All homepage static audit checks passed!'),
    'Homepage audit: single H1, all tools present once, categories linked, FAQ JSON-LD parity, no TODOs, no fake stats'
  );
} catch (e) {
  assert(false, `Homepage static audit checks failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 14: Playwright Homepage Search & Dynamic Interactions
// -----------------------------------------------------------------
console.log('\n--- 14. Playwright Homepage Interactions & Search ---');
try {
  const hpInteractionOutput = execSync('node scripts/test-homepage-interactions.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    hpInteractionOutput.includes('All homepage Playwright interaction tests passed successfully!'),
    'Homepage interactions: hero live search, Enter to open top match, recent-tools row + Clear, jump pills, no 375px overflow'
  );
} catch (e) {
  assert(false, `Homepage interaction tests failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 15: Category Hub, All-Tools Directory & Tool Template Integrity
// -----------------------------------------------------------------
console.log('\n--- 15. Category Hub, Directory & Tool Template Integrity ---');
try {
  const templateOutput = execSync('node scripts/check-templates.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    templateOutput.includes('ALL TEMPLATE & DIRECTORY INTEGRITY CHECKS PASSED'),
    'Template audit: 5 category hubs, /tools/ directory, 10 tool pages, breadcrumbs, JSON-LD, sitemap, result actions'
  );
} catch (e) {
  assert(false, `Template & Directory integrity checks failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 16: Playwright Tool Calculations, Result Actions & Directory
// -----------------------------------------------------------------
console.log('\n--- 16. Playwright Tool Calculations, Result Actions & Directory ---');
try {
  const toolInteractionOutput = execSync('node scripts/test-template-interactions.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    toolInteractionOutput.includes('ALL PLAYWRIGHT TEMPLATE & DIRECTORY TESTS PASSED'),
    'Playwright template interactions: age/discount/password calculations, copy toast, reset, category hub, directory filtering'
  );
} catch (e) {
  assert(false, `Tool template interaction tests failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 17: Structured Data (JSON-LD) & Schema Parity Audit
// -----------------------------------------------------------------
console.log('\n--- 17. Structured Data (JSON-LD) & Schema Parity Audit ---');
try {
  const schemaOutput = execSync('node scripts/check-schema.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    schemaOutput.includes('JSON-LD schemas validated successfully'),
    'Structured data audit: all JSON-LD schemas valid, proper shapes, DOM-schema parity, no fabricated fields'
  );
} catch (e) {
  assert(false, `Structured data audit failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 18: Technical SEO, Link Crawlability, Metadata Bounds & Accessibility
// -----------------------------------------------------------------
console.log('\n--- 18. Technical SEO, Crawlability, Metadata & Accessibility ---');
try {
  const seoOutput = execSync('node scripts/check-seo.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    seoOutput.includes('Technical SEO & Accessibility audit PASSED'),
    'SEO audit: depth <= 3, trailing slashes, anchor integrity, descriptive links, title/desc bounds, og:image <= 100KB'
  );
} catch (e) {
  assert(false, `Technical SEO & Accessibility audit failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 19: Pure Tool Logic Modules & Property Fuzz Tests
// -----------------------------------------------------------------
console.log('\n--- 19. Pure Tool Logic Modules & Property-Based Fuzz Testing ---');
try {
  const logicOutput = execSync('node scripts/test-tool-logic.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    logicOutput.includes('ALL PURE LOGIC & PROPERTY FUZZ TESTS PASSED'),
    'Pure logic: 10 tools, unit edge cases, DST/UTC invariance, Mulberry32 property fuzzing (500 runs)'
  );
} catch (e) {
  assert(false, `Pure logic unit/fuzz tests failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 20: Playwright Tool UX, Debounce, Enter-Key & axe-core A11y Suite
// -----------------------------------------------------------------
console.log('\n--- 20. Playwright Tool UX, Debounce, Enter-Key & axe-core Suite ---');
try {
  const toolUxOutput = execSync('node scripts/test-tool-ux.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    toolUxOutput.includes('ALL TOOL UX, DEBOUNCE, ENTER-KEY & AXE-CORE TESTS PASSED'),
    'Tool UX: 10 tools, live 150ms debounce, Enter key submission, copy toast, 0 axe-core violations in light & dark mode'
  );
} catch (e) {
  assert(false, `Tool UX & axe-core tests failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 21: Layout, Container Alignment, Search Overlap & Privacy Invariance Suite
// -----------------------------------------------------------------
console.log('\n--- 21. Layout, Container Alignment, Search Overlap & Privacy Suite ---');
try {
  const layoutOutput = execSync('node scripts/test-layout-final.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert(
    layoutOutput.includes('ALL LAYOUT, UX & PRIVACY REGRESSION TESTS PASSED'),
    'Layout regression: container alignment, search overlap, 6 chips with icons, 2-col tool page, sticky TOC, privacy audit'
  );
} catch (e) {
  assert(false, `Layout regression suite failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
}

// -----------------------------------------------------------------
// Test 22: Blog Tooling, Draft Rendering & Published Post SEO Audit
// -----------------------------------------------------------------
console.log('\n--- 22. Blog Tooling, Draft Rendering & Published Post SEO Audit ---');
try {
  const testTitle = 'Automated Verification Draft Post';
  const testSlug = 'percentage-change-calculator';
  const expectedFile = path.join(ROOT, 'src', 'blog', 'automated-verification-draft-post.md');

  // 1. Test scripts/new-post.js scaffolding
  if (fs.existsSync(expectedFile)) fs.unlinkSync(expectedFile);
  execSync(`node scripts/new-post.js "${testTitle}" ${testSlug}`, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  assert(fs.existsSync(expectedFile), 'new-post script created draft post file in src/blog/');

  const createdContent = fs.readFileSync(expectedFile, 'utf8');
  assert(createdContent.includes('draft: true'), 'New post has draft: true');
  assert(createdContent.includes('## Quick answer'), 'New post has Quick answer H2 skeleton');
  assert(createdContent.includes('tool: "percentage-change-calculator"'), 'New post includes tool slug');

  // 2. Drafts must pass check-seo because they are skipped
  const seoCheckWithDraft = execSync('node scripts/check-seo.js', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  assert(seoCheckWithDraft.includes('Technical SEO & Accessibility audit PASSED'), 'Draft posts are skipped by check-seo.js');

  // 3. Staging build renders draft with DRAFT banner
  execSync('npx @11ty/eleventy', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  const draftHtmlPath = path.join(ROOT, '_site', 'blog', 'automated-verification-draft-post', 'index.html');
  assert(fs.existsSync(draftHtmlPath), 'Staging build renders draft post page');
  if (fs.existsSync(draftHtmlPath)) {
    const draftHtml = fs.readFileSync(draftHtmlPath, 'utf8');
    assert(draftHtml.includes('draft-banner') && draftHtml.includes('DRAFT'), 'Draft post page displays visible DRAFT banner in staging');
    assert(draftHtml.includes('noindex, nofollow'), 'Draft post has noindex meta in staging');
  }

  // 4. Production build excludes draft post
  fs.rmSync(path.join(ROOT, '_site'), { recursive: true, force: true });
  execSync('SITE_ENV=production npx @11ty/eleventy', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  assert(!fs.existsSync(draftHtmlPath), 'Production build does not output draft post HTML');
  const prodSitemap = fs.readFileSync(path.join(ROOT, '_site', 'sitemap.xml'), 'utf8');
  assert(!prodSitemap.includes('automated-verification-draft-post'), 'Production sitemap excludes draft post');
  const prodFeed = fs.readFileSync(path.join(ROOT, '_site', 'feed.xml'), 'utf8');
  assert(!prodFeed.includes('automated-verification-draft-post'), 'Production feed excludes draft post');
  const prodLlms = fs.readFileSync(path.join(ROOT, '_site', 'llms.txt'), 'utf8');
  assert(!prodLlms.includes('automated-verification-draft-post'), 'Production llms.txt excludes draft post');
  const prodBlogIndex = fs.readFileSync(path.join(ROOT, '_site', 'blog', 'index.html'), 'utf8');
  assert(!prodBlogIndex.includes('automated-verification-draft-post'), 'Production blog index excludes draft post');

  // 5. check-seo fails on non-draft post with missing requirements
  fs.writeFileSync(expectedFile, createdContent.replace('draft: true', 'draft: false'));
  let seoFailedAsExpected = false;
  try {
    execSync('node scripts/check-seo.js', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    seoFailedAsExpected = true;
    const errOutput = (err.stdout || '') + (err.stderr || '');
    assert(errOutput.includes('automated-verification-draft-post.md'), 'Failing message names the file');
    assert(errOutput.includes('Word count') || errOutput.includes('Missing description') || errOutput.includes('Missing link'), 'Failing message names specific problem(s)');
  }
  assert(seoFailedAsExpected, 'check-seo.js fails when published post violates quality/SEO rules');

  // Cleanup test file
  if (fs.existsSync(expectedFile)) fs.unlinkSync(expectedFile);
} catch (e) {
  assert(false, `Blog tooling verification failed: ${e.message}\n${e.stdout || ''}${e.stderr || ''}`);
  const cleanupFile = path.join(ROOT, 'src', 'blog', 'automated-verification-draft-post.md');
  if (fs.existsSync(cleanupFile)) fs.unlinkSync(cleanupFile);
}

console.log('\n========================================================');
if (failures === 0) {
  console.log('🎉 ALL AUDIT & REGRESSION TESTS PASSED (0 FAILURES)');
} else {
  console.error(`💥 TEST SUITE COMPLETED WITH ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('========================================================\n');
