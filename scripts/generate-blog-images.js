#!/usr/bin/env node
/**
 * Blog post images: charts, formula cards and Open Graph cards drawn as SVG from numbers computed
 * here with the tools' own logic.js (so the pictures and the post text always agree).
 *
 * Output per post in src/assets/blog/<post-slug>/:
 *   <name>.svg   the source (kept in git, editable)
 *   <name>.webp  what the post shows, 1600x900 (the SVG drawn at 96 dpi; the post's width/height match)
 *   og.png       1200x630 social card
 *
 * Usage: node scripts/generate-blog-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// librsvg finds fonts through fontconfig: point it at the self-hosted Inter
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

// Site palette (src/assets/css/tokens.css, light theme)
const C = {
  bg: '#ffffff', border: '#e2e8f0', grid: '#eef2f7', text: '#0f172a', muted: '#475569', faint: '#64748b',
  blue: '#2563eb', blueTint: '#e8f0ff', green: '#15803d', greenTint: '#e3f7ea',
  orange: '#c2410c', orangeTint: '#ffedde', purple: '#9333ea', purpleTint: '#f3e8ff'
};
const FONT = "Inter, 'Inter Variable', -apple-system, 'Segoe UI', sans-serif";
const W = 1200, H = 675; // in-post images: 16:9

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rs = (n, d = 0) => 'Rs ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size || 22}" font-weight="${o.weight || 400}" fill="${o.fill || C.text}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const frame = (title, subtitle, body, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img">
  <rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="24" fill="${C.bg}" stroke="${C.border}" stroke-width="2"/>
  ${t(56, 74, title, { size: 34, weight: 800 })}
  ${subtitle ? t(56, 112, subtitle, { size: 21, fill: C.muted }) : ''}
  ${body}
  ${t(W - 56, h - 30, 'toolsbuilt.com', { size: 18, weight: 600, fill: C.faint, anchor: 'end' })}
</svg>`;

function legend(items, x, y) {
  let out = '', cx = x;
  for (const [color, label] of items) {
    out += `<rect x="${cx}" y="${y - 16}" width="20" height="20" rx="5" fill="${color}"/>` + t(cx + 30, y, label, { size: 20, fill: C.muted });
    cx += 40 + label.length * 10.5;
  }
  return out;
}

// --------------------------------------------------------------- post 1: loan EMI
function emiImages() {
  const home = Loan.calculateLoanEmi(5000000, 16, 15, 'years');
  const homeExtra = Loan.calculateLoanEmi(5000000, 16, 15, 'years', { extraMonthlyPayment: 10000 });
  const bike = Loan.calculateLoanEmi(1500000, 20, 3, 'years');
  const flatInterest = 1500000 * 0.20 * 3;
  const flatEmi = (1500000 + flatInterest) / 36;
  const out = {};

  // 1. Formula card with the 1.5M example plugged in
  const r = 20 / 1200, pow = Math.pow(1 + r, 36);
  out['emi-formula-worked-example'] = frame('The EMI formula, with a real loan plugged in', 'Rs 1,500,000 borrowed at an example rate of 20% a year for 3 years (36 months)', `
  <rect x="56" y="150" width="${W - 112}" height="132" rx="18" fill="${C.blueTint}"/>
  ${t(W / 2, 236, 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)', { size: 44, weight: 800, fill: C.blue, anchor: 'middle' })}
  ${t(80, 340, 'P = 1,500,000', { size: 26, weight: 700 })}${t(80, 372, 'the amount you borrow', { size: 20, fill: C.muted })}
  ${t(440, 340, `r = 20 ÷ 1200 = ${r.toFixed(6)}`, { size: 26, weight: 700 })}${t(440, 372, 'the monthly rate, as a decimal', { size: 20, fill: C.muted })}
  ${t(840, 340, 'n = 36', { size: 26, weight: 700 })}${t(840, 372, 'number of monthly payments', { size: 20, fill: C.muted })}
  <line x1="56" y1="412" x2="${W - 56}" y2="412" stroke="${C.border}" stroke-width="2"/>
  ${t(80, 464, `(1 + r)ⁿ = 1.016667³⁶ = ${pow.toFixed(4)}`, { size: 24, fill: C.muted })}
  ${t(80, 508, `EMI = 1,500,000 × ${r.toFixed(6)} × ${pow.toFixed(4)} ÷ ${(pow - 1).toFixed(4)}`, { size: 24, fill: C.muted })}
  ${t(80, 576, `= ${rs(bike.monthlyEmi, 2)} a month`, { size: 40, weight: 800, fill: C.green })}
  ${t(80, 616, `36 payments add up to ${rs(bike.totalPayment, 2)}: ${rs(bike.totalInterest, 2)} of that is interest`, { size: 21, fill: C.muted })}`);

  // 2. Principal vs interest per year, 5M home loan
  const years = [];
  for (let y = 0; y < 15; y++) {
    const rows = home.schedule.slice(y * 12, y * 12 + 12);
    years.push({ i: rows.reduce((s, x) => s + x.interest, 0), p: rows.reduce((s, x) => s + x.principal, 0) });
  }
  const top = 215, base = 560, chartH = base - top, left = 130, colW = 64, gap = 1000 / 15 - colW;
  const max = Math.max(...years.map(y => y.i + y.p));
  let bars = '';
  years.forEach((y, k) => {
    const x = left + k * (colW + gap);
    const hi = y.i / max * chartH, hp = y.p / max * chartH;
    bars += `<rect x="${x}" y="${base - hi}" width="${colW}" height="${hi}" fill="${C.orange}"/>`;
    bars += `<rect x="${x}" y="${base - hi - hp}" width="${colW}" height="${hp}" fill="${C.green}"/>`;
    bars += t(x + colW / 2, base + 30, String(k + 1), { size: 18, fill: C.faint, anchor: 'middle' });
  });
  let grid = '';
  for (let v = 0; v <= 900000; v += 300000) {
    const y = base - v / max * chartH;
    grid += `<line x1="${left - 10}" y1="${y}" x2="${W - 60}" y2="${y}" stroke="${C.grid}" stroke-width="2"/>` + t(left - 18, y + 7, v === 0 ? '0' : `${v / 1000}k`, { size: 18, fill: C.faint, anchor: 'end' });
  }
  out['emi-principal-vs-interest-5m-home-loan'] = frame('Where each year of EMIs goes on a Rs 5,000,000 home loan', `${rs(home.monthlyEmi, 2)} a month for 15 years at an example 16%: interest (orange) vs principal (green)`, `
  ${grid}${bars}
  ${t(left + 500, base + 64, 'Year of the loan', { size: 19, fill: C.muted, anchor: 'middle' })}
  ${legend([[C.orange, `Interest, year 1: ${rs(years[0].i)}`], [C.green, `Principal, year 1: ${rs(years[0].p)}`]], 130, 168)}`);

  // 3. Balance curve with and without Rs 10,000 extra a month
  const pts = (sched) => [[0, 5000000], ...sched.map(x => [x.month, x.balance])];
  const sx = m => 130 + m / 180 * 990, sy = b => 560 - b / 5000000 * 380;
  const line = (p, color, dash) => `<polyline fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"${dash ? ' stroke-dasharray="12 10"' : ''} points="${p.map(([m, b]) => `${sx(m).toFixed(1)},${sy(b).toFixed(1)}`).join(' ')}"/>`;
  let g3 = '';
  for (let v = 0; v <= 5000000; v += 1000000) g3 += `<line x1="120" y1="${sy(v)}" x2="1130" y2="${sy(v)}" stroke="${C.grid}" stroke-width="2"/>` + t(108, sy(v) + 7, v === 0 ? '0' : `${v / 1000000}M`, { size: 18, fill: C.faint, anchor: 'end' });
  for (let m = 0; m <= 180; m += 36) g3 += t(sx(m), 592, m === 0 ? '0' : `${m / 12} yrs`, { size: 18, fill: C.faint, anchor: 'middle' });
  const xEnd = homeExtra.extra.payoffMonths;
  out['emi-balance-curve-extra-10000'] = frame('Paying Rs 10,000 extra each month on the same home loan', `Balance left over time. Paid off in ${xEnd} months instead of 180, saving ${rs(homeExtra.extra.interestSaved)} of interest`, `
  ${g3}${line(pts(home.schedule), C.blue)}${line(pts(homeExtra.extra.schedule), C.green, true)}
  <circle cx="${sx(xEnd)}" cy="${sy(0)}" r="9" fill="${C.green}"/>
  ${t(sx(xEnd) + 18, sy(0) - 14, `paid off: month ${xEnd}`, { size: 20, weight: 700, fill: C.green })}
  ${legend([[C.blue, 'EMI only'], [C.green, 'EMI + Rs 10,000 extra']], 130, 150)}`);

  // 4. Flat rate vs reducing balance
  const bw = 820 / flatInterest;
  out['flat-rate-vs-reducing-balance-20-percent'] = frame('"20% flat" and "20% reducing balance" are not the same loan', 'Rs 1,500,000 over 3 years: total interest you would pay', `
  ${t(56, 210, '20% reducing balance', { size: 24, weight: 700 })}
  <rect x="56" y="228" width="${bike.totalInterest * bw}" height="64" rx="10" fill="${C.green}"/>
  ${t(56 + bike.totalInterest * bw + 18, 270, rs(bike.totalInterest, 2), { size: 26, weight: 800, fill: C.green })}
  ${t(56, 322, `EMI ${rs(bike.monthlyEmi, 2)}`, { size: 20, fill: C.muted })}
  ${t(56, 400, '20% flat', { size: 24, weight: 700 })}
  <rect x="56" y="418" width="${flatInterest * bw}" height="64" rx="10" fill="${C.orange}"/>
  ${t(56 + flatInterest * bw + 18, 460, rs(flatInterest, 2), { size: 26, weight: 800, fill: C.orange })}
  ${t(56, 512, `EMI ${rs(flatEmi, 2)}`, { size: 20, fill: C.muted })}
  ${t(56, 590, `The flat quote costs ${rs(flatInterest - bike.totalInterest, 2)} more. Its true reducing-balance rate is about 33.6%.`, { size: 22, weight: 600, fill: C.text })}`);
  return out;
}

// --------------------------------------------------------------- post 2: percentages
function percentImages() {
  const out = {};
  const card = (x, y, w, h, tint, color, head, formula, ex) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${tint}"/>
  ${t(x + 28, y + 46, head, { size: 22, weight: 700, fill: color })}
  ${t(x + 28, y + 100, formula, { size: 30, weight: 800 })}
  ${t(x + 28, y + 146, ex, { size: 20, fill: C.muted })}`;
  out['percentage-formulas-cheat-sheet'] = frame('Four percentage formulas that cover almost everything', 'Marks, discounts, price changes and working backwards from a sale price', `
  ${card(56, 146, 528, 186, C.blueTint, C.blue, 'Marks: what percent did I get?', 'obtained ÷ total × 100', '912 ÷ 1100 × 100 = 82.91%')}
  ${card(616, 146, 528, 186, C.greenTint, C.green, 'Discount: price after % off', 'price × (1 − % ÷ 100)', '2,400 × (1 − 0.15) = Rs 2,040')}
  ${card(56, 356, 528, 186, C.orangeTint, C.orange, 'Change: how much did it rise?', '(new − old) ÷ old × 100', '(46,000 − 40,000) ÷ 40,000 = 15%')}
  ${card(616, 356, 528, 186, C.purpleTint, C.purple, 'Reverse: price before % off', 'sale ÷ (1 − % ÷ 100)', '2,040 ÷ 0.85 = Rs 2,400')}
  ${t(56, 600, 'Always divide by the value you started from. Most percentage mistakes come from the wrong base.', { size: 21, weight: 600 })}`);

  // stacked discount
  const d = Discount.calculateDiscount(5000, 20, { stackedDiscountPercent: 10 });
  const sc = 680 / 5000;
  const row = (y, label, value, color, note) => `${t(56, y + 40, label, { size: 22, weight: 700 })}
  <rect x="300" y="${y}" width="${value * sc}" height="60" rx="10" fill="${color}"/>
  ${t(300 + value * sc + 16, y + 40, rs(value), { size: 24, weight: 800, fill: color })}
  ${note ? t(300, y + 88, note, { size: 19, fill: C.muted }) : ''}`;
  out['stacked-discount-20-then-10-percent'] = frame('20% off, then 10% off, is not 30% off', 'A Rs 5,000 item with two discounts applied one after the other', `
  ${row(160, 'Original price', 5000, C.faint, '')}
  ${row(260, 'After 20% off', d.subtotalAfterPrimary, C.blue, `20% of 5,000 = ${rs(d.primarySavings)} off`)}
  ${row(380, 'Then 10% off', d.priceAfterDiscounts, C.green, `10% of 4,000 (not 5,000) = ${rs(d.stackedSavings)} off. Total saved: ${d.totalSavingsPercent}%`)}
  ${row(500, 'If it were 30%', 3500, C.orange, 'What many people expect. You actually pay Rs 100 more than this.')}`);

  // asymmetry
  const up = (46000 - 40000) / 40000 * 100, down = (40000 - 46000) / 46000 * 100;
  out['percentage-increase-decrease-not-symmetric'] = frame('Up 15%, then back down: why it is only 13.04%', 'Rent goes from Rs 40,000 to Rs 46,000 and later returns to Rs 40,000', `
  <rect x="96" y="${560 - 40000 / 50000 * 380}" width="220" height="${40000 / 50000 * 380}" rx="12" fill="${C.blue}"/>
  <rect x="490" y="${560 - 46000 / 50000 * 380}" width="220" height="${46000 / 50000 * 380}" rx="12" fill="${C.orange}"/>
  <rect x="884" y="${560 - 40000 / 50000 * 380}" width="220" height="${40000 / 50000 * 380}" rx="12" fill="${C.blue}"/>
  ${t(206, 596, 'Before: Rs 40,000', { size: 20, weight: 700, anchor: 'middle' })}
  ${t(600, 596, 'Raised: Rs 46,000', { size: 20, weight: 700, anchor: 'middle' })}
  ${t(994, 596, 'Back: Rs 40,000', { size: 20, weight: 700, anchor: 'middle' })}
  ${t(403, 230, `+${up}%`, { size: 34, weight: 800, fill: C.orange, anchor: 'middle' })}
  ${t(403, 262, '6,000 ÷ 40,000', { size: 19, fill: C.muted, anchor: 'middle' })}
  ${t(797, 230, `${down.toFixed(2)}%`, { size: 34, weight: 800, fill: C.blue, anchor: 'middle' })}
  ${t(797, 262, '6,000 ÷ 46,000', { size: 19, fill: C.muted, anchor: 'middle' })}`);

  // averaging percentages
  const avg = (90 + 60) / 2, real = 78 / 120 * 100;
  out['averaging-percentages-mistake'] = frame("Don't average percentages with different totals", 'A class test of 18/20 and a final exam of 60/100', `
  ${card(56, 150, 528, 186, C.orangeTint, C.orange, 'Wrong: average the two percentages', '(90% + 60%) ÷ 2', `= ${avg}%, which treats a 20-mark test like the exam`)}
  ${card(616, 150, 528, 186, C.greenTint, C.green, 'Right: add the marks first', '(18 + 60) ÷ (20 + 100)', `= 78 ÷ 120 × 100 = ${real}%`)}
  ${t(56, 410, 'The 20-mark test is one sixth of the 120 marks on offer, so it should only move the result a little.', { size: 22 })}
  ${t(56, 446, 'Averaging gives it as much weight as the exam and inflates the result by 10 points.', { size: 22 })}
  ${t(56, 520, 'Equal totals (like FSc Part 1 and Part 2, 550 each) are the one case where the average matches.', { size: 21, fill: C.muted })}`);
  return out;
}

// --------------------------------------------------------------- Open Graph cards (1200x630)
function ogCard(kicker, lines, sub, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><radialGradient id="g" cx="85%" cy="15%" r="65%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/><stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="#0b0f19"/><rect width="1200" height="630" fill="url(#g)"/>
  <rect x="80" y="80" width="56" height="56" rx="14" fill="#4f46e5"/>${t(108, 118, 'T', { size: 30, weight: 800, fill: '#ffffff', anchor: 'middle' })}
  ${t(154, 119, 'ToolsBuilt', { size: 30, weight: 800, fill: '#f8fafc' })}
  ${t(80, 222, kicker.toUpperCase(), { size: 22, weight: 700, fill: accent })}
  ${lines.map((l, i) => t(80, 300 + i * 70, l, { size: 58, weight: 800, fill: '#f8fafc' })).join('')}
  ${t(80, 300 + lines.length * 70 + 20, sub, { size: 26, fill: '#94a3b8' })}
  ${t(80, 572, 'toolsbuilt.com/blog', { size: 22, weight: 600, fill: '#64748b' })}
</svg>`;
}

const POSTS = {
  'how-to-calculate-loan-emi-in-pakistan': {
    images: emiImages,
    og: ogCard('Guide · Loan EMI', ['How to calculate loan EMI', 'in Pakistan'], 'The formula, worked PKR examples and ways to pay less interest', '#10b981')
  },
  'percentage-formulas-explained': {
    images: percentImages,
    og: ogCard('Guide · Percentages', ['Percentage formulas for', 'marks, discounts and change'], 'Worked examples, and the mistakes that give wrong answers', '#3b82f6')
  }
};

(async () => {
  for (const [slug, post] of Object.entries(POSTS)) {
    const dir = path.join(ROOT, 'src', 'assets', 'blog', slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, svg] of Object.entries(post.images())) {
      fs.writeFileSync(path.join(dir, `${name}.svg`), svg);
      await sharp(Buffer.from(svg), { density: 96 }).webp({ quality: 82, effort: 6 }).toFile(path.join(dir, `${name}.webp`));
    }
    fs.writeFileSync(path.join(dir, 'og.svg'), post.og);
    await sharp(Buffer.from(post.og)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(dir, 'og.png'));
    console.log(`${slug}: ${fs.readdirSync(dir).join(', ')}`);
  }
})();
