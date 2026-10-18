/**
 * Date Difference Calculator UI Controller
 * Powered by DateDifferenceLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DateDifferenceLogic || window.DateDifferenceCalculatorLogic;
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
    const params = new URLSearchParams(window.location.search);
    const urlStart = params.get('start');
    const urlEnd = params.get('end');
    const urlInc = params.get('inc');

    if (urlStart && urlEnd) {
      startDateInput.value = urlStart;
      endDateInput.value = urlEnd;
      includeEndCheckbox.checked = (urlInc === '1' || urlInc === 'true');
      return;
    }

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

    const url = new URL(window.location.href);
    if (start && start !== defaultStart) {
      url.searchParams.set('start', start);
    } else {
      url.searchParams.delete('start');
    }
    if (end && end !== defaultEnd) {
      url.searchParams.set('end', end);
    } else {
      url.searchParams.delete('end');
    }
    if (inc) {
      url.searchParams.set('inc', '1');
    } else {
      url.searchParams.delete('inc');
    }
    window.history.replaceState({}, '', url.toString());
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
      showError('Please select a valid start date.', startDateInput);
      return;
    }
    if (!rawEnd) {
      showError('Please select a valid end date.', endDateInput);
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
    const numFormatter = new Intl.NumberFormat('en-US');
    const primaryStr = `${numFormatter.format(res.totalDays)} Day${res.totalDays === 1 ? '' : 's'}`;
    const swapNotice = res.isReversed ? ' (Dates automatically ordered start to end)' : '';
    
    lastResultText = `Total Duration: ${primaryStr}${swapNotice}. Working Business Days: ${numFormatter.format(res.businessDays)} days. Equivalent: ${res.totalWeeks}w ${res.remainingDaysAfterWeeks}d (${res.years}y ${res.months}m ${res.days}d).`;

    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statBusinessDays = document.getElementById('stat-business-days');
    const statYMD = document.getElementById('stat-ymd');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');

    resultHeader.textContent = `Date Span Difference${swapNotice}`;
    resultPrimary.textContent = primaryStr;
    statTotalDays.textContent = `${numFormatter.format(res.totalDays)} Days`;
    statBusinessDays.textContent = `${numFormatter.format(res.businessDays)} Business Days (${numFormatter.format(res.weekendDays)} Weekend Days)`;
    statYMD.textContent = `${res.years} Years, ${res.months} Months, ${res.days} Days`;
    statWeeksDays.textContent = `${res.totalWeeks} Week${res.totalWeeks === 1 ? '' : 's'}, ${res.remainingDaysAfterWeeks} Day${res.remainingDaysAfterWeeks === 1 ? '' : 's'}`;
    statMonthsDays.textContent = `${numFormatter.format(res.totalHours)} Total Hours`;

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
        window.ToolsBuilt.copy(lastResultText, 'Date difference copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
