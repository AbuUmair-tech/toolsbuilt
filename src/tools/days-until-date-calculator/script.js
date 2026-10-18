/**
 * Days Until Date Calculator UI Controller
 * Powered by DaysUntilLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DaysUntilLogic;
  const form = document.getElementById('calculator-form');
  const targetDateInput = document.getElementById('target-date');
  const eventNameInput = document.getElementById('event-name');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:days-until-date-calculator';
  let debounceTimer = null;
  let lastResultText = '';

  // Get tomorrow as default date string in local calendar
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7); // Default 1 week out
  const defaultTargetStr = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0')
  ].join('-');

  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const urlDate = params.get('date');
    const urlEvent = params.get('event');

    if (urlDate) {
      targetDateInput.value = urlDate;
      if (urlEvent) eventNameInput.value = urlEvent;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.date) targetDateInput.value = data.date;
        if (data.event) eventNameInput.value = data.event;
        return;
      }
    } catch (e) {}

    targetDateInput.value = defaultTargetStr;
  }

  function saveState(date, event) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, event }));
    } catch (e) {}

    const url = new URL(window.location.href);
    if (date && date !== defaultTargetStr) {
      url.searchParams.set('date', date);
    } else {
      url.searchParams.delete('date');
    }
    if (event) {
      url.searchParams.set('event', event);
    } else {
      url.searchParams.delete('event');
    }
    window.history.replaceState({}, '', url.toString());
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    targetDateInput.removeAttribute('aria-invalid');
    targetDateInput.removeAttribute('aria-describedby');
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    targetDateInput.setAttribute('aria-invalid', 'true');
    targetDateInput.setAttribute('aria-describedby', 'error-box');
  }

  function calculate() {
    clearError();
    const rawDate = targetDateInput.value;
    const eventName = eventNameInput.value.trim();

    if (!rawDate) {
      showError('Please select a valid target date.');
      return;
    }

    try {
      const res = logic.calculateDaysUntil(rawDate);
      renderResult(res, eventName);
      saveState(rawDate, eventName);
    } catch (err) {
      showError(err.message);
    }
  }

  function renderResult(res, eventName) {
    const numFormatter = new Intl.NumberFormat('en-US');
    const titleSubject = eventName ? eventName : 'Target Date';
    let primaryStr = '';

    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');
    const statWeekday = document.getElementById('stat-weekday');

    if (res.isToday) {
      resultHeader.textContent = 'Event Status';
      primaryStr = `Today is the day! (${titleSubject})`;
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = '0 Days';
      statWeeksDays.textContent = '0 weeks, 0 days';
      statMonthsDays.textContent = '0 months, 0 days';
      lastResultText = `${primaryStr} - ${res.weekdayName}, ${res.formattedDate}`;
    } else if (res.isPast) {
      resultHeader.textContent = 'Elapsed Time Calculation';
      const absDays = Math.abs(res.totalDays);
      primaryStr = `${numFormatter.format(absDays)} Day${absDays === 1 ? '' : 's'} Since ${titleSubject}`;
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = `${numFormatter.format(absDays)} Days Ago`;
      statWeeksDays.textContent = `${res.weeks} week${res.weeks === 1 ? '' : 's'}, ${res.daysAfterWeeks} day${res.daysAfterWeeks === 1 ? '' : 's'} ago`;
      statMonthsDays.textContent = `${res.months} month${res.months === 1 ? '' : 's'}, ${res.daysAfterMonths} day${res.daysAfterMonths === 1 ? '' : 's'} ago`;
      lastResultText = `${primaryStr} (${absDays} days elapsed on ${res.weekdayName}, ${res.formattedDate}).`;
    } else {
      resultHeader.textContent = 'Countdown Calculation Result';
      primaryStr = `${numFormatter.format(res.totalDays)} Day${res.totalDays === 1 ? '' : 's'} Until ${titleSubject}`;
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = `${numFormatter.format(res.totalDays)} Days`;
      statWeeksDays.textContent = `${res.weeks} week${res.weeks === 1 ? '' : 's'}, ${res.daysAfterWeeks} day${res.daysAfterWeeks === 1 ? '' : 's'}`;
      statMonthsDays.textContent = `${res.months} month${res.months === 1 ? '' : 's'}, ${res.daysAfterMonths} day${res.daysAfterMonths === 1 ? '' : 's'}`;
      lastResultText = `${primaryStr} (${numFormatter.format(res.totalDays)} days, ${res.weeks}w ${res.daysAfterWeeks}d until ${res.weekdayName}, ${res.formattedDate}).`;
    }

    statWeekday.textContent = `${res.weekdayName} (${res.formattedDate})`;
    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  targetDateInput.addEventListener('input', debouncedCalculate);
  eventNameInput.addEventListener('input', debouncedCalculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    targetDateInput.value = defaultTargetStr;
    eventNameInput.value = '';
    clearError();
    saveState(defaultTargetStr, '');
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Countdown result copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
