const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'tools.json'), 'utf8'));
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
  const allToolsMatch = html.match(/<div class="all-tools-wrapper"[\s\S]*?id="all-tools"[\s\S]*?<\/div>\s*<!-- 5\. Why/i);
  assert(!!allToolsMatch, 'All tools section wrapper found in HTML');
  if (allToolsMatch) {
    const allToolsHtml = allToolsMatch[0];
    const missingTools = [];
    const duplicatedTools = [];
    TOOLS_DATA.forEach(t => {
      const regex = new RegExp(`href="/tools/${t.slug}/"`, 'g');
      const count = (allToolsHtml.match(regex) || []).length;
      if (count === 0) missingTools.push(t.slug);
      if (count > 1) duplicatedTools.push(`${t.slug} (${count} times)`);
    });
    assert(missingTools.length === 0, `All ${TOOLS_DATA.length} tools appear in "All tools" section (missing: ${missingTools.join(', ') || 'none'})`);
    assert(duplicatedTools.length === 0, `Every tool appears exactly once in "All tools" section (duplicates: ${duplicatedTools.join(', ') || 'none'})`);
  }

  // 3. Every category id exists and is linked from nav/jump-bar
  const missingCatSections = [];
  const unlinkedCats = [];
  CATEGORIES_DATA.forEach(cat => {
    if (!html.includes(`id="cat-${cat.slug}"`)) {
      missingCatSections.push(cat.slug);
    }
    const hasNav = html.includes(`href="/#cat-${cat.slug}"`) || html.includes(`href="#cat-${cat.slug}"`);
    if (!hasNav) {
      unlinkedCats.push(cat.slug);
    }
  });
  assert(missingCatSections.length === 0, `Every category id exists in DOM (missing: ${missingCatSections.join(', ') || 'none'})`);
  assert(unlinkedCats.length === 0, `Every category is linked from navigation (unlinked: ${unlinkedCats.join(', ') || 'none'})`);

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
    assert(!mismatch && visibleSummaries.length === jsonQuestions.length && visibleSummaries.length >= 5,
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
