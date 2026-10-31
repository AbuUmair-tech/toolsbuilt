#!/usr/bin/env node
/**
 * scripts/check-theme-consistency.js
 * Theme Consistency Guard
 *
 * Fails (exit 1) if any built page in _site/ drifts from the homepage theme:
 * 1. The site header and footer must be identical to the homepage's, ignoring
 *    the active-navigation markers (aria-current="page" and is-active).
 * 2. The only stylesheets a page may load are the main bundle
 *    (/assets/css/main.<hash>.css) and, on a tool page, that tool's own
 *    /tools/<slug>/style.css (country variants share their parent's sheet).
 * 3. Per-tool style.css files stay layout-only: colours, borders, type,
 *    shadows and motion belong in the shared bundle (assets/css/tools.css).
 * 4. No <style> blocks, and no style="" attributes outside /design-system/
 *    (its colour swatches are the only allowed exception).
 *
 * Run after a build: node scripts/check-theme-consistency.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const TOOLS_SRC = path.join(ROOT, 'src', 'tools');

const INLINE_STYLE_ALLOWED = new Set(['/design-system/']);
const MAIN_BUNDLE = /^\/assets\/css\/main\.[0-9a-f]{8}\.css$/;
const TOOL_STYLESHEET = /^\/tools\/([a-z0-9-]+)\/style\.css$/;
const VISUAL_PROPERTY = /^(color|background(-[a-z]+)?|border(-[a-z-]+)?|box-shadow|outline(-[a-z-]+)?|font(-[a-z-]+)?|line-height|letter-spacing|text-transform|text-decoration(-[a-z]+)?|text-shadow|opacity|fill|stroke(-[a-z]+)?|accent-color|caret-color|transition(-[a-z]+)?|animation(-[a-z]+)?|cursor|filter|--[\w-]+)$/;

const errors = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function pageUrl(file) {
  const rel = '/' + path.relative(SITE_DIR, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

function extract(html, open, close) {
  const start = html.indexOf(open);
  if (start < 0) return null;
  const end = html.indexOf(close, start);
  return end < 0 ? null : html.slice(start, end + close.length);
}

function normalise(fragment) {
  return fragment
    .replace(/\s+aria-current="page"/g, '')
    .replace(/\s+is-active(?=["\s])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `…${a.slice(Math.max(0, i - 40), i + 60)}… vs …${b.slice(Math.max(0, i - 40), i + 60)}…`;
}

if (!fs.existsSync(path.join(SITE_DIR, 'index.html'))) {
  console.error('❌ _site/index.html not found. Run the build first.');
  process.exit(1);
}

// 1. Header and footer match the homepage
const home = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');
const parts = {
  header: ['<header class="site-header"', '</header>'],
  footer: ['<footer class="site-footer"', '</footer>']
};
const reference = {};
for (const [name, [open, close]] of Object.entries(parts)) {
  const fragment = extract(home, open, close);
  if (!fragment) errors.push(`Homepage has no ${name} (${open})`);
  else reference[name] = normalise(fragment);
}

const pages = walk(SITE_DIR).filter(file => !/^google[0-9a-f]+\.html$/.test(path.basename(file)));
let checked = 0;

for (const file of pages) {
  const url = pageUrl(file);
  const html = fs.readFileSync(file, 'utf8');
  if (/http-equiv=["']refresh["']/i.test(html)) continue; // redirect stubs
  checked++;

  for (const [name, [open, close]] of Object.entries(parts)) {
    if (!reference[name]) continue;
    const fragment = extract(html, open, close);
    if (!fragment) {
      errors.push(`${url}: missing site ${name}`);
    } else if (normalise(fragment) !== reference[name]) {
      errors.push(`${url}: ${name} differs from the homepage ${firstDifference(normalise(fragment), reference[name])}`);
    }
  }

  // 2. Only the main bundle and the page's own tool stylesheet
  const bodyTool = (html.match(/<body[^>]*data-tool-id="([^"]+)"/) || [])[1];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (!/\brel=["'][^"']*stylesheet/i.test(tag)) continue;
    const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1] || '';
    if (MAIN_BUNDLE.test(href)) continue;
    const toolMatch = href.match(TOOL_STYLESHEET);
    if (toolMatch && fs.existsSync(path.join(TOOLS_SRC, toolMatch[1], 'style.css'))) {
      // Country variants (uk-, us-, india-salary-tax-calculator) share their parent's sheet
      if (bodyTool && (bodyTool === toolMatch[1] || bodyTool.endsWith(`-${toolMatch[1]}`))) continue;
    }
    errors.push(`${url}: unapproved stylesheet ${href}`);
  }

  // 4. No <style> blocks or inline style attributes
  if (/<style[\s>]/i.test(html)) errors.push(`${url}: has a <style> block`);
  if (!INLINE_STYLE_ALLOWED.has(url)) {
    const inline = html.match(/<[a-z][^>]*\sstyle=["'][^"']*["']/gi) || [];
    for (const tag of inline.slice(0, 3)) errors.push(`${url}: inline style ${tag.slice(0, 120)}`);
  }
}

// 3. Per-tool style.css is layout-only
let toolSheets = 0;
for (const slug of fs.readdirSync(TOOLS_SRC)) {
  const file = path.join(TOOLS_SRC, slug, 'style.css');
  if (!fs.existsSync(file)) continue;
  toolSheets++;
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of css.match(/\{[^{}]*\}/g) || []) {
    for (const decl of block.slice(1, -1).split(';')) {
      const prop = decl.split(':')[0].trim().toLowerCase();
      if (prop && VISUAL_PROPERTY.test(prop)) {
        errors.push(`src/tools/${slug}/style.css: visual property "${prop}" belongs in assets/css/tools.css`);
      }
    }
  }
}

console.log(`Checked ${checked} pages and ${toolSheets} per-tool stylesheets.`);
if (errors.length) {
  for (const err of errors) console.error(`❌ ${err}`);
  console.error(`\nTheme consistency check FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log('Theme consistency check PASSED');
