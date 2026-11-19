#!/usr/bin/env node
/**
 * Blog post images: charts, formula cards and Open Graph cards drawn as SVG from numbers computed
 * here with the tools' own logic.js (so the pictures and the post text always agree).
 *
 * Text comes from scripts/blog-images/<lang>.json (English is the source; every language has the
 * same keys). Numbers stay in English format in every language, as in the posts themselves.
 * Every line of text is measured after rendering and shrunk until it fits its box, so a longer
 * translation never runs off the image; a line that still does not fit fails the run.
 *
 * Output per post in src/assets/blog/<post-slug>/ (English) and .../<post-slug>/<lang>/ (others):
 *   <name>.svg   the source (kept in git, editable)
 *   <name>.webp  what the post shows, 1600x900 (the SVG drawn at 96 dpi; the post's width/height match)
 *   og.png       1200x630 social card
 *
 * Usage: node scripts/generate-blog-images.js [lang ...]   (default: every enabled language)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// librsvg finds fonts through fontconfig: the self-hosted Inter, plus the system Noto fonts for
// Arabic, Urdu (Nastaliq) and Devanagari
(function configureFonts() {
  const dir = path.join(ROOT, 'node_modules', '.cache', 'blog-fonts');
  fs.mkdirSync(path.join(dir, 'cache'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'src', 'assets', 'fonts', 'inter-latin-wght-normal.woff2'), path.join(dir, 'inter.woff2'));
  const conf = path.join(dir, 'fonts.conf');
  fs.writeFileSync(conf, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n  <dir>${dir}</dir>\n  <cachedir>${path.join(dir, 'cache')}</cachedir>\n</fontconfig>\n`);
  process.env.FONTCONFIG_FILE = conf;
})();
const sharp = require('sharp');

const Loan = require('../src/tools/loan-emi-calculator/logic.js');
const Discount = require('../src/tools/discount-calculator/logic.js');
const Grade = require('../src/tools/grade-calculator/logic.js');
const LANGUAGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'languages.json'), 'utf8'));
const TOOLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'tools.json'), 'utf8'));

// Site palette (src/assets/css/tokens.css, light theme)
const C = {
  bg: '#ffffff', border: '#e2e8f0', grid: '#eef2f7', text: '#0f172a', muted: '#475569', faint: '#64748b',
  blue: '#2563eb', blueTint: '#e8f0ff', green: '#15803d', greenTint: '#e3f7ea',
  orange: '#c2410c', orangeTint: '#ffedde', purple: '#9333ea', purpleTint: '#f3e8ff'
};
const FONTS = {
  default: "Inter, 'Inter Variable', -apple-system, 'Segoe UI', sans-serif",
  ar: "Inter, 'Noto Sans Arabic', sans-serif",
  ur: "Inter, 'Noto Nastaliq Urdu', sans-serif",
  hi: "Inter, 'Noto Sans Devanagari', sans-serif"
};
// Nastaliq is much taller than Latin text at the same size
const SCALE = { ur: 0.8 };
const W = 1200, H = 675; // in-post images: 16:9

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rs = (n, d = 0) => 'Rs ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// ------------------------------------------------------------------ text, measured and fitted
const widthCache = new Map();
async function measure(text, size, weight, font) {
  const key = [text, size, weight, font].join('|');
  if (!widthCache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${Math.ceil(size * 4)}"><rect width="4000" height="${Math.ceil(size * 4)}" fill="#fff"/><text x="40" y="${Math.ceil(size * 2.5)}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}">${esc(text)}</text></svg>`;
    const { info } = await sharp(Buffer.from(svg)).trim({ background: '#ffffff' }).toBuffer({ resolveWithObject: true });
    widthCache.set(key, info.width);
  }
  return widthCache.get(key);
}

const problems = [];

/**
 * One drawing context per language: text helpers that know the font, the direction and the
 * strings. Free text is mirrored for right-to-left languages; chart internals (axes, bars, the
 * numbers on them) keep their positions (`fixed: true`).
 */
