/**
 * SIP Calculator UI Controller
 * Powered by SipLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.SipLogic;
  if (!logic) return;

  const form = document.getElementById('calculator-form');
  const investmentInput = document.getElementById('monthly-investment');
  const returnInput = document.getElementById('expected-return');
  const yearsInput = document.getElementById('investment-years');
  const stepUpInput = document.getElementById('step-up-percent');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');

  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const actionsBar = document.getElementById('result-actions-bar');

  // Stats
  const statMaturity = document.getElementById('stat-maturity-value');
  const statInvested = document.getElementById('stat-total-invested');
  const statReturns = document.getElementById('stat-estimated-returns');
  const statMultiplier = document.getElementById('stat-wealth-multiplier');
  const resultPrimary = document.getElementById('result-primary-text');
  const tableBody = document.getElementById('sip-table-body');

  const STORAGE_KEY = 'toolsbuilt:sip-calculator';
  let debounceTimer = null;
  let lastResultSummary = '';

  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const urlInv = params.get('inv');
    const urlRet = params.get('ret');
    const urlYrs = params.get('yrs');
    const urlStep = params.get('step');

    if (urlInv) {
      investmentInput.value = urlInv;
      if (urlRet) returnInput.value = urlRet;
      if (urlYrs) yearsInput.value = urlYrs;
      if (urlStep) stepUpInput.value = urlStep;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.inv) investmentInput.value = data.inv;
        if (data.ret) returnInput.value = data.ret;
        if (data.yrs) yearsInput.value = data.yrs;
        if (data.step) stepUpInput.value = data.step;
        return;
      }
    } catch (e) {}

    // Default sample values: $500/mo, 12% return, 10 years, 0% step-up
    investmentInput.value = '500';
    returnInput.value = '12';
    yearsInput.value = '10';
    stepUpInput.value = '';
  }

  function saveState(inv, ret, yrs, step) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inv, ret, yrs, step }));
    } catch (e) {}

    const url = new URL(window.location.href);
    if (inv && inv !== '500') url.searchParams.set('inv', inv); else url.searchParams.delete('inv');
    if (ret && ret !== '12') url.searchParams.set('ret', ret); else url.searchParams.delete('ret');
    if (yrs && yrs !== '10') url.searchParams.set('yrs', yrs); else url.searchParams.delete('yrs');
    if (step) url.searchParams.set('step', step); else url.searchParams.delete('step');
    window.history.replaceState({}, '', url.toString());
  }

  function clearError() {
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    [investmentInput, returnInput, yearsInput, stepUpInput].forEach(inp => {
      if (inp) inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg, targetField) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
    if (resultBox) resultBox.classList.remove('is-visible');
    if (actionsBar) actionsBar.setAttribute('hidden', '');
    if (targetField) {
      targetField.setAttribute('aria-invalid', 'true');
      targetField.focus();
    }
  }

  function calculate() {
    clearError();
    const rawInv = investmentInput.value.trim();
    const rawRet = returnInput.value.trim();
    const rawYrs = yearsInput.value.trim();
    const rawStep = stepUpInput.value.trim();

    if (!rawInv || isNaN(parseFloat(rawInv))) {
      showError('Please enter a monthly investment amount.', investmentInput);
      return;
    }
    if (parseFloat(rawInv) <= 0) {
      showError('Monthly investment must be greater than zero.', investmentInput);
      return;
    }
    if (!rawRet || isNaN(parseFloat(rawRet))) {
      showError('Please enter expected annual return.', returnInput);
      return;
    }
    if (parseFloat(rawRet) < 0) {
      showError('Expected annual return cannot be negative.', returnInput);
      return;
    }
    if (!rawYrs || isNaN(parseFloat(rawYrs))) {
      showError('Please enter investment time period.', yearsInput);
      return;
    }
    if (parseFloat(rawYrs) <= 0) {
      showError('Time period must be greater than zero.', yearsInput);
      return;
    }
    if (rawStep && (isNaN(parseFloat(rawStep)) || parseFloat(rawStep) < 0 || parseFloat(rawStep) > 100)) {
      showError('Annual step-up percentage must be between 0% and 100%.', stepUpInput);
      return;
    }

    try {
      const res = logic.calculateSip(rawInv, rawRet, rawYrs, {
        stepUpPercent: rawStep ? parseFloat(rawStep) : 0,
        currencySymbol: '$'
      });

      const formattedMaturity = logic.formatCurrency(res.maturityValue);
      const formattedInvested = logic.formatCurrency(res.totalInvested);
      const formattedReturns = logic.formatCurrency(res.estimatedReturns);
      const multiplier = res.totalInvested > 0 ? (res.maturityValue / res.totalInvested).toFixed(2) : '1.00';

      resultPrimary.textContent = `Maturity Value: ${formattedMaturity}`;
      statMaturity.textContent = formattedMaturity;
      statInvested.textContent = formattedInvested;
      statReturns.textContent = formattedReturns;
      statMultiplier.textContent = `${multiplier}x Growth`;

      populateYearlyTable(res.yearlyBreakdown);

      resultBox.classList.add('is-visible');
      if (actionsBar) actionsBar.removeAttribute('hidden');

      lastResultSummary = [
        `SIP Investment Projection Summary:`,
        `Monthly Investment: ${logic.formatCurrency(res.monthlyInvestment)}`,
        `Expected Return: ${res.expectedReturnPercent}% per year`,
        `Duration: ${res.tenureYears} Years (${res.totalMonths} installments)`,
        res.stepUpPercent > 0 ? `Annual Step-Up: ${res.stepUpPercent}%` : null,
        `Total Invested: ${formattedInvested}`,
        `Estimated Returns: ${formattedReturns}`,
        `Projected Maturity Value: ${formattedMaturity} (${multiplier}x invested capital)`
      ].filter(Boolean).join('\n');

      saveState(rawInv, rawRet, rawYrs, rawStep);
    } catch (err) {
      showError(err.message, null);
    }
  }

  function populateYearlyTable(breakdown) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    breakdown.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>Year ${row.year}</td>
        <td>$${row.monthlyDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>$${row.annualInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>$${row.totalInvestedToDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td><strong>$${row.futureValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      `;
      fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
  }

  function debounceCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [investmentInput, returnInput, yearsInput, stepUpInput].forEach(inp => {
    if (inp) inp.addEventListener('input', debounceCalculate);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      investmentInput.value = '';
      returnInput.value = '';
      yearsInput.value = '';
      stepUpInput.value = '';
      investmentInput.focus();
      clearError();
      resultBox.classList.remove('is-visible');
      if (actionsBar) actionsBar.setAttribute('hidden', '');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      window.history.replaceState({}, '', window.location.pathname);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!lastResultSummary) return;
      navigator.clipboard.writeText(lastResultSummary).then(() => {
        if (window.showTbToast) window.showTbToast('SIP calculation copied to clipboard!');
      }).catch(() => {});
    });
  }

  initInputs();
  calculate();
});
