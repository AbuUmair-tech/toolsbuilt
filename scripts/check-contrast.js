#!/usr/bin/env node
/**
 * WCAG AA Contrast Checker for the ToolsBuilt design tokens.
 *
 * Reads src/assets/css/tokens.css directly (no hardcoded colours), resolves the
 * light theme (:root in @layer tokens) and the dark theme (light tokens plus the
 * :root[data-theme="dark"] overrides), then checks every text/background pairing
 * the components use: 4.5:1 for text, 3:1 for control borders and focus rings.
 *
 * Also verifies the prefers-color-scheme dark block and the [data-theme="dark"]
 * block define identical values, so the two dark paths can never drift apart.
 */

const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, '..', 'src', 'assets', 'css', 'tokens.css');

function parseHex(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function parseColor(str, bgRgb = { r: 255, g: 255, b: 255 }) {
  if (str.startsWith('#')) return parseHex(str);
  const match = str.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (!match) throw new Error(`Cannot parse color: ${str}`);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
  const mix = (v, bg) => Math.round(parseFloat(v) * a + bg * (1 - a));
  return { r: mix(match[1], bgRgb.r), g: mix(match[2], bgRgb.g), b: mix(match[3], bgRgb.b) };
}

function getLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrast(fg, bg, surfaceRgb) {
  const bgRgb = parseColor(bg, surfaceRgb);
  const fgRgb = parseColor(fg, bgRgb);
  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Returns the declarations inside the first block whose selector matches `selectorRe`. */
function extractBlock(css, selectorRe) {
  const m = selectorRe.exec(css);
  if (!m) throw new Error(`Block not found in tokens.css: ${selectorRe}`);
  let depth = 0;
  let start = css.indexOf('{', m.index);
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start + 1, i);
  }
  throw new Error(`Unclosed block: ${selectorRe}`);
}

function parseDecls(block) {
  const decls = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(block.replace(/\/\*[\s\S]*?\*\//g, ''))) !== null) {
    decls[m[1]] = m[2].trim();
  }
  return decls;
}

function resolve(tokens, name, seen = new Set()) {
  const value = tokens[name];
  if (value === undefined) throw new Error(`Undefined token ${name}`);
  const ref = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (!ref) return value;
  if (seen.has(name)) throw new Error(`Circular token ${name}`);
  seen.add(name);
  return resolve(tokens, ref[1], seen);
}

const css = fs.readFileSync(TOKENS_FILE, 'utf8');
const lightTokens = parseDecls(extractBlock(css, /@layer tokens\s*\{[\s\S]*?:root\s*(?=\{)/));
const darkMediaTokens = parseDecls(extractBlock(css, /:root:not\(\[data-theme="light"\]\)\s*(?=\{)/));
const darkAttrTokens = parseDecls(extractBlock(css, /:root\[data-theme="dark"\]\s*(?=\{)/));

const THEMES = {
  light: lightTokens,
  dark: { ...lightTokens, ...darkAttrTokens }
};

// [foreground token, background token, minimum ratio, label]
const PAIRS = [
  ['--text-primary', '--surface-canvas', 4.5, 'Primary text on page'],
  ['--text-primary', '--surface-muted', 4.5, 'Primary text on muted surface'],
  ['--text-secondary', '--surface-canvas', 4.5, 'Secondary text on page'],
  ['--text-secondary', '--surface-card', 4.5, 'Secondary text on card'],
  ['--text-secondary', '--surface-muted', 4.5, 'Secondary text on muted surface'],
  ['--text-tertiary', '--surface-canvas', 4.5, 'Subtle text on page'],
  ['--text-tertiary', '--surface-card', 4.5, 'Subtle text on card'],
  ['--text-tertiary', '--surface-muted', 4.5, 'Subtle text on muted surface'],
  ['--accent-primary', '--surface-canvas', 4.5, 'Link / accent text on page'],
  ['--accent-primary', '--surface-muted', 4.5, 'Link / accent text on muted surface'],
  ['--accent-primary', '--accent-subtle', 4.5, 'Accent text on accent-subtle'],
  ['--accent-hover', '--surface-canvas', 4.5, 'Link hover on page'],
  ['--accent-contrast', '--accent-solid', 4.5, 'Primary button text'],
  ['--accent-contrast', '--accent-solid-hover', 4.5, 'Primary button text (hover)'],
  ['--color-success-text', '--color-success-bg', 4.5, 'Success text on success background'],
  ['--color-success-text', '--surface-canvas', 4.5, 'Success text on page'],
  ['--color-error-text', '--color-error-bg', 4.5, 'Error text on error background'],
  ['--color-error-text', '--surface-canvas', 4.5, 'Error text on page'],
  ['--border-strong', '--surface-input', 3.0, 'Input border on input background'],
  ['--border-strong', '--surface-muted', 3.0, 'Input border on muted surface'],
  ['--accent-primary', '--surface-canvas', 3.0, 'Focus ring on page']
];

// Kept for consumers that import the computed table
const PALETTES = {};
const results = { light: [], dark: [] };
let allPass = true;

const mediaKeys = Object.keys(darkMediaTokens).sort();
const attrKeys = Object.keys(darkAttrTokens).sort();
const driftKeys = [...new Set([...mediaKeys, ...attrKeys])].filter(k => darkMediaTokens[k] !== darkAttrTokens[k]);
if (driftKeys.length > 0) {
  allPass = false;
  console.error(`❌ FAIL: dark theme blocks differ (prefers-color-scheme vs [data-theme="dark"]): ${driftKeys.join(', ')}`);
} else {
  console.log(`✅ PASS: prefers-color-scheme and [data-theme="dark"] blocks define identical values (${attrKeys.length} tokens)`);
}

for (const [theme, tokens] of Object.entries(THEMES)) {
  console.log(`\n--- WCAG AA Contrast Check: [${theme.toUpperCase()}] Theme ---`);
  const canvas = parseColor(resolve(tokens, '--surface-canvas'));
  PALETTES[theme] = { surfaceBase: canvas, pairs: [] };

  for (const [fgName, bgName, target, label] of PAIRS) {
    const fg = resolve(tokens, fgName);
    const bg = resolve(tokens, bgName);
    const ratio = getContrast(fg, bg, canvas);
    const pass = ratio >= target;
    const formatted = ratio.toFixed(2) + ':1';
    PALETTES[theme].pairs.push({ name: label, fg, bg, target });
    results[theme].push({ name: label, fg, bg, target, ratio: formatted, pass });

    if (!pass) {
      allPass = false;
      console.error(`❌ FAIL: ${label} | ${formatted} (Required >= ${target}:1) | ${fgName} ${fg} on ${bgName} ${bg}`);
    } else {
      console.log(`✅ PASS: ${label} | ${formatted} (>= ${target}:1)`);
    }
  }
}

console.log('\n========================================================');
if (allPass) {
  console.log('🎉 ALL WCAG AA CONTRAST CHECKS PASSED');
  if (require.main === module) process.exit(0);
} else {
  console.error('💥 ONE OR MORE CONTRAST CHECKS FAILED');
  if (require.main === module) process.exit(1);
}

module.exports = { getContrast, PALETTES, results };
