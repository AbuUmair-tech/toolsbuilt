/**
 * Date Difference Calculator UI Controller
 * Powered by DateDifferenceLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DateDifferenceLogic || window.DateDifferenceCalculatorLogic;
  const T = ToolsBuilt.scope('date-difference-calculator');
  const form = document.getElementById('calculator-form');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const includeEndCheckbox = document.getElementById('include-end-date');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:date-difference-calculator';
  let debounceTimer = null;
  let lastResultText = '';

  const today = new Date();
  const defaultStart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');

  const defaultEndObj = new Date(today);
  defaultEndObj.setDate(defaultEndObj.getDate() + 30);
  const defaultEnd = [
    defaultEndObj.getFullYear(),
    String(defaultEndObj.getMonth() + 1).padStart(2, '0'),
    String(defaultEndObj.getDate()).padStart(2, '0')
  ].join('-');

  function initInputs() {
    // Result links (?from=&to=&inc=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.start) startDateInput.value = data.start;
        if (data.end) endDateInput.value = data.end;
        if (typeof data.inc === 'boolean') includeEndCheckbox.checked = data.inc;
        return;
      }
    } catch (e) {}

    startDateInput.value = defaultStart;
    endDateInput.value = defaultEnd;
  }

  function saveState(start, end, inc) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ start, end, inc }));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    startDateInput.removeAttribute('aria-invalid');
    startDateInput.removeAttribute('aria-describedby');
    endDateInput.removeAttribute('aria-invalid');
    endDateInput.removeAttribute('aria-describedby');
  }

  function showError(msg, targetField) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (targetField) {
      targetField.setAttribute('aria-invalid', 'true');
      targetField.setAttribute('aria-describedby', 'error-box');
      targetField.focus();
    }
  }

  function calculate() {
    clearError();
    const rawStart = startDateInput.value;
    const rawEnd = endDateInput.value;
    const includeEnd = includeEndCheckbox.checked;

    if (!rawStart) {
      showError(T('errors.missingStart'), startDateInput);
      return;
    }
    if (!rawEnd) {
      showError(T('errors.missingEnd'), endDateInput);
      return;
    }

    try {
      const res = logic.calculateDateDifference(rawStart, rawEnd, { includeEndDate: includeEnd });
      renderResult(res);
      saveState(rawStart, rawEnd, includeEnd);
    } catch (err) {
      showError(err.message, startDateInput);
    }
  }

  function renderResult(res) {
    const numFormatter = new Intl.NumberFormat(ToolsBuilt.pageLocale('en-US'));
    const plural = (n) => (n === 1 ? 'one' : 'other');
    const primaryStr = T(`result.days.${plural(res.totalDays)}`, { n: numFormatter.format(res.totalDays) });
    const swapKey = res.isReversed ? 'Swapped' : '';

    lastResultText = T(`copy.result${swapKey}`, {
      total: primaryStr,
      business: numFormatter.format(res.businessDays),
      weeks: res.totalWeeks,
      weekDays: res.remainingDaysAfterWeeks,
      years: res.years,
      months: res.months,
      days: res.days
    });

    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statBusinessDays = document.getElementById('stat-business-days');
    const statYMD = document.getElementById('stat-ymd');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');

    resultHeader.textContent = T(`result.header${swapKey}`);
    resultPrimary.textContent = primaryStr;
    statTotalDays.textContent = T('stats.totalDays', { n: numFormatter.format(res.totalDays) });
    statBusinessDays.textContent = T('stats.businessDays', { n: numFormatter.format(res.businessDays), weekend: numFormatter.format(res.weekendDays) });
    statYMD.textContent = T('stats.ymd', { years: res.years, months: res.months, days: res.days });
    statWeeksDays.textContent = T('stats.weeksDays', {
      weeks: T(`stats.weeks.${plural(res.totalWeeks)}`, { n: res.totalWeeks }),
      days: T(`stats.days.${plural(res.remainingDaysAfterWeeks)}`, { n: res.remainingDaysAfterWeeks })
    });
    statMonthsDays.textContent = T('stats.totalHours', { n: numFormatter.format(res.totalHours) });

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  startDateInput.addEventListener('input', debouncedCalculate);
  endDateInput.addEventListener('input', debouncedCalculate);
  includeEndCheckbox.addEventListener('change', debouncedCalculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    startDateInput.value = defaultStart;
    endDateInput.value = defaultEnd;
    includeEndCheckbox.checked = false;
    clearError();
    saveState(defaultStart, defaultEnd, false);
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, T('copy.toast'));
      }
    });
  }

  initInputs();
  calculate();
});
