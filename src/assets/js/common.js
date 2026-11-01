/**
 * ToolsBuilt - Shared JavaScript Logic
 * Handles Icon Injection and In-Page Tool/FAQ Accordions.
 * Layout, Header, Search, and Mobile Drawer are handled in layout.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initAccordions();
  initScrollableTables();
});

/**
 * Tables that scroll sideways (usually on phones) must be reachable by keyboard:
 * make an overflowing .table-wrapper focusable and name it after its table caption.
 * Re-checked on resize, since a table may only overflow on narrow screens.
 */
function initScrollableTables() {
  const update = () => {
    document.querySelectorAll('.table-wrapper').forEach((wrapper) => {
      if (wrapper.dataset.tbScroll === 'static') return;
      if (wrapper.dataset.tbScroll === undefined && wrapper.hasAttribute('tabindex')) {
        wrapper.dataset.tbScroll = 'static'; // already set up in the markup
        return;
      }
      const overflows = wrapper.scrollWidth > wrapper.clientWidth + 1;
      if (overflows && wrapper.dataset.tbScroll !== 'on') {
        wrapper.dataset.tbScroll = 'on';
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('role', 'region');
        const caption = wrapper.querySelector('caption');
        wrapper.setAttribute('aria-label', caption && caption.textContent.trim() ? caption.textContent.trim() : ToolsBuilt.t('table.scrollable'));
      } else if (!overflows && wrapper.dataset.tbScroll === 'on') {
        wrapper.dataset.tbScroll = 'off';
        ['tabindex', 'role', 'aria-label'].forEach(a => wrapper.removeAttribute(a));
      }
    });
  };
  update();
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 150);
  });
  // Result tables are often filled in after load
  if (typeof MutationObserver === 'function') {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; update(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * Icon Injection from window.ICONS registry
 */
function initIcons() {
  if (!window.ICONS) return;
  document.querySelectorAll('[data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    if (iconName && window.ICONS[iconName] && !el.innerHTML.trim()) {
      el.innerHTML = window.ICONS[iconName];
    }
  });
}

/**
 * Accessible In-Page Accordion Component (e.g., FAQ sections)
 */
function initAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  if (!accordionHeaders.length) return;

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      const targetId = header.getAttribute('aria-controls');
      const content = document.getElementById(targetId);

      if (!content) return;

      header.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        content.setAttribute('hidden', '');
      } else {
        content.removeAttribute('hidden');
      }
    });
  });
}

window.ToolsBuilt = window.ToolsBuilt || {};

/**
 * Translations (see scripts/i18n-client.js)
 *   ToolsBuilt.t('copy.copiedToClipboard')      -> shared UI string
 *   ToolsBuilt.tp('codeFormatter.formattedLines', n) -> plural shared string
 *   const T = ToolsBuilt.scope('<tool slug>');   T('resultIncrease', { pct: '12%' })
 *   ToolsBuilt.pageLocale('en-US')              -> locale for Intl: the given English locale on
 *                                                  English pages, the page language otherwise
 * window.I18N (non-English pages) wins over window.I18N_DEFAULTS (English, built into the JS).
 */
(function() {
  function lookup(obj, key) {
    return String(key).split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  }
  function format(str, vars) {
    return vars ? str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : str;
  }
  function resolve(path, vars) {
    let value = lookup(window.I18N, path);
    if (typeof value !== 'string') value = lookup(window.I18N_DEFAULTS, path);
    return typeof value === 'string' ? format(value, vars) : path.split('.').pop();
  }
  function t(key, vars) {
    return resolve(`ui.${key}`, vars);
  }
  function scope(slug) {
    return (key, vars) => resolve(`tools.${slug}.${key}`, vars);
  }
  // Plural UI string: the key holds one entry per plural category (one, few, many, other, ...)
  function tp(key, count, vars) {
    const lang = document.documentElement.lang || 'en';
    const form = new Intl.PluralRules(lang).select(Number(count));
    const forms = lookup(window.I18N, `ui.${key}`) || lookup(window.I18N_DEFAULTS, `ui.${key}`) || {};
    return resolve(`ui.${key}.${form in forms ? form : 'other'}`, { count, ...(vars || {}) });
  }
  // Locale for Intl on this page; data-intl-locale overrides it (Arabic uses Western digits: ar-u-nu-latn)
  function pageLocale(englishLocale) {
    const root = document.documentElement;
    const lang = root.lang || 'en';
    return lang === 'en' ? englishLocale : (root.dataset.intlLocale || lang);
  }
  Object.assign(window.ToolsBuilt, { t, tp, scope, pageLocale });
})();

