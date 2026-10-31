/**
 * Profit Margin & Markup Calculator UI Controller
 * Powered by ProfitMarginLogic. Three modes (cost + price, cost + target margin,
 * cost + markup), currency formatting via ToolsBuilt.money and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.ProfitMarginLogic;
  const form = document.getElementById('calculator-form');
  const tabBtns = Array.from(document.querySelectorAll('.mode-tab-btn'));
  const modeInput = document.getElementById('mode');
  const costInput = document.getElementById('cost');
  const priceInput = document.getElementById('price');
  const marginInput = document.getElementById('margin');
  const markupInput = document.getElementById('markup');
  const currencySelect = document.getElementById('currency');
  const modeFields = Array.from(document.querySelectorAll('[data-mode-field]'));
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('result-note');
  const statsBox = document.getElementById('result-stats');
  const stepsList = document.getElementById('result-steps');

  const FIELDS = { cost: costInput, price: priceInput, margin: marginInput, markup: markupInput };
  const DEFAULTS = { cost: '60', price: '100', margin: '25', markup: '25' };
  let mode = 'price';
  let debounceTimer = null;

  const pct = (n) => (n === null ? '—' : `${Number(n.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`);

  function switchMode(next, focusTab) {
    mode = ['price', 'margin', 'markup'].includes(next) ? next : 'price';
    modeInput.value = mode;
    tabBtns.forEach(btn => {
      const current = btn.dataset.mode === mode;
      btn.classList.toggle('active', current);
      btn.setAttribute('aria-selected', current ? 'true' : 'false');
      btn.tabIndex = current ? 0 : -1;
      if (current) form.setAttribute('aria-labelledby', btn.id);
      if (current && focusTab) btn.focus();
    });
    modeFields.forEach(el => {
      el.hidden = el.dataset.modeField !== mode;
      const input = el.querySelector('input');
      if (el.hidden) input.removeAttribute('required');
      else input.setAttribute('required', '');
    });
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
    statsBox.replaceChildren(...stats.map(([label, value, loss]) => {
      const card = document.createElement('div');
      card.className = 'result-stat-card';
      const l = document.createElement('div');
      l.className = 'result-stat-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = loss ? 'result-stat-value is-loss' : 'result-stat-value';
      v.textContent = value;
      card.append(l, v);
      return card;
    }));
  }

  function calculate() {
    clearError();
    let res;
    if (mode === 'margin') res = logic.priceFromMargin(costInput.value, marginInput.value);
    else if (mode === 'markup') res = logic.priceFromMarkup(costInput.value, markupInput.value);
    else res = logic.fromCostAndPrice(costInput.value, priceInput.value);
    if (res.error) return showError(res.error, FIELDS[res.field]);

    const cur = currencySelect.value;
    const money = (n) => ToolsBuilt.money(n, cur);

    if (mode === 'price') {
      headerText.textContent = res.isLoss ? 'Loss on this sale' : 'Profit margin';
      primaryText.textContent = `${pct(res.marginPercent)} margin · ${pct(res.markupPercent)} markup`;
    } else {
      headerText.textContent = 'Selling price';
      primaryText.textContent = money(res.price);
    }

    renderStats([
      ['Selling price', money(res.price)],
      ['Cost', money(res.cost)],
      [res.isLoss ? 'Loss' : 'Profit', money(res.profit), res.isLoss],
      ['Margin (of price)', pct(res.marginPercent), res.isLoss],
      ['Markup (of cost)', res.markupPercent === null ? 'Not defined (cost is 0)' : pct(res.markupPercent), res.isLoss]
    ]);

    const c = money(res.cost), p = money(res.price), pr = money(res.profit);
    const steps = [];
    if (mode === 'margin') steps.push(`Price = cost ÷ (1 − margin) = ${c} ÷ (1 − ${res.targetMargin / 100}) = ${p}`);
    if (mode === 'markup') steps.push(`Price = cost × (1 + markup) = ${c} × (1 + ${res.targetMarkup / 100}) = ${p}`);
    steps.push(`Profit = price − cost = ${p} − ${c} = ${pr}`);
    steps.push(`Margin = profit ÷ price = ${pr} ÷ ${p} = ${pct(res.marginPercent)}`);
    if (res.markupPercent !== null) steps.push(`Markup = profit ÷ cost = ${pr} ÷ ${c} = ${pct(res.markupPercent)}`);
    stepsList.replaceChildren(...steps.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));

    noteText.textContent = res.isLoss ? 'The selling price is below the cost, so this sale makes a loss.' : '';
    noteText.hidden = !res.isLoss;

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = `Cost ${c}, price ${p}: profit ${pr}, margin ${pct(res.marginPercent)}, markup ${pct(res.markupPercent)}`;

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  Object.values(FIELDS).forEach(el => el.addEventListener('input', debounced));
  currencySelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => { FIELDS[key].value = value; });
    currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
    calculate();
  });

  currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
  ToolsBuilt.resultLink.restore();
  switchMode(modeInput.value);
});
