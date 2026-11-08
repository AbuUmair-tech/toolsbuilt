/**
 * Sales Tax, VAT & GST Calculator UI Controller
 * Powered by SalesTaxLogic pure module.
 * Add / remove tax, rate presets or custom rate, quantity, debounced live calculation,
 * shareable result links, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.SalesTaxLogic;
  const T = ToolsBuilt.scope('sales-tax-calculator');
  const form = document.getElementById('calculator-form');
  const modeInputs = document.querySelectorAll('input[name="tax-mode"]');
  const priceInput = document.getElementById('tax-price');
  const priceLabel = document.getElementById('price-label');
  const qtyInput = document.getElementById('tax-qty');
  const rateSelect = document.getElementById('tax-rate-preset');
  const customGroup = document.getElementById('custom-rate-group');
  const customInput = document.getElementById('tax-rate-custom');
  const currencySelect = document.getElementById('tax-currency');
  const countrySelect = document.getElementById('tax-country');
  const countryNote = document.getElementById('tax-country-note');
  const VAT = (() => {
    try { return JSON.parse(document.getElementById('vat-data').textContent); } catch (e) { return []; }
  })();
  // Generic rates kept in every list, so older result links (?rate=5|10|15|18) still open
  const COMMON_RATES = [5, 10, 15, 18];
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:sales-tax-calculator';
  const DEFAULTS = { mode: 'add', price: '1000', qty: '1', country: 'PK', rate: '18', custom: '', cur: 'PKR' };
  let debounceTimer = null;
  let lastResultText = '';

  const getMode = () => (Array.from(modeInputs).find(i => i.checked) || {}).value || 'add';
  const setMode = (value) => modeInputs.forEach(i => { i.checked = i.value === value; });
  const trimRate = (n) => Number(n.toFixed(4)).toString();

  const vatFor = (code) => VAT.find(c => c.code === code);
  // A preset's display text (name, rate labels, notes, source name) from the translation data
  const vatText = (code, key) => T(`vat.${code}.${key}`);

  // Visitor's country among the presets: saved choice, time zone, then browser language region
  function guessPreset() {
    const known = ToolsBuilt.countries();
    const list = VAT.map(c => ({ ...c, timeZones: c.timeZones || ((known.find(k => k.code === c.code) || {}).timeZones) }));
    const guess = ToolsBuilt.guessCountry(list);
    return guess ? guess.code : null;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Rebuild the rate list for a country: its verified rates first, then the common rates, then custom
  function applyCountry(code) {
    const c = vatFor(code);
    if (!c) return;
    countrySelect.value = code;
    const seen = new Set();
    const options = [];
    c.rates.forEach((r, i) => {
      seen.add(String(r.rate));
      options.push(`<option value="${r.rate}">${T('rateOption', { rate: r.rate, country: escapeHtml(vatText(code, 'name')), label: escapeHtml(vatText(code, `rates.${i}`)) })}</option>`);
    });
    COMMON_RATES.filter(r => !seen.has(String(r))).forEach(r => options.push(`<option value="${r}">${r}%</option>`));
    options.push(`<option value="custom">${T('customRate')}</option>`);
    rateSelect.innerHTML = options.join('');
    rateSelect.value = c.rates.length ? String(c.rates[0].rate) : 'custom';

    const notes = escapeHtml(vatText(code, 'notes'));
    countryNote.innerHTML = c.source
      ? T('countryNote', {
        notes,
        url: c.source.url,
        source: escapeHtml(vatText(code, 'source')),
        date: new Intl.DateTimeFormat(ToolsBuilt.pageLocale('en-GB'), { dateStyle: 'long' }).format(new Date(c.verifiedOn + 'T00:00:00'))
      })
      : notes;

    // Match the currency when the page offers the country's own
    const home = ToolsBuilt.countries().find(k => k.code === code.split('-')[0]);
    if (home && Array.from(currencySelect.options).some(o => o.value === home.currency)) currencySelect.value = home.currency;
    syncForm();
  }

  function applyValues(v) {
    applyCountry(v.country);
    setMode(v.mode);
    priceInput.value = v.price;
    qtyInput.value = v.qty;
    rateSelect.value = v.rate;
    customInput.value = v.custom;
    currencySelect.value = v.cur;
    syncForm();
  }

  function syncForm() {
    const add = getMode() === 'add';
    priceLabel.firstChild.textContent = add ? T('priceLabel.add') : T('priceLabel.remove');
    customGroup.hidden = rateSelect.value !== 'custom';
  }

  function initInputs() {
    // Result links (?mode=&price=&country=&rate=&custom=&qty=&cur=) take priority over saved state.
    // The rate list depends on the country, so build it before the link fills the rate.
    const linked = new URLSearchParams(window.location.search).get('country');
    DEFAULTS.country = guessPreset() || 'PK';
    const home = vatFor(DEFAULTS.country);
    DEFAULTS.rate = home && home.rates.length ? String(home.rates[0].rate) : 'custom';
    DEFAULTS.cur = ToolsBuilt.defaultCurrency('PKR', currencySelect);
    applyCountry(linked && vatFor(linked) ? linked : DEFAULTS.country);
    if (ToolsBuilt.resultLink.restore().length) {
      syncForm();
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        applyValues({ ...DEFAULTS, ...JSON.parse(saved) });
        return;
      }
    } catch (e) {}
    applyValues(DEFAULTS);
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  // fromSubmit: only an explicit Calculate asks for a missing custom rate (e.g. the US has no preset)
  function calculate(fromSubmit) {
    clearError();
    syncForm();
    const state = {
      mode: getMode(),
      price: priceInput.value.trim(),
      qty: qtyInput.value.trim(),
      country: countrySelect.value,
      rate: rateSelect.value,
      custom: customInput.value.trim(),
      cur: currencySelect.value
    };

    if (!state.price) {
      showError(T('errors.priceRequired'), priceInput);
      return;
    }
    if (state.rate === 'custom' && !state.custom) {
      if (fromSubmit !== true) {
        resultBox.classList.remove('is-visible');
        return;
      }
      showError(T('errors.customRequired'), customInput);
      return;
    }

    const rate = state.rate === 'custom' ? state.custom : state.rate;
    try {
      const res = state.mode === 'add'
        ? logic.addTax(state.price, rate, state.qty)
        : logic.removeTax(state.price, rate, state.qty);
      renderResult(res, state.cur);
      saveState(state);
    } catch (err) {
      const field = err.field === 'rate' ? (state.rate === 'custom' ? customInput : rateSelect)
        : err.field === 'quantity' ? qtyInput : priceInput;
      showError(err.message, field);
    }
  }

  function renderResult(res, cur) {
    const money = (n) => ToolsBuilt.money(n, cur);
    const rateText = `${trimRate(res.rate)}%`;
    const add = res.mode === 'add';
    const factor = trimRate(1 + res.rate / 100);
    const qtyText = res.quantity !== 1 ? T('steps.quantity', { qty: trimRate(res.quantity), price: money(res.unitPrice) }) : '';

    document.getElementById('result-header-text').textContent = add ? T('result.headerAdd') : T('result.headerRemove');
    document.getElementById('result-primary-text').textContent = money(add ? res.gross : res.net);
    document.getElementById('stat-net').textContent = money(res.net);
    document.getElementById('stat-tax-label').textContent = T('result.taxLabel', { rate: rateText });
    document.getElementById('stat-tax').textContent = money(res.tax);
    document.getElementById('stat-gross').textContent = money(res.gross);

    const perItem = document.getElementById('per-item-line');
    perItem.hidden = res.quantity === 1;
    if (res.quantity !== 1) {
      perItem.textContent = T('result.perItem', { net: money(res.net / res.quantity), tax: money(res.tax / res.quantity), gross: money(res.gross / res.quantity) });
    }

    let steps;
    if (add) {
      steps = T('steps.addFormula');
      steps += T('steps.addNet', { qty: qtyText, net: money(res.net) });
      steps += T('steps.addTax', { net: money(res.net), rate: trimRate(res.rate / 100), tax: money(res.tax) });
      steps += T('steps.addTotal', { net: money(res.net), tax: money(res.tax), gross: money(res.gross) });
    } else {
      steps = T('steps.removeFormula');
      steps += T('steps.removeGross', { qty: qtyText, gross: money(res.gross) });
      steps += T('steps.removeNet', { gross: money(res.gross), factor, net: money(res.net) });
      steps += T('steps.removeTax', { gross: money(res.gross), net: money(res.net), tax: money(res.tax) });
    }
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = add
      ? T('result.copyAdd', { net: money(res.net), rate: rateText, tax: money(res.tax), gross: money(res.gross) })
      : T('result.copyRemove', { gross: money(res.gross), rate: rateText, net: money(res.net), tax: money(res.tax) });
    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [priceInput, qtyInput, customInput].forEach(el => el.addEventListener('input', debouncedCalculate));
  [rateSelect, currencySelect].forEach(el => el.addEventListener('change', calculate));
  countrySelect.addEventListener('change', () => {
    applyCountry(countrySelect.value);
    calculate();
  });
  modeInputs.forEach(el => el.addEventListener('change', calculate));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate(true);
  });

  resetBtn.addEventListener('click', () => {
    applyValues(DEFAULTS);
    clearError();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, T('toast.copied'));
      }
    });
  }

  initInputs();
  calculate();
});
