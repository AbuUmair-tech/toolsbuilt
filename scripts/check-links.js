#!/usr/bin/env node
/**
 * ToolsBuilt Link Checker
 * Zero external dependencies. Crawls local HTML files and reports:
 * - Broken internal links (hrefs that don't resolve to a file)
 * - Missing <title> tags
 * - Missing <meta name="description"> tags
 * - Duplicate <title> values across pages
 * - Pages with 0 or 2+ <h1> tags
 * - Missing <link rel="canonical"> tags
 * - JSON-LD blocks that fail JSON.parse
 *
 * Usage: node /scripts/check-links.js
 * Run from the repository root.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://toolsbuilt.com';

const errors = [];
const warnings = [];
const titles = new Map(); // title -> [files]

function log(type, file, msg) {
  const rel = path.relative(ROOT, file);
  if (type === 'error') errors.push(`[ERROR] ${rel}: ${msg}`);
  else warnings.push(`[WARN]  ${rel}: ${msg}`);
}

function collectHtmlFiles(dir) {
  const results = [];
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

function resolveInternalHref(href, fromFile) {
  // Skip external, anchors only, mailto, javascript
  if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript') || href === '#') return null;

  // Strip hash and query
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;

  let abs;
  if (clean.startsWith('/')) {
    abs = path.join(ROOT, clean);
  } else {
    abs = path.join(path.dirname(fromFile), clean);
  }

  // If it ends with /, check for index.html
  if (clean.endsWith('/') || !path.extname(abs)) {
    const idx = path.join(abs, 'index.html');
    if (fs.existsSync(idx)) return idx;
    if (fs.existsSync(abs)) return abs;
    return null;
  }

  if (fs.existsSync(abs)) return abs;
  return null;
}

function analyzeFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const is404 = file.endsWith('404.html');

  // Title check
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!titleMatch) {
    log('error', file, 'Missing <title> tag');
  } else {
    const titleText = titleMatch[1].trim();
    if (!titles.has(titleText)) titles.set(titleText, []);
    titles.get(titleText).push(file);
  }

  // Meta description check
  if (!/<meta\s[^>]*name=["']description["'][^>]*>/i.test(html)) {
    log('error', file, 'Missing <meta name="description">');
  }

  // H1 count
  const h1Matches = html.match(/<h1[\s>]/gi) || [];
  if (h1Matches.length === 0) {
    log('error', file, 'No <h1> found on page');
  } else if (h1Matches.length > 1) {
    log('error', file, `Multiple <h1> tags found: ${h1Matches.length}`);
  }

  // Canonical check (skip 404.html - no canonical expected)
  if (!is404 && !/<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)) {
    log('error', file, 'Missing <link rel="canonical">');
  }

  // Internal links check
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    // Skip external, mailto, javascript
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript')) continue;
    // Skip fragment-only anchors (e.g. #section-id, #main-content)
    if (href.startsWith('#')) continue;
    // Skip hrefs that contain a fragment - resolve only the path part
    const resolved = resolveInternalHref(href, file);
    if (resolved === null) {
      log('error', file, `Broken internal link: ${href}`);
    }
  }

  // JSON-LD validity check
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jldMatch;
  let jldIndex = 0;
  while ((jldMatch = jsonLdRegex.exec(html)) !== null) {
    jldIndex++;
    try {
      JSON.parse(jldMatch[1]);
    } catch (e) {
      log('error', file, `Invalid JSON-LD block #${jldIndex}: ${e.message}`);
    }
  }
}

function checkSitemap() {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    errors.push('[ERROR] sitemap.xml: File not found');
    return;
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const loc of locs) {
    const relativePath = loc.replace(DOMAIN, '');
    const resolved = resolveInternalHref(relativePath, path.join(ROOT, 'index.html'));
    if (resolved === null) {
      errors.push(`[ERROR] sitemap.xml: URL not found on disk: ${loc}`);
    }
  }
}

// Run analysis
console.log('\n=== ToolsBuilt Link Checker ===\n');

const htmlFiles = collectHtmlFiles(ROOT);
console.log(`Scanning ${htmlFiles.length} HTML files...\n`);

for (const file of htmlFiles) {
  analyzeFile(file);
}

// Duplicate title check
for (const [title, files] of titles.entries()) {
  if (files.length > 1) {
    const relFiles = files.map(f => path.relative(ROOT, f)).join(', ');
    warnings.push(`[WARN]  Duplicate <title> "${title}" in: ${relFiles}`);
  }
}

checkSitemap();

// Output results
if (errors.length === 0 && warnings.length === 0) {
  console.log('All checks passed! No errors or warnings found.');
} else {
  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    errors.forEach(e => console.log('  ' + e));
    console.log();
  }
  if (warnings.length > 0) {
    console.log(`WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log('  ' + w));
    console.log();
  }
}

console.log(`\n--- Summary ---`);
console.log(`Files scanned: ${htmlFiles.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
