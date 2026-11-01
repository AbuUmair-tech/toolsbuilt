/**
 * Week Number Calculator UI Controller
 * Powered by WeekNumberLogic. Today's ISO week, date -> ISO week (plus US-style
 * number), and ISO year + week -> Monday to Sunday dates. Shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.WeekNumberLogic;
  const T = ToolsBuilt.scope('week-number-calculator');
  const dateForm = document.getElementById('date-form');
  const dateInput = document.getElementById('week-date');
  const todayBtn = document.getElementById('today-btn');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('week-note');
  const statsBox = document.getElementById('week-stats');
  const rangeForm = document.getElementById('range-form');
  const yearInput = document.getElementById('range-year');
  const weekInput = document.getElementById('range-week');
  const rangeError = document.getElementById('range-error');
  const rangeResult = document.getElementById('range-result');
  const rangeSummary = document.getElementById('range-summary');
  const rangeDays = document.getElementById('range-days');

  const pad = (n) => String(n).padStart(2, '0');
  let debounceTimer = null;

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Date in the page language (English pages: the visitor's regional order), without shifting the day
  function niceDate(iso, withWeekday) {
    const [y, m, d] = iso.split('-').map(Number);
    try {
      const locale = ToolsBuilt.pageLocale(/^en\b/i.test(navigator.language || '') ? navigator.language : 'en-US');
      return new Intl.DateTimeFormat(locale, {
        weekday: withWeekday ? 'short' : undefined, day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).format(new Date(Date.UTC(y, m - 1, d)));
    } catch (e) {
      return iso;
    }
  }

  function setCopyText(text) {
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = text;
  }

  function showError(box, message, field) {
    box.textContent = message;
    box.classList.remove('hidden');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-errormessage', box.id);
    }
  }

  function clearError(box, fields) {
    box.textContent = '';
    box.classList.add('hidden');
    fields.forEach(f => { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-errormessage'); });
  }

  function renderStats(stats) {
    statsBox.replaceChildren(...stats.map(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'result-stat-card';
      const l = document.createElement('div');
      l.className = 'result-stat-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = 'result-stat-value';
      v.textContent = value;
      card.append(l, v);
      return card;
    }));
  }

  // ---- Today ------------------------------------------------------------
  function renderToday() {
    const info = logic.weekInfo(todayIso());
    if (info.error) return;
    document.getElementById('today-week').textContent = T('today.week', { week: info.isoWeek });
    document.getElementById('today-range').textContent = T('today.range', {
      label: info.isoLabel, start: niceDate(info.weekStart, true), end: niceDate(info.weekEnd, true), weekday: info.weekday, day: info.isoWeekday
    });
  }

  // ---- Date -> week -----------------------------------------------------
  function calculateDate() {
    clearError(errorBox, [dateInput]);
    if (!dateInput.value) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, T('errors.pickDate'), dateInput);
      return false;
    }
    const info = logic.weekInfo(dateInput.value);
    if (info.error) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, info.error, dateInput);
      return false;
    }

    headerText.textContent = T('result.header', { date: niceDate(info.date, true), week: info.isoWeek });
    primaryText.textContent = info.isoLabel;
    noteText.textContent = info.weekYearDiffers
      ? T('result.weekYearDiffers', { year: info.date.slice(0, 4), weekYear: info.isoWeekYear })
      : '';
    noteText.hidden = !info.weekYearDiffers;

    renderStats([
      [T('stats.week'), T('stats.weekValue', { start: niceDate(info.weekStart), end: niceDate(info.weekEnd) })],
      [T('stats.isoWeekDate'), info.isoFullLabel],
      [T('stats.isoWeekYear'), T('stats.isoWeekYearValue', { year: info.isoWeekYear, weeks: info.weeksInIsoYear })],
      [T('stats.weekday'), T('stats.weekdayValue', { weekday: info.weekday, day: info.isoWeekday })],
      [T('stats.usWeek'), T('stats.usWeekValue', { week: info.usWeek, year: info.date.slice(0, 4) })],
      [T('stats.dayOfYear'), T('stats.dayOfYearValue', { day: info.dayOfYear, total: info.daysInYear })]
    ]);
    setCopyText(T('copy.result', { date: info.date, label: info.isoLabel, start: info.weekStart, end: info.weekEnd, usWeek: info.usWeek }));
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
    return true;
  }

  // ---- Week -> dates ----------------------------------------------------
  function calculateRange() {
    clearError(rangeError, [yearInput, weekInput]);
    const year = yearInput.value.trim();
    const week = weekInput.value.trim();
    if (!year || !/^\d{1,4}$/.test(year)) {
      rangeResult.hidden = true;
      showError(rangeError, T('errors.year'), yearInput);
      return;
    }
    if (!week || !/^\d{1,2}$/.test(week)) {
      rangeResult.hidden = true;
      showError(rangeError, T('errors.week'), weekInput);
      return;
    }
    const res = logic.isoWeekRange(Number(year), Number(week));
    if (res.error) {
      rangeResult.hidden = true;
      showError(rangeError, res.error, res.field === 'week' ? weekInput : yearInput);
      return;
    }
    rangeSummary.textContent = T('range.summary', {
      label: res.label, start: niceDate(res.start, true), end: niceDate(res.end, true), year: res.year, weeks: res.weeksInYear
    });
    rangeDays.replaceChildren(...res.days.map((iso) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      // Monday ... Sunday in the page language
      strong.textContent = logic.WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
      const span = document.createElement('span');
      span.textContent = niceDate(iso);
      li.append(strong, span);
      return li;
    }));
    rangeResult.hidden = false;
    ToolsBuilt.resultLink.update();
  }

  function debounce(fn) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, 150);
  }

  dateInput.addEventListener('input', () => debounce(calculateDate));
  dateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    if (!calculateDate()) dateInput.focus();
  });
  todayBtn.addEventListener('click', () => {
    dateInput.value = todayIso();
    calculateDate();
  });

  [yearInput, weekInput].forEach(el => el.addEventListener('input', () => debounce(calculateRange)));
  rangeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateRange();
  });

  function setDefaults() {
    const info = logic.weekInfo(todayIso());
    dateInput.value = todayIso();
    yearInput.value = String(info.isoWeekYear);
    weekInput.value = String(info.isoWeek);
  }

  resetBtn.addEventListener('click', () => {
    setDefaults();
    calculateDate();
    calculateRange();
  });

  renderToday();
  // Refresh "this week" if the page stays open past midnight
  setInterval(renderToday, 60000);

  const restored = ToolsBuilt.resultLink.restore();
  const todayInfo = logic.weekInfo(todayIso());
  if (!dateInput.value) dateInput.value = todayIso();
  if (!yearInput.value) yearInput.value = String(todayInfo.isoWeekYear);
  if (!weekInput.value) weekInput.value = String(todayInfo.isoWeek);
  calculateDate();
  calculateRange();
  if (restored.some(el => el === yearInput || el === weekInput) && !restored.includes(dateInput)) {
    rangeForm.scrollIntoView({ block: 'nearest' });
  }
});
