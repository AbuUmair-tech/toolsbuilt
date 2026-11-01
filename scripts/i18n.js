/**
 * Multilingual build plumbing (no runtime translation, no CDN).
 *
 * - src/_data/languages.json lists every language; only `enabled` ones are built and shown.
 * - English stays at the root. Each other enabled language gets a copy of every localizable
 *   page under /<prefix>/, with the English slugs, built as an Eleventy virtual template from
 *   the English source file.
 * - Translations live in src/_i18n/<code>/:
 *     strings.json                 UI strings, keyed by the English text, used by the `t` filter
 *     pages/<input path>.json      front-matter overrides for one page, e.g.
 *                                  pages/tools/percentage-change-calculator/index.json
 *   Anything missing falls back to English.
 * - A language may set "pages": [input paths] to build only those pages (staged rollout).
 *
 * Templates get `lang`, `dir` and `enabledLanguages`, and the filters `t`, `localeUrl`,
 * `hasLocalePage`, `localeAlternates` and `languageInfo`.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const I18N_DIR = path.join(SRC, '_i18n');
const SITE_URL = 'https://toolsbuilt.com';

// Sources that are never copied into a language folder: non-HTML outputs, verification files,
// and the blog (its posts need blog.11tydata.js and feed the English collections).
const EXCLUDED = [
  /^_/, /^assets\//, /^blog\//, /^design-system\//,
  /^404\.njk$/, /^feed\.xml\.njk$/, /^sitemap\.xml\.njk$/, /^robots\.txt\.njk$/,
  /^llms\.txt\.njk$/, /^indexnow-key\.njk$/, /^google[0-9a-f]+\.html$/
];

function loadLanguages() {
  return JSON.parse(fs.readFileSync(path.join(SRC, '_data', 'languages.json'), 'utf8'));
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function listSources(dir = SRC, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (EXCLUDED.some(re => re.test(relPath))) return [];
    if (entry.isDirectory()) return listSources(path.join(dir, entry.name), relPath);
    return /\.(njk|md|html)$/.test(entry.name) ? [relPath] : [];
  });
}

// "/en-path/" for any URL: drops a leading language prefix
function stripPrefix(url, languages) {
  const first = (url || '/').split('/')[1];
  const lang = languages.find(l => l.prefix && l.prefix === first);
  return lang ? url.slice(lang.prefix.length + 1) || '/' : (url || '/');
}

function withPrefix(url, lang) {
  return lang.prefix ? `/${lang.prefix}${url}` : url;
}

module.exports = function i18nPlugin(eleventyConfig) {
  const languages = loadLanguages();
  const byCode = new Map(languages.map(l => [l.code, l]));
  const enabled = languages.filter(l => l.enabled);
  const english = byCode.get('en');
  // Design review only: list every language in the picker without building any pages
  const menuLanguages = process.env.I18N_MENU_PREVIEW ? languages : enabled;

  eleventyConfig.addGlobalData('lang', english.code);
  eleventyConfig.addGlobalData('dir', english.dir);

  for (const lang of enabled.filter(l => l.code !== 'en')) {
    const sources = lang.pages || listSources();
    for (const inputPath of sources) {
      const source = fs.readFileSync(path.join(SRC, inputPath), 'utf8');
      const fm = matter(source).data;
      if (fm.permalink === false) continue;
      const overrides = readJson(path.join(I18N_DIR, lang.code, 'pages', inputPath.replace(/\.\w+$/, '.json')));
      const data = {
        ...overrides,
        lang: lang.code,
        dir: lang.dir,
        tags: [],
        eleventyExcludeFromCollections: true
      };
      if (typeof fm.permalink === 'string') data.permalink = withPrefix(fm.permalink, lang);
      if (typeof fm.canonical === 'string' && fm.canonical.startsWith(SITE_URL + '/')) {
        data.canonical = SITE_URL + withPrefix(fm.canonical.slice(SITE_URL.length), lang);
      }
      eleventyConfig.addTemplate(`${lang.prefix}/${inputPath}`, source, data);
    }
  }

  // Every built URL, known before any template renders
  let builtUrls = new Set();
  eleventyConfig.on('eleventy.contentMap', ({ urlToInputPath }) => {
    builtUrls = new Set(Object.keys(urlToInputPath));
  });

  const strings = new Map(enabled.map(l => [l.code, readJson(path.join(I18N_DIR, l.code, 'strings.json'))]));

  // {{ "Search languages" | t }} -> the current page's translation, or the English text
  eleventyConfig.addFilter('t', function(text) {
    const code = (this.ctx && this.ctx.lang) || english.code;
    const table = strings.get(code);
    return (table && table[text]) || text;
  });

  // The same page in another language; that language's homepage when the page is not
  // translated yet, and the English page when the language is not built at all.
  function localeUrl(url, code) {
    const lang = byCode.get(code) || english;
    const base = stripPrefix(url, languages);
    const target = withPrefix(base, lang);
    if (builtUrls.has(target)) return target;
    const home = withPrefix('/', lang);
    return builtUrls.has(home) ? home : base;
  }
  eleventyConfig.addFilter('localeUrl', localeUrl);

  // True when this exact page is built in that language (not a fallback)
  eleventyConfig.addFilter('hasLocalePage', function(url, code) {
    const lang = byCode.get(code);
    return Boolean(lang) && builtUrls.has(withPrefix(stripPrefix(url, languages), lang));
  });

  // hreflang links for a page: empty unless it exists in more than one language
  eleventyConfig.addFilter('localeAlternates', function(url) {
    const base = stripPrefix(url, languages);
    const links = enabled
      .filter(l => builtUrls.has(withPrefix(base, l)))
      .map(l => ({ hreflang: l.hreflang, url: SITE_URL + withPrefix(base, l) }));
    if (links.length < 2) return [];
    return links.concat({ hreflang: 'x-default', url: SITE_URL + base });
  });

  eleventyConfig.addFilter('languageInfo', code => byCode.get(code) || english);
  eleventyConfig.addGlobalData('enabledLanguages', () => menuLanguages);
};

module.exports.loadLanguages = loadLanguages;
module.exports.stripPrefix = stripPrefix;
