/**
 * Multilingual build plumbing (no runtime translation, no CDN).
 *
 * - src/_data/languages.json lists every language; only `enabled` ones are built and shown.
 * - English stays at the root. Each other enabled language gets a copy of every localizable
 *   page under /<prefix>/, with the English slugs, built as an Eleventy virtual template from
 *   the English source file.
 * - Every user-visible string comes from src/_data/i18n/ (see scripts/i18n-data.js). A page's
 *   text fields (title, faqs, body, ...) are computed data for the page's language, so English
 *   and translated copies render from the same template. Pages with `i18n: false` (the blog)
 *   stay English-only.
 * - A language may set "pages": [input paths] to build only those pages (staged rollout).
 *
 * Templates get `lang`, `dir` and `enabledLanguages`, and the filters `t` (UI strings),
 * `pt` (the page's own `body` strings), `tp` (plural UI strings), `fmtDeep`, `localizeCategory`, `localeUrl`,
 * `hasLocalePage`, `localeAlternates` and `languageInfo`.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const nunjucks = require('nunjucks');
const i18nData = require('./i18n-data.js');
const i18nClient = require('./i18n-client.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SITE_URL = 'https://toolsbuilt.com';

// Sources that are never copied into a language folder: non-HTML outputs and verification files.
// Pages marked `i18n: false` (front matter or directory data, e.g. the blog) are skipped too.
const EXCLUDED = [
  /^_/, /^assets\//,
  /^404\.njk$/, /^feed\.xml\.njk$/, /^sitemap\.xml\.njk$/, /^robots\.txt\.njk$/,
/^indexnow-key\.njk$/, /^google[0-9a-f]+\.html$/
];

function loadLanguages() {
  return JSON.parse(fs.readFileSync(path.join(SRC, '_data', 'languages.json'), 'utf8'));
}

// Page front-matter keys whose values come from translation data
const TEXT_KEYS = [
  'title', 'description', 'h1', 'subtitle', 'breadcrumbTitle', 'quickAnswer', 'formula',
  'workedExamples', 'exampleSections', 'commonMistakes', 'sources', 'howto', 'faqs', 'body'
];

// Which translation file holds a page's text: tools/<slug> for tool pages, pages/<name> otherwise
function textSource(inputPath, toolSlug) {
  if (toolSlug) return { kind: 'tool', name: toolSlug };
  const rel = inputPath.replace(/^\.?\/?src\//, '').replace(/\.\w+$/, '');
  if (rel === 'index') return { kind: 'page', name: 'home' };
  if (rel === 'tools/index') return { kind: 'page', name: 'tools-directory' };
  return { kind: 'page', name: rel.replace(/\/index$/, '').replace(/\//g, '-') };
}

const TOOL_TEXT = ['name', 'shortName', 'description', 'shortDescription', 'keywords'];
const CATEGORY_TEXT = ['name', 'tagline', 'description', 'seoTitle', 'seoDescription', 'intro', 'howToChoose', 'faqs'];

function localizeTool(tool, lang) {
  if (!tool || !lang || lang === 'en') return tool;
  const listing = (i18nData.tool(lang, tool.slug) || {}).listing || {};
  const out = { ...tool };
  for (const key of TOOL_TEXT) if (listing[key] !== undefined) out[key] = listing[key];
  return out;
}

function localizeCategory(category, lang) {
  if (!category || !lang || lang === 'en') return category;
  const text = (i18nData.page(lang, 'categories') || {})[category.slug] || {};
  const out = { ...category };
  for (const key of CATEGORY_TEXT) if (text[key] !== undefined) out[key] = text[key];
  return out;
}

const localizeTools = (tools, lang) => (Array.isArray(tools) && lang && lang !== 'en' ? tools.map(t => localizeTool(t, lang)) : tools);
const localizeCategories = (cats, lang) => (Array.isArray(cats) && lang && lang !== 'en' ? cats.map(c => localizeCategory(c, lang)) : cats);

function pageText(data) {
  if (data.i18n === false) return undefined;
  const source = textSource(data.i18nSource || (data.page && data.page.inputPath) || '', data.toolSlug);
  return source.kind === 'tool' ? i18nData.tool(data.lang, source.name) : i18nData.page(data.lang, source.name);
}

// Directory data (<dir>/<dir>.11tydata.js or .json) that sets i18n: false
function englishOnlyDir(dir) {
  const base = path.join(dir, path.basename(dir) + '.11tydata');
  for (const file of [base + '.js', base + '.json']) {
    if (fs.existsSync(file)) {
      const data = file.endsWith('.js') ? require(file) : JSON.parse(fs.readFileSync(file, 'utf8'));
      if ((typeof data === 'function' ? data() : data).i18n === false) return true;
    }
  }
  return false;
}

// Front matter as Eleventy reads it: YAML, or a `---js` object literal (permalink may be a function)
function frontMatter(source, file) {
  const js = source.match(/^---js\r?\n([\s\S]*?)\r?\n---/);
  if (!js) return matter(source).data;
  return new Function('require', `return (${js[1]});`)(require('module').createRequire(file));
}

function listSources(dir = SRC, rel = '') {
  if (rel && englishOnlyDir(dir)) return [];
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

  eleventyConfig.on('eleventy.before', () => i18nData.clearCache());

  // English client strings go into the built scripts, so English pages need no extra markup
  eleventyConfig.on('eleventy.after', ({ dir }) => {
    const prepend = (file, banner) => {
      if (!banner || !fs.existsSync(file)) return;
      const code = fs.readFileSync(file, 'utf8');
      const next = i18nClient.withDefaults(code, banner);
      if (next !== code) fs.writeFileSync(file, next);
    };
    prepend(path.join(dir.output, 'assets', 'js', 'common.js'), i18nClient.defaultsBanner({ ui: true }));
    for (const slug of i18nData.toolSlugs()) {
      const banner = i18nClient.defaultsBanner({ slug });
      const toolDir = path.join(dir.output, 'tools', slug);
      if (!fs.existsSync(toolDir)) continue;
      // logic.js, script.js, country.js, ... (not word lists or workers, which load logic.js)
      for (const name of fs.readdirSync(toolDir).filter(f => f.endsWith('.js') && !['eff-words.js', 'worker.js'].includes(f))) {
        prepend(path.join(toolDir, name), banner);
      }
    }
  });

  // title, faqs, body, ... for the page's language; the front-matter value when there is no data
  for (const key of TEXT_KEYS) {
    eleventyConfig.addGlobalData(`eleventyComputed.${key}`, () => data => {
      const text = pageText(data);
      return text && text[key] !== undefined ? text[key] : data[key];
    });
  }
  // tools and categories with their text in the page language (the English objects on English pages)
  eleventyConfig.addGlobalData('eleventyComputed.tools', () => data => localizeTools(data.tools, data.lang));
  eleventyConfig.addGlobalData('eleventyComputed.categories', () => data => localizeCategories(data.categories, data.lang));
  eleventyConfig.addGlobalData('eleventyComputed.countries', () => data =>
    (data.lang && data.lang !== 'en' ? i18nData.deepMerge(data.countries, i18nData.page(data.lang, 'countries')) : data.countries));

  // The page's whole translation file (for page-specific data such as the homepage FAQ)
  eleventyConfig.addGlobalData('eleventyComputed.text', () => data => pageText(data) || {});

  for (const lang of enabled.filter(l => l.code !== 'en')) {
    const sources = lang.pages || listSources();
    for (const inputPath of sources) {
      const source = fs.readFileSync(path.join(SRC, inputPath), 'utf8');
      const fm = frontMatter(source, path.join(SRC, inputPath));
      if (fm.permalink === false || fm.i18n === false) continue;
      const data = {
        i18nSource: inputPath,
        lang: lang.code,
        dir: lang.dir,
        tags: [],
        eleventyExcludeFromCollections: true
      };
      if (typeof fm.permalink === 'string') data.permalink = withPrefix(fm.permalink, lang);
      if (typeof fm.permalink === 'function') data.permalink = d => withPrefix(fm.permalink(d), lang);
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

  const pageLang = ctx => (ctx && ctx.ctx && ctx.ctx.lang) || english.code;

  // Strings are HTML; placeholder values are escaped unless they are already safe markup
  function resolve(value, key, where, vars) {
    if (typeof value !== 'string') throw new Error(`i18n: no English text for "${key}" in ${where}`);
    const escaped = vars && Object.fromEntries(Object.entries(vars).map(([name, v]) => [
      name, v instanceof nunjucks.runtime.SafeString ? String(v) : nunjucks.lib.escape(String(v))
    ]));
    return new nunjucks.runtime.SafeString(i18nData.format(value, escaped));
  }

  // {{ "header.nav.home" | t }}, {{ "toolPage.toolCount" | t({ count: n }) }}: a UI string (HTML)
  eleventyConfig.addFilter('t', function(key, vars) {
    return resolve(i18nData.lookup(i18nData.ui(pageLang(this)), key), key, 'ui', vars);
  });

  // {{ "label.m1-old-val" | pt }}: one of the current page's own `body` strings (HTML)
  eleventyConfig.addFilter('pt', function(key, vars) {
    const body = this.ctx && this.ctx.body;
    return resolve(i18nData.lookup(body, key), key, `the body of ${this.page && this.page.inputPath}`, vars);
  });

  // Fills {{name}} placeholders in every string of a value: {{ text.faq | fmtDeep({ author: site.authorName }) }}
  eleventyConfig.addFilter('fmtDeep', function fmtDeep(value, vars) {
    if (typeof value === 'string' || value instanceof nunjucks.runtime.SafeString) return i18nData.format(String(value), vars);
    if (Array.isArray(value)) return value.map(v => fmtDeep(v, vars));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fmtDeep(v, vars)]));
    return value;
  });

  // {{ category | localizeCategory }}: for objects that do not come from the computed lists
  // (e.g. the paginated `category` alias on category pages)
  eleventyConfig.addFilter('localizeCategory', function(category) {
    return localizeCategory(category, pageLang(this));
  });

  // Data with text in a page translation file of the same shape (text fields only), e.g.
  // {% set gradingScales = gradingScales | localizeData('grading-scales') %}
  eleventyConfig.addFilter('localizeData', function(value, name) {
    const lang = pageLang(this);
    return lang === 'en' ? value : i18nData.deepMerge(value, i18nData.page(lang, name));
  });

  // {{ 'common.tools' | tp(n) }}: a plural UI string; the key holds one entry per plural
  // category of the page language (one, few, many, other, ...), each with {{count}}
  eleventyConfig.addFilter('tp', function(key, count, vars) {
    const lang = pageLang(this);
    const forms = i18nData.lookup(i18nData.ui(lang), key);
    if (!forms || typeof forms !== 'object') throw new Error(`i18n: no plural forms for "${key}"`);
    const rule = new Intl.PluralRules(lang).select(Number(count));
    return resolve(forms[rule] !== undefined ? forms[rule] : forms.other, key, 'ui', { count, ...(vars || {}) });
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
      .map(l => ({ hreflang: l.hreflang, ogLocale: l.ogLocale, url: SITE_URL + withPrefix(base, l) }));
    if (links.length < 2) return [];
    return links.concat({ hreflang: 'x-default', url: SITE_URL + base });
  });

  // "/tools/salary-tax-calculator/country.js" -> "salary-tax-calculator"
  eleventyConfig.addFilter('toolDir', url => ((url || '').match(/^\/tools\/([^/]+)\//) || [])[1]);

  // <script>window.I18N = ...</script> body for a non-English page (tool slugs whose scripts it loads)
  eleventyConfig.addFilter('clientStrings', function(slugs) {
    return new nunjucks.runtime.SafeString(i18nClient.json(i18nClient.pageStrings(pageLang(this), slugs || [])));
  });

  // --- Output of non-English pages: links and structured data point to the same language ---
  const langOfUrl = url => languages.find(l => l.prefix && (url || '').startsWith(`/${l.prefix}/`));
  const localPath = (lang, href) => {
    const m = href.match(/^(\/[^?#]*)([?#].*)?$/);
    if (!m || m[1].startsWith('/assets/') || m[1].startsWith(`/${lang.prefix}/`)) return null;
    const target = withPrefix(m[1], lang);
    return builtUrls.has(target) ? target + (m[2] || '') : null;
  };
  const JSON_LD_TYPES = new Set(['WebPage', 'WebSite', 'WebApplication', 'SoftwareApplication', 'CollectionPage',
    'ItemList', 'FAQPage', 'HowTo', 'BreadcrumbList', 'ProfilePage', 'AboutPage', 'ContactPage', 'Article']);

  // People and organisations keep their canonical URLs (they identify the entity, not a page)
  const ENTITY_TYPES = new Set(['Person', 'Organization']);

  function localizeJsonLd(value, lang, top) {
    if (Array.isArray(value)) return value.map(v => localizeJsonLd(v, lang, top));
    if (value && typeof value === 'object') {
      if (ENTITY_TYPES.has(value['@type'])) return value;
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = localizeJsonLd(v, lang, false);
      if (typeof out.inLanguage === 'string' && out.inLanguage.startsWith('en')) out.inLanguage = lang.hreflang;
      if (top && JSON_LD_TYPES.has(out['@type']) && !out.inLanguage) out.inLanguage = lang.hreflang;
      return out;
    }
    if (typeof value === 'string' && value.startsWith(SITE_URL + '/')) {
      const local = localPath(lang, value.slice(SITE_URL.length));
      return local ? SITE_URL + local : value;
    }
    return value;
  }

  eleventyConfig.addTransform('i18n-localize-output', function(content) {
    const lang = langOfUrl(this.page && this.page.url);
    if (!lang || !(this.page.outputPath || '').endsWith('.html')) return content;
    return content
      // <a href="/tools/x/"> -> /<prefix>/tools/x/ (not language links, which carry hreflang)
      .replace(/<a\b[^>]*>/g, tag => (/\shreflang=/.test(tag) ? tag : tag.replace(/(\shref=")(\/[^"]*)"/, (m, attr, href) => {
        const local = localPath(lang, href);
        return local ? `${attr}${local}"` : m;
      })))
      .replace(/(<form\b[^>]*\saction=")(\/[^"]*)"/g, (m, attr, href) => {
        const local = localPath(lang, href);
        return local ? `${attr}${local}"` : m;
      })
      .replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, open, json, close) => {
        try {
          return `${open}\n${JSON.stringify(localizeJsonLd(JSON.parse(json), lang, true), null, 2)}\n${close}`;
        } catch (e) {
          throw new Error(`i18n: invalid JSON-LD on ${this.page.url}: ${e.message}`);
        }
      });
  });

  // sitemap.xml: every language version of each URL, with xhtml:link alternates (once several
  // languages are enabled; with English only the file is left as it is)
  eleventyConfig.addTransform('i18n-sitemap', function(content) {
    if (!this.page || this.page.url !== '/sitemap.xml' || enabled.length < 2) return content;
    const entries = content.match(/  <url>[\s\S]*?<\/url>\n?/g) || [];
    const out = entries.map(entry => {
      const loc = (entry.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
      const base = loc.slice(SITE_URL.length);
      const versions = enabled.filter(l => builtUrls.has(withPrefix(base, l)));
      if (versions.length < 2) return entry;
      const links = versions.map(l => `    <xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${SITE_URL + withPrefix(base, l)}"/>`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL + base}"/>`).join('\n');
      return versions.map(l => entry
        .replace(`<loc>${loc}</loc>`, `<loc>${SITE_URL + withPrefix(base, l)}</loc>`)
        .replace(/\n  <\/url>/, `\n${links}\n  </url>`)).join(entry.endsWith('\n') ? '' : '\n');
    });
    let i = 0;
    return content
      .replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
      .replace(/  <url>[\s\S]*?<\/url>\n?/g, () => out[i++]);
  });

  eleventyConfig.addFilter('languageInfo', code => byCode.get(code) || english);
  eleventyConfig.addGlobalData('enabledLanguages', () => menuLanguages);
};

module.exports.loadLanguages = loadLanguages;
module.exports.stripPrefix = stripPrefix;
