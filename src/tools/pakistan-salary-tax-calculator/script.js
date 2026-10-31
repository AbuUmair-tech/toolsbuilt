/**
 * Pakistan Salary Tax Calculator UI Controller
 * Powered by PakistanSalaryTaxLogic pure module.
 * Debounced live calculation, shareable result links, localStorage, slab highlighting and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PakistanSalaryTaxLogic;
  const form = document.getElementById('calculator-form');
  const salaryInput = document.getElementById('salary-amount');
  const periodInputs = document.querySelectorAll('input[name="salary-period"]');
  const yearSelect = document.getElementById('tax-year');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const fmt = logic.formatPkr;

  const STORAGE_KEY = 'toolsbuilt:pakistan-salary-tax-calculator';
  const DEFAULT_SALARY = '100000';
  let debounceTimer = null;
  let lastResultText = '';

  function getPeriod() {
    const checked = Array.from(periodInputs).find(i => i.checked);
    return checked ? checked.value : 'monthly';
  }

  function setPeriod(value) {
    periodInputs.forEach(i => { i.checked = i.value === value; });
  }

  function initInputs() {
    // Result links (?salary=&period=&year=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.salary) salaryInput.value = data.salary;
        if (data.period) setPeriod(data.period);
        if (data.year && logic.TAX_TABLES[data.year]) yearSelect.value = data.year;
        return;
      }
    } catch (e) {}

    salaryInput.value = DEFAULT_SALARY;
  }

  function saveState(salary, period, year) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ salary, period, year }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    salaryInput.removeAttribute('aria-invalid');
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    highlightSlab(null, null);
    salaryInput.setAttribute('aria-invalid', 'true');
  }

  function calculate() {
    clearError();
    const raw = salaryInput.value.replace(/,/g, '').trim();
    const period = getPeriod();
    const year = yearSelect.value;

    if (!raw) {
      showError('Please enter your salary in rupees.');
      return;
    }
    const salary = Number(raw);
    if (!isFinite(salary)) {
      showError('Please enter the salary as a number, for example 150000.');
      return;
    }
    if (salary < 0) {
      showError('Salary cannot be negative.');
      return;
    }
    if (period === 'monthly' && salary > 0 && salary < 1000) {
      showError('That looks too small for a monthly salary. Enter the full amount in rupees, for example 150000.');
      return;
    }

    try {
      const res = logic.calculateSalaryTax(salary, period, year);
      renderResult(res);
      saveState(raw, period, year);
    } catch (err) {
      showError(err.message);
    }
  }

  function slabText(slab) {
    return slab.upTo === null ? `Above ${fmt(slab.over)}` : `${fmt(slab.over === 0 ? 0 : slab.over + 1)} to ${fmt(slab.upTo)}`;
  }

  function comparisonText(res) {
    const saving = Math.round(res.comparison.monthlySaving);
    const { newerYear, olderYear } = res.comparison;
    if (saving > 0) return `You save ${fmt(saving)} per month in ${newerYear} compared to ${olderYear}.`;
    if (saving < 0) return `You pay ${fmt(-saving)} more per month in ${newerYear} compared to ${olderYear}.`;
    return `Your tax is the same in ${newerYear} and ${olderYear}.`;
  }

  function renderResult(res) {
    const rate = `${Math.round(res.marginalRate * 100)}%`;
    const effective = `${res.effectiveRate.toFixed(2)}%`;

    document.getElementById('result-header-text').textContent = `Monthly take-home salary, ${res.taxYear.replace('-', '\u2011')}`; // keep the year on one line
    document.getElementById('result-primary-text').textContent = fmt(res.monthlyTakeHome);
    document.getElementById('result-comparison').textContent = comparisonText(res);
    document.getElementById('stat-monthly-tax').textContent = fmt(res.monthlyTax);
    document.getElementById('stat-monthly-takehome').textContent = fmt(res.monthlyTakeHome);
    document.getElementById('stat-annual-income').textContent = fmt(res.annualIncome);
    document.getElementById('stat-annual-tax').textContent = fmt(res.annualTax);
    document.getElementById('stat-effective-rate').textContent = effective;
    document.getElementById('stat-slab').textContent = rate;
    document.getElementById('stat-slab-range').textContent = slabText(res.slab);

    let steps = `1. Annual taxable income: <code>${fmt(res.annualIncome)}</code>`;
    if (res.period === 'monthly') steps += ` (${fmt(res.monthlyIncome)} × 12)`;
    steps += `<br>2. Slab: <code>${slabText(res.slab)}</code>, ${rate} on income above ${fmt(res.slab.over)}`;
    if (res.slab.rate > 0) {
      steps += `<br>3. Tax: ${fmt(res.slab.fixed)} + ${rate} × (${fmt(res.annualIncome)} − ${fmt(res.slab.over)}) = <code>${fmt(res.baseTax)}</code>`;
    } else {
      steps += '<br>3. Tax: <code>Rs 0</code> (below the taxable threshold)';
    }
    if (res.surcharge > 0) {
      steps += `<br>4. Surcharge (9% of tax above ${fmt(logic.TAX_TABLES[res.taxYear].surcharge.incomeAbove)}): <code>${fmt(res.surcharge)}</code>`;
    }
    steps += `<br>Monthly tax: ${fmt(res.annualTax)} ÷ 12 = <strong>${fmt(res.monthlyTax)}</strong>`;
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = `Pakistan salary tax ${res.taxYear}: annual taxable income ${fmt(res.annualIncome)}, annual tax ${fmt(res.annualTax)}, ` +
      `monthly tax ${fmt(res.monthlyTax)}, monthly take-home ${fmt(res.monthlyTakeHome)}, effective rate ${effective}, ${rate} slab. ${comparisonText(res)}`;

    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    highlightSlab(res.taxYear, res.slabIndex);
    resultBox.classList.add('is-visible');
  }

  // Show the selected year's slab table and mark the visitor's row
  function highlightSlab(year, slabIndex) {
    document.querySelectorAll('.slab-table-block').forEach(block => {
      const isYear = block.dataset.year === (year || yearSelect.value);
      block.hidden = !isYear;
      block.querySelectorAll('tr[data-slab]').forEach(row => {
        const isCurrent = isYear && slabIndex !== null && Number(row.dataset.slab) === slabIndex;
        row.classList.toggle('is-current', isCurrent);
        if (isCurrent) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
      });
    });
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  salaryInput.addEventListener('input', debouncedCalculate);
  periodInputs.forEach(i => i.addEventListener('change', calculate));
  yearSelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    salaryInput.value = DEFAULT_SALARY;
    setPeriod('monthly');
    yearSelect.value = logic.TAX_YEAR;
    clearError();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Salary tax result copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
