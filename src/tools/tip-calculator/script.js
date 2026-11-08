/**
 * Tip Calculator UI Controller
 * Powered by TipCalculatorLogic. Preset and custom tip, pre-tax tipping, round-up
 * per person, currency formatting via ToolsBuilt.money and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.TipCalculatorLogic;
  const T = ToolsBuilt.scope('tip-calculator');
  const form = document.getElementById('calculator-form');
  const billInput = document.getElementById('bill');
  const currencySelect = document.getElementById('currency');
  const tipInput = document.getElementById('tip-percent');
  const presets = Array.from(document.querySelectorAll('input[name="tip-preset"]'));
  const peopleInput = document.getElementById('people');
  const pretaxBox = document.getElementById('pretax');
  const taxGroup = document.getElementById('tax-group');
  const taxInput = document.getElementById('tax-percent');
  const roundBox = document.getElementById('round-up');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('result-note');
  const statsBox = document.getElementById('result-stats');

  const FIELDS = { bill: billInput, tip: tipInput, people: peopleInput, tax: taxInput };
  let debounceTimer = null;

  function syncPresets() {
    presets.forEach(r => { r.checked = Number(r.value) === Number(tipInput.value) && tipInput.value !== ''; });
  }

  function syncTaxField() {
    taxGroup.hidden = !pretaxBox.checked;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    Object.values(FIELDS).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
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
    const res = logic.calculateTip({
      bill: billInput.value,
      tipPercent: tipInput.value,
      people: peopleInput.value,
      tipOnPreTax: pretaxBox.checked,
      taxPercent: taxInput.value,
      roundUp: roundBox.checked
    });
    if (res.error) return showError(res.error, FIELDS[res.field]);

    const cur = currencySelect.value;
    const money = (n) => ToolsBuilt.money(n, cur);
    const split = res.people > 1;

    headerText.textContent = split ? T('result.eachPays', { people: res.people }) : T('result.totalToPay');
    primaryText.textContent = split ? money(res.perPerson) : money(res.total);

    const stats = [
      [res.roundedUp ? T('stats.tipRounded', { pct: res.effectiveTipPercent }) : T('stats.tip', { pct: res.tipPercent }), money(res.tip)],
      [T('stats.total'), money(res.total)]
    ];
    if (split) {
      stats.push([T('stats.perPerson'), money(res.perPerson)]);
      stats.push([T('stats.tipPerPerson'), money(res.tipPerPerson)]);
    }
    if (pretaxBox.checked && res.tax > 0) {
      stats.push([T('stats.tipBase'), money(res.tipBase)]);
      stats.push([T('stats.tax'), money(res.tax)]);
    }
    renderStats(stats);

    const notes = [];
    if (res.unevenSplit) {
      notes.push(T(res.extraCentPayers === 1 ? 'notes.uneven.one' : 'notes.uneven.other', {
        total: money(res.total), count: res.extraCentPayers, high: money(res.highShare), low: money(res.lowShare)
      }));
    }
    if (res.roundedUp && res.roundingExtra > 0) {
      notes.push(T('notes.roundingExtra', { amount: money(res.roundingExtra) }));
    }
    noteText.textContent = notes.join(' ');
    noteText.hidden = notes.length === 0;

    const lines = [T('copy.bill', { amount: money(res.bill) }), T('copy.tip', { amount: money(res.tip) }), T('copy.total', { amount: money(res.total) })];
    if (split) lines.push(T('copy.perPerson', { people: res.people, amount: money(res.perPerson) }));
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = lines.join('\n');

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  presets.forEach(r => r.addEventListener('change', () => {
    tipInput.value = r.value;
    calculate();
  }));
  tipInput.addEventListener('input', () => { syncPresets(); debounced(); });
  [billInput, peopleInput, taxInput].forEach(el => el.addEventListener('input', debounced));
  [currencySelect, roundBox].forEach(el => el.addEventListener('change', calculate));
  pretaxBox.addEventListener('change', () => { syncTaxField(); calculate(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    billInput.value = '50';
    tipInput.value = '18';
    peopleInput.value = '2';
    currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
    syncPresets();
    syncTaxField();
    calculate();
  });

  currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
  ToolsBuilt.resultLink.restore();
  syncPresets();
  syncTaxField();
  calculate();
});
