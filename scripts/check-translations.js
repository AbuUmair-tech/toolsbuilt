#!/usr/bin/env node
/**
 * scripts/check-translations.js
 * Translation data check (src/_data/i18n)
 *
 * For every enabled non-English language (or the languages given with --lang, or every language
 * that has files with --all), compares each translation file with its English source:
 *   ERRORS (exit 1):
 *     - missing keys: English text with no translation (non-text fields such as url, link and
 *       code are not expected in translations; they come from English)
 *     - broken placeholders: {{name}}, %s/%d, or HTML tags (and link targets) that differ
 *     - non-text fields that differ from English (e.g. a changed URL)
 *     - plural forms missing for a category the language needs (Intl.PluralRules)
 *     - page title over 60 or description over 155 characters
 *   WARNINGS:
 *     - extra keys that English does not have
 *     - text identical to English (possibly untranslated), except brand names and other
 *       glossary terms, formulas and strings without words
 *     - numbers in worked examples that differ from English
 * Always: the English copies in tools.json / categories.json / countries.json /
 * grading-scales.json must match the translation data (scripts/i18n-sync.js).
 *
 * Usage: node scripts/check-translations.js [--lang es,de] [--all] [--quiet]
 */
const fs = require('fs');
const path = require('path');
const { I18N_DIR } = require('./i18n-data.js');
const { NON_TEXT, isObject, isPluralForms, needsTranslation, filePairs } = require('./i18n-text.js');
const { loadLanguages } = require('./i18n.js');
const { syncEnglishCopies } = require('./i18n-sync.js');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const languages = loadLanguages();
// Text that is fine to leave as in English: formulas and expressions
const SAME_OK_PATH = /(^|\.)(formula\.expression|expression|keywords)(\.|$)/;

let codes;
if (args.includes('--lang')) codes = args[args.indexOf('--lang') + 1].split(',');
else if (args.includes('--all')) codes = languages.map(l => l.code).filter(c => c !== 'en' && hasFiles(c));
else codes = languages.filter(l => l.enabled && l.code !== 'en').map(l => l.code);

const errors = [];
const warnings = [];

function hasFiles(code) {
  return fs.existsSync(path.join(I18N_DIR, 'ui', `${code}.json`)) ||
    ['tools', 'pages'].some(dir => fs.existsSync(path.join(I18N_DIR, dir, code)));
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
}

// Search-result limits, in characters (not bytes)
const LIMITS = { title: 60, description: 155 };

const placeholders = s => (s.match(/\{\{\s*\w+\s*\}\}|%[sd]/g) || []).map(p => p.replace(/\s/g, '')).sort().join(' ');
const tags = s => (s.match(/<\/?[a-zA-Z][^>]*>/g) || [])
  .map(t => { const href = t.match(/\shref="([^"]*)"/); return t.match(/^<\/?[a-zA-Z0-9]+/)[0] + (href ? `[${href[1]}]` : ''); })
  .sort().join(' ');
const numbers = s => (s.match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/[.,]/g, '')).sort().join(' ');

