/**
 * Fraction Calculator UI Controller
 * Powered by FractionLogic. Calculate (+ − × ÷), simplify and decimal-to-fraction
 * modes with step-by-step working and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.FractionLogic;
  const T = ToolsBuilt.scope('fraction-calculator');
  const form = document.getElementById('calculator-form');
  const tabBtns = Array.from(document.querySelectorAll('.mode-tab-btn'));
  const modeInput = document.getElementById('mode');
  const aInput = document.getElementById('frac-a');
  const opSelect = document.getElementById('frac-op');
  const bInput = document.getElementById('frac-b');
  const sInput = document.getElementById('frac-s');
  const decInput = document.getElementById('frac-dec');
  const modeFields = Array.from(document.querySelectorAll('[data-mode-field]'));
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const statsBox = document.getElementById('result-stats');
  const stepsList = document.getElementById('result-steps');

  const DEFAULTS = { a: '1/2', op: 'add', b: '1/3', s: '6/8', dec: '0.375' };
  const INPUTS = { a: aInput, op: opSelect, b: bInput, s: sInput, dec: decInput };
  let mode = 'calc';
  let debounceTimer = null;

  function switchMode(next, focusTab) {
    mode = ['calc', 'simplify', 'dec'].includes(next) ? next : 'calc';
    modeInput.value = mode;
    tabBtns.forEach(btn => {
      const current = btn.dataset.mode === mode;
      btn.classList.toggle('active', current);
      btn.setAttribute('aria-selected', current ? 'true' : 'false');
      btn.tabIndex = current ? 0 : -1;
      if (current) form.setAttribute('aria-labelledby', btn.id);
      if (current && focusTab) btn.focus();
    });
    modeFields.forEach(el => { el.hidden = el.dataset.modeField !== mode; });
    calculate();
  }

  tabBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
      switchMode(next.dataset.mode, true);
    });
  });

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    Object.values(INPUTS).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
  }

  function showError(message, field) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-errormessage', 'error-box');
    }
  }

  function renderStats(stats) {
    statsBox.replaceChildren(...stats.map(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'result-stat-card';
      const l = document.createElement('div');
      l.className = 'result-stat-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = 'result-stat-value';
      v.textContent = value;
      card.append(l, v);
      return card;
    }));
  }

  function calculate() {
    clearError();
    let res, field, title;
    if (mode === 'simplify') {
      res = logic.simplify(sInput.value);
      field = sInput;
      title = res.error ? '' : T('result.lowestTerms', { input: sInput.value.trim() });
    } else if (mode === 'dec') {
      res = logic.decimalToFraction(decInput.value);
      field = decInput;
      title = res.error ? '' : T('result.asFraction', { input: decInput.value.trim() });
    } else {
      res = logic.calculate(aInput.value, opSelect.value, bInput.value);
      field = res.field === 'b' ? bInput : aInput;
      title = res.error ? '' : res.expression;
    }
    if (res.error) return showError(res.error, field);

    headerText.textContent = title;
    primaryText.textContent = res.fraction === res.mixed ? `= ${res.fraction}` : `= ${res.fraction} = ${res.mixed}`;
    renderStats([
      [T('stats.simplified'), res.fraction],
      [T('stats.mixed'), res.mixed],
      [T('stats.decimal'), res.decimalExact ? res.decimal : `${res.decimal} (≈ ${res.decimalRounded})`]
    ]);
    stepsList.replaceChildren(...res.steps.map(text => {
      const li = document.createElement('li');
      if (/^\s{2}/.test(text)) li.className = 'is-sub';
      li.textContent = text.trim();
      return li;
    }));

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = `${title} = ${res.fraction}${res.mixed !== res.fraction ? ` = ${res.mixed}` : ''} = ${res.decimal}`;

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 200);
  }

  [aInput, bInput, sInput, decInput].forEach(el => el.addEventListener('input', debounced));
  opSelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => { INPUTS[key].value = value; });
    calculate();
  });

  ToolsBuilt.resultLink.restore();
  switchMode(modeInput.value);
});
