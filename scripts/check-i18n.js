#!/usr/bin/env node
/**
 * scripts/check-i18n.js
 * Multilingual safety check
 *
 * (a) English output is unchanged: builds the current tree and a base commit (in a temporary
 *     git worktree) and compares every English page, and every feed/text file byte for byte. Allowed differences: the language picker
 *     (<!-- language-menu --> ... <!-- /language-menu -->), the language banner, the picker
 *     script tag, the <html lang/dir> attributes, hreflang links added for translated pages,
 *     the content hash in main.<hash>.css and blank lines.
 * (b) Every page has the right <html lang dir>: English at the root, each enabled language
 *     under /<prefix>/.
 * (c) No translation service is called at runtime: no built HTML, JS, CSS or JSON file
 *     mentions a known machine-translation endpoint or widget.
 *
 * Usage: node scripts/check-i18n.js [--base <git ref>] [--fresh]
 *   --base   commit to compare against (default: the last commit before the i18n work)
 *   --fresh  rebuild the base even if a cached build exists
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadLanguages } = require('./i18n.js');

const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'check-i18n');
const DEFAULT_BASE = '6a96614'; // style: unify header, footer and tool pages with the homepage theme

const args = process.argv.slice(2);
const baseRef = args.includes('--base') ? args[args.indexOf('--base') + 1] : DEFAULT_BASE;
const fresh = args.includes('--fresh');

const TRANSLATION_SERVICES = [
  /translate\.google(apis)?\.com/i,
  /translate\.goog\b/i,
  /translation\.googleapis\.com/i,
  /google\.translate\.TranslateElement/,
  /googleTranslateElementInit/,
  /\/translate_a\//,
  /microsofttranslator\.com/i,
  /api\.cognitive\.microsoft\.com\/translat/i,
  /bing\.com\/translator/i,
  /api(-free)?\.deepl\.com/i,
  /translate\.yandex\./i,
  /libretranslate/i,
  /api\.mymemory\.translated\.net/i,
  /papago\.naver/i,
  /translate\.amazonaws\.com/i,
  /gtranslate\.(io|net)/i,
  /weglot\.com/i,
  /localizejs\.com/i
];

let failures = 0;
function fail(message) {
  console.error(`❌ ${message}`);
  failures++;
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

function build(cwd, output) {
  const env = { ...process.env };
  delete env.SITE_ENV;
  delete env.NODE_ENV;
  delete env.I18N_MENU_PREVIEW;
  fs.rmSync(output, { recursive: true, force: true });
  execFileSync('npx', ['@11ty/eleventy', `--output=${output}`, '--quiet'], { cwd, env, stdio: 'pipe' });
}

function buildBase(sha) {
  const output = path.join(CACHE_DIR, `base-${sha}`);
  if (!fresh && fs.existsSync(path.join(output, 'index.html'))) {
    console.log(`Using cached base build of ${sha.slice(0, 7)}`);
    return output;
  }
  const worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'toolsbuilt-i18n-base-'));
  console.log(`Building base ${sha.slice(0, 7)} in a temporary worktree...`);
  try {
    execFileSync('git', ['worktree', 'add', '--detach', worktree, sha], { cwd: ROOT, stdio: 'pipe' });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(worktree, 'node_modules'), 'dir');
    build(worktree, output);
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT, stdio: 'pipe' });
    fs.rmSync(worktree, { recursive: true, force: true });
  }
  return output;
}

function normalize(html, baseLines) {
  return html
    .replace(/\s*<!-- language-menu -->[\s\S]*?<!-- \/language-menu -->/g, '')
    .replace(/\s*<!-- language-banner -->[\s\S]*?<!-- \/language-banner -->/g, '')
    .replace(/\s*<script src="\/assets\/js\/language-menu\.js" defer><\/script>/g, '')
    .replace(/<html[^>]*>/, '<html>')
    .replace(/\/assets\/css\/main\.[a-f0-9]+\.css/g, '/assets/css/main.HASH.css')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim() !== '')
    .filter(line => !baseLines || baseLines.has(line) || !/^\s*<link rel="alternate" hreflang="[^"]+" href="https:\/\/toolsbuilt\.com\/[^"]*">$/.test(line))
    .join('\n');
}

function firstDifference(a, b) {
  const left = a.split('\n');
  const right = b.split('\n');
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i] !== right[i]) {
      return `line ${i + 1}\n      base:    ${(left[i] ?? '<end of file>').trim().slice(0, 160)}\n      current: ${(right[i] ?? '<end of file>').trim().slice(0, 160)}`;
    }
  }
  return '';
}

const languages = loadLanguages();
const enabled = languages.filter(l => l.enabled);
const prefixes = languages.filter(l => l.prefix).map(l => l.prefix);
const isLocalized = rel => prefixes.includes(rel.split('/')[0]);

console.log('Building the current tree...');
// Per checkout, so several worktrees can run the check at once (the base build cache is shared)
const currentDir = path.join(os.tmpdir(), `toolsbuilt-i18n-current-${require('crypto').createHash('md5').update(ROOT).digest('hex').slice(0, 8)}`);
build(ROOT, currentDir);

// (a) English output unchanged
console.log('\n--- (a) English pages match the base build ---');
const sha = execFileSync('git', ['rev-parse', baseRef], { cwd: ROOT, encoding: 'utf8' }).trim();
const baseDir = buildBase(sha);
const basePages = walk(baseDir, /\.html$/).map(f => path.relative(baseDir, f)).filter(rel => !isLocalized(rel));
const currentPages = walk(currentDir, /\.html$/).map(f => path.relative(currentDir, f));
const currentEnglish = currentPages.filter(rel => !isLocalized(rel));
let changed = 0;
for (const rel of basePages) {
  const currentFile = path.join(currentDir, rel);
  if (!fs.existsSync(currentFile)) {
    fail(`/${rel} exists in the base build but not in the current build`);
    continue;
  }
  const base = normalize(fs.readFileSync(path.join(baseDir, rel), 'utf8'));
  const baseLines = new Set(base.split('\n'));
  const current = normalize(fs.readFileSync(currentFile, 'utf8'), baseLines);
  if (base !== current) {
    changed++;
    fail(`/${rel} differs from ${sha.slice(0, 7)} at ${firstDifference(base, current)}`);
  }
}
for (const rel of currentEnglish.filter(rel => !basePages.includes(rel))) {
  console.log(`ℹ️  New English page (not in base): /${rel}`);
}
if (!changed) console.log(`✅ ${basePages.length} English pages unchanged apart from the language picker and banner`);

// Feeds and text files (feed.xml, sitemap.xml, llms.txt, robots.txt, ...) must be byte-identical
const textFiles = walk(baseDir, /\.(xml|txt|webmanifest)$/).map(f => path.relative(baseDir, f)).filter(rel => !isLocalized(rel));
let textChanged = 0;
for (const rel of textFiles) {
  const currentFile = path.join(currentDir, rel);
  if (!fs.existsSync(currentFile) || fs.readFileSync(currentFile, 'utf8') !== fs.readFileSync(path.join(baseDir, rel), 'utf8')) {
    textChanged++;
    fail(`/${rel} differs from ${sha.slice(0, 7)}`);
  }
}
if (!textChanged) console.log(`✅ ${textFiles.length} feeds and text files identical (${textFiles.join(', ')})`);

// (b) lang and dir on every page
console.log('\n--- (b) <html lang dir> on every page ---');
const english = languages.find(l => l.code === 'en');
let wrongAttrs = 0;
for (const rel of currentPages) {
  const html = fs.readFileSync(path.join(currentDir, rel), 'utf8');
  if (!/<html[\s>]/i.test(html)) continue; // verification files, not pages
  const lang = languages.find(l => l.prefix && l.prefix === rel.split('/')[0]) || english;
  if (!enabled.includes(lang)) {
    fail(`/${rel} is built for ${lang.code}, which is not enabled`);
    continue;
  }
  const tag = (html.match(/<html[^>]*>/) || [''])[0];
  const expected = `<html lang="${lang.hreflang}" dir="${lang.dir}">`;
  if (tag !== expected) {
    wrongAttrs++;
    fail(`/${rel}: expected ${expected}, found ${tag || 'no <html> tag'}`);
  }
}
for (const lang of enabled.filter(l => l.prefix)) {
  const count = currentPages.filter(rel => rel.split('/')[0] === lang.prefix).length;
  if (!count) fail(`${lang.code} is enabled but no pages were built under /${lang.prefix}/`);
  else console.log(`ℹ️  ${lang.code}: ${count} page(s) under /${lang.prefix}/`);
}
if (!wrongAttrs) console.log(`✅ ${currentPages.length} pages have the right lang and dir (${enabled.map(l => l.code).join(', ')} enabled)`);

// (c) no translation services
console.log('\n--- (c) No runtime translation services ---');
let hits = 0;
for (const file of walk(currentDir, /\.(html|js|mjs|css|json|webmanifest|xml|txt)$/)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const re of TRANSLATION_SERVICES) {
    if (re.test(text)) {
      hits++;
      fail(`${path.relative(currentDir, file)} mentions a translation service (${re})`);
    }
  }
}
if (!hits) console.log('✅ No built file references a machine-translation service or widget');

console.log('');
if (failures) {
  console.error(`💥 i18n check FAILED with ${failures} problem(s)`);
  process.exit(1);
}
console.log('i18n check PASSED');
