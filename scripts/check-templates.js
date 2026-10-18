#!/usr/bin/env node
/**
 * Static Validation Suite for Category Hub Pages, All-Tools Directory, and Tool Page Templates
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const tools = require(path.join(ROOT, 'src/_data/tools.json'));
const categories = require(path.join(ROOT, 'src/_data/categories.json'));

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('=== Checking Category Pages, Directory & Tool Templates ===\n');

// 1. Check Sitemap includes all category pages and /tools/
const sitemapPath = path.join(SITE_DIR, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'sitemap.xml exists in _site');
if (fs.existsSync(sitemapPath)) {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  assert(sitemapXml.includes('<loc>https://toolsbuilt.com/tools/</loc>'), 'sitemap.xml includes /tools/');
  categories.forEach(cat => {
    assert(
      sitemapXml.includes(`<loc>https://toolsbuilt.com/category/${cat.slug}/</loc>`),
      `sitemap.xml includes /category/${cat.slug}/`
    );
  });
}

// 2. Check each Category Hub page
console.log('\n--- Checking 5 Category Hub Pages ---');
categories.forEach(cat => {
  const catFile = path.join(SITE_DIR, 'category', cat.slug, 'index.html');
  assert(fs.existsSync(catFile), `Category page exists: /category/${cat.slug}/index.html`);
  if (!fs.existsSync(catFile)) return;

  const html = fs.readFileSync(catFile, 'utf8');

  // Single H1
  const catNameHtml = cat.name.replace(/&/g, '&amp;');
  const h1Matches = html.match(/<h1\b[^>]*>(.*?)<\/h1>/gi) || [];
  assert(h1Matches.length === 1, `/category/${cat.slug}/ has exactly 1 H1`);
  assert(
    h1Matches[0] && (h1Matches[0].includes(`Free ${catNameHtml}`) || h1Matches[0].includes(`Free ${cat.name}`)),
    `/category/${cat.slug}/ H1 contains 'Free ${cat.name}'`
  );

  // Breadcrumbs
  assert(html.includes('aria-label="Breadcrumb"'), `/category/${cat.slug}/ has accessible breadcrumbs`);
  assert(html.includes('<li><a href="/">Home</a></li>'), `/category/${cat.slug}/ breadcrumb links to Home`);
  assert(
    html.includes(`<li aria-current="page">${catNameHtml}</li>`) || html.includes(`<li aria-current="page">${cat.name}</li>`),
    `/category/${cat.slug}/ breadcrumb has current page ${cat.name}`
  );

  // JSON-LD Schemas: BreadcrumbList, CollectionPage, FAQPage
  assert(html.includes('"@type": "BreadcrumbList"'), `/category/${cat.slug}/ contains BreadcrumbList schema`);
  assert(html.includes('"@type": "CollectionPage"'), `/category/${cat.slug}/ contains CollectionPage schema`);
  assert(html.includes('"@type": "FAQPage"'), `/category/${cat.slug}/ contains FAQPage schema`);

  // How to choose & other categories
  assert(html.includes('How to Choose the Right Tool'), `/category/${cat.slug}/ has 'How to Choose' guidance`);
  assert(html.includes('Other Categories'), `/category/${cat.slug}/ has 'Other Categories' section`);

  // Ensure other categories links point to other 4 categories
  const otherCats = categories.filter(c => c.slug !== cat.slug);
  otherCats.forEach(oc => {
    assert(
      html.includes(`/category/${oc.slug}/`),
      `/category/${cat.slug}/ links to other category /category/${oc.slug}/`
    );
  });

  // Check no TODO placeholders in HTML
  assert(!html.includes('TODO_'), `/category/${cat.slug}/ has zero TODO_ placeholders`);
});

// 3. Check All Tools Directory (/tools/)
console.log('\n--- Checking All Tools Directory (/tools/) ---');
const dirFile = path.join(SITE_DIR, 'tools', 'index.html');
assert(fs.existsSync(dirFile), 'Directory page exists: /tools/index.html');
if (fs.existsSync(dirFile)) {
  const dirHtml = fs.readFileSync(dirFile, 'utf8');

  // Single H1
  const h1Matches = dirHtml.match(/<h1\b[^>]*>(.*?)<\/h1>/gi) || [];
  assert(h1Matches.length === 1, '/tools/ has exactly 1 H1');

  // Search input & filter chips
  assert(dirHtml.includes('id="directory-search"'), '/tools/ has directory search input');
  assert(dirHtml.includes('class="directory-filter-bar"'), '/tools/ has directory filter chips bar');
  assert(dirHtml.includes('data-category="all"'), '/tools/ has "All Tools" filter chip');

  // Check chips for each category
  categories.forEach(cat => {
    assert(dirHtml.includes(`data-category="${cat.slug}"`), `/tools/ has filter chip for ${cat.name}`);
  });

  // Check all tools are listed in directory
  tools.forEach(tool => {
    assert(
      dirHtml.includes(`/tools/${tool.slug}/`),
      `/tools/ directory links to tool /tools/${tool.slug}/`
    );
  });

  // Check schemas: BreadcrumbList and CollectionPage + ItemList
  assert(dirHtml.includes('"@type": "BreadcrumbList"'), '/tools/ has BreadcrumbList schema');
  assert(dirHtml.includes('"@type": "CollectionPage"'), '/tools/ has CollectionPage schema');
  assert(dirHtml.includes(`"numberOfItems": ${tools.length}`), `/tools/ schema reports all ${tools.length} items`);
  assert(!dirHtml.includes('TODO_'), '/tools/ has zero TODO_ placeholders');
}

// 4. Check all Tool Pages
console.log('\n--- Checking All 10 Tool Pages Template Upgrades ---');
tools.forEach(tool => {
  const toolFile = path.join(SITE_DIR, 'tools', tool.slug, 'index.html');
  assert(fs.existsSync(toolFile), `Tool page exists: /tools/${tool.slug}/index.html`);
  if (!fs.existsSync(toolFile)) return;

  const toolHtml = fs.readFileSync(toolFile, 'utf8');

  // Breadcrumbs: Home > Category > Tool
  const cat = categories.find(c => c.slug === tool.category);
  const catNameHtml = cat.name.replace(/&/g, '&amp;');
  assert(
    toolHtml.includes(`<a href="/category/${cat.slug}/">${catNameHtml}</a>`),
    `/tools/${tool.slug}/ breadcrumb links to /category/${cat.slug}/`
  );

  // Single H1
  const h1Matches = toolHtml.match(/<h1\b[^>]*>(.*?)<\/h1>/gi) || [];
  assert(h1Matches.length === 1, `/tools/${tool.slug}/ has exactly 1 H1`);

  // Result Actions bar
  assert(
    toolHtml.includes('id="result-actions-bar"'),
    `/tools/${tool.slug}/ has result actions bar`
  );
  assert(
    toolHtml.includes('id="action-copy-btn"'),
    `/tools/${tool.slug}/ has copy button`
  );
  assert(
    toolHtml.includes('id="action-share-btn"'),
    `/tools/${tool.slug}/ has share button`
  );
  assert(
    toolHtml.includes('id="action-print-btn"'),
    `/tools/${tool.slug}/ has print button`
  );
  assert(
    toolHtml.includes('id="action-reset-btn"'),
    `/tools/${tool.slug}/ has reset button`
  );

  // Desktop TOC Aside
  assert(
    toolHtml.includes('class="tool-toc-aside"'),
    `/tools/${tool.slug}/ has desktop TOC aside`
  );

  // Byline & Privacy Note (replaces old large trust block)
  assert(
    toolHtml.includes('class="tool-byline"') || toolHtml.includes('ToolsBuilt editorial team'),
    `/tools/${tool.slug}/ renders author 'ToolsBuilt editorial team'`
  );
  assert(
    !toolHtml.includes('TODO_'),
    `/tools/${tool.slug}/ has no TODO_ placeholders`
  );
  assert(
    toolHtml.includes('class="tool-privacy-note"') || toolHtml.includes('Calculations run') || toolHtml.includes('Inputs never leave'),
    `/tools/${tool.slug}/ has privacy note`
  );

  // JSON-LD Schemas: BreadcrumbList, WebApplication, FAQPage
  assert(
    toolHtml.includes('"@type": "BreadcrumbList"'),
    `/tools/${tool.slug}/ has BreadcrumbList JSON-LD`
  );
  assert(
    toolHtml.includes('"@type": "WebApplication"'),
    `/tools/${tool.slug}/ has WebApplication JSON-LD`
  );
  assert(
    toolHtml.includes('"@type": "FAQPage"'),
    `/tools/${tool.slug}/ has FAQPage JSON-LD`
  );

  // Related Tools (single curated section with View all Category link)
  assert(
    toolHtml.includes('class="related-tools-section"') || toolHtml.includes('id="related-tools-heading"'),
    `/tools/${tool.slug}/ has related tools section`
  );

  // Tool actions script tag
  assert(
    toolHtml.includes('/assets/js/tool-actions.js'),
    `/tools/${tool.slug}/ includes tool-actions.js script`
  );
});

console.log('\n========================================================');
if (failures === 0) {
  console.log('🎉 ALL TEMPLATE & DIRECTORY INTEGRITY CHECKS PASSED');
  process.exit(0);
} else {
  console.error(`💥 TEMPLATE CHECKS FAILED WITH ${failures} ERROR(S)`);
  process.exit(1);
}
