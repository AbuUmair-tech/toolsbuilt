/**
 * Keeps the English text copies in src/_data/tools.json and src/_data/categories.json in step
 * with the translation data, which is the source:
 *   tools.json       name, shortName, description, shortDescription, keywords
 *                    <- src/_data/i18n/tools/en/<slug>.json "listing"
 *   categories.json  name, tagline, description, seoTitle, seoDescription, intro, howToChoose, faqs
 *                    <- src/_data/i18n/pages/en/categories.json "<slug>"
 *   countries.json   country names <- src/_data/i18n/pages/en/countries.json (by index)
 *   grading-scales.json  scale names, notes and band labels
 *                    <- src/_data/i18n/pages/en/grading-scales.json (same shape, text only)
 * Scripts that read those files (search index, OG cards, tests) keep working unchanged.
 * Edit the text in src/_data/i18n, never in tools.json / categories.json.
 *
 * syncEnglishCopies({ write: false }) returns the files that are out of date without writing.
 */
const fs = require('fs');
const path = require('path');
const i18nData = require('./i18n-data.js');

const DATA_DIR = path.resolve(__dirname, '..', 'src', '_data');
const TOOL_TEXT = ['name', 'shortName', 'description', 'shortDescription', 'keywords'];
const CATEGORY_TEXT = ['name', 'tagline', 'description', 'seoTitle', 'seoDescription', 'intro', 'howToChoose', 'faqs'];

function applyText(item, text, keys) {
  if (!text) return item;
  const out = { ...item };
  for (const key of keys) if (text[key] !== undefined) out[key] = text[key];
  return out;
}

// New file content, or null when the data is already up to date (formatting is left alone)
function syncFile(file, update) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = update(data);
  return JSON.stringify(next) === JSON.stringify(data) ? null : JSON.stringify(next, null, 2) + '\n';
}

function syncEnglishCopies({ write = true } = {}) {
  i18nData.clearCache();
  const changes = {
    'tools.json': syncFile(path.join(DATA_DIR, 'tools.json'),
      tools => tools.map(t => applyText(t, (i18nData.tool('en', t.slug) || {}).listing, TOOL_TEXT))),
    'categories.json': syncFile(path.join(DATA_DIR, 'categories.json'),
      cats => cats.map(c => applyText(c, (i18nData.page('en', 'categories') || {})[c.slug], CATEGORY_TEXT))),
    'countries.json': syncFile(path.join(DATA_DIR, 'countries.json'),
      countries => i18nData.deepMerge(countries, i18nData.page('en', 'countries'))),
    'grading-scales.json': syncFile(path.join(DATA_DIR, 'grading-scales.json'),
      scales => i18nData.deepMerge(scales, i18nData.page('en', 'grading-scales')))
  };
  const stale = Object.keys(changes).filter(name => changes[name] !== null);
  if (write) for (const name of stale) fs.writeFileSync(path.join(DATA_DIR, name), changes[name]);
  return stale;
}

module.exports = { syncEnglishCopies };