/**
 * Shareable result links
 * Inputs marked data-param="<name>" (optionally data-param-alias="<old name>") are
 * filled from the URL query on load, and written back to the query with
 * history.replaceState after each successful calculation. The canonical
 * <link> always stays the clean URL.
 *
 *   ToolsBuilt.resultLink.restore(calculate)  -> fills inputs, runs calculate(filled) once
 *   ToolsBuilt.resultLink.update(scope)       -> writes [data-param] values inside scope to the URL
 *   ToolsBuilt.resultLink.clear()             -> drops the query (e.g. on reset)
 *
 * The URL is only written once the visitor has interacted with the tool (or arrived
 * with a result link), so a plain visit keeps the clean URL while defaults are shown.
 */
ToolsBuilt.resultLink = (function() {
  let armed = false;
  const arm = (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-param], .tool-container form, form')) armed = true;
  };
  ['input', 'change', 'submit'].forEach(type => document.addEventListener(type, arm, true));
  // Reset buttons return the page to its clean URL
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button');
    if (btn && /reset/i.test(btn.id || '') && fields().length) {
      armed = false;
      clear();
    }
  }, true);

  function fields(scope) {
    return Array.from((scope || document).querySelectorAll('[data-param]'));
  }

  function readValue(el) {
    if (el.type === 'checkbox') return el.checked ? '1' : '';
    if (el.type === 'radio') return el.checked ? el.value : '';
    return (el.value || '').trim();
  }

  function writeValue(el, value) {
    if (el.type === 'checkbox') {
      el.checked = value === '1' || value === 'true';
    } else if (el.type === 'radio') {
      // Radios in a group share one data-param; only the matching option counts as filled
      el.checked = el.value === value;
      return el.checked;
    } else if (el.tagName === 'SELECT' && !Array.from(el.options).some(o => o.value === value)) {
      return false;
    } else {
      el.value = value;
    }
    return true;
  }

  function setUrl(query) {
    const url = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
    window.history.replaceState(window.history.state, '', url);
  }

  function restore(calculate) {
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return []; }
    const filled = [];
    fields().forEach(el => {
      const names = [el.dataset.param].concat(el.dataset.paramAlias ? el.dataset.paramAlias.split(',') : []);
      const name = names.find(n => params.has(n));
      if (name !== undefined && writeValue(el, params.get(name))) filled.push(el);
    });
    if (filled.length) {
      armed = true;
      if (typeof calculate === 'function') calculate(filled);
    }
    return filled;
  }

  function update(scope) {
    if (!armed) return;
    const params = new URLSearchParams();
    fields(scope).forEach(el => {
      const value = readValue(el);
      if (value !== '') params.set(el.dataset.param, value);
    });
    setUrl(params.toString());
  }

  function clear() {
    setUrl('');
  }

  return { restore, update, clear, isEnabled: () => fields().length > 0 };
})();

