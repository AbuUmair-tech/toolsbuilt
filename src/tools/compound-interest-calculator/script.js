/**
 * Compound Interest Calculator UI Controller
 * Powered by CompoundInterestLogic pure module.
 * Debounced live calculation, inline SVG growth chart rendering, URL query sync, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.CompoundInterestLogic;
  if (!logic) return;

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
  let debounceTimer = null;
  let lastResultSummary = '';

  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const urlP = params.get('p');
    const urlR = params.get('r');
    const urlY = params.get('y');
    const urlF = params.get('f');
    const urlPmt = params.get('pmt');

    if (urlP) {
      principalInput.value = urlP;
      if (urlR) rateInput.value = urlR;
      if (urlY) yearsInput.value = urlY;
      if (urlF) freqSelect.value = urlF;
      if (urlPmt) contributionInput.value = urlPmt;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.p) principalInput.value = data.p;
        if (data.r) rateInput.value = data.r;
        if (data.y) yearsInput.value = data.y;
        if (data.f) freqSelect.value = data.f;
        if (data.pmt) contributionInput.value = data.pmt;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ p, r, y, f, pmt }));
    } catch (e) {}

    const url = new URL(window.location.href);
    if (p && p !== '10000') url.searchParams.set('p', p); else url.searchParams.delete('p');
    if (r && r !== '7') url.searchParams.set('r', r); else url.searchParams.delete('r');
    if (y && y !== '10') url.searchParams.set('y', y); else url.searchParams.delete('y');
    if (f && f !== 'annual') url.searchParams.set('f', f); else url.searchParams.delete('f');
    if (pmt) url.searchParams.set('pmt', pmt); else url.searchParams.delete('pmt');
    window.history.replaceState({}, '', url.toString());
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
      showError('Please enter an initial principal amount (0 or greater).', principalInput);
      return;
    }
    if (parseFloat(rawP) < 0) {
      showError('Initial principal cannot be negative.', principalInput);
      return;
    }
    if (rawR === '' || isNaN(parseFloat(rawR))) {
      showError('Please enter an annual interest rate.', rateInput);
      return;
    }
    if (parseFloat(rawR) < 0) {
      showError('Interest rate cannot be negative.', rateInput);
      return;
    }
    if (!rawY || isNaN(parseFloat(rawY))) {
      showError('Please enter investment duration in years.', yearsInput);
      return;
    }
    if (parseFloat(rawY) <= 0) {
      showError('Duration must be greater than zero.', yearsInput);
      return;
    }
    if (rawPmt && (isNaN(parseFloat(rawPmt)) || parseFloat(rawPmt) < 0)) {
      showError('Contribution amount must be 0 or greater.', contributionInput);
      return;
    }
    if (parseFloat(rawP) === 0 && (!rawPmt || parseFloat(rawPmt) === 0)) {
      showError('Please enter an initial principal or a regular contribution amount.', principalInput);
      return;
    }

    try {
      const res = logic.calculateCompoundInterest(rawP, rawR, rawY, freq, {
        contributionAmount: rawPmt ? parseFloat(rawPmt) : 0,
        currencySymbol: '$'
      });

      const formattedBal = logic.formatCurrency(res.finalBalance);
      const formattedPrin = logic.formatCurrency(res.totalPrincipal);
      const formattedInt = logic.formatCurrency(res.totalInterest);

      resultPrimary.textContent = `Future Value: ${formattedBal}`;
      statFinalBalance.textContent = formattedBal;
      statTotalPrincipal.textContent = formattedPrin;
      statTotalInterest.textContent = formattedInt;
      statApy.textContent = `${res.apyPercent}% APY`;

      // Render SVG Growth Chart
      if (chartContainer) {
        chartContainer.innerHTML = logic.generateSvgGrowthChart(res.yearlyData, '$');
      }

      // Populate Table
      populateBreakdownTable(res.yearlyData);

      resultBox.classList.add('is-visible');
      if (actionsBar) actionsBar.removeAttribute('hidden');

      lastResultSummary = [
        `Compound Interest Growth Summary:`,
        `Initial Principal: ${logic.formatCurrency(res.initialPrincipal)}`,
        `Interest Rate: ${res.annualRate}% (Compounded ${res.frequencyLabel})`,
        `Effective APY: ${res.apyPercent}%`,
        `Time Horizon: ${res.tenureYears} Years`,
        res.contributionAmount > 0 ? `Monthly Contribution: ${logic.formatCurrency(res.contributionAmount)}` : null,
        `Total Principal Invested: ${formattedPrin}`,
        `Total Compound Interest Earned: ${formattedInt}`,
        `Ending Future Value: ${formattedBal}`
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
        <td>Year ${row.year}</td>
        <td>$${row.annualDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>$${row.totalPrincipal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>$${row.interestEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td><strong>$${row.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
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
        if (window.showTbToast) window.showTbToast('Compound interest calculation copied to clipboard!');
      }).catch(() => {});
    });
  }

  initInputs();
  calculate();
});
