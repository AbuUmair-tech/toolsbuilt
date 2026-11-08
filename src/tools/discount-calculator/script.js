/**
 * Discount Calculator UI Controller
 * Powered by DiscountLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DiscountLogic;
  const T = ToolsBuilt.scope('discount-calculator');
  const form = document.getElementById('calculator-form');
  const priceInput = document.getElementById('original-price');
  const discountInput = document.getElementById('discount-percent');
  const stackedDiscountInput = document.getElementById('stacked-discount-percent');
  const taxInput = document.getElementById('tax-percent');
  const currencySelect = document.getElementById('currency-symbol');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:discount-calculator';
  // Older links and saved state stored a symbol; the selector now uses currency codes
  const LEGACY_SYMBOLS = { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₹': 'INR' };
  const toCode = (cur) => LEGACY_SYMBOLS[cur] || cur;
  const defaultCurrency = () => ToolsBuilt.defaultCurrency('USD', currencySelect);
  let debounceTimer = null;
  let lastResultText = '';

  function initInputs() {
    // Result links (?price=&off=&off2=&tax=&cur=) take priority over saved state
    try {
      const params = new URLSearchParams(window.location.search);
      if (LEGACY_SYMBOLS[params.get('cur')]) {
        params.set('cur', toCode(params.get('cur')));
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}${window.location.hash}`);
      }
    } catch (e) {}
    currencySelect.value = defaultCurrency();
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.price) priceInput.value = data.price;
        if (data.disc) discountInput.value = data.disc;
        if (data.stacked) stackedDiscountInput.value = data.stacked;
        if (data.tax) taxInput.value = data.tax;
        if (data.cur && currencySelect) currencySelect.value = toCode(data.cur);
        return;
      }
    } catch (e) {}

    priceInput.value = '100';
    discountInput.value = '20';
  }

  function saveState(price, disc, stacked, tax, cur) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ price, disc, stacked, tax, cur }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    [priceInput, discountInput, stackedDiscountInput, taxInput].forEach(inp => {
      inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg, targetField) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (targetField) {
      targetField.setAttribute('aria-invalid', 'true');
      targetField.focus();
    }
  }

  function calculate() {
    clearError();
    const rawPrice = priceInput.value.trim();
    const rawDisc = discountInput.value.trim();
    const rawStacked = stackedDiscountInput.value.trim();
    const rawTax = taxInput.value.trim();
    const cur = currencySelect.value;

    if (!rawPrice || isNaN(parseFloat(rawPrice))) {
      showError(T('errors.price'), priceInput);
      return;
    }

    if (!rawDisc || isNaN(parseFloat(rawDisc))) {
      showError(T('errors.discount'), discountInput);
      return;
    }

    const price = parseFloat(rawPrice);
    const disc = parseFloat(rawDisc);
    const stacked = rawStacked ? parseFloat(rawStacked) : 0;
    const tax = rawTax ? parseFloat(rawTax) : 0;

    if (price < 0 || disc < 0 || stacked < 0 || tax < 0) {
      showError(T('errors.negative'), priceInput);
      return;
    }

    try {
      const res = logic.calculateDiscount(price, disc, {
        stackedDiscountPercent: stacked,
        taxPercent: tax,
        currencySymbol: cur
      });
      renderResult(res);
      saveState(rawPrice, rawDisc, rawStacked, rawTax, cur);
    } catch (err) {
      showError(err.message, priceInput);
    }
  }

  function renderResult(res) {
    const fmt = (num) => ToolsBuilt.money(num, res.currencySymbol);

    const finalFormatted = fmt(res.finalPrice);
    const savedFormatted = fmt(res.totalSavings);

    document.getElementById('result-primary-text').textContent = T('result.primary', { final: finalFormatted });
    document.getElementById('stat-final-price').textContent = finalFormatted;
    document.getElementById('stat-total-saved').textContent = T('result.totalSaved', { saved: savedFormatted, pct: res.effectiveDiscountPercent });
    document.getElementById('stat-price-before-tax').textContent = fmt(res.priceAfterDiscounts);
    document.getElementById('stat-tax-amount').textContent = fmt(res.taxAmount);

    lastResultText = T('result.copy', {
      final: finalFormatted, saved: savedFormatted, pct: res.effectiveDiscountPercent,
      beforeTax: fmt(res.priceAfterDiscounts), tax: fmt(res.taxAmount)
    });

    let stepsHtml = T('steps.heading');
    stepsHtml += T('steps.original', { price: fmt(res.originalPrice) });
    stepsHtml += T('steps.primary', { pct: res.primaryDiscount, saved: fmt(res.primarySavings), subtotal: fmt(res.subtotalAfterPrimary) });

    if (res.stackedDiscount > 0) {
      stepsHtml += T('steps.stacked', { pct: res.stackedDiscount, base: fmt(res.subtotalAfterPrimary), saved: fmt(res.stackedSavings), subtotal: fmt(res.priceAfterDiscounts) });
    }

    if (res.taxPercent > 0) {
      stepsHtml += T('steps.tax', { pct: res.taxPercent, tax: fmt(res.taxAmount) });
    }
    stepsHtml += T('steps.total', { final: finalFormatted, saved: savedFormatted });

    const breakdownBox = document.getElementById('formula-breakdown-box');
    if (breakdownBox) {
      breakdownBox.innerHTML = stepsHtml;
    }

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [priceInput, discountInput, stackedDiscountInput, taxInput].forEach(inp => {
    inp.addEventListener('input', debouncedCalculate);
  });
  if (currencySelect) {
    currencySelect.addEventListener('change', debouncedCalculate);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    priceInput.value = '100';
    discountInput.value = '20';
    stackedDiscountInput.value = '';
    taxInput.value = '';
    currencySelect.value = defaultCurrency();
    clearError();
    saveState('100', '20', '', '', currencySelect.value);
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, T('result.copied'));
      }
    });
  }

  initInputs();
  calculate();
});
