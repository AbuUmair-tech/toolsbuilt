/**
 * Week Number Calculator UI Controller
 * Powered by WeekNumberLogic. Today's ISO week, date -> ISO week (plus US-style
 * number), and ISO year + week -> Monday to Sunday dates. Shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.WeekNumberLogic;
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

  // English date in the visitor's regional order, without shifting the day
  function niceDate(iso, withWeekday) {
    const [y, m, d] = iso.split('-').map(Number);
    try {
      const locale = /^en\b/i.test(navigator.language || '') ? navigator.language : 'en-US';
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
    document.getElementById('today-week').textContent = `Week ${info.isoWeek}`;
    document.getElementById('today-range').textContent =
      `${info.isoLabel} · ${niceDate(info.weekStart, true)} – ${niceDate(info.weekEnd, true)} · today is ${info.weekday} (day ${info.isoWeekday})`;
  }

  // ---- Date -> week -----------------------------------------------------
  function calculateDate() {
    clearError(errorBox, [dateInput]);
    if (!dateInput.value) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, 'Pick a date to find its week number.', dateInput);
      return false;
    }
    const info = logic.weekInfo(dateInput.value);
    if (info.error) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, info.error, dateInput);
      return false;
    }

    headerText.textContent = `${niceDate(info.date, true)} is in ISO week ${info.isoWeek}`;
    primaryText.textContent = info.isoLabel;
    noteText.textContent = info.weekYearDiffers
      ? `This date is in ${info.date.slice(0, 4)}, but its week belongs to ISO year ${info.isoWeekYear} because that week's Thursday falls in ${info.isoWeekYear}.`
      : '';
    noteText.hidden = !info.weekYearDiffers;

    renderStats([
      ['Week (Mon – Sun)', `${niceDate(info.weekStart)} – ${niceDate(info.weekEnd)}`],
      ['ISO week date', info.isoFullLabel],
      ['ISO week-year', `${info.isoWeekYear} (${info.weeksInIsoYear} weeks)`],
      ['Weekday', `${info.weekday} (ISO day ${info.isoWeekday})`],
      ['US-style week (Sun start, week 1 has 1 Jan)', `Week ${info.usWeek} of ${info.date.slice(0, 4)}`],
      ['Day of year', `${info.dayOfYear} of ${info.daysInYear}`]
    ]);
    setCopyText(`${info.date} is in ISO week ${info.isoLabel} (${info.weekStart} to ${info.weekEnd}). US-style week: ${info.usWeek}.`);
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
      showError(rangeError, 'Enter a four-digit year, for example 2026.', yearInput);
      return;
    }
    if (!week || !/^\d{1,2}$/.test(week)) {
      rangeResult.hidden = true;
      showError(rangeError, 'Enter a week number from 1 to 53.', weekInput);
      return;
    }
    const res = logic.isoWeekRange(Number(year), Number(week));
    if (res.error) {
      rangeResult.hidden = true;
      showError(rangeError, res.error, /weeks/.test(res.error) ? weekInput : yearInput);
      return;
    }
    rangeSummary.textContent = `${res.label}: ${niceDate(res.start, true)} to ${niceDate(res.end, true)} · ${res.year} has ${res.weeksInYear} ISO weeks`;
    const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    rangeDays.replaceChildren(...res.days.map((iso, i) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = names[i];
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
