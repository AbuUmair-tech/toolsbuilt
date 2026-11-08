#!/usr/bin/env node
/**
 * Flat string lists for translators, so nobody edits the nested JSON by hand.
 *
 *   node scripts/i18n-strings.js export <lang> <file|all> [--out dir] [--missing]
 *     Writes <out>/<lang>/<file label>.json: { "faqs[0].q": "English text", ... } with every
 *     string that needs translating (not URLs, ids or glossary-only strings). Plural keys are
 *     listed once per plural form the language needs (e.g. "common.tools.few"), with the
 *     English "other" form as the source. --missing lists only strings the language lacks.
 *   node scripts/i18n-strings.js import <lang> <flat.json> <file label>
 *     Builds/updates src/_data/i18n/<file label for lang> from a flat translation file. Only text
 *     goes in; URLs and other data keep coming from English.
 *
 * File labels: "ui", "tools/<slug>.json", "pages/<name>.json".
 */
const fs = require('fs');
const path = require('path');
const { I18N_DIR } = require('./i18n-data.js');
const { NON_TEXT, isObject, isPluralForms, needsTranslation, filePairs, pluralCategories } = require('./i18n-text.js');

function flatten(en, code, prefix = '', out = {}) {
  if (isPluralForms(en)) {
    for (const cat of pluralCategories(code)) out[`${prefix}.${cat}`] = en[cat] !== undefined ? en[cat] : en.other;
    return out;
  }
  if (Array.isArray(en)) {
    en.forEach((item, i) => flatten(item, code, `${prefix}[${i}]`, out));
    return out;
  }
  if (isObject(en)) {
    for (const [key, value] of Object.entries(en)) {
      if (NON_TEXT.has(key) && typeof value !== 'object') continue;
      flatten(value, code, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (typeof en === 'string' && needsTranslation(en)) out[prefix] = en;
  return out;
}

// "a.b[2].c" -> ['a', 'b', 2, 'c']; empty segments are kept (keys may contain dots, e.g. "x..")
function parsePath(p) {
  const parts = [];
  for (const segment of p.split('.')) {
    const m = segment.match(/^([^[]*)((?:\[\d+\])*)$/);
    if (m[1] !== '' || !m[2]) parts.push(m[1]);
    for (const index of m[2].match(/\d+/g) || []) parts.push(Number(index));
  }
  return parts;
}

function lookup(obj, parts) {
  return parts.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, parts, value) {
  let o = obj;
  parts.forEach((key, i) => {
    if (i === parts.length - 1) { o[key] = value; return; }
    if (o[key] == null) o[key] = typeof parts[i + 1] === 'number' ? [] : {};
    o = o[key];
  });
}

// Arrays with gaps: fill with {} (objects) or null so deep merge keeps English there
function fillGaps(v, en) {
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (v[i] === undefined) v[i] = isObject(en && en[i]) ? {} : null;
      else fillGaps(v[i], en && en[i]);
    }
  } else if (isObject(v)) {
    for (const key of Object.keys(v)) fillGaps(v[key], en && en[key]);
  }
  return v;
}

const [cmd, code, target, label] = process.argv.slice(2);
const opt = name => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);

if (cmd === 'export') {
  const outDir = path.join(opt('--out') || path.join(process.cwd(), 'i18n-export'), code);
  const pairs = filePairs(code).filter(([l]) => target === 'all' || l === target);
  let total = 0;
  for (const [l, enFile, trFile] of pairs) {
    const flat = flatten(JSON.parse(fs.readFileSync(enFile, 'utf8')), code);
    if (process.argv.includes('--missing') && fs.existsSync(trFile)) {
      const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
      for (const p of Object.keys(flat)) if (typeof lookup(tr, parsePath(p)) === 'string') delete flat[p];
    }
    if (!Object.keys(flat).length) continue;
    const file = path.join(outDir, `${l.replace(/\.json$/, '')}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(flat, null, 2) + '\n');
    total += Object.keys(flat).length;
    console.log(`${path.relative(process.cwd(), file)}: ${Object.keys(flat).length} strings`);
  }
  console.log(`${total} strings to translate for ${code}`);
} else if (cmd === 'import') {
  const pair = filePairs(code).find(([l]) => l === label || l === `${label}.json`);
  if (!pair) throw new Error(`unknown file label "${label}"`);
  const [, enFile, trFile] = pair;
  const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const known = flatten(en, code);
  const flat = JSON.parse(fs.readFileSync(target, 'utf8'));
  const tr = fs.existsSync(trFile) ? JSON.parse(fs.readFileSync(trFile, 'utf8')) : (Array.isArray(en) ? [] : {});
  const unknown = Object.keys(flat).filter(p => !(p in known));
  if (unknown.length) throw new Error(`keys not in English: ${unknown.slice(0, 5).join(', ')}`);
  for (const [p, value] of Object.entries(flat)) setPath(tr, parsePath(p), value);
  fs.mkdirSync(path.dirname(trFile), { recursive: true });
  fs.writeFileSync(trFile, JSON.stringify(fillGaps(tr, en), null, 2) + '\n');
  console.log(`${path.relative(process.cwd(), trFile)}: ${Object.keys(flat).length} strings imported`);
} else {
  console.error('Usage: i18n-strings.js export <lang> <file|all> [--out dir] [--missing] | import <lang> <flat.json> <file label>');
  process.exit(1);
}
