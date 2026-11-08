#!/usr/bin/env node
/**
 * scripts/check-external.js
 * External Resource Guard
 *
 * Fails (exit 1) if any page in _site/ loads a resource from an origin other
 * than toolsbuilt.com. Everything must be self-hosted.
 *
 * Checks:
 * 1. HTML: <script src>, <link href> (stylesheet, preload, icon, manifest, ...),
 *    <img src/srcset>, <source>, <video>, <audio>, <track>, <iframe>, <embed>,
 *    <object data>, SVG <use>/<image> href
 * 2. CSS: @import and url() in <style> blocks, style="" attributes and _site/**.css
 * 3. JS: script/resource loaders (`.src =`, setAttribute('src'), fetch(), import(),
 *    importScripts(), new Worker/EventSource/WebSocket) in inline scripts and _site/**.js
 * 4. manifest.webmanifest icon sources
 *
 * Allowlist: https://www.googletagmanager.com, only inside the inline
 * consent-gated analytics loader (an inline <script> that defines gtag).
 * Plain <a href> links to other sites are allowed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');

const SITE_HOSTS = new Set(['toolsbuilt.com']);
const ANALYTICS_ORIGIN = 'https://www.googletagmanager.com';

// <link rel> values that make the browser fetch or connect to the href
const RESOURCE_LINK_RELS = new Set([
  'stylesheet', 'preload', 'modulepreload', 'prefetch', 'prerender', 'preconnect', 'dns-prefetch',
  'icon', 'shortcut', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'mask-icon', 'manifest'
]);

// tag -> attributes that load a resource
const RESOURCE_ATTRS = {
  script: ['src'],
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src'],
  track: ['src'],
  iframe: ['src'],
  frame: ['src'],
  embed: ['src'],
  object: ['data'],
  input: ['src'],
  use: ['href', 'xlink:href'],
  image: ['href', 'xlink:href']
};

const JS_LOADER_PATTERNS = [
  /\.src\s*=\s*(['"`])([^'"`]+)\1/g,
  /setAttribute\(\s*['"](?:src|href)['"]\s*,\s*(['"`])([^'"`]+)\1/g,
  /\b(?:fetch|import|importScripts)\s*\(\s*(['"`])([^'"`]+)\1/g,
  /\bnew\s+(?:Worker|SharedWorker|EventSource|WebSocket)\s*\(\s*(['"`])([^'"`]+)\1/g
];

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some(ext => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

/** Returns the external origin a URL points to, or null if it is relative / same-site / inline. */
function externalOrigin(rawUrl) {
  const url = String(rawUrl).trim().replace(/&amp;/g, '&');
  if (!url) return null;
  if (/^(data|blob|about|javascript|mailto|tel):/i.test(url)) return null;
  if (url.startsWith('#')) return null;
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');
  if (!isAbsolute) return null;
  let parsed;
  try {
    parsed = new URL(url, 'https://toolsbuilt.com/');
  } catch (e) {
    return url;
  }
  if (SITE_HOSTS.has(parsed.hostname) && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) return null;
  return parsed.origin !== 'null' ? parsed.origin : url;
}

function parseAttrs(attrString) {
  const attrs = {};
  const re = /([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function srcsetUrls(value) {
  return value.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);
}

function checkCss(css, where, errors) {
  const importRe = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1/gi;
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let m;
  while ((m = importRe.exec(css)) !== null) {
    const origin = externalOrigin(m[2]);
    if (origin) errors.push(`${where}: CSS @import loads external ${m[2]}`);
  }
  while ((m = urlRe.exec(css)) !== null) {
    const origin = externalOrigin(m[2]);
    if (origin) errors.push(`${where}: CSS url() loads external ${m[2]}`);
  }
}

function checkJs(js, where, errors, { allowAnalytics = false } = {}) {
  for (const pattern of JS_LOADER_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(js)) !== null) {
      const origin = externalOrigin(m[2]);
      if (!origin) continue;
      if (allowAnalytics && origin === ANALYTICS_ORIGIN) continue;
      errors.push(`${where}: script loads external ${m[2]}`);
    }
  }
}

function checkHtml(file, errors) {
  const rel = path.relative(ROOT, file);
  const html = fs.readFileSync(file, 'utf8');

  // 1. Resource-loading tags and attributes
  const tagRe = /<([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);

    if (tag === 'link') {
      const rels = (attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
      if (rels.some(r => RESOURCE_LINK_RELS.has(r)) && attrs.href !== undefined) {
        const origin = externalOrigin(attrs.href);
        if (origin) errors.push(`${rel}: <link rel="${attrs.rel}"> loads external ${attrs.href}`);
      }
      if (attrs.imagesrcset) {
        for (const u of srcsetUrls(attrs.imagesrcset)) {
          if (externalOrigin(u)) errors.push(`${rel}: <link imagesrcset> loads external ${u}`);
        }
      }
    }

    for (const attr of RESOURCE_ATTRS[tag] || []) {
      if (attrs[attr] === undefined) continue;
      const urls = attr.endsWith('srcset') ? srcsetUrls(attrs[attr]) : [attrs[attr]];
      for (const u of urls) {
        if (externalOrigin(u)) errors.push(`${rel}: <${tag} ${attr}> loads external ${u}`);
      }
    }

    if (attrs.style) checkCss(attrs.style, `${rel} <${tag} style>`, errors);
  }

  // 2. Inline <style> blocks
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html)) !== null) {
    checkCss(m[1], `${rel} <style>`, errors);
  }

  // 3. Inline executable <script> blocks
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const attrs = parseAttrs(m[1]);
    if (attrs.src !== undefined) continue;
    const type = (attrs.type || '').toLowerCase();
    if (type && !/^(text\/javascript|application\/javascript|module)$/.test(type)) continue;
    const body = m[2];
    const isAnalyticsLoader = /function\s+gtag\s*\(/.test(body);
    checkJs(body, `${rel} inline <script>`, errors, { allowAnalytics: isAnalyticsLoader });
  }
}

function checkExternal() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error('❌ _site/ not found. Run the build first.');
    process.exit(1);
  }

  const errors = [];
  const htmlFiles = walk(SITE_DIR, ['.html']);
  const cssFiles = walk(SITE_DIR, ['.css']);
  const jsFiles = walk(SITE_DIR, ['.js', '.mjs']);

  for (const file of htmlFiles) checkHtml(file, errors);
  for (const file of cssFiles) checkCss(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file), errors);
  for (const file of jsFiles) checkJs(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file), errors);

  const manifestPath = path.join(SITE_DIR, 'manifest.webmanifest');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      for (const icon of manifest.icons || []) {
        if (externalOrigin(icon.src)) errors.push(`_site/manifest.webmanifest: icon loads external ${icon.src}`);
      }
    } catch (e) {
      errors.push(`_site/manifest.webmanifest: invalid JSON (${e.message})`);
    }
  }

  console.log(`Scanned ${htmlFiles.length} HTML, ${cssFiles.length} CSS and ${jsFiles.length} JS files in _site/`);

  if (errors.length > 0) {
    const unique = [...new Set(errors)];
    console.error(`\n❌ Found ${unique.length} external resource reference(s):`);
    unique.forEach(err => console.error(`  - ${err}`));
    console.error('\nAll scripts, styles, fonts, images and frames must be self-hosted.');
    process.exit(1);
  }

  console.log('✅ External resource check PASSED: all resources are self-hosted');
}

if (require.main === module) {
  checkExternal();
}

module.exports = { checkExternal, externalOrigin };
