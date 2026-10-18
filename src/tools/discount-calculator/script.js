/**
 * Discount Calculator UI Controller
 * Powered by DiscountLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DiscountLogic;
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
  let debounceTimer = null;
  let lastResultText = '';

  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const urlPrice = params.get('price');
    const urlDisc = params.get('disc');
    const urlStacked = params.get('stacked');
    const urlTax = params.get('tax');
    const urlCur = params.get('cur');

    if (urlPrice) {
      priceInput.value = urlPrice;
      if (urlDisc) discountInput.value = urlDisc;
      if (urlStacked) stackedDiscountInput.value = urlStacked;
      if (urlTax) taxInput.value = urlTax;
      if (urlCur && currencySelect) currencySelect.value = urlCur;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.price) priceInput.value = data.price;
        if (data.disc) discountInput.value = data.disc;
        if (data.stacked) stackedDiscountInput.value = data.stacked;
        if (data.tax) taxInput.value = data.tax;
        if (data.cur && currencySelect) currencySelect.value = data.cur;
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

    const url = new URL(window.location.href);
    if (price && price !== '100') url.searchParams.set('price', price); else url.searchParams.delete('price');
    if (disc && disc !== '20') url.searchParams.set('disc', disc); else url.searchParams.delete('disc');
    if (stacked) url.searchParams.set('stacked', stacked); else url.searchParams.delete('stacked');
    if (tax) url.searchParams.set('tax', tax); else url.searchParams.delete('tax');
    if (cur && cur !== '$') url.searchParams.set('cur', cur); else url.searchParams.delete('cur');
    window.history.replaceState({}, '', url.toString());
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
    const cur = currencySelect ? currencySelect.value : '$';

    if (!rawPrice || isNaN(parseFloat(rawPrice))) {
      showError('Please enter a valid original price.', priceInput);
      return;
    }

    if (!rawDisc || isNaN(parseFloat(rawDisc))) {
      showError('Please enter a valid discount percentage.', discountInput);
      return;
    }

    const price = parseFloat(rawPrice);
    const disc = parseFloat(rawDisc);
    const stacked = rawStacked ? parseFloat(rawStacked) : 0;
    const tax = rawTax ? parseFloat(rawTax) : 0;

    if (price < 0 || disc < 0 || stacked < 0 || tax < 0) {
      showError('Price, discount, and tax percentages cannot be negative.', priceInput);
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
    const cur = res.currencySymbol;
    const fmt = (num) => cur + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const finalFormatted = fmt(res.finalPrice);
    const savedFormatted = fmt(res.totalSavings);

    document.getElementById('result-primary-text').textContent = `Final Price: ${finalFormatted}`;
    document.getElementById('stat-final-price').textContent = finalFormatted;
    document.getElementById('stat-total-saved').textContent = `${savedFormatted} (${res.effectiveDiscountPercent}% total)`;
    document.getElementById('stat-price-before-tax').textContent = fmt(res.priceAfterDiscounts);
    document.getElementById('stat-tax-amount').textContent = fmt(res.taxAmount);

    lastResultText = `Final Price: ${finalFormatted}. Total Saved: ${savedFormatted} (${res.effectiveDiscountPercent}% off). Price before tax: ${fmt(res.priceAfterDiscounts)}. Sales tax: ${fmt(res.taxAmount)}.`;

    let stepsHtml = `<strong>Calculation Breakdown:</strong><br>`;
    stepsHtml += `1. Original Price: <code>${fmt(res.originalPrice)}</code><br>`;
    stepsHtml += `2. Primary Discount (${res.primaryDiscount}%): Saved <code>${fmt(res.primarySavings)}</code> → Subtotal: <code>${fmt(res.subtotalAfterPrimary)}</code><br>`;

    if (res.stackedDiscount > 0) {
      stepsHtml += `3. Stacked 2nd Discount (${res.stackedDiscount}% off ${fmt(res.subtotalAfterPrimary)}): Saved additional <code>${fmt(res.stackedSavings)}</code> → Subtotal: <code>${fmt(res.priceAfterDiscounts)}</code><br>`;
    }

    if (res.taxPercent > 0) {
      stepsHtml += `4. Sales Tax (${res.taxPercent}%): Added <code>${fmt(res.taxAmount)}</code><br>`;
    }
    stepsHtml += `5. Total Out-of-Pocket: <strong>${finalFormatted}</strong> (Total Savings: <strong>${savedFormatted}</strong>)`;

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
    if (currencySelect) currencySelect.value = '$';
    clearError();
    saveState('100', '20', '', '', '$');
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Discount calculation copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