function context(lang) {
  const info = LANGUAGES.find(l => l.code === lang);
  const rtl = info.dir === 'rtl';
  const font = FONTS[lang] || FONTS.default;
  const scale = SCALE[lang] || 1;
  const strings = JSON.parse(fs.readFileSync(path.join(__dirname, 'blog-images', `${lang}.json`), 'utf8'));
  const english = JSON.parse(fs.readFileSync(path.join(__dirname, 'blog-images', 'en.json'), 'utf8'));

  function S(key, vars = {}) {
    const value = key.split('.').reduce((o, k) => (o || {})[k], strings);
    if (typeof value !== 'string') throw new Error(`blog-images/${lang}.json: missing "${key}"`);
    const englishValue = key.split('.').reduce((o, k) => (o || {})[k], english);
    for (const name of (englishValue.match(/\{\{\w+\}\}/g) || [])) {
      if (!value.includes(name)) throw new Error(`blog-images/${lang}.json: "${key}" lost the placeholder ${name}`);
    }
    return value.replace(/\{\{(\w+)\}\}/g, (m, name) => (vars[name] !== undefined ? vars[name] : m));
  }

  // <text> that fits in `max` pixels (default: from x to the far margin)
  async function t(x, y, s, o = {}) {
    const anchor = o.anchor || 'start';
    let size = (o.size || 22) * (o.fixed ? 1 : scale);
    const weight = o.weight || 400;
    // Where the text sits: free text is mirrored in right-to-left images (also `ltr` text such as
    // formulas, which keeps its own reading order); `fixed` text stays where it is
    const mirrored = rtl && !o.fixed;
    const px = mirrored ? W - x : x;
    const flip = { start: 'end', end: 'start', middle: 'middle' };
    const edge = mirrored ? flip[anchor] : anchor; // 'start' = left edge, 'end' = right edge
    // Text with Arabic-script words is laid out right to left, where text-anchor "start" is the
    // right edge
    const rtlText = rtl && !o.ltr && /[\u0590-\u08FF\uFB50-\uFEFF]/.test(s);
    const a = rtlText ? flip[edge] : edge;
    const room = o.max || (anchor === 'middle' ? W - 112 : anchor === 'end' ? x - 56 : (o.frameW || W) - 56 - x);
    const min = size * 0.62;
    while (await measure(s, size, weight, font) > room && size > min) size = Math.round((size - 0.5) * 2) / 2;
    if (await measure(s, size, weight, font) > room) problems.push(`${lang}: "${s}" is wider than ${room}px`);
    const dir = rtlText ? ' direction="rtl"' : '';
    return `<text x="${px}" y="${y}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${o.fill || C.text}"${a !== 'start' ? ` text-anchor="${a}"` : ''}${dir}>${esc(s)}</text>`;
  }

  // Coloured keys with labels, laid out from the start edge using measured widths
  async function legend(items, x, y, max = W - 112) {
    let out = '', used = 0;
    const size = 20 * scale;
    for (const [color, label] of items) {
      const w = Math.min(await measure(label, size, 400, font), max - used - 70);
      const sx = rtl ? W - x - used - 20 : x + used;
      out += `<rect x="${sx}" y="${y - 16}" width="20" height="20" rx="5" fill="${color}"/>`;
      out += await t(rtl ? W - (sx - 10) : sx + 30, y, label, { size: 20, fill: C.muted, max: w + 2 });
      used += 70 + w;
    }
    return out;
  }

  async function frame(title, subtitle, body, h = H) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img">
  <rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="24" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
  ${await t(56, 74, title, { size: 34, weight: 800 })}
  ${subtitle ? await t(56, 112, subtitle, { size: 21, fill: C.muted }) : ''}
  ${body}
  ${await t(W - 56, h - 30, 'toolsbuilt.com', { size: 18, weight: 600, fill: C.faint, anchor: 'end', fixed: true })}
</svg>`;
  }

  return { lang, rtl, font, S, t, legend, frame };
}

// --------------------------------------------------------------- post 1: loan EMI
async function emiImages({ rtl, S, t, legend, frame }) {
  const home = Loan.calculateLoanEmi(5000000, 16, 15, 'years');
  const homeExtra = Loan.calculateLoanEmi(5000000, 16, 15, 'years', { extraMonthlyPayment: 10000 });
  const bike = Loan.calculateLoanEmi(1500000, 20, 3, 'years');
  const flatInterest = 1500000 * 0.20 * 3;
  const flatEmi = (1500000 + flatInterest) / 36;
  const out = {};
  const k = 'emi.';

  // 1. Formula card with the 1.5M example plugged in
  const r = 20 / 1200, pow = Math.pow(1 + r, 36);
  out['emi-formula-worked-example'] = await frame(S(k + 'formula.title'), S(k + 'formula.subtitle'), `
  <rect x="56" y="150" width="${W - 112}" height="132" rx="18" fill="${C.blueTint}"/>
  ${await t(W / 2, 236, 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)', { size: 44, weight: 800, fill: C.blue, anchor: 'middle', fixed: true })}
  ${await t(80, 340, 'P = 1,500,000', { size: 26, weight: 700, max: 340 })}${await t(80, 372, S(k + 'formula.p'), { size: 20, fill: C.muted, max: 340 })}
  ${await t(440, 340, `r = 20 ÷ 1200 = ${r.toFixed(6)}`, { size: 26, weight: 700, max: 380 })}${await t(440, 372, S(k + 'formula.r'), { size: 20, fill: C.muted, max: 380 })}
  ${await t(840, 340, 'n = 36', { size: 26, weight: 700, max: 300 })}${await t(840, 372, S(k + 'formula.n'), { size: 20, fill: C.muted, max: 300 })}
  <line x1="56" y1="412" x2="${W - 56}" y2="412" stroke="${C.border}" stroke-width="2"/>
  ${await t(80, 464, `(1 + r)ⁿ = 1.016667³⁶ = ${pow.toFixed(4)}`, { size: 24, fill: C.muted })}
  ${await t(80, 508, `EMI = 1,500,000 × ${r.toFixed(6)} × ${pow.toFixed(4)} ÷ ${(pow - 1).toFixed(4)}`, { size: 24, fill: C.muted })}
  ${await t(80, 576, S(k + 'formula.result', { emi: rs(bike.monthlyEmi, 2) }), { size: 40, weight: 800, fill: C.green })}
  ${await t(80, 616, S(k + 'formula.total', { total: rs(bike.totalPayment, 2), interest: rs(bike.totalInterest, 2) }), { size: 21, fill: C.muted, max: W - 136 - 200 })}`);

  // 2. Principal vs interest per year, 5M home loan
  const years = [];
  for (let y = 0; y < 15; y++) {
    const rows = home.schedule.slice(y * 12, y * 12 + 12);
    years.push({ i: rows.reduce((s, x) => s + x.interest, 0), p: rows.reduce((s, x) => s + x.principal, 0) });
  }
  const top = 215, base = 560, chartH = base - top, left = 130, colW = 64, gap = 1000 / 15 - colW;
  const max = Math.max(...years.map(y => y.i + y.p));
  let bars = '';
  for (const [n, y] of years.entries()) {
    const x = left + n * (colW + gap);
    const hi = y.i / max * chartH, hp = y.p / max * chartH;
    bars += `<rect x="${x}" y="${base - hi}" width="${colW}" height="${hi}" fill="${C.orange}"/>`;
    bars += `<rect x="${x}" y="${base - hi - hp}" width="${colW}" height="${hp}" fill="${C.green}"/>`;
    bars += await t(x + colW / 2, base + 30, String(n + 1), { size: 18, fill: C.faint, anchor: 'middle', fixed: true });
  }
  let grid = '';
  for (let v = 0; v <= 900000; v += 300000) {
    const y = base - v / max * chartH;
    grid += `<line x1="${left - 10}" y1="${y}" x2="${W - 60}" y2="${y}" stroke="${C.grid}" stroke-width="2"/>` + await t(left - 18, y + 7, v === 0 ? '0' : `${v / 1000}k`, { size: 18, fill: C.faint, anchor: 'end', fixed: true });
  }
  out['emi-principal-vs-interest-5m-home-loan'] = await frame(S(k + 'split.title'), S(k + 'split.subtitle', { emi: rs(home.monthlyEmi, 2) }), `
  ${grid}${bars}
  ${await t(left + 500, base + 64, S(k + 'split.axis'), { size: 19, fill: C.muted, anchor: 'middle', fixed: true, max: 600 })}
  ${await legend([[C.orange, S(k + 'split.interest', { value: rs(years[0].i) })], [C.green, S(k + 'split.principal', { value: rs(years[0].p) })]], 130, 168, W - 186)}`);

  // 3. Balance curve with and without Rs 10,000 extra a month
  const pts = (sched) => [[0, 5000000], ...sched.map(x => [x.month, x.balance])];
  const sx = m => 130 + m / 180 * 990, sy = b => 560 - b / 5000000 * 380;
  const line = (p, color, dash) => `<polyline fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"${dash ? ' stroke-dasharray="12 10"' : ''} points="${p.map(([m, b]) => `${sx(m).toFixed(1)},${sy(b).toFixed(1)}`).join(' ')}"/>`;
  let g3 = '';
  for (let v = 0; v <= 5000000; v += 1000000) g3 += `<line x1="120" y1="${sy(v)}" x2="1130" y2="${sy(v)}" stroke="${C.grid}" stroke-width="2"/>` + await t(108, sy(v) + 7, v === 0 ? '0' : `${v / 1000000}M`, { size: 18, fill: C.faint, anchor: 'end', fixed: true });
  for (let m = 0; m <= 180; m += 36) g3 += await t(sx(m), 592, m === 0 ? '0' : S(k + 'balance.years', { n: m / 12 }), { size: 18, fill: C.faint, anchor: 'middle', fixed: true, max: 150 });
  const xEnd = homeExtra.extra.payoffMonths;
  out['emi-balance-curve-extra-10000'] = await frame(S(k + 'balance.title'), S(k + 'balance.subtitle', { months: xEnd, saved: rs(homeExtra.extra.interestSaved) }), `
  ${g3}${line(pts(home.schedule), C.blue)}${line(pts(homeExtra.extra.schedule), C.green, true)}
  <circle cx="${sx(xEnd)}" cy="${sy(0)}" r="9" fill="${C.green}"/>
  ${await t(sx(xEnd) + 18, sy(0) - 14, S(k + 'balance.paidOff', { month: xEnd }), { size: 20, weight: 700, fill: C.green, fixed: true, max: W - 60 - sx(xEnd) - 18 })}
  ${await legend([[C.blue, S(k + 'balance.emiOnly')], [C.green, S(k + 'balance.emiExtra')]], 130, 150, W - 186)}`);

  // 4. Flat rate vs reducing balance
  const bw = 820 / flatInterest;
  out['flat-rate-vs-reducing-balance-20-percent'] = await frame(S(k + 'flat.title'), S(k + 'flat.subtitle'), `
  ${await t(56, 210, S(k + 'flat.reducing'), { size: 24, weight: 700 })}
  <rect x="${rtl ? W - 56 - bike.totalInterest * bw : 56}" y="228" width="${bike.totalInterest * bw}" height="64" rx="10" fill="${C.green}"/>
  ${await t(56 + bike.totalInterest * bw + 18, 270, rs(bike.totalInterest, 2), { size: 26, weight: 800, fill: C.green })}
  ${await t(56, 322, S(k + 'flat.emi', { emi: rs(bike.monthlyEmi, 2) }), { size: 20, fill: C.muted })}
  ${await t(56, 400, S(k + 'flat.flat'), { size: 24, weight: 700 })}
  <rect x="${rtl ? W - 56 - flatInterest * bw : 56}" y="418" width="${flatInterest * bw}" height="64" rx="10" fill="${C.orange}"/>
  ${await t(56 + flatInterest * bw + 18, 460, rs(flatInterest, 2), { size: 26, weight: 800, fill: C.orange })}
  ${await t(56, 512, S(k + 'flat.emi', { emi: rs(flatEmi, 2) }), { size: 20, fill: C.muted })}
  ${await t(56, 590, S(k + 'flat.note', { more: rs(flatInterest - bike.totalInterest, 2) }), { size: 22, weight: 600, fill: C.text, max: W - 112 - 190 })}`);
  return out;
}

// --------------------------------------------------------------- post 2: percentages
async function percentImages({ rtl, S, t, frame }) {
  const out = {};
  const k = 'percent.';
  // Boxes swap sides in right-to-left images, together with their (mirrored) text
  const card = async (x, y, w, h, tint, color, head, formula, ex) => `
  <rect x="${rtl ? W - x - w : x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${tint}"/>
  ${await t(x + 28, y + 46, head, { size: 22, weight: 700, fill: color, max: w - 56 })}
  ${await t(x + 28, y + 100, formula, { size: 30, weight: 800, max: w - 56 })}
  ${await t(x + 28, y + 146, ex, { size: 20, fill: C.muted, max: w - 56 })}`;
  out['percentage-formulas-cheat-sheet'] = await frame(S(k + 'cheat.title'), S(k + 'cheat.subtitle'), `
  ${await card(56, 146, 528, 186, C.blueTint, C.blue, S(k + 'cheat.marksHead'), S(k + 'cheat.marksFormula'), '912 ÷ 1100 × 100 = 82.91%')}
  ${await card(616, 146, 528, 186, C.greenTint, C.green, S(k + 'cheat.discountHead'), S(k + 'cheat.discountFormula'), '2,400 × (1 − 0.15) = Rs 2,040')}
  ${await card(56, 356, 528, 186, C.orangeTint, C.orange, S(k + 'cheat.changeHead'), S(k + 'cheat.changeFormula'), '(46,000 − 40,000) ÷ 40,000 = 15%')}
  ${await card(616, 356, 528, 186, C.purpleTint, C.purple, S(k + 'cheat.reverseHead'), S(k + 'cheat.reverseFormula'), '2,040 ÷ 0.85 = Rs 2,400')}
  ${await t(56, 600, S(k + 'cheat.note'), { size: 21, weight: 600, max: W - 112 - 190 })}`);

  // stacked discount
  const d = Discount.calculateDiscount(5000, 20, { stackedDiscountPercent: 10 });
  const sc = 680 / 5000;
  // Bars grow from the label side: leftwards in right-to-left images
  const row = async (y, label, value, color, note) => `${await t(56, y + 40, label, { size: 22, weight: 700, max: 230 })}
  <rect x="${rtl ? W - 300 - value * sc : 300}" y="${y}" width="${value * sc}" height="60" rx="10" fill="${color}"/>
  ${await t(300 + value * sc + 16, y + 40, rs(value), { size: 24, weight: 800, fill: color })}
  ${note ? await t(300, y + 88, note, { size: 19, fill: C.muted, max: W - 356 }) : ''}`;
  out['stacked-discount-20-then-10-percent'] = await frame(S(k + 'stacked.title'), S(k + 'stacked.subtitle'), `
  ${await row(160, S(k + 'stacked.original'), 5000, C.faint, '')}
  ${await row(260, S(k + 'stacked.after20'), d.subtotalAfterPrimary, C.blue, S(k + 'stacked.after20Note', { off: rs(d.primarySavings) }))}
  ${await row(380, S(k + 'stacked.then10'), d.priceAfterDiscounts, C.green, S(k + 'stacked.then10Note', { off: rs(d.stackedSavings), total: d.totalSavingsPercent }))}
  ${await row(500, S(k + 'stacked.if30'), 3500, C.orange, S(k + 'stacked.if30Note'))}`);

  // asymmetry
  const up = (46000 - 40000) / 40000 * 100, down = (40000 - 46000) / 46000 * 100;
  out['percentage-increase-decrease-not-symmetric'] = await frame(S(k + 'asym.title'), S(k + 'asym.subtitle'), `
  <rect x="96" y="${560 - 40000 / 50000 * 380}" width="220" height="${40000 / 50000 * 380}" rx="12" fill="${C.blue}"/>
  <rect x="490" y="${560 - 46000 / 50000 * 380}" width="220" height="${46000 / 50000 * 380}" rx="12" fill="${C.orange}"/>
  <rect x="884" y="${560 - 40000 / 50000 * 380}" width="220" height="${40000 / 50000 * 380}" rx="12" fill="${C.blue}"/>
  ${await t(206, 596, S(k + 'asym.before'), { size: 20, weight: 700, anchor: 'middle', fixed: true, max: 330 })}
  ${await t(600, 596, S(k + 'asym.raised'), { size: 20, weight: 700, anchor: 'middle', fixed: true, max: 330 })}
  ${await t(994, 596, S(k + 'asym.back'), { size: 20, weight: 700, anchor: 'middle', fixed: true, max: 330 })}
  ${await t(403, 230, `+${up}%`, { size: 34, weight: 800, fill: C.orange, anchor: 'middle', fixed: true })}
  ${await t(403, 262, '6,000 ÷ 40,000', { size: 19, fill: C.muted, anchor: 'middle', fixed: true })}
  ${await t(797, 230, `${down.toFixed(2)}%`, { size: 34, weight: 800, fill: C.blue, anchor: 'middle', fixed: true })}
  ${await t(797, 262, '6,000 ÷ 46,000', { size: 19, fill: C.muted, anchor: 'middle', fixed: true })}`);

  // averaging percentages
  const avg = (90 + 60) / 2, real = 78 / 120 * 100;
  out['averaging-percentages-mistake'] = await frame(S(k + 'avg.title'), S(k + 'avg.subtitle'), `
  ${await card(56, 150, 528, 186, C.orangeTint, C.orange, S(k + 'avg.wrongHead'), '(90% + 60%) ÷ 2', S(k + 'avg.wrongResult', { avg: `${avg}%` }))}
  ${await card(616, 150, 528, 186, C.greenTint, C.green, S(k + 'avg.rightHead'), '(18 + 60) ÷ (20 + 100)', `= 78 ÷ 120 × 100 = ${real}%`)}
  ${await t(56, 410, S(k + 'avg.line1'), { size: 22 })}
  ${await t(56, 446, S(k + 'avg.line2'), { size: 22 })}
  ${await t(56, 520, S(k + 'avg.line3'), { size: 21, fill: C.muted })}`);
  return out;
}

// --------------------------------------------------------------- post 3: welcome
function categoryNames(lang) {
  const file = path.join(ROOT, 'src', '_data', 'i18n', 'pages', lang, 'categories.json');
  const english = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'i18n', 'pages', 'en', 'categories.json'), 'utf8'));
  const local = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return Object.fromEntries(Object.keys(english).map(slug => [slug, (local[slug] || {}).name || english[slug].name]));
}

