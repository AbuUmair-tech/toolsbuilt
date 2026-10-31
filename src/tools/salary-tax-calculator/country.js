/**
 * Salary Tax Calculator (country pages) UI Controller
 * Powered by SalaryTaxEngine and the country dataset embedded as #tax-datasets.
 * Monthly / annual input, filing status, step-by-step breakdown, band highlighting,
 * shareable result links, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const engine = window.SalaryTaxEngine;
  const dataset = (() => {
    try { return JSON.parse(document.getElementById('tax-datasets').textContent)[0]; } catch (e) { return null; }
  })();
  if (!engine || !dataset) return;

  const form = document.getElementById('calculator-form');
  const salaryInput = document.getElementById('salary-amount');
  const periodInputs = document.querySelectorAll('input[name="salary-period"]');
  const statusSelect = document.getElementById('filing-status');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = `toolsbuilt:${dataset.page.slug}`;
  const DEFAULTS = {
    salary: String(dataset.page.defaultSalary),
    period: dataset.page.defaultPeriod || 'monthly',
    status: dataset.defaultStatus || ''
  };
  const money = (n) => ToolsBuilt.money(n, dataset.currency);
  const pct = (rate) => `${Number((rate * 100).toFixed(4))}%`;
  let debounceTimer = null;
  let lastResultText = '';

  const getPeriod = () => (Array.from(periodInputs).find(i => i.checked) || {}).value || 'monthly';
  const setPeriod = (value) => periodInputs.forEach(i => { i.checked = i.value === value; });

  function applyValues(v) {
    salaryInput.value = v.salary;
    setPeriod(v.period);
    if (statusSelect && v.status) statusSelect.value = v.status;
  }

  function initInputs() {
    // Result links (?salary=&period=&status=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) return;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        salary: salaryInput.value.trim(), period: getPeriod(), status: statusSelect ? statusSelect.value : ''
      }));
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
    salaryInput.setAttribute('aria-invalid', 'true');
    highlight(null);
  }

  function highlight(index) {
    const status = statusSelect ? statusSelect.value : 'all';
    document.querySelectorAll('.slab-table-block').forEach(block => {
      if (statusSelect) block.hidden = block.dataset.status !== status;
      block.querySelectorAll('tr[data-slab]').forEach(tr => {
        const current = index !== null && block.dataset.status === status && Number(tr.dataset.slab) === index;
        tr.classList.toggle('is-current', current);
        if (current) tr.setAttribute('aria-current', 'true');
        else tr.removeAttribute('aria-current');
      });
    });
  }

  function calculate(fromSubmit) {
    clearError();
    const raw = salaryInput.value.trim();
    if (!raw) {
      if (fromSubmit === true) showError('Please enter your salary.');
      else { resultBox.classList.remove('is-visible'); highlight(null); }
      return;
    }
    try {
      const res = engine.calculateSalary(dataset, raw, getPeriod(), { status: statusSelect ? statusSelect.value : undefined });
      renderResult(res);
      saveState();
    } catch (err) {
      showError(err.message);
    }
  }

  function renderResult(res) {
    document.getElementById('result-primary-text').textContent = `${money(res.annualTax)} a year`;
    document.getElementById('stat-monthly-tax').textContent = money(res.monthlyTax);
    document.getElementById('stat-monthly-takehome').textContent = money(res.monthlyTakeHome);
    document.getElementById('stat-taxable').textContent = money(res.taxableIncome);
    document.getElementById('stat-annual-tax').textContent = money(res.annualTax);
    document.getElementById('stat-effective-rate').textContent = `${res.effectiveRate.toFixed(2)}%`;
    document.getElementById('stat-slab').textContent = pct(res.marginalRate);

    const steps = [];
    steps.push(`Annual gross salary: <code>${money(res.annualIncome)}</code>`);
    res.deductions.forEach(d => steps.push(`Less ${d.label.toLowerCase()}: <code>${money(d.amount)}</code>`));
    steps.push(`Taxable income: <strong>${money(res.taxableIncome)}</strong>`);
    const slabs = res.slabs.filter(s => res.taxableIncome > s.over && s.rate > 0);
    slabs.forEach(s => {
      const top = s.upTo === null ? res.taxableIncome : Math.min(s.upTo, res.taxableIncome);
      steps.push(`${pct(s.rate)} on ${money(top - s.over)} (${money(s.over)} to ${money(top)}): <code>${money((top - s.over) * s.rate)}</code>`);
    });
    steps.push(`Tax from the bands: <code>${money(res.grossTax)}</code>`);
    if (res.rebate) steps.push(`Less ${dataset.rebate.label || 'rebate'}: <code>${money(res.rebate)}</code>`);
    if (res.surcharge) steps.push(`Plus surcharge: <code>${money(res.surcharge)}</code>`);
    if (res.cess) steps.push(`Plus ${dataset.cess.label || 'cess'} (${pct(dataset.cess.rate)}): <code>${money(res.cess)}</code>`);
    steps.push(`Annual income tax: <strong>${money(res.annualTax)}</strong>, or ${money(res.monthlyTax)} a month`);
    document.getElementById('formula-breakdown-box').innerHTML = steps.join('<br>');

    lastResultText = `${dataset.countryName} income tax (${dataset.label}) on ${money(res.annualIncome)} a year: ${money(res.annualTax)} a year (${money(res.monthlyTax)} a month), take-home ${money(res.monthlyTakeHome)} a month, effective rate ${res.effectiveRate.toFixed(2)}%.`;
    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    highlight(res.slabIndex);
    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  salaryInput.addEventListener('input', debouncedCalculate);
  periodInputs.forEach(el => el.addEventListener('change', calculate));
  if (statusSelect) statusSelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate(true);
  });

  resetBtn.addEventListener('click', () => {
    applyValues(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Tax calculation copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
