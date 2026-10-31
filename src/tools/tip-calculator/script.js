/**
 * Tip Calculator UI Controller
 * Powered by TipCalculatorLogic. Preset and custom tip, pre-tax tipping, round-up
 * per person, currency formatting via ToolsBuilt.money and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.TipCalculatorLogic;
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

    headerText.textContent = split ? `Each of ${res.people} people pays` : 'Total to pay';
    primaryText.textContent = split ? money(res.perPerson) : money(res.total);

    const stats = [
      [res.roundedUp ? `Tip (${res.effectiveTipPercent}% after rounding)` : `Tip (${res.tipPercent}%)`, money(res.tip)],
      ['Total with tip', money(res.total)]
    ];
    if (split) {
      stats.push(['Per person', money(res.perPerson)]);
      stats.push(['Tip per person', money(res.tipPerPerson)]);
    }
    if (pretaxBox.checked && res.tax > 0) {
      stats.push(['Tip based on (before tax)', money(res.tipBase)]);
      stats.push(['Tax in the bill', money(res.tax)]);
    }
    renderStats(stats);

    const notes = [];
    if (res.unevenSplit) {
      notes.push(`${money(res.total)} does not split evenly: ${res.extraCentPayers} ${res.extraCentPayers === 1 ? 'person pays' : 'people pay'} ${money(res.highShare)} and the rest pay ${money(res.lowShare)}.`);
    }
    if (res.roundedUp && res.roundingExtra > 0) {
      notes.push(`Rounding up adds ${money(res.roundingExtra)} to the tip.`);
    }
    noteText.textContent = notes.join(' ');
    noteText.hidden = notes.length === 0;

    const lines = [`Bill: ${money(res.bill)}`, `Tip: ${money(res.tip)}`, `Total: ${money(res.total)}`];
    if (split) lines.push(`Per person (${res.people}): ${money(res.perPerson)}`);
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
