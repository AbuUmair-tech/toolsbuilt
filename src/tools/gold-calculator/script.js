/**
 * Gold Calculator UI Controller
 * Powered by GoldCalculatorLogic pure module.
 * Debounced live calculation, shareable result links, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.GoldCalculatorLogic;
  const T = ToolsBuilt.scope('gold-calculator');
  const form = document.getElementById('calculator-form');
  const rateInput = document.getElementById('gold-rate');
  const rateUnitSelect = document.getElementById('rate-unit');
  const rateKaratSelect = document.getElementById('rate-karat');
  const currencySelect = document.getElementById('currency');
  const weightInput = document.getElementById('gold-weight');
  const weightUnitSelect = document.getElementById('weight-unit');
  const karatSelect = document.getElementById('item-karat');
  const makingTypeSelect = document.getElementById('making-type');
  const makingValueGroup = document.getElementById('making-value-group');
  const makingValueInput = document.getElementById('making-value');
  const makingValueLabel = document.getElementById('making-value-label');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:gold-calculator';
  const fields = {
    rate: rateInput, per: rateUnitSelect, ratek: rateKaratSelect, cur: currencySelect,
    weight: weightInput, unit: weightUnitSelect, karat: karatSelect, making: makingTypeSelect, mv: makingValueInput
  };
  // No default rate: the visitor must enter today's rate
  const DEFAULTS = { rate: '', per: 'tola', ratek: '24', cur: ToolsBuilt.defaultCurrency('PKR', currencySelect), weight: '1', unit: 'tola', karat: '22', making: 'none', mv: '' };
  let debounceTimer = null;
  let lastResultText = '';

  const trim = (n, digits) => Number(n.toFixed(digits)).toLocaleString(ToolsBuilt.pageLocale('en-US'), { maximumFractionDigits: digits });

  function applyValues(values) {
    Object.entries(fields).forEach(([key, el]) => { el.value = values[key] !== undefined ? values[key] : DEFAULTS[key]; });
    syncMaking();
  }

  function readValues() {
    const out = {};
    Object.entries(fields).forEach(([key, el]) => { out[key] = el.value.trim(); });
    return out;
  }

  function syncMaking() {
    const type = makingTypeSelect.value;
    makingValueGroup.hidden = type === 'none';
    const symbol = ToolsBuilt.currencySymbol(currencySelect.value);
    makingValueLabel.textContent = type === 'percent' ? T('making.labelPercent') : T('making.labelPerGram', { symbol });
    makingValueInput.placeholder = type === 'percent' ? T('making.placeholderPercent') : T('making.placeholderPerGram');
  }

  function initInputs() {
    // Result links (?rate=&per=&ratek=&weight=&unit=&karat=&making=&mv=&cur=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) {
      syncMaking();
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

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readValues()));
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

  function calculate(fromSubmit) {
    clearError();
    syncMaking();
    const v = readValues();

    // Wait quietly for a rate on first load; ask for it on submit
    if (!v.rate) {
      resultBox.classList.remove('is-visible');
      if (fromSubmit) showError(T('errors.rateRequired'), rateInput);
      return;
    }

    try {
      const res = logic.calculateGold({
        rate: v.rate, rateUnit: v.per, rateKarat: Number(v.ratek),
        weight: v.weight, weightUnit: v.unit, karat: Number(v.karat),
        makingType: v.making, makingValue: v.mv
      });
      renderResult(res, v);
      saveState();
    } catch (err) {
      const field = { rate: rateInput, weight: weightInput, making: makingValueInput }[err.field] || null;
      showError(err.message, field);
    }
  }

  function renderResult(res, v) {
    const money = (n) => ToolsBuilt.money(n, v.cur);
    const weightText = T(`weightText.${v.unit}`, { value: trim(Number(v.weight), 4) });

    document.getElementById('result-header-text').textContent = T('result.header', { weight: weightText, karat: res.karat });
    document.getElementById('result-primary-text').textContent = money(res.total);
    document.getElementById('stat-pure-grams').textContent = T('weightAmount.gram', { value: trim(res.pureGoldGrams, 4) });
    document.getElementById('stat-gold-value').textContent = money(res.goldValue);
    document.getElementById('stat-making').textContent = money(res.makingCharges);
    document.getElementById('stat-total').textContent = money(res.total);
    document.getElementById('rates-title').textContent = T('result.ratesTitle', { karat: res.karat });
    document.getElementById('rate-per-tola').textContent = money(res.rates.perTola);
    document.getElementById('rate-per-10g').textContent = money(res.rates.per10g);
    document.getElementById('rate-per-gram').textContent = money(res.rates.perGram);
    // The same weight in every other unit
    const digits = { gram: 4, tola: 5, masha: 3, ratti: 2 };
    const others = Object.keys(digits).filter(u => u !== v.unit)
      .map(u => T(`weightAmount.${u}`, { value: trim(res.weightIn[u], digits[u]) }));
    document.getElementById('weight-line').textContent = `${weightText} = ${others.join(' = ')}`;

    let steps = T('steps.weight', { grams: trim(res.itemGrams, 4) });
    steps += T('steps.purity', { karat: res.karat, purity: trim(res.purity * 100, 2), pure: trim(res.pureGoldGrams, 4) });
    steps += T('steps.value', { rate: money(res.rates.perGram), karat: res.karat, value: money(res.goldValue) });
    if (res.makingType === 'percent') steps += T('steps.makingPercent', { percent: trim(res.makingValue, 2), value: money(res.makingCharges) });
    if (res.makingType === 'perGram') steps += T('steps.makingPerGram', { grams: trim(res.itemGrams, 4), rate: money(res.makingValue), value: money(res.makingCharges) });
    steps += T('steps.total', { total: money(res.total) });
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = T('result.copy', {
      weight: weightText, karat: res.karat, pure: trim(res.pureGoldGrams, 4), value: money(res.goldValue),
      making: money(res.makingCharges), total: money(res.total), perTola: money(res.rates.perTola), perGram: money(res.rates.perGram)
    });
    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => calculate(false), 150);
  }

  [rateInput, weightInput, makingValueInput].forEach(el => el.addEventListener('input', debouncedCalculate));
  [rateUnitSelect, rateKaratSelect, currencySelect, weightUnitSelect, karatSelect, makingTypeSelect]
    .forEach(el => el.addEventListener('change', () => calculate(false)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate(true);
  });

  resetBtn.addEventListener('click', () => {
    applyValues(DEFAULTS);
    clearError();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate(false);
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, T('toast.copied'));
      }
    });
  }

  initInputs();
  calculate(false);
});
