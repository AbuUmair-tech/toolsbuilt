const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'tools.json'), 'utf8'));
// Listed tools only: country pages (listed: false) are reached through their parent tool
const LISTED = TOOLS_DATA.filter(t => t.listed !== false);
const HIDDEN = TOOLS_DATA.filter(t => t.listed === false);
const CATEGORIES_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'categories.json'), 'utf8'));
const SITE_DIR = path.join(ROOT, '_site');
const INDEX_HTML_PATH = path.join(SITE_DIR, 'index.html');

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function runHomepageChecks() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error(`❌ FAIL: Built homepage not found at ${INDEX_HTML_PATH}`);
    process.exit(1);
  }

  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  // 1. Exactly one H1
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  assert(h1Matches.length === 1, `Homepage has exactly one H1 (found ${h1Matches.length})`);

  // 2. Every tool in tools.json appears exactly once in the "All tools" section
  const allToolsMatch = html.match(/<section[^>]*id="all-tools"[\s\S]*?<\/section>/i);
  assert(!!allToolsMatch, 'All tools section found in HTML');
  if (allToolsMatch) {
    const allToolsHtml = allToolsMatch[0];
    const missingTools = [];
    const duplicatedTools = [];
    LISTED.forEach(t => {
      const regex = new RegExp(`href="/tools/${t.slug}/"`, 'g');
      const count = (allToolsHtml.match(regex) || []).length;
      if (count === 0) missingTools.push(t.slug);
      if (count > 1) duplicatedTools.push(`${t.slug} (${count} times)`);
    });
    assert(missingTools.length === 0, `All ${LISTED.length} listed tools appear in "All tools" section (missing: ${missingTools.join(', ') || 'none'})`);
    assert(duplicatedTools.length === 0, `Every tool appears exactly once in "All tools" section (duplicates: ${duplicatedTools.join(', ') || 'none'})`);
  }

  // 3. One category card per category, and an "All tools" group per category
  const cardCount = (html.match(/class="category-card"/g) || []).length;
  assert(cardCount === CATEGORIES_DATA.length, `Category grid has one card per category (${cardCount}/${CATEGORIES_DATA.length})`);
  const missingCatSections = [];
  const unlinkedCats = [];
  CATEGORIES_DATA.forEach(cat => {
    if (!html.includes(`id="cat-${cat.slug}"`)) missingCatSections.push(cat.slug);
    if (!html.includes(`href="/category/${cat.slug}/" class="category-card"`)) unlinkedCats.push(cat.slug);
  });
  assert(missingCatSections.length === 0, `Every category has an "All tools" group (missing: ${missingCatSections.join(', ') || 'none'})`);
  assert(unlinkedCats.length === 0, `Every category card links to its category page (unlinked: ${unlinkedCats.join(', ') || 'none'})`);

  // Popular tools: tools with popular: true, max 8
  const popularMatch = html.match(/<section[^>]*id="popular-tools"[\s\S]*?<\/section>/i);
  const expectedPopular = LISTED.filter(t => t.popular).length;
  const popularLinks = popularMatch ? (popularMatch[0].match(/href="\/tools\/[a-z0-9-]+\/" class="tool-card"/g) || []).length : 0;
  assert(popularLinks === Math.min(8, expectedPopular), `Popular tools lists ${Math.min(8, expectedPopular)} popular tools (found ${popularLinks})`);

  // Unlisted tools (country pages) never appear on the homepage
  const shownHidden = HIDDEN.filter(t => html.includes(`href="/tools/${t.slug}/"`)).map(t => t.slug);
  assert(shownHidden.length === 0, `Unlisted tools are not linked from the homepage (found: ${shownHidden.join(', ') || 'none'})`);

  // Removed blocks stay removed
  ['how-it-works', 'home-cta', 'trust-badge', 'quick-chip', 'jump-pill'].forEach(cls => {
    assert(!html.includes(cls), `Homepage no longer contains "${cls}"`);
  });

  // 4. FAQ JSON-LD questions match visible <summary> text
  const visibleSummaries = [...html.matchAll(/<summary class="faq-question">[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<\/summary>/gi)].map(m => m[1].trim());
  const jsonLdScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => {
    try { return JSON.parse(m[1].trim()); } catch (e) { return null; }
  }).filter(Boolean);

  const faqSchema = jsonLdScripts.find(s => s['@type'] === 'FAQPage');
  assert(!!faqSchema, 'FAQPage JSON-LD schema is present in HTML');

  if (faqSchema && Array.isArray(faqSchema.mainEntity)) {
    const jsonQuestions = faqSchema.mainEntity.map(e => (e.name || '').trim());
    const mismatch = visibleSummaries.some((vq, i) => vq !== jsonQuestions[i]);
    assert(!mismatch && visibleSummaries.length === jsonQuestions.length && visibleSummaries.length >= 1 && visibleSummaries.length <= 5,
      `FAQ JSON-LD questions match visible <summary> text (${visibleSummaries.length} questions synchronized)`);
  }

  // 5. No TODO_ placeholder text appears in built HTML
  assert(!html.includes('TODO_'), 'No "TODO_" placeholder text appears in built homepage HTML');

  // 6. No invented-number patterns (only numbers derived from real computed values)
  // Check for common marketing exaggeration patterns
  const marketingNumberPatterns = [
    /\b\d{1,3}(?:,\d{3})+\s*(?:\+|plus)?\s*(?:users|clients|downloads|calculations|happy)/i,
    /\b(?:4\.\d|5\.0)\s*\/\s*5(?:\.0)?\b/i,
    /\b(?:top|rated|ranked)\s*#?1\b/i,
    /\b(?:trusted by|loved by)\s*\d+/i
  ];
  let foundInvented = false;
  marketingNumberPatterns.forEach(pattern => {
    if (pattern.test(html)) {
      foundInvented = true;
      console.error(`Found invented marketing number pattern: ${pattern}`);
    }
  });
  assert(!foundInvented, 'No invented numbers, user counts, or fake rating statistics on homepage');

  if (failures > 0) {
    console.error(`\n❌ Homepage verification completed with ${failures} failure(s).`);
    process.exit(1);
  } else {
    console.log('✅ All homepage static audit checks passed!');
  }
}

if (require.main === module) {
  runHomepageChecks();
}

module.exports = { runHomepageChecks };
