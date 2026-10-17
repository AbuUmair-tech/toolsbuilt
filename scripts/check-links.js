#!/usr/bin/env node
/**
 * ToolsBuilt Link & Quality Checker
 * Zero external dependencies. Crawls compiled _site/ HTML files and reports:
 * - Broken internal links (hrefs that don't resolve to a file in _site)
 * - Missing <title> tags
 * - Missing <meta name="description"> tags
 * - Duplicate <title> values across pages
 * - Pages with 0 or 2+ <h1> tags
 * - Missing <link rel="canonical"> tags
 * - JSON-LD blocks that fail JSON.parse
 * - og:image pointing to a PNG/JPG (not SVG) and resolving on disk
 * - Environment-aware robots / noindex verification:
 *     In production: NO page has noindex, robots.txt allows all
 *     In staging/dev: EVERY page has noindex, robots.txt disallows all
 *
 * Usage: node scripts/check-links.js [_site]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const DOMAIN = 'https://toolsbuilt.com';

const errors = [];
const warnings = [];
const titles = new Map(); // title -> [files]

const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';

function log(type, file, msg) {
  const rel = path.relative(SITE_DIR, file);
  if (type === 'error') errors.push(`[ERROR] ${rel}: ${msg}`);
  else warnings.push(`[WARN]  ${rel}: ${msg}`);
}

function collectHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    // Skip Google Search Console verification token file
    if (entry.name.startsWith('google') && entry.name.endsWith('.html')) continue;
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
  if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript') || href === '#') return null;

  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;

  let abs;
  if (clean.startsWith('/')) {
    abs = path.join(SITE_DIR, clean);
  } else {
    abs = path.join(path.dirname(fromFile), clean);
  }

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

  // Canonical check (skip 404.html)
  if (!is404 && !/<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)) {
    log('error', file, 'Missing <link rel="canonical">');
  }

  // Open Graph Image verification
  if (!is404) {
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (!ogImageMatch) {
      log('error', file, 'Missing <meta property="og:image">');
    } else {
      const ogUrl = ogImageMatch[1];
      if (ogUrl.endsWith('.svg')) {
        log('error', file, `og:image must not be SVG (found ${ogUrl})`);
      } else if (!/\.(png|jpg|jpeg|webp)$/i.test(ogUrl)) {
        log('error', file, `og:image must point to PNG/JPG/WebP, found: ${ogUrl}`);
      }
      // Check file exists on disk
      const localRel = ogUrl.replace(DOMAIN, '');
      if (localRel.startsWith('/')) {
        const localPath = path.join(SITE_DIR, localRel);
        if (!fs.existsSync(localPath)) {
          log('error', file, `og:image file missing on disk: ${localPath}`);
        }
      }
    }
  }

  // Robots / noindex check based on environment
  const hasNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i.test(html);
  const isDesignSystem = file.includes('design-system');
  if (isDesignSystem) {
    if (!hasNoindex) {
      log('error', file, 'Design system page must always have noindex meta tag');
    }
  } else if (isProduction && hasNoindex) {
    log('error', file, 'Production build contains forbidden noindex meta tag');
  } else if (!isProduction && !hasNoindex && !is404) {
    log('error', file, 'Staging/non-production build is missing required noindex meta tag');
  }

  // Internal links check
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript') || href.startsWith('#')) continue;
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

  // Stylesheet existence check
  const linkCssRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
  let linkCssMatch;
  while ((linkCssMatch = linkCssRegex.exec(html)) !== null) {
    const tag = linkCssMatch[0];
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      const href = hrefMatch[1];
      if (!href.startsWith('http')) {
        const resolved = resolveInternalHref(href, file);
        if (resolved === null) {
          log('error', file, `Stylesheet missing from _site: ${href}`);
        }
      }
    }
  }

  // Script src existence check
  const scriptRegex = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const src = scriptMatch[1];
    if (!src.startsWith('http')) {
      const resolved = resolveInternalHref(src, file);
      if (resolved === null) {
        log('error', file, `Script file missing from _site: ${src}`);
      }
    }
  }

  // SVG regression guard: fail if any <svg> lacks width/height or a sized class
  const svgRegex = /<svg\b([^>]*)>/gi;
  let svgMatch;
  while ((svgMatch = svgRegex.exec(html)) !== null) {
    const attrs = svgMatch[1];
    const hasWidth = /\bwidth\s*=/i.test(attrs);
    const hasHeight = /\bheight\s*=/i.test(attrs);
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i);
    const hasClass = Boolean(classMatch && classMatch[1].trim());

    if ((!hasWidth || !hasHeight) && !hasClass) {
      log('error', file, `Unconstrained <svg> missing width/height and class: ${svgMatch[0].substring(0, 80)}...`);
    }
  }

  // IMG regression guard: fail if any <img> lacks width/height or a sized class
  const imgRegex = /<img\b([^>]*)>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const attrs = imgMatch[1];
    const hasWidth = /\bwidth\s*=/i.test(attrs);
    const hasHeight = /\bheight\s*=/i.test(attrs);
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i);
    const hasClass = Boolean(classMatch && classMatch[1].trim());

    if ((!hasWidth || !hasHeight) && !hasClass) {
      log('error', file, `Unconstrained <img> missing width/height and class: ${imgMatch[0].substring(0, 80)}...`);
    }
  }
}

function checkSitemap() {
  const sitemapPath = path.join(SITE_DIR, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    errors.push('[ERROR] sitemap.xml: File not found');
    return;
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const loc of locs) {
    if (loc.includes('design-system')) {
      errors.push('[ERROR] sitemap.xml: /design-system/ must be excluded from sitemap.xml');
    }
    const relativePath = loc.replace(DOMAIN, '');
    const resolved = resolveInternalHref(relativePath, path.join(SITE_DIR, 'index.html'));
    if (resolved === null) {
      errors.push(`[ERROR] sitemap.xml: URL not found on disk: ${loc}`);
    }
  }
}

function checkRobotsTxt() {
  const robotsPath = path.join(SITE_DIR, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    errors.push('[ERROR] robots.txt: File not found');
    return;
  }
  const txt = fs.readFileSync(robotsPath, 'utf8');
  if (isProduction) {
    if (txt.includes('Disallow: /')) {
      errors.push('[ERROR] robots.txt: Production robots.txt contains "Disallow: /"');
    }
    if (!txt.includes('Allow: /')) {
      warnings.push('[WARN]  robots.txt: Production robots.txt expected to contain "Allow: /"');
    }
  } else {
    if (!txt.includes('Disallow: /')) {
      errors.push('[ERROR] robots.txt: Non-production robots.txt must contain "Disallow: /"');
    }
  }
}

// Run analysis
console.log('\n=== ToolsBuilt Link & Quality Checker ===');
console.log(`Target directory: ${SITE_DIR}`);
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'STAGING / NON-PRODUCTION'}\n`);

const htmlFiles = collectHtmlFiles(SITE_DIR);
if (htmlFiles.length === 0) {
  console.error(`[ERROR] No HTML files found in ${SITE_DIR}. Did you run "npm run build" first?\n`);
  process.exit(1);
}

console.log(`Scanning ${htmlFiles.length} HTML files...\n`);

for (const file of htmlFiles) {
  analyzeFile(file);
}

// Duplicate title check
for (const [title, files] of titles.entries()) {
  if (files.length > 1) {
    const relFiles = files.map(f => path.relative(SITE_DIR, f)).join(', ');
    warnings.push(`[WARN]  Duplicate <title> "${title}" in: ${relFiles}`);
  }
}

checkSitemap();
checkRobotsTxt();

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

if (errors.length > 0) {
  process.exit(1);
}
