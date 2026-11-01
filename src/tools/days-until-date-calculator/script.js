/**
 * Days Until Date Calculator UI Controller
 * Powered by DaysUntilLogic pure module.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DaysUntilLogic;
  const T = ToolsBuilt.scope('days-until-date-calculator');
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
    // Result links (?date=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) return;

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

    ToolsBuilt.resultLink.update();
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
      showError(T('errors.missingTarget'));
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
    const numFormatter = new Intl.NumberFormat(ToolsBuilt.pageLocale('en-US'));
    const plural = (n) => (n === 1 ? 'one' : 'other');
    const weeksDays = (suffix) => T(`stats.weeksDays${suffix}`, {
      weeks: T(`units.weeks.${plural(res.weeks)}`, { n: res.weeks }),
      days: T(`units.days.${plural(res.daysAfterWeeks)}`, { n: res.daysAfterWeeks })
    });
    const monthsDays = (suffix) => T(`stats.monthsDays${suffix}`, {
      months: T(`units.months.${plural(res.months)}`, { n: res.months }),
      days: T(`units.days.${plural(res.daysAfterMonths)}`, { n: res.daysAfterMonths })
    });
    const tp = res.targetParts;
    const targetDate = ToolsBuilt.formatIsoDate(`${tp.year}-${String(tp.month).padStart(2, '0')}-${String(tp.day).padStart(2, '0')}`);
    const titleSubject = eventName ? eventName : T('result.defaultSubject');
    let primaryStr = '';

    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');
    const statWeekday = document.getElementById('stat-weekday');

    if (res.isToday) {
      resultHeader.textContent = T('result.headerToday');
      primaryStr = T('result.today', { subject: titleSubject });
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = T('stats.zeroDays');
      statWeeksDays.textContent = T('stats.zeroWeeksDays');
      statMonthsDays.textContent = T('stats.zeroMonthsDays');
      lastResultText = T('copy.today', { result: primaryStr, date: targetDate });
    } else if (res.isPast) {
      resultHeader.textContent = T('result.headerPast');
      const absDays = Math.abs(res.totalDays);
      primaryStr = T(`result.since.${plural(absDays)}`, { n: numFormatter.format(absDays), subject: titleSubject });
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = T('stats.daysAgo', { n: numFormatter.format(absDays) });
      statWeeksDays.textContent = weeksDays('Ago');
      statMonthsDays.textContent = monthsDays('Ago');
      lastResultText = T('copy.past', { result: primaryStr, n: absDays, date: targetDate });
    } else {
      resultHeader.textContent = T('result.headerFuture');
      primaryStr = T(`result.until.${plural(res.totalDays)}`, { n: numFormatter.format(res.totalDays), subject: titleSubject });
      resultPrimary.textContent = primaryStr;
      statTotalDays.textContent = T('stats.days', { n: numFormatter.format(res.totalDays) });
      statWeeksDays.textContent = weeksDays('');
      statMonthsDays.textContent = monthsDays('');
      lastResultText = T('copy.future', {
        result: primaryStr, n: numFormatter.format(res.totalDays), weeks: res.weeks, days: res.daysAfterWeeks, date: targetDate
      });
    }

    statWeekday.textContent = targetDate;
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
        window.ToolsBuilt.copy(lastResultText, T('copy.toast'));
      }
    });
  }

  initInputs();
  calculate();
});
