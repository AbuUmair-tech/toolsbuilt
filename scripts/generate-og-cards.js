#!/usr/bin/env node
/**
 * ToolsBuilt Social Card Generator (1200x630 Open Graph & Twitter Cards)
 * Generates branded cards at build time using Sharp and SVG with embedded Inter font.
 * Output: src/assets/og/<slug>.png (copied to _site/assets/og/); other enabled languages get
 * src/assets/og/<prefix>/<slug>.png. All card text comes from src/_data/i18n (ui.ogCard and the
 * tool/category text in the card's language).
 */

const fs = require('fs');
const path = require('path');
// Translated cards need script fonts. librsvg renders text through fontconfig (not CSS
// @font-face), so give fontconfig the self-hosted Noto fonts before sharp starts. Only the script
// subsets are added, so Latin text renders exactly as before.
const SCRIPT_FONTS = {
  ar: { family: 'Noto Sans Arabic', file: 'noto-sans-arabic-arabic-wght-normal.woff2' },
  ur: { family: 'Noto Nastaliq Urdu', file: 'noto-nastaliq-urdu-arabic-wght-normal.woff2' },
  hi: { family: 'Noto Sans Devanagari', file: 'noto-sans-devanagari-devanagari-wght-normal.woff2' }
};
(function configureFonts() {
  const root = path.resolve(__dirname, '..');
  const dir = path.join(root, 'node_modules', '.cache', 'og-fonts');
  fs.mkdirSync(path.join(dir, 'cache'), { recursive: true });
  for (const { file } of Object.values(SCRIPT_FONTS)) {
    const src = path.join(root, 'src', 'assets', 'fonts', file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, file));
  }
  const conf = path.join(dir, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${dir}</dir>\n  <cachedir>${path.join(dir, 'cache')}</cachedir>\n</fontconfig>\n`);
  process.env.FONTCONFIG_FILE = conf;
})();
const sharp = require('sharp');
const i18nData = require('./i18n-data.js');
const { loadLanguages } = require('./i18n.js');

const ROOT = path.resolve(__dirname, '..');
const OG_ROOT = path.join(ROOT, 'src', 'assets', 'og');
const SITE_OG_ROOT = path.join(ROOT, '_site', 'assets', 'og');

const FONT_FILE = path.join(ROOT, 'src', 'assets', 'fonts', 'inter-latin-wght-normal.woff2');
let base64Font = '';
if (fs.existsSync(FONT_FILE)) {
  base64Font = fs.readFileSync(FONT_FILE).toString('base64');
}

const CATEGORY_COLORS = {
  'date-time': '#3b82f6',
  'math-finance': '#10b981',
  'text': '#8b5cf6',
  'security': '#f59e0b',
  'fun': '#ec4899',
  'default': '#6366f1'
};


function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxChars) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function generateSvg({ title, description, categoryName, accentColor, trust, lang = { code: 'en', dir: 'ltr' } }) {
  const script = SCRIPT_FONTS[lang.code];
  const fontStack = script ? `Inter, ${script.family}, sans-serif` : 'Inter, -apple-system, sans-serif';
  // Right-to-left cards: title and description start on the right
  const textX = lang.dir === 'rtl' ? '1120" text-anchor="end' : '80';
  // Nastaliq is much taller than Latin: more room between lines
  const titleStep = lang.code === 'ur' ? 84 : 64;
  const descStep = lang.code === 'ur' ? 52 : 36;
  const safeTitle = escapeXml(title);
  const safeDesc = escapeXml(description);
  const safeCategory = escapeXml(categoryName.toUpperCase());
  const accent = accentColor || '#6366f1';

  const titleLines = wrapText(title, 36).slice(0, 2);
  const descLines = wrapText(description, 60).slice(0, 3);

  const titleTspans = titleLines.map((line, i) => {
    const y = 230 + (i * titleStep);
    return `<text x="${textX}" y="${y}" font-family="${fontStack}" font-size="52" font-weight="800" fill="#f8fafc" letter-spacing="-0.02em">${escapeXml(line)}</text>`;
  }).join('\n');

  const descStartY = 240 + (titleLines.length * titleStep) + (descStep - 36);
  const descTspans = descLines.map((line, i) => {
    const y = descStartY + (i * descStep);
    return `<text x="${textX}" y="${y}" font-family="${fontStack}" font-size="24" font-weight="400" fill="#94a3b8" line-height="1.5">${escapeXml(line)}</text>`;
  }).join('\n');

  const pillWidth = Math.max(160, safeCategory.length * 9 + 48);
  const pillX = 1120 - pillWidth;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${base64Font ? `@font-face {
        font-family: 'Inter';
        src: url('data:font/woff2;base64,${base64Font}') format('woff2');
        font-weight: 400 800;
        font-style: normal;
      }` : ''}
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19"/>
      <stop offset="100%" stop-color="#070a10"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.3"/>
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Subtle Inner Card Container -->
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>

  <!-- Subtle Grid Accent Lines -->
  <line x1="80" y1="120" x2="1120" y2="120" stroke="#1e293b" stroke-opacity="0.6" stroke-width="1"/>
  <line x1="80" y1="520" x2="1120" y2="520" stroke="#1e293b" stroke-opacity="0.6" stroke-width="1"/>

  <!-- Top Bar: Logo & Brand + Category Pill -->
  <g transform="translate(80, 56)">
    <!-- Logo Icon -->
    <rect width="44" height="44" rx="12" fill="url(#logoGrad)"/>
    <text x="22" y="31" font-family="Inter, -apple-system, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">T</text>
    <!-- Brand Name -->
    <text x="56" y="32" font-family="Inter, -apple-system, sans-serif" font-size="26" font-weight="800" fill="#ffffff">ToolsBuilt</text>
  </g>

  <!-- Category Badge Pill -->
  <g transform="translate(${pillX}, 60)">
    <rect width="${pillWidth}" height="36" rx="18" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-width="1.5"/>
    <circle cx="20" cy="18" r="4" fill="${accent}"/>
    <text x="34" y="23" font-family="${fontStack}" font-size="13" font-weight="700" fill="${accent}">${safeCategory}</text>
  </g>

  <!-- Main Body Content: Title & Description -->
  ${titleTspans}
  ${descTspans}

  <!-- Bottom Bar: Trust Strip & URL -->
  <g transform="translate(80, 545)">
    <!-- Shield Icon -->
    <g transform="translate(0, 4)">
      <path d="M9 1L2 4v4.5c0 4.2 3 8.1 7 9.1 4-1 7-4.9 7-9.1V4L9 1z" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 9.5l2 2 4-4" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- Trust Claims -->
    <text x="26" y="19" font-family="${fontStack}" font-size="17" font-weight="500" fill="#64748b">
      ${trust.map(escapeXml).join(' <tspan fill="#334155">•</tspan> ')}
    </text>
    <!-- Brand URL -->
    <text x="1040" y="19" font-family="Inter, -apple-system, sans-serif" font-size="20" font-weight="700" fill="${accent}" text-anchor="end">toolsbuilt.com</text>
  </g>
</svg>`;
}

async function renderCard({ slug, title, description, categoryName, accentColor, trust, lang, OG_DIR, SITE_OG_DIR }, force = false) {
  const svg = generateSvg({ title, description, categoryName, accentColor, trust, lang });
  const filename = `${slug}.png`;
  const outPath = path.join(OG_DIR, filename);

  if (!force && fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    if (stat.size > 0) {
      if (fs.existsSync(SITE_OG_DIR) && !fs.existsSync(path.join(SITE_OG_DIR, filename))) {
        fs.copyFileSync(outPath, path.join(SITE_OG_DIR, filename));
      }
      return { filename, size: stat.size, cached: true };
    }
  }

  const buffer = await sharp(Buffer.from(svg))
    .png({ quality: 85, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(outPath, buffer);

  // If _site exists, copy directly
  if (fs.existsSync(SITE_OG_DIR)) {
    fs.writeFileSync(path.join(SITE_OG_DIR, filename), buffer);
  }

  return { filename, size: buffer.length, cached: false };
}

// Cards for every enabled language
async function generateAllCards({ force = false } = {}) {
  const results = [];
  for (const lang of loadLanguages().filter(l => l.enabled)) {
    results.push(...await generateCards({ force, lang }));
  }
  return results;
}

async function generateCards({ force = false, lang = { code: 'en', prefix: '' } } = {}) {
  const OG_DIR = lang.prefix ? path.join(OG_ROOT, lang.prefix) : OG_ROOT;
  const SITE_OG_DIR = lang.prefix ? path.join(SITE_OG_ROOT, lang.prefix) : SITE_OG_ROOT;
  const ui = i18nData.ui(lang.code).ogCard;
  const pages = { OG_DIR, SITE_OG_DIR, trust: ui.trust, lang };
  if (!fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
  }
  if (fs.existsSync(path.join(ROOT, '_site', 'assets')) && !fs.existsSync(SITE_OG_DIR)) {
    fs.mkdirSync(SITE_OG_DIR, { recursive: true });
  }

  const categoryText = i18nData.page(lang.code, 'categories') || {};
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'tools.json'), 'utf8'))
    .map(t => ({ ...t, ...((i18nData.tool(lang.code, t.slug) || {}).listing || {}) }));
  const categories = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'categories.json'), 'utf8'))
    .map(c => ({ ...c, ...(categoryText[c.slug] || {}) }));
  const label = slug => ui.categoryLabels[slug];

  const cardsToGenerate = [];

  // 1. Homepage
  cardsToGenerate.push({
    ...pages,
    slug: 'home',
    title: ui.home.title,
    description: ui.home.description,
    categoryName: ui.labels.home,
    accentColor: CATEGORY_COLORS['default']
  });

  // 2. All Tools Directory
  cardsToGenerate.push({
    ...pages,
    slug: 'tools',
    title: ui.tools.title,
    description: i18nData.format(ui.tools.description, { count: tools.length }),
    categoryName: ui.labels.directory,
    accentColor: CATEGORY_COLORS['default']
  });

  // 3. Category Hubs
  categories.forEach(cat => {
    cardsToGenerate.push({
      ...pages,
      slug: `category-${cat.slug}`,
      title: cat.name,
      description: cat.seoDescription || cat.description,
      categoryName: label(cat.slug) || cat.name,
      accentColor: CATEGORY_COLORS[cat.slug] || CATEGORY_COLORS['default']
    });
  });

  // 4. Tools
  tools.forEach(tool => {
    const cat = categories.find(c => c.slug === tool.category) || {};
    cardsToGenerate.push({
      ...pages,
      slug: tool.slug,
      title: tool.name,
      description: tool.description,
      categoryName: label(tool.category) || cat.name || ui.labels.tool,
      accentColor: CATEGORY_COLORS[tool.category] || CATEGORY_COLORS['default']
    });
  });

  console.log(`Generating ${cardsToGenerate.length} Open Graph social cards (1200x630)...`);
  const results = [];

  for (const card of cardsToGenerate) {
    try {
      const res = await renderCard(card, force);
      results.push(res);
    } catch (err) {
      console.error(`Failed to generate card for ${card.slug}:`, err);
    }
  }

  const generatedCount = results.filter(r => !r.cached).length;
  console.log(`✅ ${generatedCount} generated, ${results.length - generatedCount} cached in ${path.relative(ROOT, OG_DIR)}/`);
  return results;
}

if (require.main === module) {
  generateAllCards().then(results => {
    let overSize = results.filter(r => r.size > 100 * 1024);
    if (overSize.length > 0) {
      console.error(`❌ ${overSize.length} cards exceed 100 KB!`);
      process.exit(1);
    } else {
      console.log('✅ All cards verified under 100 KB limit.');
    }
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateAllCards, generateSvg };
