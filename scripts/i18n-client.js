/**
 * Client-side translation strings (the `client` objects in src/_data/i18n).
 *
 * In the browser, scripts call ToolsBuilt.t('key', vars) for shared UI strings (ui.client) and
 * ToolsBuilt.scope('<tool slug>')('key', vars) for a tool's own strings (tools/<slug>.client).
 * - English: the build prepends the English strings to the built JS files as
 *   window.I18N_DEFAULTS (defaultsBanner below), so English pages need no extra markup.
 * - Other languages: the page emits window.I18N = { ui, tools: { <slug>: ... } } (pageStrings),
 *   which wins over the defaults key by key.
 * In Node (unit tests of logic.js), scope(slug) reads the English strings directly.
 */
const i18nData = require('./i18n-data.js');

const BANNER_START = '/* i18n defaults: generated from src/_data/i18n, do not edit */';
const BANNER_END = '/* end i18n defaults */';

// window.I18N_DEFAULTS assignment for one built file: ui strings for shared scripts, or a tool's
function defaultsBanner({ ui, slug }) {
  const lines = [];
  if (ui) lines.push(`(globalThis.I18N_DEFAULTS = globalThis.I18N_DEFAULTS || {}).ui = ${json(i18nData.ui('en').client || {})};`);
  if (slug) {
    const text = i18nData.tool('en', slug);
    if (!text || !text.client) return '';
    lines.push(`((globalThis.I18N_DEFAULTS = globalThis.I18N_DEFAULTS || {}).tools = globalThis.I18N_DEFAULTS.tools || {})[${JSON.stringify(slug)}] = ${json(text.client)};`);
  }
  return lines.length ? `${BANNER_START}\n${lines.join('\n')}\n${BANNER_END}\n` : '';
}

function withDefaults(code, banner) {
  const start = code.indexOf(BANNER_START);
  const end = code.indexOf(BANNER_END);
  const clean = start === 0 && end > 0 ? code.slice(end + BANNER_END.length + 1) : code;
  return banner + clean;
}

// window.I18N for a non-English page: shared strings plus those of the tools whose scripts it loads
function pageStrings(lang, slugs) {
  const tools = {};
  for (const slug of slugs.filter(Boolean)) {
    const text = i18nData.tool(lang, slug);
    if (text && text.client) tools[slug] = text.client;
  }
  return { ui: i18nData.ui(lang).client || {}, tools };
}

// JSON safe inside <script>
function json(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function scope(slug) {
  const strings = (i18nData.tool('en', slug) || {}).client || {};
  return (key, vars) => {
    const value = i18nData.lookup(strings, key);
    return typeof value === 'string' ? i18nData.format(value, vars) : key;
  };
}

module.exports = { defaultsBanner, withDefaults, pageStrings, json, scope };
