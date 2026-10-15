#!/usr/bin/env node
/**
 * WCAG AA Contrast Checker for ToolsBuilt Design System
 * Checks all text and background token pairs in both light and dark modes.
 * Ensures minimum 4.5:1 for body text and 3:1 for large text/UI components.
 */

function parseHex(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function parseRgba(rgbaStr, bgRgb = { r: 255, g: 255, b: 255 }) {
  if (rgbaStr.startsWith('#')) return parseHex(rgbaStr);
  const match = rgbaStr.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (!match) throw new Error(`Cannot parse color: ${rgbaStr}`);
  const r = parseFloat(match[1]);
  const g = parseFloat(match[2]);
  const b = parseFloat(match[3]);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  // Composite over bgRgb
  return {
    r: Math.round(r * a + bgRgb.r * (1 - a)),
    g: Math.round(g * a + bgRgb.g * (1 - a)),
    b: Math.round(b * a + bgRgb.b * (1 - a))
  };
}

function getLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrast(fg, bg, surfaceRgb) {
  const fgRgb = parseRgba(fg, surfaceRgb);
  const bgRgb = parseRgba(bg, surfaceRgb);
  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const PALETTES = {
  light: {
    surfaceBase: { r: 248, g: 250, b: 252 }, // #f8fafc
    pairs: [
      { name: 'Primary Text on Canvas', fg: '#0f172a', bg: '#f8fafc', target: 4.5 },
      { name: 'Primary Text on Card', fg: '#0f172a', bg: '#ffffff', target: 4.5 },
      { name: 'Secondary Text on Canvas', fg: '#475569', bg: '#f8fafc', target: 4.5 },
      { name: 'Secondary Text on Card', fg: '#475569', bg: '#ffffff', target: 4.5 },
      { name: 'Tertiary/Subtle Text on Card', fg: '#64748b', bg: '#ffffff', target: 4.5 },
      { name: 'Accent Text on Card', fg: '#4338ca', bg: '#ffffff', target: 4.5 },
      { name: 'White Text on Primary Button', fg: '#ffffff', bg: '#4f46e5', target: 4.5 },
      { name: 'Success Text on Success Bg', fg: '#065f46', bg: '#ecfdf5', target: 4.5 },
      { name: 'Warning Text on Warning Bg', fg: '#92400e', bg: '#fffbeb', target: 4.5 },
      { name: 'Danger Text on Danger Bg', fg: '#9f1239', bg: '#fff1f2', target: 4.5 },
      { name: 'Info Text on Info Bg', fg: '#075985', bg: '#f0f9ff', target: 4.5 },
      { name: 'Category Date-Time on Tag', fg: '#3730a3', bg: '#e0e7ff', target: 4.5 },
      { name: 'Category Math-Finance on Tag', fg: '#065f46', bg: '#d1fae5', target: 4.5 },
      { name: 'Category Text on Tag', fg: '#92400e', bg: '#fef3c7', target: 4.5 },
      { name: 'Category Security on Tag', fg: '#9f1239', bg: '#ffe4e6', target: 4.5 },
      { name: 'Category Fun on Tag', fg: '#6b21a8', bg: '#f3e8ff', target: 4.5 },
      { name: 'Category Dev on Tag', fg: '#115e59', bg: '#ccfbf1', target: 4.5 },
      { name: 'Input Border on White Card', fg: '#768396', bg: '#ffffff', target: 3.0 } // UI element
    ]
  },
  dark: {
    surfaceBase: { r: 9, g: 13, b: 22 }, // #090d16
    pairs: [
      { name: 'Primary Text on Canvas', fg: '#f8fafc', bg: '#090d16', target: 4.5 },
      { name: 'Primary Text on Card', fg: '#f8fafc', bg: '#161f33', target: 4.5 },
      { name: 'Secondary Text on Canvas', fg: '#cbd5e1', bg: '#090d16', target: 4.5 },
      { name: 'Secondary Text on Card', fg: '#cbd5e1', bg: '#161f33', target: 4.5 },
      { name: 'Tertiary/Subtle Text on Card', fg: '#94a3b8', bg: '#161f33', target: 4.5 },
      { name: 'Accent Text on Card', fg: '#a5b4fc', bg: '#161f33', target: 4.5 },
      { name: 'White Text on Primary Button', fg: '#ffffff', bg: '#4f46e5', target: 4.5 },
      { name: 'Success Text on Success Bg', fg: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)', target: 4.5 },
      { name: 'Warning Text on Warning Bg', fg: '#fcd34d', bg: 'rgba(245, 158, 11, 0.15)', target: 4.5 },
      { name: 'Danger Text on Danger Bg', fg: '#fda4af', bg: 'rgba(244, 63, 94, 0.15)', target: 4.5 },
      { name: 'Info Text on Info Bg', fg: '#7dd3fc', bg: 'rgba(14, 165, 233, 0.15)', target: 4.5 },
      { name: 'Category Date-Time on Tag', fg: '#c7d2fe', bg: 'rgba(79, 70, 229, 0.2)', target: 4.5 },
      { name: 'Category Math-Finance on Tag', fg: '#a7f3d0', bg: 'rgba(5, 150, 105, 0.2)', target: 4.5 },
      { name: 'Category Text on Tag', fg: '#fde68a', bg: 'rgba(217, 119, 6, 0.2)', target: 4.5 },
      { name: 'Category Security on Tag', fg: '#fecdd3', bg: 'rgba(225, 29, 72, 0.2)', target: 4.5 },
      { name: 'Category Fun on Tag', fg: '#e9d5ff', bg: 'rgba(126, 34, 206, 0.2)', target: 4.5 },
      { name: 'Category Dev on Tag', fg: '#99f6e4', bg: 'rgba(15, 118, 110, 0.2)', target: 4.5 },
      { name: 'Input Border on Dark Card', fg: '#64748b', bg: '#161f33', target: 3.0 } // UI element
    ]
  }
};

let allPass = true;
const results = { light: [], dark: [] };

for (const theme of ['light', 'dark']) {
  const { surfaceBase, pairs } = PALETTES[theme];
  console.log(`\n--- WCAG AA Contrast Check: [${theme.toUpperCase()}] Theme ---`);

  for (const pair of pairs) {
    const ratio = getContrast(pair.fg, pair.bg, surfaceBase);
    const pass = ratio >= pair.target;
    const formattedRatio = ratio.toFixed(2) + ':1';
    results[theme].push({ ...pair, ratio: formattedRatio, pass });

    if (!pass) {
      allPass = false;
      console.error(`❌ FAIL: ${pair.name} | Ratio: ${formattedRatio} (Required >= ${pair.target}:1) | FG: ${pair.fg}, BG: ${pair.bg}`);
    } else {
      console.log(`✅ PASS: ${pair.name} | ${formattedRatio} (>= ${pair.target}:1)`);
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
