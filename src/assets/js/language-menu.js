/**
 * ToolsBuilt language picker and language suggestion banner
 * - Header listbox: search filter, Arrow/Home/End/Enter/Escape, type-ahead, outside click,
 *   full-width sheet on phones. Choosing a language goes to the same page in that language
 *   (pre-built static pages; the URLs are rendered into data-href at build time).
 * - Banner: on English pages only, when the visitor never chose a language and their browser
 *   prefers another enabled language that has this page. It never redirects.
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'tb_language';
  const BANNER_KEY = 'tb_language_banner_dismissed';
  const SHEET_QUERY = '(max-width: 599px)';

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const menu = document.querySelector('[data-language-menu]');
    if (!menu) return;
    initMenu(menu);
    initBanner(menu);
  }

  function initMenu(menu) {
    const trigger = menu.querySelector('.language-menu-trigger');
    const panel = menu.querySelector('.language-menu-panel');
    const backdrop = menu.querySelector('[data-language-menu-backdrop]');
    const search = menu.querySelector('.language-menu-search-input');
    const listbox = menu.querySelector('[role="listbox"]');
    const empty = menu.querySelector('.language-menu-empty');
    const closeBtn = menu.querySelector('[data-language-menu-close]');
    const options = Array.from(listbox.querySelectorAll('[role="option"]'));
    let typeahead = '';
    let typeaheadTimer = null;

    const visibleOptions = () => options.filter(o => !o.hidden);
    const isOpen = () => !panel.hidden;
    const isSheet = () => window.matchMedia(SHEET_QUERY).matches;
    const inMenu = el => menu.contains(el) || panel.contains(el) || backdrop.contains(el);
    const home = panel.nextSibling;

    // The header is its own stacking context, so the phone sheet moves to <body> while open
    function placePanel(sheet) {
      if (sheet) {
        document.body.append(backdrop, panel);
      } else if (panel.parentNode !== menu) {
        menu.insertBefore(backdrop, home);
        menu.insertBefore(panel, home);
      }
    }

    function open() {
      if (isOpen()) return;
      placePanel(isSheet());
      panel.hidden = false;
      backdrop.hidden = !isSheet();
      trigger.setAttribute('aria-expanded', 'true');
      if (isSheet()) document.body.style.overflow = 'hidden';
      const active = listbox.querySelector('.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
      // On phones, focusing the search box would pop up the keyboard over the list
      (isSheet() ? listbox : search).focus();
    }

    function close(returnFocus) {
      if (!isOpen()) return;
      panel.hidden = true;
      backdrop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      placePanel(false);
      if (search.value) {
        search.value = '';
        filter('');
      }
      if (returnFocus) trigger.focus();
    }

    function filter(query) {
      const q = query.trim().toLowerCase();
      options.forEach(o => {
        o.hidden = Boolean(q) && !(o.dataset.native.toLowerCase().includes(q) ||
          o.dataset.english.toLowerCase().includes(q) || o.dataset.locale.toLowerCase().startsWith(q));
      });
      empty.hidden = visibleOptions().length > 0;
    }

    function focusOption(option) {
      if (!option) return;
      option.focus();
      option.scrollIntoView({ block: 'nearest' });
    }

    function choose(option) {
      store(STORAGE_KEY, option.dataset.locale);
      const href = option.dataset.href;
      if (option.classList.contains('is-active') || !href) {
        close(true);
        return;
      }
      window.location.href = href;
    }

    trigger.addEventListener('click', () => (isOpen() ? close(true) : open()));
    closeBtn.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', () => close(false));

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open();
      }
    });

    search.addEventListener('input', () => filter(search.value));

    options.forEach(o => o.addEventListener('click', () => choose(o)));

    panel.addEventListener('keydown', (e) => {
      const visible = visibleOptions();
      const index = visible.indexOf(document.activeElement);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close(true);
          return;
        case 'ArrowDown':
          e.preventDefault();
          focusOption(visible[index < 0 ? 0 : Math.min(index + 1, visible.length - 1)]);
          return;
        case 'ArrowUp':
          e.preventDefault();
          if (index <= 0) search.focus();
          else focusOption(visible[index - 1]);
          return;
        case 'Home':
        case 'End':
          if (document.activeElement === search) return;
          e.preventDefault();
          focusOption(e.key === 'Home' ? visible[0] : visible[visible.length - 1]);
          return;
        case 'Enter':
          if (document.activeElement === search) {
            e.preventDefault();
            if (visible.length) choose(visible[0]);
          }
          return;
        case 'Tab':
          if (!isSheet()) close(false);
          return;
      }

      // Type-ahead while an option has focus: jump to the first name starting with the typed text
      if (index >= 0 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead += e.key.toLowerCase();
        clearTimeout(typeaheadTimer);
        typeaheadTimer = setTimeout(() => { typeahead = ''; }, 600);
        const match = visible.find(o => o.dataset.native.toLowerCase().startsWith(typeahead) ||
          o.dataset.english.toLowerCase().startsWith(typeahead));
        if (match) focusOption(match);
      }
    });

    document.addEventListener('click', (e) => {
      if (isOpen() && !inMenu(e.target)) close(false);
    });

    [menu, panel].forEach(el => el.addEventListener('focusout', (e) => {
      if (isOpen() && e.relatedTarget && !inMenu(e.relatedTarget)) close(false);
    }));
  }

  // Browser language tags (e.g. "es-MX", "zh-HK") matched to an option's code
  function matchLocale(tag, codes) {
    const lower = tag.toLowerCase();
    const exact = codes.find(c => c.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split('-')[0];
    if (base === 'zh') {
      const traditional = /-(hant|tw|hk|mo)\b/.test(lower);
      return codes.find(c => c === (traditional ? 'zh-TW' : 'zh-CN')) || null;
    }
    if (base === 'no' || base === 'nn') return codes.find(c => c === 'nb') || null;
    if (base === 'tl') return codes.find(c => c === 'fil') || null;
    return codes.find(c => c.toLowerCase() === base) || null;
  }

  function initBanner(menu) {
    const banner = document.getElementById('language-banner');
    if (!banner || menu.dataset.currentLocale !== 'en') return;
    if (read(STORAGE_KEY) || read(BANNER_KEY)) return;

    const options = Array.from(menu.querySelectorAll('[role="option"]'));
    const codes = options.map(o => o.dataset.locale);
    const preferred = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];

    // The first browser language we have decides; English first means no banner
    let code = null;
    for (const tag of preferred) {
      code = matchLocale(tag, codes);
      if (code) break;
    }
    if (!code || code === 'en') return;

    const option = options.find(o => o.dataset.locale === code);
    if (!option || option.hasAttribute('data-fallback')) return;

    const link = banner.querySelector('.language-banner-link');
    link.href = option.dataset.href;
    link.textContent = option.dataset.native;
    link.setAttribute('lang', option.getAttribute('lang'));
    link.setAttribute('hreflang', option.getAttribute('lang'));
    link.addEventListener('click', () => store(STORAGE_KEY, code));
    banner.querySelector('.language-banner-close').addEventListener('click', () => {
      store(BANNER_KEY, '1');
      banner.hidden = true;
    });
    banner.hidden = false;
  }
})();
