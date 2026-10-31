/**
 * Salary to Hourly Calculator UI Controller
 * Powered by SalaryToHourlyLogic. Converts any pay period to all the others,
 * with currency formatting via ToolsBuilt.money and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.SalaryToHourlyLogic;
  const form = document.getElementById('calculator-form');
  const amountInput = document.getElementById('amount');
  const periodSelect = document.getElementById('period');
  const currencySelect = document.getElementById('currency');
  const hoursInput = document.getElementById('hours');
  const daysInput = document.getElementById('days');
  const weeksInput = document.getElementById('weeks');
  const unpaidInput = document.getElementById('unpaid');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('result-note');
  const rowsBody = document.getElementById('salary-rows');

  const FIELDS = { amount: amountInput, period: periodSelect, hours: hoursInput, days: daysInput, weeks: weeksInput, unpaid: unpaidInput };
  const ROWS = [
    ['annual', 'Annual'],
    ['monthly', 'Monthly'],
    ['biweekly', 'Bi-weekly (every 2 weeks)'],
    ['weekly', 'Weekly'],
    ['daily', 'Daily'],
    ['hourly', 'Hourly']
  ];
  const DEFAULTS = { amount: '52000', period: 'annual', hours: '40', days: '5', weeks: '52', unpaid: '0' };
  let debounceTimer = null;

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    Object.values(FIELDS).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
  }

  function showError(message, field) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-errormessage', 'error-box');
    }
  }

  function calculate() {
    clearError();
    const res = logic.convertPay({
      amount: amountInput.value,
      period: periodSelect.value,
      hoursPerWeek: hoursInput.value,
      daysPerWeek: daysInput.value,
      weeksPerYear: weeksInput.value,
      unpaidWeeks: unpaidInput.value
    });
    if (res.error) return showError(res.error, FIELDS[res.field]);

    const cur = currencySelect.value;
    const money = (n) => ToolsBuilt.money(n, cur);
    // Headline the conversion people usually want: salary -> hourly, anything else -> annual
    const headline = res.input.period === 'hourly' ? 'annual' : 'hourly';
    headerText.textContent = headline === 'hourly' ? 'Hourly rate' : 'Annual salary';
    primaryText.textContent = `${money(res[headline])} ${logic.PERIOD_LABELS[headline]}`;

    rowsBody.replaceChildren(...ROWS.map(([key, label]) => {
      const tr = document.createElement('tr');
      if (key === res.input.period) tr.className = 'is-input';
      const name = document.createElement('td');
      name.textContent = key === res.input.period ? `${label} (entered)` : label;
      const value = document.createElement('td');
      value.textContent = money(res[key]);
      tr.append(name, value);
      return tr;
    }));

    const hrs = Number(res.hoursPerYear.toFixed(2)).toLocaleString('en-US');
    noteText.textContent = `Based on ${res.hoursPerWeek} hours × ${res.paidWeeks} paid weeks = ${hrs} hours a year, and ${res.daysPerWeek} days a week. Gross pay, before tax.`;

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = ROWS.map(([key, label]) => `${label}: ${money(res[key])}`).join('\n');

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [amountInput, hoursInput, daysInput, weeksInput, unpaidInput].forEach(el => el.addEventListener('input', debounced));
  [periodSelect, currencySelect].forEach(el => el.addEventListener('change', calculate));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([key, value]) => { FIELDS[key].value = value; });
    currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
    calculate();
  });

  currencySelect.value = ToolsBuilt.defaultCurrency('USD', currencySelect);
  ToolsBuilt.resultLink.restore();
  calculate();
});