/**
 * Country and currency helpers (no network: only the browser's own language and time zone)
 *
 *   ToolsBuilt.guessCountry(list)        -> country object or null. A saved choice wins; then the
 *                                           time zone; then the region in navigator.languages.
 *   ToolsBuilt.rememberCountry(code)     -> saves the visitor's choice (localStorage, if allowed)
 *   ToolsBuilt.formatMoney(n, cur, loc)  -> "Rs 1,234", "₹12,34,567.00", "£1,234.50" via Intl
 *   ToolsBuilt.countries()               -> the list from the page's #tb-country-data JSON
 *   ToolsBuilt.money(n, cur)             -> formatMoney with two decimals in that currency's home format
 *   ToolsBuilt.defaultCurrency(fallback) -> the guessed country's currency if the page offers it
 *   ToolsBuilt.formatIsoDate('2026-10-31') -> English date in the visitor's regional format
 */
(function() {
  const STORE_KEY = 'toolsbuilt:country';
  let cached = null;

  function countries() {
    if (cached) return cached;
    const el = document.getElementById('tb-country-data');
    try { cached = el ? JSON.parse(el.textContent) : []; } catch (e) { cached = []; }
    return cached;
  }

  function storedCode() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  function rememberCountry(code) {
    try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
  }

  function guessCountry(list) {
    list = list || countries();
    const byCode = code => list.find(c => c.code === code) || null;
    const saved = storedCode();
    if (saved && byCode(saved)) return byCode(saved);
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    const fromZone = list.find(c => (c.timeZones || []).includes(zone));
    if (fromZone) return fromZone;
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const lang of langs) {
      const region = (lang.split('-')[1] || '').toUpperCase();
      if (region && byCode(region)) return byCode(region);
    }
    return null;
  }

  function formatMoney(amount, currency, locale, options) {
    const value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency, ...(options || {}) }).format(value);
    } catch (e) {
      return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
  }

  // Locale for number formatting: lakh/crore countries without a lakh-grouping locale borrow en-IN
  function numberLocale(country) {
    if (!country) return 'en-US';
    return country.lakhGrouping ? 'en-IN' : country.locale;
  }

  function localeForCurrency(currency) {
    const match = countries().find(c => c.currency === currency);
    return numberLocale(match);
  }

  function defaultCurrency(fallback, select) {
    const guess = guessCountry();
    if (!guess) return fallback;
    if (select && !Array.from(select.options).some(o => o.value === guess.currency)) return fallback;
    return guess.currency;
  }

  // Money with two decimals in the currency's home number format, e.g. money(1580.17, 'INR') -> "₹1,580.17"
  function money(amount, currency) {
    return formatMoney(amount, currency, localeForCurrency(currency), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Bare currency symbol for labels and table headings, e.g. "Rs", "₹", "AED"
  function currencySymbol(currency) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0).find(part => part.type === 'currency').value;
    } catch (e) {
      return currency;
    }
  }

  // English date in the visitor's regional order, e.g. en-GB "Saturday 31 October 2026",
  // en-US "Saturday, October 31, 2026". Content stays English; only the format follows the region.
  // English pages: English with the visitor's region (en-GB, en-IN, ...); otherwise the page language
  function dateLocale() {
    const pageLang = document.documentElement.lang || 'en';
    if (pageLang !== 'en') return document.documentElement.dataset.intlLocale || pageLang;
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en-US'];
    for (const lang of langs) {
      const region = (lang.split('-')[1] || '').toUpperCase();
      if (region && Intl.DateTimeFormat.supportedLocalesOf(`en-${region}`).length) return `en-${region}`;
    }
    return 'en-US';
  }

  function formatIsoDate(iso, options) {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return String(iso);
    return new Intl.DateTimeFormat(dateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC', ...(options || {}) })
      .format(new Date(Date.UTC(y, m - 1, d)));
  }

  Object.assign(window.ToolsBuilt, { countries, guessCountry, rememberCountry, formatMoney, money, currencySymbol, numberLocale, localeForCurrency, defaultCurrency, formatIsoDate });

  // Any select marked data-country-remember saves the chosen country (value or data-country of the option)
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('select[data-country-remember]')) return;
    const opt = el.options[el.selectedIndex];
    const code = (opt && opt.dataset.country) || el.value;
    if (countries().some(c => c.code === code)) rememberCountry(code);
  });
})();
