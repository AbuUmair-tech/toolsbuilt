/**
 * Translation data: src/_data/i18n/
 *   ui/<lang>.json                UI strings shared by every page (nested keys)
 *   tools/<lang>/<slug>.json      one tool page: front-matter text, `body` and `client` strings
 *   pages/<lang>/<page>.json      every other page (home, about, category, ...)
 *   glossary.json                 terms that are never translated, and fixed translations
 *
 * English is the source. Another language's file only needs the keys it translates: it is
 * deep-merged over the English file (objects by key, arrays by index), so URLs, links and other
 * non-text fields come from English.
 *
 * Value types: front-matter fields (title, description, faqs, ...) are plain text and are
 * escaped by the templates as before. `ui`, `body` and `client` values are HTML snippets and
 * are output as they are, so they keep their entities and inline tags.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'src', '_data', 'i18n');

let cache = new Map();

function clearCache() {
  cache = new Map();
}

function readJson(rel) {
  if (!cache.has(rel)) {
    const file = path.join(I18N_DIR, rel);
    cache.set(rel, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined);
  }
  return cache.get(rel);
}

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function deepMerge(base, over) {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) && Array.isArray(over)) {
    return base.map((item, i) => (i < over.length ? deepMerge(item, over[i]) : item));
  }
  if (isObject(base) && isObject(over)) {
    const out = { ...base };
    for (const key of Object.keys(over)) out[key] = key in base ? deepMerge(base[key], over[key]) : over[key];
    return out;
  }
  return over;
}

function localized(rel, lang) {
  const english = readJson(rel.replace('{lang}', 'en'));
  if (!lang || lang === 'en' || english === undefined) return english;
  return deepMerge(english, readJson(rel.replace('{lang}', lang)));
}

const ui = lang => localized('ui/{lang}.json', lang) || {};
const tool = (lang, slug) => localized(`tools/{lang}/${slug}.json`, lang);
const page = (lang, name) => localized(`pages/{lang}/${name}.json`, lang);

function toolSlugs() {
  const dir = path.join(I18N_DIR, 'tools', 'en');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : [];
}

function lookup(obj, key) {
  return String(key).split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

// "{{count}} tools" + { count: 3 } -> "3 tools"
function format(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

module.exports = { I18N_DIR, clearCache, readJson, deepMerge, ui, tool, page, toolSlugs, lookup, format };
