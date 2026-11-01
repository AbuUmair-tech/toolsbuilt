/**
 * SIP Calculator UI Controller
 * Powered by SipLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.SipLogic;
  if (!logic) return;
  const T = ToolsBuilt.scope('sip-calculator');

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
  const currencySelect = document.getElementById('currency');
  const money = (n) => ToolsBuilt.money(n, currencySelect.value);
  let debounceTimer = null;
  let lastResultSummary = '';

  function initInputs() {
    // Result links (?inv=&ret=&yrs=&step=) take priority over saved state
    currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.inv) investmentInput.value = data.inv;
        if (data.ret) returnInput.value = data.ret;
        if (data.yrs) yearsInput.value = data.yrs;
        if (data.step) stepUpInput.value = data.step;
        if (data.cur && Array.from(currencySelect.options).some(o => o.value === data.cur)) currencySelect.value = data.cur;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inv, ret, yrs, step, cur: currencySelect.value }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
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
      showError(T('errors.investmentRequired'), investmentInput);
      return;
    }
    if (parseFloat(rawInv) <= 0) {
      showError(T('errors.investmentPositive'), investmentInput);
      return;
    }
    if (!rawRet || isNaN(parseFloat(rawRet))) {
      showError(T('errors.returnRequired'), returnInput);
      return;
    }
    if (parseFloat(rawRet) < 0) {
      showError(T('errors.returnNegative'), returnInput);
      return;
    }
    if (!rawYrs || isNaN(parseFloat(rawYrs))) {
      showError(T('errors.yearsRequired'), yearsInput);
      return;
    }
    if (parseFloat(rawYrs) <= 0) {
      showError(T('errors.yearsPositive'), yearsInput);
      return;
    }
    if (rawStep && (isNaN(parseFloat(rawStep)) || parseFloat(rawStep) < 0 || parseFloat(rawStep) > 100)) {
      showError(T('errors.stepUpRange'), stepUpInput);
      return;
    }

    try {
      const res = logic.calculateSip(rawInv, rawRet, rawYrs, {
        stepUpPercent: rawStep ? parseFloat(rawStep) : 0,
        currencySymbol: ToolsBuilt.currencySymbol(currencySelect.value)
      });

      const formattedMaturity = money(res.maturityValue);
      const formattedInvested = money(res.totalInvested);
      const formattedReturns = money(res.estimatedReturns);
      const multiplier = res.totalInvested > 0 ? (res.maturityValue / res.totalInvested).toFixed(2) : '1.00';

      resultPrimary.textContent = T('result.primary', { value: formattedMaturity });
      statMaturity.textContent = formattedMaturity;
      statInvested.textContent = formattedInvested;
      statReturns.textContent = formattedReturns;
      statMultiplier.textContent = T('result.multiplier', { multiplier });

      populateYearlyTable(res.yearlyBreakdown);

      resultBox.classList.add('is-visible');
      if (actionsBar) actionsBar.removeAttribute('hidden');

      lastResultSummary = [
        T('summary.title'),
        T('summary.monthly', { value: money(res.monthlyInvestment) }),
        T('summary.return', { rate: res.expectedReturnPercent }),
        T('summary.duration', { years: res.tenureYears, months: res.totalMonths }),
        res.stepUpPercent > 0 ? T('summary.stepUp', { rate: res.stepUpPercent }) : null,
        T('summary.invested', { value: formattedInvested }),
        T('summary.returns', { value: formattedReturns }),
        T('summary.maturity', { value: formattedMaturity, multiplier })
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
        <td>${T('table.year', { year: row.year })}</td>
        <td>${money(row.monthlyDeposit)}</td>
        <td>${money(row.annualInvestment)}</td>
        <td>${money(row.totalInvestedToDate)}</td>
        <td><strong>${money(row.futureValue)}</strong></td>
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

  currencySelect.addEventListener('change', calculate);

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
        if (window.showTbToast) window.showTbToast(T('toast.copied'));
      }).catch(() => {});
    });
  }

  initInputs();
  calculate();
});
