/**
 * Loan EMI Calculator UI Controller
 * Powered by LoanEmiLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and client-side CSV download.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.LoanEmiLogic;
  if (!logic) return;

  const form = document.getElementById('calculator-form');
  const amountInput = document.getElementById('loan-amount');
  const rateInput = document.getElementById('interest-rate');
  const tenureInput = document.getElementById('tenure-value');
  const tenureUnitSelect = document.getElementById('tenure-unit');
  const extraInput = document.getElementById('extra-payment');
  const currencySelect = document.getElementById('currency-select');
  const resetBtn = document.getElementById('reset-btn');
  const downloadCsvBtn = document.getElementById('download-csv-btn');
  const copyBtn = document.getElementById('copy-result-btn');

  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const actionsBar = document.getElementById('result-actions-bar');

  // Result displays
  const statMonthlyEmi = document.getElementById('stat-monthly-emi');
  const statTotalInterest = document.getElementById('stat-total-interest');
  const statTotalPayment = document.getElementById('stat-total-payment');
  const statTenure = document.getElementById('stat-tenure');
  const resultPrimary = document.getElementById('result-primary-text');
  const extraCard = document.getElementById('extra-savings-card');
  const statExtraSaved = document.getElementById('stat-extra-saved');
  const statMonthsSaved = document.getElementById('stat-months-saved');
  const statNewTenure = document.getElementById('stat-new-tenure');
  const scheduleTableBody = document.getElementById('amortization-table-body');
  const tableCurrencyLabels = document.querySelectorAll('.table-currency-symbol');

  const STORAGE_KEY = 'toolsbuilt:loan-emi-calculator';
  let debounceTimer = null;
  let currentSchedule = [];
  let currentCurrencySymbol = '$';
  let lastResultSummary = '';

  function initInputs() {
    // Result links (?amount=&rate=&tenure=&unit=&extra=&cur=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.amount) amountInput.value = data.amount;
        if (data.rate) rateInput.value = data.rate;
        if (data.tenure) tenureInput.value = data.tenure;
        if (data.unit) tenureUnitSelect.value = data.unit;
        if (data.extra) extraInput.value = data.extra;
        if (data.cur && currencySelect) currencySelect.value = data.cur;
        return;
      }
    } catch (e) {}

    // Default sample values: $250,000 at 6.5% for 30 years
    amountInput.value = '250000';
    rateInput.value = '6.5';
    tenureInput.value = '30';
    tenureUnitSelect.value = 'years';
    extraInput.value = '';
    if (currencySelect) currencySelect.value = 'USD';
  }

  function saveState(amount, rate, tenure, unit, extra, cur) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ amount, rate, tenure, unit, extra, cur }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    [amountInput, rateInput, tenureInput, extraInput].forEach(inp => {
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
    const rawAmt = amountInput.value.trim();
    const rawRate = rateInput.value.trim();
    const rawTenure = tenureInput.value.trim();
    const tenureUnit = tenureUnitSelect.value;
    const rawExtra = extraInput.value.trim();
    const curCode = currencySelect ? currencySelect.value : 'USD';

    if (!rawAmt || isNaN(parseFloat(rawAmt))) {
      showError('Please enter a valid loan amount.', amountInput);
      return;
    }
    if (parseFloat(rawAmt) <= 0) {
      showError('Loan amount must be greater than zero.', amountInput);
      return;
    }
    if (!rawRate || isNaN(parseFloat(rawRate))) {
      showError('Please enter an annual interest rate.', rateInput);
      return;
    }
    if (parseFloat(rawRate) < 0) {
      showError('Interest rate cannot be negative.', rateInput);
      return;
    }
    if (!rawTenure || isNaN(parseFloat(rawTenure))) {
      showError('Please enter loan tenure.', tenureInput);
      return;
    }
    if (parseFloat(rawTenure) <= 0) {
      showError('Tenure must be greater than zero.', tenureInput);
      return;
    }
    if (rawExtra && (isNaN(parseFloat(rawExtra)) || parseFloat(rawExtra) < 0)) {
      showError('Extra monthly payment must be 0 or greater.', extraInput);
      return;
    }

    try {
      const res = logic.calculateLoanEmi(rawAmt, rawRate, rawTenure, tenureUnit, {
        extraMonthlyPayment: rawExtra ? parseFloat(rawExtra) : 0,
        currencyCode: curCode
      });

      currentCurrencySymbol = res.currencySymbol;
      currentSchedule = res.extra ? res.extra.schedule : res.schedule;

      // Update Currency symbols in table header
      tableCurrencyLabels.forEach(el => {
        el.textContent = `(${res.currencySymbol})`;
      });

      // Update primary and stat values
      const formattedEmi = logic.formatCurrency(res.monthlyEmi, curCode);
      const formattedTotalPay = logic.formatCurrency(res.totalPayment, curCode);
      const formattedTotalInt = logic.formatCurrency(res.totalInterest, curCode);

      resultPrimary.textContent = `Monthly EMI: ${formattedEmi}`;
      statMonthlyEmi.textContent = formattedEmi;
      statTotalPayment.textContent = formattedTotalPay;
      statTotalInterest.textContent = formattedTotalInt;
      statTenure.textContent = `${res.tenureMonths} Months (${res.tenureYears} yrs)`;

      // Extra payment card
      if (res.extra && res.extra.extraMonthlyPayment > 0) {
        extraCard.classList.remove('hidden');
        statExtraSaved.textContent = logic.formatCurrency(res.extra.interestSaved, curCode);
        statMonthsSaved.textContent = `${res.extra.monthsSaved} Months (${logic.roundCents(res.extra.monthsSaved / 12)} yrs)`;
        statNewTenure.textContent = `${res.extra.payoffMonths} Months (down from ${res.tenureMonths})`;
      } else {
        extraCard.classList.add('hidden');
      }

      // Populate Amortization Table
      populateAmortizationTable(currentSchedule, curCode);

      // Make result visible
      resultBox.classList.add('is-visible');
      if (actionsBar) actionsBar.removeAttribute('hidden');

      // Update copy summary text
      lastResultSummary = [
        `Loan EMI Calculation Summary:`,
        `Principal Amount: ${logic.formatCurrency(res.principal, curCode)}`,
        `Interest Rate: ${res.annualRate}%`,
        `Tenure: ${res.tenureMonths} months (${res.tenureYears} years)`,
        `Monthly EMI: ${formattedEmi}`,
        `Total Interest: ${formattedTotalInt}`,
        `Total Payment: ${formattedTotalPay}`
      ];
      if (res.extra && res.extra.extraMonthlyPayment > 0) {
        lastResultSummary.push(
          `Extra Monthly Payment: ${logic.formatCurrency(res.extra.extraMonthlyPayment, curCode)}`,
          `Months Saved: ${res.extra.monthsSaved} months`,
          `Interest Saved: ${logic.formatCurrency(res.extra.interestSaved, curCode)}`,
          `New Payoff Duration: ${res.extra.payoffMonths} months`
        );
      }
      lastResultSummary = lastResultSummary.join('\n');

      saveState(rawAmt, rawRate, rawTenure, tenureUnit, rawExtra, curCode);
    } catch (err) {
      showError(err.message, null);
    }
  }

  function populateAmortizationTable(schedule, curCode) {
    if (!scheduleTableBody) return;
    scheduleTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    schedule.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.month}</td>
        <td>${row.payment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${row.principal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${row.interest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${row.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${row.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      `;
      fragment.appendChild(tr);
    });

    scheduleTableBody.appendChild(fragment);
  }

  function downloadCsv() {
    if (!currentSchedule || currentSchedule.length === 0) return;
    const csvContent = logic.generateAmortizationCsv(currentSchedule, currentCurrencySymbol);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'loan-amortization-schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function debounceCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  // Listeners
  [amountInput, rateInput, tenureInput, extraInput].forEach(inp => {
    if (inp) inp.addEventListener('input', debounceCalculate);
  });
  if (tenureUnitSelect) tenureUnitSelect.addEventListener('change', calculate);
  if (currencySelect) currencySelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      amountInput.value = '';
      rateInput.value = '';
      tenureInput.value = '';
      extraInput.value = '';
      amountInput.focus();
      clearError();
      resultBox.classList.remove('is-visible');
      if (actionsBar) actionsBar.setAttribute('hidden', '');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      window.history.replaceState({}, '', window.location.pathname);
    });
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', downloadCsv);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!lastResultSummary) return;
      navigator.clipboard.writeText(lastResultSummary).then(() => {
        if (window.showTbToast) window.showTbToast('Loan calculation copied to clipboard!');
      }).catch(() => {});
    });
  }

  // Initial load
  initInputs();
  calculate();
});
