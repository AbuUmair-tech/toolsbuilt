#!/usr/bin/env node
/**
 * Checks translated blog posts (src/blog/<lang>/<slug>.md) against their English originals
 * (src/blog/<slug>.md), and the translated chart strings (scripts/blog-images/<lang>.json).
 *
 * A translation must keep everything that is not prose exactly: every number, link, image,
 * heading, FAQ, table row and takeaway, and the front-matter data. Prose must be translated:
 * no English sentence may be left behind.
 *
 * Usage: node scripts/check-blog-translations.js [--lang ur]
 * Exit code 1 when there are errors.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const BLOG = path.join(ROOT, 'src', 'blog');
const IMAGES = path.join(__dirname, 'blog-images');
const languages = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', '_data', 'languages.json'), 'utf8'));
const argLang = (process.argv.indexOf('--lang') > -1) ? process.argv[process.argv.indexOf('--lang') + 1] : null;
const targets = languages.filter(l => l.enabled && l.code !== 'en' && (!argLang || l.code === argLang));
const NON_LATIN = new Set(['ar', 'ur', 'hi']);
// Data that is the same in every language
const SAME = ['date', 'updated', 'author', 'tool', 'relatedTools', 'ogType', 'draft'];
// Words that stay in Latin script in every language
const KEEP = new Set(('ToolsBuilt EMI KIBOR SBP PKR Rs FBR GPA CGPA FSc ICS ICom Matric BISE HEC SIP JavaScript GitHub ' +
  'Eleventy Google Analytics HTML CSS JSON Python Java UUID MDN Ctrl K Mac API crypto getRandomValues Pages Do Not Track ' +
  'P r n x EMI-s DRAFT Math Fun Reset Pro').split(/\s+/).map(w => w.toLowerCase()));

const errors = [];
const warnings = [];

function read(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front matter`);
  return { fm: yaml.load(m[1]) || {}, body: m[2], raw };
}

const strip = s => s.replace(/<[^>]+>/g, ' ');
// Numbers as written, e.g. 1,500,000 / 55,745.38 / 20 / 0.016667 (not inside URLs or file names)
function numbers(text) {
  const clean = text
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/(src|href)="[^"]*"/g, '')
    .replace(/\b(width|height)="\d+"/g, '')
    .replace(/https?:\/\/\S+/g, '');
  return (clean.match(/\d+(?:[.,]\d+)*/g) || []).sort();
}
function links(body) {
  const out = [];
  body.replace(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g, (m, href) => out.push(href));
  body.replace(/<a\b[^>]*\shref="([^"]+)"/g, (m, href) => out.push(href));
  return out.sort();
}
const images = body => [...body.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
const attr = (tag, name) => ((tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1]);
const count = (body, re) => (body.match(re) || []).length;
function diff(a, b) {
  const left = [...a], extra = [];
  for (const x of b) {
    const i = left.indexOf(x);
    if (i > -1) left.splice(i, 1); else extra.push(x);
  }
  return { missing: left, extra };
}

function checkPost(lang, slug) {
  const enFile = path.join(BLOG, `${slug}.md`);
  const file = path.join(BLOG, lang.code, `${slug}.md`);
  const rel = path.relative(ROOT, file);
  if (!fs.existsSync(file)) { errors.push(`${rel}: missing translation of src/blog/${slug}.md`); return; }
  const en = read(enFile);
  let tr;
  try { tr = read(file); } catch (e) { errors.push(`${rel}: ${e.message}`); return; }

  // Front matter: same keys, same data, translated text
  const keys = o => Object.keys(o).filter(k => k !== 'tags').sort().join(',');
  if (keys(en.fm) !== keys(tr.fm)) errors.push(`${rel}: front matter keys differ from English (${keys(tr.fm)} vs ${keys(en.fm)})`);
  for (const k of SAME) {
    if (JSON.stringify(en.fm[k] instanceof Date ? en.fm[k].toISOString() : en.fm[k]) !==
        JSON.stringify(tr.fm[k] instanceof Date ? tr.fm[k].toISOString() : tr.fm[k])) errors.push(`${rel}: "${k}" must stay as in English`);
  }
  if (en.fm.ogImage) {
    const want = en.fm.ogImage.replace(/\/og\.png$/, `/${lang.code}/og.png`);
    if (tr.fm.ogImage !== want) errors.push(`${rel}: ogImage must be ${want}`);
  }
  const tl = (tr.fm.title || '').length, dl = (tr.fm.description || '').length;
  if (tl < 30 || tl > 60) errors.push(`${rel}: title is ${tl} characters (30-60)`);
  if (dl < 120 || dl > 155) errors.push(`${rel}: description is ${dl} characters (120-155)`);
  for (const k of ['title', 'h1', 'shortTitle', 'description', 'category', 'ogImageAlt']) {
    if (en.fm[k] && tr.fm[k] === en.fm[k]) errors.push(`${rel}: "${k}" is not translated`);
  }
  const ef = en.fm.faqs || [], tf = tr.fm.faqs || [];
  if (ef.length !== tf.length) errors.push(`${rel}: ${tf.length} FAQs, English has ${ef.length}`);
  tf.forEach((f, i) => {
    if (!f || !f.question || !f.answer) errors.push(`${rel}: FAQ ${i + 1} is empty`);
    else if (ef[i] && (f.question === ef[i].question || f.answer === ef[i].answer)) errors.push(`${rel}: FAQ ${i + 1} is not translated`);
  });

  // Numbers in the body and the FAQs
  const enText = en.body + JSON.stringify(ef), trText = tr.body + JSON.stringify(tf);
  const n = diff(numbers(enText), numbers(trText));
  if (n.missing.length || n.extra.length) {
    errors.push(`${rel}: numbers differ from English. Missing: [${n.missing.join(' ')}] Extra: [${n.extra.join(' ')}]`);
  }

  // Links, images, structure
  const l = diff(links(en.body), links(tr.body));
  if (l.missing.length || l.extra.length) errors.push(`${rel}: links differ from English. Missing: [${l.missing.join(' ')}] Extra: [${l.extra.join(' ')}]`);
  const ei = images(en.body), ti = images(tr.body);
  if (ei.length !== ti.length) errors.push(`${rel}: ${ti.length} images, English has ${ei.length}`);
  ei.forEach((img, i) => {
    const t = ti[i];
    if (!t) return;
    const want = attr(img, 'src').replace(/\/([^/]+)$/, `/${lang.code}/$1`);
    if (attr(t, 'src') !== want) errors.push(`${rel}: image ${i + 1} src must be ${want}`);
    for (const a of ['width', 'height', 'loading', 'decoding']) {
      if (attr(img, a) !== attr(t, a)) errors.push(`${rel}: image ${i + 1} ${a} must stay "${attr(img, a)}"`);
    }
    if (!attr(t, 'alt') || attr(t, 'alt') === attr(img, 'alt')) errors.push(`${rel}: image ${i + 1} alt text is not translated`);
  });
  const shapes = {
    'H2 headings': /^## /gm, 'H3 headings': /^### /gm, 'figures': /<figure/g, 'captions': /<figcaption>/g,
    'table rows': /^\|.*\|\s*$/gm, 'list items in takeaways': /<li>/g, 'takeaway boxes': /class="key-takeaways"/g,
    'numbered steps': /^\d+\. /gm, 'bullet points': /^[-*] /gm, 'bold spans': /\*\*[^*]+\*\*/g, 'code spans': /`[^`]+`/g
  };
  for (const [name, re] of Object.entries(shapes)) {
    const a = count(en.body, re), b = count(tr.body, re);
    if (a !== b) errors.push(`${rel}: ${b} ${name}, English has ${a}`);
  }
  // Code spans and <kbd> keys stay exactly as they are
  const codes = s => (s.match(/`[^`]+`|<kbd>[^<]*<\/kbd>/g) || []).sort().join('|');
  if (codes(en.body) !== codes(tr.body)) errors.push(`${rel}: code spans or <kbd> keys were changed`);

  // Leftover English
  const enLines = new Set(en.body.split('\n').map(s => s.trim()).filter(s => s.length > 40 && !/^(<img|<\/?figure|\|[-|]+\||<div|<\/div|<ul|<\/ul)/.test(s)));
  for (const line of tr.body.split('\n')) {
    if (enLines.has(line.trim())) errors.push(`${rel}: untranslated line: "${line.trim().slice(0, 80)}"`);
  }
  if (NON_LATIN.has(lang.code)) {
    const words = strip(tr.body + ' ' + tf.map(f => f.question + ' ' + f.answer).join(' '))
      .replace(/\]\([^)]*\)/g, ']').replace(/`[^`]*`/g, ' ').replace(/https?:\/\/\S+/g, ' ')
      .match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    const latin = words.filter(w => !KEEP.has(w.toLowerCase()) && w.length > 2);
    const counts = {};
    latin.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    if (latin.length > 25) warnings.push(`${rel}: ${latin.length} Latin-script words left in the text: ${Object.keys(counts).slice(0, 25).join(', ')}`);
  }
  if (/\bTODO\b|\[AUTHOR_NOTE\]|lorem ipsum/i.test(tr.raw)) errors.push(`${rel}: placeholder text`);
}

function checkImageStrings(lang) {
  const file = path.join(IMAGES, `${lang.code}.json`);
  const rel = path.relative(ROOT, file);
  if (!fs.existsSync(file)) { errors.push(`${rel}: missing`); return; }
  const en = JSON.parse(fs.readFileSync(path.join(IMAGES, 'en.json'), 'utf8'));
  let tr;
  try { tr = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { errors.push(`${rel}: ${e.message}`); return; }
  (function walk(a, b, at) {
    for (const [k, v] of Object.entries(a)) {
      const key = at ? `${at}.${k}` : k;
      if (typeof v === 'object') { walk(v, (b || {})[k], key); continue; }
      const t = (b || {})[k];
      if (typeof t !== 'string' || !t.trim()) { errors.push(`${rel}: "${key}" is missing`); continue; }
      for (const ph of (v.match(/\{\{\w+\}\}/g) || [])) if (!t.includes(ph)) errors.push(`${rel}: "${key}" lost ${ph}`);
      const d = diff(numbers(v.replace(/\{\{\w+\}\}/g, '')), numbers(t.replace(/\{\{\w+\}\}/g, '')));
      if (d.missing.length || d.extra.length) errors.push(`${rel}: "${key}" numbers differ (missing [${d.missing}] extra [${d.extra}])`);
      if (t === v && /[a-z]{4}/.test(v) && !/^[\w\s·.-]*ToolsBuilt[\w\s·.-]*$/.test(v)) warnings.push(`${rel}: "${key}" is the same as English`);
    }
    for (const k of Object.keys(b || {})) if (!(k in a)) errors.push(`${rel}: unknown key "${at ? at + '.' : ''}${k}"`);
  })(en, tr, '');
}

const slugs = fs.readdirSync(BLOG).filter(f => f.endsWith('.md'))
  .filter(f => !read(path.join(BLOG, f)).fm.draft).map(f => f.replace(/\.md$/, ''));
for (const lang of targets) {
  const dir = path.join(BLOG, lang.code);
  if (!fs.existsSync(dir) && !argLang) continue; // language not translated yet
  for (const slug of slugs) checkPost(lang, slug);
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : []) {
    if (!slugs.includes(f.replace(/\.md$/, ''))) errors.push(`src/blog/${lang.code}/${f}: no English post with this name`);
  }
  checkImageStrings(lang);
}

for (const w of warnings) console.log(`⚠️  ${w}`);
if (errors.length) {
  console.error(`❌ Blog translation check failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✅ Blog translation check passed (${targets.length} language(s), ${slugs.length} post(s) each).`);
