/**
 * Compound Interest Calculator UI Controller
 * Powered by CompoundInterestLogic pure module.
 * Debounced live calculation, inline SVG growth chart rendering, URL query sync, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.CompoundInterestLogic;
  if (!logic) return;
  const T = ToolsBuilt.scope('compound-interest-calculator');

  const form = document.getElementById('calculator-form');
  const principalInput = document.getElementById('principal');
  const rateInput = document.getElementById('interest-rate');
  const yearsInput = document.getElementById('years');
  const freqSelect = document.getElementById('compounding-frequency');
  const contributionInput = document.getElementById('regular-contribution');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');

  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const actionsBar = document.getElementById('result-actions-bar');

  // Stats
  const statFinalBalance = document.getElementById('stat-final-balance');
  const statTotalPrincipal = document.getElementById('stat-total-principal');
  const statTotalInterest = document.getElementById('stat-total-interest');
  const statApy = document.getElementById('stat-effective-apy');
  const resultPrimary = document.getElementById('result-primary-text');
  const chartContainer = document.getElementById('growth-chart-container');
  const tableBody = document.getElementById('compound-table-body');

  const STORAGE_KEY = 'toolsbuilt:compound-interest-calculator';
  const currencySelect = document.getElementById('currency');
  const money = (n) => ToolsBuilt.money(n, currencySelect.value);
  let debounceTimer = null;
  let lastResultSummary = '';

  function initInputs() {
    // Result links (?p=&r=&y=&f=&pmt=) take priority over saved state
    currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.p) principalInput.value = data.p;
        if (data.r) rateInput.value = data.r;
        if (data.y) yearsInput.value = data.y;
        if (data.f) freqSelect.value = data.f;
        if (data.pmt) contributionInput.value = data.pmt;
        if (data.cur && Array.from(currencySelect.options).some(o => o.value === data.cur)) currencySelect.value = data.cur;
        return;
      }
    } catch (e) {}

    // Default sample values: $10,000 at 7% for 10 years, annual compounding
    principalInput.value = '10000';
    rateInput.value = '7';
    yearsInput.value = '10';
    freqSelect.value = 'annual';
    contributionInput.value = '';
  }

  function saveState(p, r, y, f, pmt) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ p, r, y, f, pmt, cur: currencySelect.value }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    [principalInput, rateInput, yearsInput, contributionInput].forEach(inp => {
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
    const rawP = principalInput.value.trim();
    const rawR = rateInput.value.trim();
    const rawY = yearsInput.value.trim();
    const freq = freqSelect.value;
    const rawPmt = contributionInput.value.trim();

    if (rawP === '' || isNaN(parseFloat(rawP))) {
      showError(T('errors.principalRequired'), principalInput);
      return;
    }
    if (parseFloat(rawP) < 0) {
      showError(T('errors.principalNegative'), principalInput);
      return;
    }
    if (rawR === '' || isNaN(parseFloat(rawR))) {
      showError(T('errors.rateRequired'), rateInput);
      return;
    }
    if (parseFloat(rawR) < 0) {
      showError(T('errors.rateNegative'), rateInput);
      return;
    }
    if (!rawY || isNaN(parseFloat(rawY))) {
      showError(T('errors.yearsRequired'), yearsInput);
      return;
    }
    if (parseFloat(rawY) <= 0) {
      showError(T('errors.yearsMin'), yearsInput);
      return;
    }
    if (rawPmt && (isNaN(parseFloat(rawPmt)) || parseFloat(rawPmt) < 0)) {
      showError(T('errors.contributionMin'), contributionInput);
      return;
    }
    if (parseFloat(rawP) === 0 && (!rawPmt || parseFloat(rawPmt) === 0)) {
      showError(T('errors.principalOrContributionRequired'), principalInput);
      return;
    }

    try {
      const res = logic.calculateCompoundInterest(rawP, rawR, rawY, freq, {
        contributionAmount: rawPmt ? parseFloat(rawPmt) : 0,
        currencySymbol: ToolsBuilt.currencySymbol(currencySelect.value)
      });

      const formattedBal = money(res.finalBalance);
      const formattedPrin = money(res.totalPrincipal);
      const formattedInt = money(res.totalInterest);

      resultPrimary.textContent = T('result.primary', { value: formattedBal });
      statFinalBalance.textContent = formattedBal;
      statTotalPrincipal.textContent = formattedPrin;
      statTotalInterest.textContent = formattedInt;
      statApy.textContent = T('result.apy', { apy: res.apyPercent });

      // Render SVG Growth Chart
      if (chartContainer) {
        chartContainer.innerHTML = logic.generateSvgGrowthChart(res.yearlyData, ToolsBuilt.currencySymbol(currencySelect.value));
      }

      // Populate Table
      populateBreakdownTable(res.yearlyData);

      resultBox.classList.add('is-visible');
      if (actionsBar) actionsBar.removeAttribute('hidden');

      lastResultSummary = [
        T('summary.title'),
        T('summary.principal', { value: money(res.initialPrincipal) }),
        T('summary.rate', { rate: res.annualRate, frequency: res.frequencyLabel }),
        T('summary.apy', { apy: res.apyPercent }),
        T('summary.horizon', { years: res.tenureYears }),
        res.contributionAmount > 0 ? T('summary.contribution', { value: money(res.contributionAmount) }) : null,
        T('summary.totalPrincipal', { value: formattedPrin }),
        T('summary.totalInterest', { value: formattedInt }),
        T('summary.futureValue', { value: formattedBal })
      ].filter(Boolean).join('\n');

      saveState(rawP, rawR, rawY, freq, rawPmt);
    } catch (err) {
      showError(err.message, null);
    }
  }

  function populateBreakdownTable(yearlyData) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    yearlyData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${T('table.year', { year: row.year })}</td>
        <td>${money(row.annualDeposit)}</td>
        <td>${money(row.totalPrincipal)}</td>
        <td>${money(row.interestEarned)}</td>
        <td><strong>${money(row.balance)}</strong></td>
      `;
      fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
  }

  function debounceCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [principalInput, rateInput, yearsInput, contributionInput].forEach(inp => {
    if (inp) inp.addEventListener('input', debounceCalculate);
  });
  if (freqSelect) freqSelect.addEventListener('change', calculate);

  currencySelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      principalInput.value = '';
      rateInput.value = '';
      yearsInput.value = '';
      contributionInput.value = '';
      principalInput.focus();
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