async function welcomeImages({ lang, rtl, S, t, frame }) {
  const out = {};
  const k = 'welcome.';
  const listed = TOOLS.filter(x => x.listed !== false);
  const names = categoryNames(lang);
  const counts = Object.keys(names).map(slug => ({ slug, name: names[slug], n: listed.filter(x => x.category === slug).length }))
    .sort((a, b) => b.n - a.n);
  const colors = [C.blue, C.green, C.orange, C.purple, C.blue, C.green, C.orange];
  const max = Math.max(...counts.map(c => c.n));
  const labelW = 360, barX = 56 + labelW + 24, barMax = W - barX - 120;
  let rows = '';
  for (const [i, c] of counts.entries()) {
    const y = 160 + i * 64;
    const len = c.n / max * barMax;
    const x0 = rtl ? W - barX - len : barX;
    rows += await t(56, y + 32, c.name, { size: 22, weight: 600, max: labelW });
    rows += `<rect x="${x0}" y="${y}" width="${len}" height="44" rx="10" fill="${colors[i]}"/>`;
    rows += await t(rtl ? x0 - 14 : x0 + len + 14, y + 32, String(c.n), { size: 24, weight: 800, fill: colors[i], fixed: true, anchor: rtl ? 'end' : 'start' });
  }
  out['tools-by-category'] = await frame(S(k + 'categories.title', { tools: listed.length, categories: counts.length }), S(k + 'categories.subtitle'), rows);

  // Diagram: the inputs, the tool's code and the result inside the browser; the server outside
  const box = async (x, y, w, h, fill, stroke, head, sub, color) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  ${await t(x + w / 2, y + 48, head, { size: 24, weight: 800, fill: color, anchor: 'middle', fixed: true, max: w - 32 })}
  ${await t(x + w / 2, y + 84, sub, { size: 18, fill: C.muted, anchor: 'middle', fixed: true, max: w - 32 })}`;
  // In right-to-left images the flow runs from right to left
  const X = (x, w) => (rtl ? W - x - w : x);
  const arrow = (x1, x2, y) => {
    const [a, b] = rtl ? [W - x1, W - x2] : [x1, x2];
    const dirn = b > a ? 1 : -1;
    return `<line x1="${a}" y1="${y}" x2="${b - dirn * 12}" y2="${y}" stroke="${C.muted}" stroke-width="4"/><polygon points="${b},${y} ${b - dirn * 16},${y - 9} ${b - dirn * 16},${y + 9}" fill="${C.muted}"/>`;
  };
  out['how-a-calculation-stays-in-your-browser'] = await frame(S(k + 'flow.title'), S(k + 'flow.subtitle'), `
  <rect x="${X(56, 760)}" y="150" width="760" height="330" rx="22" fill="${C.blueTint}" stroke="${C.blue}" stroke-width="3"/>
  ${await t(84, 196, S(k + 'flow.browser'), { size: 24, weight: 800, fill: C.blue, max: 700 })}
  ${await box(X(84, 210), 250, 210, 120, C.bg, C.border, S(k + 'flow.inputs'), S(k + 'flow.inputsSub'), C.text)}
  ${await box(X(330, 220), 250, 220, 120, C.bg, C.border, S(k + 'flow.code'), S(k + 'flow.codeSub'), C.text)}
  ${await box(X(586, 200), 250, 200, 120, C.greenTint, C.green, S(k + 'flow.result'), S(k + 'flow.resultSub'), C.green)}
  ${arrow(294, 330, 310)}${arrow(550, 586, 310)}
  ${await t(84, 440, S(k + 'flow.stays'), { size: 20, weight: 600, fill: C.blue, max: 700 })}
  <rect x="${X(880, 264)}" y="230" width="264" height="160" rx="18" fill="#f8fafc" stroke="${C.faint}" stroke-width="2" stroke-dasharray="10 8"/>
  ${await t(rtl ? W - 1012 : 1012, 290, S(k + 'flow.server'), { size: 22, weight: 800, fill: C.faint, anchor: 'middle', fixed: true, max: 232 })}
  ${await t(rtl ? W - 1012 : 1012, 326, S(k + 'flow.serverSub1'), { size: 18, fill: C.faint, anchor: 'middle', fixed: true, max: 232 })}
  ${await t(rtl ? W - 1012 : 1012, 352, S(k + 'flow.serverSub2'), { size: 18, fill: C.faint, anchor: 'middle', fixed: true, max: 232 })}
  <line x1="${rtl ? W - 816 : 816}" y1="310" x2="${rtl ? W - 880 : 880}" y2="310" stroke="${C.orange}" stroke-width="4" stroke-dasharray="8 8"/>
  <g stroke="${C.orange}" stroke-width="5" stroke-linecap="round"><line x1="${rtl ? W - 836 : 836}" y1="294" x2="${rtl ? W - 860 : 860}" y2="326"/><line x1="${rtl ? W - 860 : 860}" y1="294" x2="${rtl ? W - 836 : 836}" y2="326"/></g>
  ${await t(56, 560, S(k + 'flow.note1'), { size: 21, fill: C.text, max: W - 112 })}
  ${await t(56, 596, S(k + 'flow.note2'), { size: 21, fill: C.muted, max: W - 112 - 190 })}`);
  return out;
}

// --------------------------------------------------------------- post 4: grades
async function gradeImages({ rtl, S, t, frame }) {
  const out = {};
  const k = 'grade.';
  const rows = [
    { key: 'homework', score: 95, weight: 20, color: C.blue },
    { key: 'quizzes', score: 88, weight: 10, color: C.purple },
    { key: 'midterm', score: 82, weight: 25, color: C.orange },
    { key: 'project', score: 90, weight: 15, color: C.green }
  ];
  const cur = Grade.calculateCurrentGrade(rows);
  const finalWeight = 30;
  const points = cur.totalPoints; // 61.8
  const dec = w => (w / 100).toFixed(2);

  // 1. Weighted grade: score bars, score × weight, total ÷ share graded
  const barX = 300, barMax = 470;
  let body = '';
  for (const [i, r] of rows.entries()) {
    const y = 150 + i * 84;
    const len = r.score / 100 * barMax;
    const c = cur.validRows[i].contribution;
    body += await t(56, y + 26, S(k + 'weighted.' + r.key), { size: 22, weight: 700, max: barX - 72 });
    body += await t(56, y + 54, S(k + 'weighted.weight', { weight: `${r.weight}%` }), { size: 18, fill: C.muted, max: barX - 72 });
    body += `<rect x="${rtl ? W - barX - len : barX}" y="${y + 6}" width="${len}" height="44" rx="10" fill="${r.color}"/>`;
    body += await t(barX + len + 12, y + 37, `${r.score}%`, { size: 22, weight: 800, fill: r.color, ltr: true });
    body += await t(870, y + 37, `${r.score} × ${dec(r.weight)} = ${c.toFixed(1)}`, { size: 24, weight: 700, ltr: true, max: W - 56 - 870 });
  }
  out['weighted-grade-worked-example'] = await frame(S(k + 'weighted.title'), S(k + 'weighted.subtitle', { weight: `${cur.totalWeight}%` }), `
  ${body}
  <line x1="56" y1="490" x2="${W - 56}" y2="490" stroke="${C.border}" stroke-width="2"/>
  ${await t(56, 548, `${points} ÷ ${dec(cur.totalWeight)} = ${cur.currentGrade}%`, { size: 42, weight: 800, fill: C.green, ltr: true })}
  ${await t(56, 592, S(k + 'weighted.result', { points, weight: `${cur.totalWeight}%`, letter: cur.letterGrade }), { size: 20, fill: C.muted, max: W - 112 - 190 })}`);

  // 2. Score needed on the final for five targets
  const targets = [90, 87, 80, 70, 60];
  const nX = 380, nMax = 600;
  let bars = '';
  for (const [i, target] of targets.entries()) {
    const y = 150 + i * 80;
    const need = Grade.calculateFinalExamNeeded(target, cur.totalWeight, cur.exactGrade, finalWeight);
    const label = S(k + 'needed.target', { target: `${target}%`, letter: Grade.getLetterGrade(target) });
    bars += await t(56, y + 36, label, { size: 22, weight: 700, max: nX - 76 });
    if (need.neededScore <= 0) {
      bars += await t(nX, y + 36, S(k + 'needed.secured', { points }), { size: 21, weight: 600, fill: C.green, max: nMax + 120 });
    } else {
      const len = need.neededScore / 100 * nMax;
      const color = need.neededScore >= 90 ? C.orange : need.neededScore >= 60 ? C.blue : C.green;
      bars += `<rect x="${rtl ? W - nX - len : nX}" y="${y + 8}" width="${len}" height="44" rx="10" fill="${color}"/>`;
      bars += await t(nX + len + 12, y + 38, `${need.neededScore}%`, { size: 24, weight: 800, fill: color, ltr: true });
    }
  }
  out['score-needed-on-final'] = await frame(S(k + 'needed.title', { weight: `${finalWeight}%` }), S(k + 'needed.subtitle', { points, weight: `${cur.totalWeight}%` }), `
  ${bars}
  ${await t(56, 600, S(k + 'needed.formula', { points, weight: dec(finalWeight) }), { size: 21, weight: 600, max: W - 112 - 190 })}`);

  // 3. Course grade against the score on the final (a straight line)
  const sx = f => 170 + f * 8.7, sy = g => 560 - (g - 55) / 40 * 380;
  const grade = f => points + f * finalWeight / 100;
  let g3 = '';
  for (const g of [60, 70, 80, 90]) {
    g3 += `<line x1="160" y1="${sy(g)}" x2="1144" y2="${sy(g)}" stroke="${C.grid}" stroke-width="2"/>`;
    g3 += await t(148, sy(g) + 7, `${g}% ${Grade.getLetterGrade(g)}`, { size: 18, fill: C.faint, anchor: 'end', fixed: true });
  }
  for (let f = 0; f <= 100; f += 20) g3 += await t(sx(f), 592, String(f), { size: 18, fill: C.faint, anchor: 'middle', fixed: true });
  let marks = '';
  // The end of the line only gets its value; the others get "final → course grade (letter)"
  for (const [f, dx, dy, anchor] of [[0, 14, 34, 'start'], [70, -14, -18, 'end'], [80, 14, 34, 'start'], [94, -14, -18, 'end'], [100, 14, 7, 'start']]) {
    const g = Math.round(grade(f) * 100) / 100;
    const label = f === 100 ? `${g}%` : `${f} → ${g}% (${Grade.getLetterGrade(g)})`;
    marks += `<circle cx="${sx(f)}" cy="${sy(g)}" r="8" fill="${C.blue}" stroke="#fff" stroke-width="3"/>`;
    marks += await t(sx(f) + dx, sy(g) + dy, label, { size: 20, weight: 700, fill: C.text, anchor, fixed: true });
  }
  out['final-exam-score-vs-course-grade'] = await frame(S(k + 'whatif.title'), S(k + 'whatif.subtitle', { points, weight: `${finalWeight}%` }), `
  ${g3}
  <line x1="${sx(0)}" y1="${sy(grade(0))}" x2="${sx(100)}" y2="${sy(grade(100))}" stroke="${C.blue}" stroke-width="6" stroke-linecap="round"/>
  ${marks}
  ${await t(sx(50), 630, S(k + 'whatif.axis'), { size: 19, fill: C.muted, anchor: 'middle', fixed: true, max: 560 })}`);
  return out;
}

// --------------------------------------------------------------- Open Graph cards (1200x630)
async function ogCard({ t, lang }, kicker, lines, sub, accent) {
  const o = { frameW: 1200, max: 1040 };
  const gap = SCALE[lang] ? 84 : 70; // Nastaliq lines need more room
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="g" cx="85%" cy="15%" r="65%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/><stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="#0b0f19"/><rect width="1200" height="630" fill="url(#g)"/>
  <rect x="80" y="80" width="56" height="56" rx="14" fill="#4f46e5"/>${await t(108, 118, 'T', { size: 30, weight: 800, fill: '#ffffff', anchor: 'middle', fixed: true })}
  ${await t(154, 119, 'ToolsBuilt', { size: 30, weight: 800, fill: '#f8fafc', fixed: true })}
  ${await t(80, 222, kicker.toUpperCase(), { size: 22, weight: 700, fill: accent, ...o })}
  ${(await Promise.all(lines.map((l, i) => t(80, 300 + i * gap, l, { size: 58, weight: 800, fill: '#f8fafc', ...o })))).join('')}
  ${await t(80, 300 + lines.length * gap + 20, sub, { size: 26, fill: '#94a3b8', ...o })}
  ${await t(80, 572, 'toolsbuilt.com/blog', { size: 22, weight: 600, fill: '#64748b', fixed: true })}
</svg>`;
}

