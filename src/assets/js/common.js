/**
 * ToolsBuilt - Shared JavaScript Logic
 * Handles Icon Injection and In-Page Tool/FAQ Accordions.
 * Layout, Header, Search, and Mobile Drawer are handled in layout.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initAccordions();
});

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
window.ToolsBuilt = window.ToolsBuilt || {};
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
