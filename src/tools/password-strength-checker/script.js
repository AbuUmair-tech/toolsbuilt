/**
 * Password Strength Checker UI Controller
 * The self-hosted zxcvbn-ts files (about 1.7 MB, 0.9 MB compressed) are loaded only
 * when the password field is first used, into a Web Worker on this page, with a
 * main-thread fallback. The password is never stored, logged, sent anywhere or put in
 * the URL, and the field is cleared when the page is hidden.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PasswordStrengthLogic;
  const form = document.getElementById('pw-form');
  const input = document.getElementById('pw-input');
  const toggleBtn = document.getElementById('toggle-pw');
  const statusText = document.getElementById('pw-status');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const meter = document.getElementById('pw-meter');
  const warningText = document.getElementById('pw-warning');
  const suggestionsList = document.getElementById('pw-suggestions');
  const onlineText = document.getElementById('pw-online');
  const offlineText = document.getElementById('pw-offline');
  const lengthText = document.getElementById('pw-length');
  const guessesText = document.getElementById('pw-guesses');
  const setsText = document.getElementById('pw-sets');

  let scripts = [];
  try { scripts = JSON.parse(document.getElementById('zxcvbn-scripts').textContent) || []; } catch (e) {}

  let engine = null;       // { check(password) -> Promise<result> }
  let loading = null;
  let requestId = 0;
  let debounceTimer = null;

  // ---- Lazy loading --------------------------------------------------------
  function loadInWorker() {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/password-strength-checker/worker.js');
      const pending = new Map();
      let messageId = 0; // separate from requestId, which tracks the latest input
      worker.onmessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'ready') {
          resolve({
            check(password) {
              const id = ++messageId;
              return new Promise((res, rej) => {
                pending.set(id, { res, rej });
                worker.postMessage({ type: 'check', id, password });
              });
            }
          });
        } else if (msg.type === 'failed') {
          worker.terminate();
          reject(new Error(msg.error));
        } else if (msg.type === 'result' && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) p.rej(new Error(msg.error));
          else p.res(msg.result);
        }
      };
      worker.onerror = () => { worker.terminate(); reject(new Error('worker')); };
      worker.postMessage({ type: 'init', scripts });
    });
  }

  function loadOnMainThread() {
    const load = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('The password checker could not be loaded. Check your connection and try again.'));
      document.head.appendChild(s);
    });
    return scripts.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).then(() => {
      const checker = logic.createChecker(window.zxcvbnts);
      return { check: (password) => Promise.resolve(checker.check(password)) };
    });
  }

  function ensureEngine() {
    if (engine) return Promise.resolve(engine);
    if (!loading) {
      statusText.textContent = 'Loading the strength checker (about 0.9 MB, once)…';
      const start = typeof Worker === 'function' ? loadInWorker().catch(() => loadOnMainThread()) : loadOnMainThread();
      loading = start.then((e) => {
        engine = e;
        statusText.textContent = '';
        return e;
      }).catch((err) => {
        loading = null;
        statusText.textContent = '';
        showError(err.message || 'The password checker could not be loaded.');
        throw err;
      });
    }
    return loading;
  }

  // ---- Rendering -----------------------------------------------------------
  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function clearResult() {
    resultBox.classList.remove('is-visible');
    meter.dataset.score = '';
    meter.setAttribute('aria-valuenow', '0');
  }

  function cap(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function render(r) {
    primaryText.textContent = `${r.score} of 4 · ${r.label}`;
    meter.dataset.score = String(r.score);
    meter.setAttribute('aria-valuenow', String(r.score));
    meter.setAttribute('aria-valuetext', `${r.score} of 4, ${r.label}`);

    warningText.textContent = r.warning;
    warningText.hidden = !r.warning;
    const tips = r.suggestions.slice();
    if (r.info.length < 15) tips.push('NIST recommends at least 15 characters for a password used on its own.');
    suggestionsList.replaceChildren(...tips.map(t => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    }));

    onlineText.textContent = r.crackTimes.onlineThrottled ? cap(r.crackTimes.onlineThrottled.display) : '--';
    offlineText.textContent = r.crackTimes.offlineFast ? cap(r.crackTimes.offlineFast.display) : '--';
    lengthText.textContent = `${r.info.length} character${r.info.length === 1 ? '' : 's'}`;
    guessesText.textContent = `about 10^${Math.round(r.guessesLog10)}`;

    const names = { lower: 'lower case', upper: 'upper case', digits: 'digits', symbols: 'symbols', spaces: 'spaces', other: 'other characters' };
    const used = r.info.setsUsed.map(k => `${names[k]} (${r.info.sets[k]})`).join(', ');
    const patterns = r.patterns.filter(p => p !== 'bruteforce');
    setsText.textContent = `Uses ${used || 'no characters'}. ${patterns.length ? `Patterns found: ${patterns.join(', ')}.` : 'No dictionary words or patterns were found.'}${r.truncated ? ' Only the first 256 characters were analysed.' : ''}`;

    // The copy action copies the assessment, never the password
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = `Password strength: ${r.score}/4 (${r.label}). Online: ${onlineText.textContent}. Offline: ${offlineText.textContent}.`;
    resultBox.classList.add('is-visible');
  }

  function check() {
    errorBox.classList.add('hidden');
    const password = input.value;
    if (!password) {
      clearResult();
      return;
    }
    const id = ++requestId;
    ensureEngine().then(e => e.check(password)).then(result => {
      // Ignore results for text that has since changed
      if (id !== requestId || input.value !== password) return;
      if (result) render(result);
      else clearResult();
    }).catch(() => {});
  }

  // ---- Events --------------------------------------------------------------
  input.addEventListener('focus', () => { ensureEngine().catch(() => {}); }, { once: true });
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (!input.value) { requestId++; clearResult(); return; }
    debounceTimer = setTimeout(check, 250);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(debounceTimer); check(); });

  toggleBtn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? 'Hide' : 'Show';
    toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
  });

  // Do not leave the password in the field for the back/forward cache
  window.addEventListener('pagehide', () => {
    input.value = '';
    input.type = 'password';
    clearResult();
  });
});
