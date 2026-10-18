#!/usr/bin/env node
/**
 * Parity Check Script for ToolsBuilt
 * Compares the OLD site (original HTML files in repo root)
 * against the NEW Eleventy build output in _site/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const REPORT_PATH = path.join(ROOT, 'docs', 'MIGRATION_REPORT.md');

const PAGES = [
  'index.html',
  'about/index.html',
  'contact/index.html',
  'privacy-policy/index.html',
  'terms/index.html',
  '404.html',
  'tools/age-calculator/index.html',
  'tools/date-difference-calculator/index.html',
  'tools/add-days-to-date-calculator/index.html',
  'tools/days-until-date-calculator/index.html',
  'tools/word-counter/index.html',
  'tools/text-case-converter/index.html',
  'tools/discount-calculator/index.html',
  'tools/percentage-change-calculator/index.html',
  'tools/password-generator/index.html',
  'tools/random-name-picker/index.html'
];

function decodeEntities(str) {
  if (!str) return '';
  let s = str;
  for (let i = 0; i < 2; i++) {
    s = s.replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'")
         .replace(/&apos;/g, "'")
         .replace(/&nbsp;/g, ' ');
  }
  return s;
}

function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '');
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim().replace(/\s+/g, ' ') : '';
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match ? decodeEntities(match[1]).trim().replace(/\s+/g, ' ') : '';
}

function extractCanonical(html) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                html.match(/<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return match ? match[1].trim() : '';
}

function extractH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return decodeEntities(stripHtml(match[1])).trim().replace(/\s+/g, ' ');
}

function extractFaqQuestions(html) {
  const questions = [];
  const faqSectionMatch = html.match(/<section[^>]*class=["'][^"']*faq-section[^"']*["'][^>]*>([\s\S]*?)<\/section>/i);
  const scope = faqSectionMatch ? faqSectionMatch[1] : html;

  const headerRegex = /<(?:button|summary)[^>]*class=["'][^"']*(?:accordion-header|faq-question)[^"']*["'][^>]*>([\s\S]*?)<\/(?:button|summary)>/gi;
  let match;
  while ((match = headerRegex.exec(scope)) !== null) {
    const btnInner = match[1];
    const spanMatch = btnInner.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    const raw = spanMatch ? spanMatch[1] : btnInner.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    const clean = decodeEntities(stripHtml(raw)).trim().replace(/\s+/g, ' ');
    if (clean) questions.push(clean);
  }
  return questions;
}

function countJsonLd(html) {
  const matches = html.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/gi);
  return matches ? matches.length : 0;
}

function runParityCheck() {
  console.log('=== ToolsBuilt Migration Parity Check ===');
  console.log(`Comparing repo root against: ${SITE_DIR}\n`);

  if (!fs.existsSync(SITE_DIR)) {
    console.error(`Error: _site directory not found at ${SITE_DIR}. Please run build first.`);
    process.exit(1);
  }

  const results = [];
  const mismatches = [];
  let unallowedMismatchCount = 0;

  for (const pagePath of PAGES) {
    const oldFilePath = path.join(ROOT, pagePath);
    const newFilePath = path.join(SITE_DIR, pagePath);

    const oldExists = fs.existsSync(oldFilePath);
    const newExists = fs.existsSync(newFilePath);

    if (!oldExists || !newExists) {
      mismatches.push({
        page: pagePath,
        field: 'File Existence',
        oldVal: oldExists ? 'Exists' : 'MISSING',
        newVal: newExists ? 'Exists' : 'MISSING',
        isExpected: false
      });
      unallowedMismatchCount++;
      continue;
    }

    const oldHtml = fs.readFileSync(oldFilePath, 'utf8');
    const newHtml = fs.readFileSync(newFilePath, 'utf8');

    const oldTitle = extractTitle(oldHtml);
    const newTitle = extractTitle(newHtml);
    const titleMatch = oldTitle === newTitle;

    const oldDesc = extractMetaDescription(oldHtml);
    const newDesc = extractMetaDescription(newHtml);
    const descMatch = oldDesc === newDesc;

    const oldCanon = extractCanonical(oldHtml);
    const newCanon = extractCanonical(newHtml);
    // 404.html in old site didn't have canonical tag; new site template includes it.
    const is404CanonDiff = (pagePath === '404.html') && (!oldCanon && newCanon);
    const canonMatch = oldCanon === newCanon;

    const oldH1 = extractH1(oldHtml);
    const newH1 = extractH1(newHtml);
    const h1Match = oldH1 === newH1;

    const oldJsonLd = countJsonLd(oldHtml);
    const newJsonLd = countJsonLd(newHtml);
    const jsonLdMatch = oldJsonLd === newJsonLd;

    const oldFaqs = extractFaqQuestions(oldHtml);
    const newFaqs = extractFaqQuestions(newHtml);
    const faqsMatch = JSON.stringify(oldFaqs) === JSON.stringify(newFaqs);

    const pageResult = {
      path: pagePath,
      titleMatch,
      descMatch,
      canonMatch,
      is404CanonDiff,
      h1Match,
      jsonLdMatch,
      faqsMatch,
      oldTitle, newTitle,
      oldDesc, newDesc,
      oldCanon, newCanon,
      oldH1, newH1,
      oldJsonLd, newJsonLd,
      oldFaqs, newFaqs
    };

    results.push(pageResult);

    if (!titleMatch) {
      mismatches.push({ page: pagePath, field: 'Title', oldVal: oldTitle, newVal: newTitle, isExpected: false });
      unallowedMismatchCount++;
    }
    if (!descMatch) {
      mismatches.push({ page: pagePath, field: 'Description', oldVal: oldDesc, newVal: newDesc, isExpected: false });
      unallowedMismatchCount++;
    }
    if (!canonMatch) {
      const isExpected = is404CanonDiff;
      mismatches.push({
        page: pagePath,
        field: 'Canonical',
        oldVal: oldCanon || '(none)',
        newVal: newCanon || '(none)',
        isExpected,
        note: isExpected ? '404 page now has canonical URL in new Eleventy template (intended improvement)' : undefined
      });
      if (!isExpected) unallowedMismatchCount++;
    }
    if (!h1Match) {
      mismatches.push({ page: pagePath, field: 'H1', oldVal: oldH1, newVal: newH1, isExpected: false });
      unallowedMismatchCount++;
    }
    if (!jsonLdMatch) {
      mismatches.push({ page: pagePath, field: 'JSON-LD Count', oldVal: `${oldJsonLd} blocks`, newVal: `${newJsonLd} blocks`, isExpected: false });
      unallowedMismatchCount++;
    }
    if (!faqsMatch) {
      mismatches.push({
        page: pagePath,
        field: 'FAQ Questions',
        oldVal: oldFaqs.join(' | ') || '(none)',
        newVal: newFaqs.join(' | ') || '(none)',
        isExpected: false
      });
      unallowedMismatchCount++;
    }
  }

  // Generate Markdown Report
  let md = `# ToolsBuilt Migration Parity Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## 1. Executive Summary\n\n`;
  const verdict = unallowedMismatchCount === 0 ? 'PASS' : 'FAIL';
  md += `**Overall Migration Verdict: ${verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}**\n\n`;
  md += `All 16 core pages were verified between the original static site and the compiled Eleventy build in \`_site/\`.\n\n`;

  md += `## 2. Page Comparison Summary Table\n\n`;
  md += `| Page URL | Title | Description | Canonical | H1 | JSON-LD | FAQs |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of results) {
    const urlDisplay = r.path === 'index.html' ? '/' : `/${r.path.replace(/index\.html$/, '')}`;
    const tIcon = r.titleMatch ? '✅' : '❌';
    const dIcon = r.descMatch ? '✅' : '❌';
    const cIcon = r.canonMatch ? '✅' : (r.is404CanonDiff ? '✅*' : '❌');
    const hIcon = r.h1Match ? '✅' : '❌';
    const jIcon = r.jsonLdMatch ? '✅' : '❌';
    const fIcon = r.faqsMatch ? '✅' : '❌';
    md += `| \`${urlDisplay}\` | ${tIcon} | ${dIcon} | ${cIcon} | ${hIcon} | ${jIcon} | ${fIcon} |\n`;
  }

  md += `\n*\\* Note: 404.html canonical was intentionally added in the Eleventy layout template.*\n\n`;

  md += `## 3. Detail of Differences / Mismatches\n\n`;
  if (mismatches.length === 0) {
    md += `No mismatches discovered! All metadata, headings, JSON-LD schemas, and FAQ questions match identically.\n\n`;
  } else {
    for (const m of mismatches) {
      const status = m.isExpected ? 'ℹ️ INTENDED' : '⚠️ MISMATCH';
      md += `### ${status}: \`${m.page}\` - ${m.field}\n\n`;
      md += `- **Old Site:** \`${m.oldVal}\`\n`;
      md += `- **New Site:** \`${m.newVal}\`\n`;
      if (m.note) md += `- **Note:** ${m.note}\n`;
      md += `\n`;
    }
  }

  md += `## 4. Expected / Intended Differences\n\n`;
  md += `The following architectural improvements and differences are expected and intentional:\n\n`;
  md += `1. **Auto-Generated Dynamic Footer:**\n`;
  md += `   - The new site dynamically generates footer links directly from \`src/_data/tools.json\` and categories rather than hardcoded static links.\n\n`;
  md += `2. **Static Related Tools Section:**\n`;
  md += `   - The new site renders Related Tools cards statically at build time into HTML, replacing the previous empty placeholder container that required client-side JavaScript execution.\n\n`;
  md += `3. **Open Graph Image Asset Modernization:**\n`;
  md += `   - Updated Open Graph metadata from \`.svg\` to rasterized \`.png\` (\`og-image.png\`) to satisfy social platform crawlers that do not support SVG previews.\n\n`;
  md += `4. **Apple Touch Icon Reference:**\n`;
  md += `   - Standardized to point to \`/assets/img/apple-touch-icon.png\` across all templates.\n\n`;
  md += `5. **Staging & Development Environment \`noindex\` Tag:**\n`;
  md += `   - Automatic injection of \`<meta name="robots" content="noindex, nofollow">\` during development/staging builds, which is dynamically removed in production builds (\`SITE_ENV=production\`).\n\n`;
  md += `6. **Theme Restoration Inline Script:**\n`;
  md += `   - Added an inline script in \`<head>\` to restore user theme preferences before DOM rendering, preventing flash of unstyled content (FOUC).\n\n`;
  md += `7. **Modern Favicon & Alternate ICO References:**\n`;
  md += `   - Standardized dual SVG + ICO favicon links in layouts.\n\n`;
  md += `8. **Whitespace & HTML Formatting:**\n`;
  md += `   - Minor formatting variations resulting from Nunjucks template composition.\n\n`;

  md += `## 5. Final Verdict\n\n`;
  if (unallowedMismatchCount === 0) {
    md += `### ✅ PASS\n\n`;
    md += `All 16 pages passed parity verification. Only expected and documented structural improvements were detected.\n`;
  } else {
    md += `### ❌ FAIL\n\n`;
    md += `Found ${unallowedMismatchCount} unexpected parity mismatch(es). Please review the details above.\n`;
  }

  // Ensure docs dir exists
  const docsDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`Migration report successfully written to: ${REPORT_PATH}\n`);

  // Console output summary
  console.table(results.map(r => ({
    Page: r.path,
    Title: r.titleMatch ? 'MATCH' : 'MISMATCH',
    Desc: r.descMatch ? 'MATCH' : 'MISMATCH',
    Canon: r.canonMatch ? 'MATCH' : (r.is404CanonDiff ? 'INTENDED' : 'MISMATCH'),
    H1: r.h1Match ? 'MATCH' : 'MISMATCH',
    JSON_LD: r.jsonLdMatch ? 'MATCH' : 'MISMATCH',
    FAQs: r.faqsMatch ? 'MATCH' : 'MISMATCH'
  })));

  console.log(`\nFinal Verdict: ${verdict}`);
  if (unallowedMismatchCount > 0) {
    process.exit(1);
  }
}

// Export helpers for testing/reuse and run if invoked directly
module.exports = {
  extractTitle,
  extractMetaDescription,
  extractCanonical,
  extractH1,
  extractFaqQuestions,
  countJsonLd
};

if (require.main === module) {
  runParityCheck();
}
