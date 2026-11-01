/**
 * Pakistan Salary Tax Calculator UI Controller
 * Powered by PakistanSalaryTaxLogic pure module.
 * Debounced live calculation, shareable result links, localStorage, slab highlighting and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PakistanSalaryTaxLogic;
  const T = ToolsBuilt.scope('pakistan-salary-tax-calculator');
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
      showError(T('errors.salaryRequired'));
      return;
    }
    const salary = Number(raw);
    if (!isFinite(salary)) {
      showError(T('errors.salaryNumber'));
      return;
    }
    if (salary < 0) {
      showError(T('errors.salaryNegative'));
      return;
    }
    if (period === 'monthly' && salary > 0 && salary < 1000) {
      showError(T('errors.salaryTooSmall'));
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
    return slab.upTo === null ? T('slab.above', { over: fmt(slab.over) }) : T('slab.range', { from: fmt(slab.over === 0 ? 0 : slab.over + 1), to: fmt(slab.upTo) });
  }

  function comparisonText(res) {
    const saving = Math.round(res.comparison.monthlySaving);
    const { newerYear, olderYear } = res.comparison;
    if (saving > 0) return T('comparison.save', { amount: fmt(saving), newer: newerYear, older: olderYear });
    if (saving < 0) return T('comparison.more', { amount: fmt(-saving), newer: newerYear, older: olderYear });
    return T('comparison.same', { newer: newerYear, older: olderYear });
  }

  function renderResult(res) {
    const rate = `${Math.round(res.marginalRate * 100)}%`;
    const effective = `${res.effectiveRate.toFixed(2)}%`;

    document.getElementById('result-header-text').textContent = T('result.header', { year: res.taxYear.replace('-', '\u2011') }); // keep the year on one line
    document.getElementById('result-primary-text').textContent = fmt(res.monthlyTakeHome);
    document.getElementById('result-comparison').textContent = comparisonText(res);
    document.getElementById('stat-monthly-tax').textContent = fmt(res.monthlyTax);
    document.getElementById('stat-monthly-takehome').textContent = fmt(res.monthlyTakeHome);
    document.getElementById('stat-annual-income').textContent = fmt(res.annualIncome);
    document.getElementById('stat-annual-tax').textContent = fmt(res.annualTax);
    document.getElementById('stat-effective-rate').textContent = effective;
    document.getElementById('stat-slab').textContent = rate;
    document.getElementById('stat-slab-range').textContent = slabText(res.slab);

    let steps = T('steps.income', { income: fmt(res.annualIncome) });
    if (res.period === 'monthly') steps += T('steps.monthly', { monthly: fmt(res.monthlyIncome) });
    steps += T('steps.slab', { slab: slabText(res.slab), rate, over: fmt(res.slab.over) });
    if (res.slab.rate > 0) {
      steps += T('steps.tax', { fixed: fmt(res.slab.fixed), rate, income: fmt(res.annualIncome), over: fmt(res.slab.over), tax: fmt(res.baseTax) });
    } else {
      steps += T('steps.taxZero');
    }
    if (res.surcharge > 0) {
      steps += T('steps.surcharge', { above: fmt(logic.TAX_TABLES[res.taxYear].surcharge.incomeAbove), surcharge: fmt(res.surcharge) });
    }
    steps += T('steps.monthlyTax', { annual: fmt(res.annualTax), monthly: fmt(res.monthlyTax) });
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = T('result.copy', {
      year: res.taxYear, income: fmt(res.annualIncome), annualTax: fmt(res.annualTax), monthlyTax: fmt(res.monthlyTax),
      takeHome: fmt(res.monthlyTakeHome), effective, rate, comparison: comparisonText(res)
    });

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
        window.ToolsBuilt.copy(lastResultText, T('toast.copied'));
      }
    });
  }

  initInputs();
  calculate();
});