function compare(en, tr, where, keyPath, code) {
  if (tr === null) tr = undefined; // a gap: English is used there
  const at = keyPath ? `${where} ${keyPath}` : where;
  const last = keyPath.split('.').pop();
  if (NON_TEXT.has(last) && typeof en !== 'object') {
    if (tr !== undefined && tr !== en) errors.push(`[${code}] ${at}: "${tr}" must be the same as English "${en}" (not text)`);
    return;
  }
  if (isPluralForms(en)) {
    if (!isObject(tr)) { errors.push(`[${code}] ${at}: missing plural forms`); return; }
    const needed = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const cat of needed) if (tr[cat] === undefined) errors.push(`[${code}] ${at}.${cat}: missing plural form`);
    for (const cat of Object.keys(tr)) {
      if (!needed.includes(cat)) warnings.push(`[${code}] ${at}.${cat}: ${code} has no "${cat}" plural form`);
      else checkString(en.other, tr[cat], `${at}.${cat}`, `${keyPath}.${cat}`, code);
    }
    return;
  }
  if (Array.isArray(en)) {
    if (tr === undefined) { if (containsText(en)) errors.push(`[${code}] ${at}: missing`); return; }
    if (!Array.isArray(tr)) { errors.push(`[${code}] ${at}: should be a list`); return; }
    if (tr.length > en.length) warnings.push(`[${code}] ${at}: ${tr.length - en.length} extra item(s)`);
    en.forEach((item, i) => compare(item, tr[i], where, `${keyPath}[${i}]`.replace(/^\./, ''), code));
    return;
  }
  if (isObject(en)) {
    if (tr === undefined) { if (containsText(en)) errors.push(`[${code}] ${at}: missing`); return; }
    if (!isObject(tr)) { errors.push(`[${code}] ${at}: should be an object`); return; }
    for (const key of Object.keys(en)) compare(en[key], tr[key], where, keyPath ? `${keyPath}.${key}` : key, code);
    for (const key of Object.keys(tr)) if (!(key in en)) warnings.push(`[${code}] ${at ? at + '.' : ''}${key}: extra key (not in English)`);
    return;
  }
  if (typeof en === 'string') {
    if (tr === undefined) { if (needsTranslation(en)) errors.push(`[${code}] ${at}: missing`); return; }
    checkString(en, tr, at, keyPath, code);
  }
}

function containsText(v) {
  if (typeof v === 'string') return needsTranslation(v);
  if (Array.isArray(v)) return v.some(containsText);
  if (isObject(v)) return Object.entries(v).some(([k, x]) => !NON_TEXT.has(k) && containsText(x));
  return false;
}

function checkString(en, tr, at, keyPath, code) {
  if (typeof tr !== 'string') { errors.push(`[${code}] ${at}: should be text`); return; }
  if (placeholders(en) !== placeholders(tr)) errors.push(`[${code}] ${at}: placeholders differ (English: ${placeholders(en) || 'none'}; ${code}: ${placeholders(tr) || 'none'})`);
  if (tags(en) !== tags(tr)) errors.push(`[${code}] ${at}: HTML tags differ (English: ${tags(en) || 'none'}; ${code}: ${tags(tr) || 'none'})`);
  const limit = LIMITS[keyPath];
  if (limit && [...tr].length > limit) errors.push(`[${code}] ${at}: ${[...tr].length} characters, limit ${limit}`);
  if (tr === en && needsTranslation(en) && !SAME_OK_PATH.test(keyPath)) warnings.push(`[${code}] ${at}: same as English (untranslated?)`);
  if (/(^|\.)(workedExamples|exampleSections)/.test(keyPath) && numbers(en) !== numbers(tr)) {
    warnings.push(`[${code}] ${at}: numbers differ from English (${numbers(en)} vs ${numbers(tr)})`);
  }
}

// English copies of the translation data
const stale = syncEnglishCopies({ write: false });
for (const file of stale) errors.push(`src/_data/${file} is out of date with src/_data/i18n (run npm run build, which regenerates it)`);

for (const code of codes) {
  if (!languages.some(l => l.code === code)) { errors.push(`${code}: not in languages.json`); continue; }
  for (const [label, enFile, trFile] of filePairs(code)) {
    const en = readJson(enFile);
    const tr = readJson(trFile);
    if (tr === undefined) {
      if (containsText(en)) errors.push(`[${code}] ${label}: file missing (${path.relative(process.cwd(), trFile)})`);
      continue;
    }
    compare(en, tr, label, '', code);
  }
}

if (!quiet || errors.length) for (const w of warnings) console.log(`⚠️  ${w}`);
for (const e of errors) console.error(`❌ ${e}`);
const scope = codes.length ? codes.join(', ') : 'no enabled non-English languages';
if (errors.length) {
  console.error(`\n💥 Translation check FAILED: ${errors.length} error(s), ${warnings.length} warning(s) (${scope})`);
  process.exit(1);
}
console.log(`Translation check PASSED (${scope}; ${warnings.length} warning(s))`);
