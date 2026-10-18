/**
 * ToolsBuilt UI Helper - Toast & Copy with accessible aria-live region
 */
window.ToolsBuilt = window.ToolsBuilt || {};

(function() {
  let live;
  function getLive() {
    if (!live) {
      live = document.getElementById('tb-toast-region') || document.createElement('div');
      live.id = 'tb-toast-region';
      live.className = 'tb-toast-container';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      if (!live.parentNode) document.body.appendChild(live);
    }
    return live;
  }

  ToolsBuilt.toast = function(msg, duration = 2800) {
    const el = document.createElement('div');
    el.className = 'tb-toast';
    el.textContent = msg;
    getLive().appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 250);
    }, duration);
  };

  ToolsBuilt.copy = function(text, successMsg = 'Copied to clipboard') {
    const p = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(text)
      : new Promise((res, rej) => {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy') ? res() : rej();
          document.body.removeChild(ta);
        });
    return p.then(() => ToolsBuilt.toast(successMsg)).catch(() => {});
  };
})();