const POSTS = {
  'how-to-calculate-loan-emi-in-pakistan': {
    images: emiImages,
    og: (c) => ogCard(c, c.S('og.emi.kicker'), [c.S('og.emi.line1'), c.S('og.emi.line2')], c.S('og.emi.sub'), '#10b981')
  },
  'percentage-formulas-explained': {
    images: percentImages,
    og: (c) => ogCard(c, c.S('og.percent.kicker'), [c.S('og.percent.line1'), c.S('og.percent.line2')], c.S('og.percent.sub'), '#3b82f6')
  },
  'how-to-calculate-your-grade': {
    images: gradeImages,
    og: (c) => ogCard(c, c.S('og.grade.kicker'), [c.S('og.grade.line1'), c.S('og.grade.line2')], c.S('og.grade.sub'), '#f59e0b')
  },
  'welcome-to-toolsbuilt': {
    images: welcomeImages,
    og: (c) => ogCard(c, c.S('og.welcome.kicker'), [c.S('og.welcome.line1'), c.S('og.welcome.line2')], c.S('og.welcome.sub'), '#8b5cf6')
  }
};

(async () => {
  const wanted = process.argv.slice(2);
  const langs = wanted.length ? wanted : LANGUAGES.filter(l => l.enabled).map(l => l.code);
  for (const lang of langs) {
    const c = context(lang);
    for (const [slug, post] of Object.entries(POSTS)) {
      const dir = path.join(ROOT, 'src', 'assets', 'blog', slug, lang === 'en' ? '' : lang);
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, svg] of Object.entries(await post.images(c))) {
        fs.writeFileSync(path.join(dir, `${name}.svg`), svg);
        await sharp(Buffer.from(svg), { density: 96 }).webp({ quality: 82, effort: 6 }).toFile(path.join(dir, `${name}.webp`));
      }
      const og = await post.og(c);
      fs.writeFileSync(path.join(dir, 'og.svg'), og);
      await sharp(Buffer.from(og)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(dir, 'og.png'));
    }
    console.log(`${lang}: done`);
  }
  if (problems.length) {
    console.error(`\n${problems.length} line(s) do not fit even at the smallest size:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
