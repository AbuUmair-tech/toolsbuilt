/**
 * What counts as translatable text in src/_data/i18n (shared by check-translations.js and
 * i18n-strings.js).
 */
const fs = require('fs');
const path = require('path');
const { I18N_DIR } = require('./i18n-data.js');

// Fields that are data, not text: translations omit them and never change them
const NON_TEXT = new Set(['url', 'link', 'href', 'id', 'code', 'slug', 'icon', 'iconName', 'value', 'lang']);
const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

const glossary = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'glossary.json'), 'utf8'));
const termPattern = new RegExp(glossary.doNotTranslate
  .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .sort((a, b) => b.length - a.length).join('|'), 'g');

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPluralForms = v => isObject(v) && 'other' in v && Object.keys(v).every(k => PLURAL_CATEGORIES.has(k));

// Has words once tags, entities, placeholders and glossary terms are removed
function needsTranslation(s) {
  const words = s.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\{\{\s*\w+\s*\}\}/g, ' ').replace(termPattern, ' ');
  return /\p{L}{2,}/u.test(words);
}

// Translation file pairs for a language: [label, englishFile, languageFile]
function filePairs(code) {
  const pairs = [['ui', path.join(I18N_DIR, 'ui', 'en.json'), path.join(I18N_DIR, 'ui', `${code}.json`)]];
  for (const dir of ['tools', 'pages']) {
    const enDir = path.join(I18N_DIR, dir, 'en');
    for (const file of fs.readdirSync(enDir).filter(f => f.endsWith('.json')).sort()) {
      pairs.push([`${dir}/${file}`, path.join(enDir, file), path.join(I18N_DIR, dir, code, file)]);
    }
  }
  return pairs;
}

const pluralCategories = code => new Intl.PluralRules(code).resolvedOptions().pluralCategories;

module.exports = { NON_TEXT, PLURAL_CATEGORIES, glossary, isObject, isPluralForms, needsTranslation, filePairs, pluralCategories };
