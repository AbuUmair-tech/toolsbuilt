/**
 * JWT Decoder UI Controller
 * Powered by JwtLogic. Decodes on input and verifies HMAC signatures with Web Crypto.
 * The token and secret are kept only in the form fields: never logged, stored,
 * sent anywhere or written to the URL.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.JwtLogic;
  const T = ToolsBuilt.scope('jwt-decoder');
  const form = document.getElementById('jwt-form');
  const input = document.getElementById('jwt-input');
  const exampleBtn = document.getElementById('example-btn');
  const clearBtn = document.getElementById('clear-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const statusText = document.getElementById('jwt-status');
  const headerPre = document.getElementById('jwt-header');
  const payloadPre = document.getElementById('jwt-payload');
  const timesWrapper = document.getElementById('jwt-times-wrapper');
  const timesBody = document.getElementById('jwt-times');
  const verifyHint = document.getElementById('verify-hint');
  const verifyFields = document.getElementById('verify-fields');
  const verifyActions = document.getElementById('verify-actions');
  const secretInput = document.getElementById('jwt-secret');
  const toggleSecret = document.getElementById('toggle-secret');
  const secretEnc = document.getElementById('jwt-secret-enc');
  const verifyBtn = document.getElementById('verify-btn');
  const verifyResult = document.getElementById('verify-result');

  const EXAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  let current = null;
  let verifyRun = 0;

  // English pages: the visitor's English variant (en-GB, ...); other languages: the page language
  const locale = ToolsBuilt.pageLocale() || (/^en\b/i.test(navigator.language || '') ? navigator.language : 'en-US');
  const localFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' });

  function relative(ms) {
    const diff = ms - Date.now();
    const abs = Math.abs(diff) / 1000;
    const units = [['year', 31536000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    for (const [name, size] of units) {
      if (abs >= size) {
        const n = Math.floor(abs / size);
        const text = T(`relative.${name}.${n === 1 ? 'one' : 'other'}`, { n: n.toLocaleString(ToolsBuilt.pageLocale('en-US')) });
        return diff < 0 ? T('relative.ago', { time: text }) : T('relative.in', { time: text });
      }
    }
    return T('relative.now');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-errormessage', 'error-box');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-errormessage');
  }

  function decode() {
    clearError();
    verifyResult.textContent = '';
    verifyResult.className = 'jwt-verify-result';
    current = null;
    if (!input.value.trim()) {
      resultBox.classList.remove('is-visible');
      return;
    }
    const res = logic.decode(input.value);
    if (res.error) return showError(res.error);
    current = res;

    primaryText.textContent = `${res.alg || T('result.noAlgorithm')}${res.header.typ ? ` · ${res.header.typ}` : ''}`;
    // Built lazily: only the claims behind the current status exist
    const statusMap = {
      'expired': () => [T('status.expired', { when: relative(res.times.exp.ms) }), 'is-expired'],
      'not-yet-valid': () => [T('status.notYetValid', { when: relative(res.times.nbf.ms) }), 'is-expired'],
      'valid-time': () => [T('status.validTime', { when: relative(res.times.exp.ms) }), 'is-valid-time'],
      'no-exp': () => [T('status.noExp'), '']
    };
    const [statusLabel, statusClass] = statusMap[res.status]();
    statusText.textContent = statusLabel;
    statusText.className = `jwt-status ${statusClass}`.trim();

    headerPre.textContent = res.headerJson;
    payloadPre.textContent = res.payloadJson;

    const timeRows = Object.keys(res.times).map(name => {
      const t = res.times[name];
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = T(`claims.${name}`);
      const td = document.createElement('td');
      const lines = t.valid
        ? [`${t.iso} (${t.value})`, `${localFmt.format(new Date(t.ms))} · ${relative(t.ms)}`]
        : [T('times.invalid', { value: JSON.stringify(t.value) })];
      lines.forEach((line, i) => {
        const span = document.createElement('span');
        span.className = i ? 'jwt-time-local' : 'jwt-time-utc';
        span.textContent = line;
        td.appendChild(span);
      });
      tr.append(th, td);
      return tr;
    });
    timesBody.replaceChildren(...timeRows);
    timesWrapper.hidden = timeRows.length === 0;

    if (res.unsigned) {
      verifyHint.textContent = T('verify.unsigned');
    } else if (res.canVerifyHmac) {
      verifyHint.textContent = T('verify.hmac', { alg: res.alg });
    } else {
      verifyHint.textContent = T('verify.other', { alg: res.alg || T('verify.unknownAlgorithm') });
    }
    verifyFields.hidden = !res.canVerifyHmac || res.unsigned;
    verifyActions.hidden = verifyFields.hidden;

    // The copy action copies the decoded JSON only, never the token itself
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = T('copy.decoded', { header: res.headerJson, payload: res.payloadJson });
    resultBox.classList.add('is-visible');
  }

  async function verify() {
    if (!current) return;
    const run = ++verifyRun;
    verifyResult.className = 'jwt-verify-result';
    verifyResult.textContent = T('verify.checking');
    let res;
    try {
      res = await logic.verifyHmac(input.value, secretInput.value, { secretEncoding: secretEnc.value });
    } catch (err) {
      res = { error: err.message || T('verify.failed') };
    }
    if (run !== verifyRun) return;
    if (res.error) {
      verifyResult.textContent = res.error;
      verifyResult.classList.add('is-invalid');
    } else if (res.valid) {
      verifyResult.textContent = T('verify.valid', { alg: res.alg });
      verifyResult.classList.add('is-valid');
    } else {
      verifyResult.textContent = T('verify.invalid');
      verifyResult.classList.add('is-invalid');
    }
  }

  input.addEventListener('input', decode);
  form.addEventListener('submit', (e) => { e.preventDefault(); decode(); });
  verifyBtn.addEventListener('click', verify);
  secretInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
  [secretInput, secretEnc].forEach(el => el.addEventListener('input', () => { verifyResult.textContent = ''; verifyResult.className = 'jwt-verify-result'; }));

  toggleSecret.addEventListener('click', () => {
    const show = secretInput.type === 'password';
    secretInput.type = show ? 'text' : 'password';
    toggleSecret.textContent = show ? T('toggle.hide') : T('toggle.show');
    toggleSecret.setAttribute('aria-pressed', show ? 'true' : 'false');
  });

  document.querySelectorAll('[data-copy-part]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!current) return;
      const isHeader = btn.dataset.copyPart === 'header';
      ToolsBuilt.copy(isHeader ? current.headerJson : current.payloadJson, T(isHeader ? 'copy.header' : 'copy.payload'));
    });
  });

  exampleBtn.addEventListener('click', () => {
    input.value = EXAMPLE;
    secretInput.value = '';
    decode();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    secretInput.value = '';
    decode();
    input.focus();
  });
});
