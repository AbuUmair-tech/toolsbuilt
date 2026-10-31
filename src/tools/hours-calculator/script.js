/**
 * Hours Calculator UI Controller
 * Powered by HoursCalculatorLogic. Two modes (single duration, weekly timesheet),
 * debounced live calculation and shareable result links per mode.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.HoursCalculatorLogic;
  const tabBtns = Array.from(document.querySelectorAll('.mode-tab-btn'));
  const modeInput = document.getElementById('mode');
  const forms = {
    single: document.getElementById('single-form'),
    week: document.getElementById('week-form')
  };
  const startInput = document.getElementById('start-time');
  const endInput = document.getElementById('end-time');
  const breakInput = document.getElementById('break-min');
  const rateInput = document.getElementById('hourly-rate');
  const otAfterInput = document.getElementById('ot-after');
  const otMultInput = document.getElementById('ot-mult');
  const otEnabled = document.getElementById('ot-enabled');
  const rows = Array.from(document.querySelectorAll('.timesheet-row'));
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('result-note');
  const statsBox = document.getElementById('result-stats');

  const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let activeMode = 'single';
  let debounceTimer = null;

  // Remember the defaults written in the markup so Reset can restore them
  const defaults = new Map();
  document.querySelectorAll('.tool-container input').forEach(el => {
    defaults.set(el, el.type === 'checkbox' ? el.checked : el.value);
  });

  function switchMode(mode, focusTab) {
    activeMode = mode === 'week' ? 'week' : 'single';
    modeInput.value = activeMode;
    tabBtns.forEach(btn => {
      const current = btn.dataset.mode === activeMode;
      btn.classList.toggle('active', current);
      btn.setAttribute('aria-selected', current ? 'true' : 'false');
      btn.tabIndex = current ? 0 : -1;
      if (current && focusTab) btn.focus();
    });
    Object.keys(forms).forEach(key => { forms[key].hidden = key !== activeMode; });
    // Links are written from the active form only, so the mode field travels with it
    forms[activeMode].prepend(modeInput);
    clearError();
    calculate();
  }

  tabBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
      switchMode(next.dataset.mode, true);
    });
  });

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('.tool-container [aria-invalid]').forEach(el => {
      el.removeAttribute('aria-invalid');
      if (el.getAttribute('aria-errormessage') === 'error-box') el.removeAttribute('aria-errormessage');
    });
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

  function setCopyText(text) {
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = text;
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

  function hoursLabel(minutes) {
    return `${logic.formatHoursMinutes(minutes)} (${num.format(minutes / 60)} h)`;
  }

  function calculateSingle() {
    if (!startInput.value) return showError('Enter a start time, for example 09:00.', startInput);
    if (!endInput.value) return showError('Enter an end time, for example 17:30.', endInput);
    const res = logic.calculateDuration(startInput.value, endInput.value, breakInput.value);
    if (res.error) {
      const field = /break/i.test(res.error) ? breakInput : (/end/i.test(res.error) ? endInput : startInput);
      return showError(res.error, field);
    }

    headerText.textContent = 'Hours worked';
    primaryText.textContent = `${res.hhmm} hours`;
    const notes = [];
    if (res.crossesMidnight) notes.push('The end time is earlier than the start, so the shift is counted as finishing the next day.');
    if (res.sameTime) notes.push('Start and end are the same time, so the duration is 0. For a full 24-hour shift, enter 00:00 to 23:59 and add one minute.');
    noteText.textContent = notes.join(' ');
    noteText.hidden = notes.length === 0;
    renderStats([
      ['Hours and minutes', res.hhmm],
      ['Decimal hours', num.format(res.workedMinutes / 60)],
      ['Total minutes', res.workedMinutes.toLocaleString('en-US')],
      ['Time on site', logic.formatHoursMinutes(res.spanMinutes)],
      ['Unpaid break', `${res.breakMinutes} min`]
    ]);
    setCopyText(`${startInput.value} to ${endInput.value}${res.crossesMidnight ? ' (next day)' : ''}, ${res.breakMinutes} min break: ${res.hhmm} hours (${num.format(res.workedMinutes / 60)} decimal hours)`);
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update(forms.single);
  }

  function readRows() {
    return rows.map(row => ({
      start: row.querySelector('.ts-start').value,
      end: row.querySelector('.ts-end').value,
      break: row.querySelector('.ts-break').value
    }));
  }

  function updateRowTotals(data) {
    rows.forEach((row, i) => {
      const out = row.querySelector('.timesheet-total');
      const r = data[i];
      if (!r.start && !r.end) { out.textContent = '–'; return; }
      const res = r.start && r.end ? logic.calculateDuration(r.start, r.end, r.break) : null;
      out.textContent = res && !res.error ? logic.formatHoursMinutes(res.workedMinutes) : '?';
    });
  }

  function calculateWeek() {
    const data = readRows();
    updateRowTotals(data);
    const res = logic.calculateTimesheet(data, {
      rate: rateInput.value,
      overtime: otEnabled.checked,
      overtimeAfterHours: otAfterInput.value,
      overtimeMultiplier: otMultInput.value
    });
    if (res.error) {
      let field = null;
      if (res.rowIndex !== undefined) {
        const row = rows[res.rowIndex];
        const r = data[res.rowIndex];
        field = !r.start ? row.querySelector('.ts-start') : !r.end ? row.querySelector('.ts-end') : row.querySelector('.ts-break');
        if (/start time/i.test(res.error)) field = row.querySelector('.ts-start');
        else if (/end time/i.test(res.error)) field = row.querySelector('.ts-end');
      } else if (/multiplier/i.test(res.error)) {
        field = otMultInput;
      } else if (/overtime/i.test(res.error)) {
        field = otAfterInput;
      }
      return showError(res.error, field);
    }
    if (rateInput.value !== '' && !res.hasRate) {
      return showError('The hourly rate must be zero or a positive number.', rateInput);
    }

    headerText.textContent = `Weekly total (${res.daysWorked} day${res.daysWorked === 1 ? '' : 's'} worked)`;
    primaryText.textContent = res.hasRate ? `${res.hhmm} hours · ${num.format(res.totalPay)} pay` : `${res.hhmm} hours`;
    const stats = [
      ['Total hours', hoursLabel(res.totalMinutes)],
      ['Regular hours', hoursLabel(res.regularMinutes)]
    ];
    if (otEnabled.checked) stats.push(['Overtime hours', hoursLabel(res.overtimeMinutes)]);
    if (res.hasRate) {
      stats.push(['Regular pay', `${num.format(res.regularPay)} (${num.format(res.rate)}/h)`]);
      if (otEnabled.checked) stats.push(['Overtime pay', `${num.format(res.overtimePay)} (${num.format(res.overtimeRate)}/h)`]);
      stats.push(['Total pay', num.format(res.totalPay)]);
    }
    renderStats(stats);
    const overnight = res.days.filter(d => d.crossesMidnight).map(d => d.day);
    const notes = [];
    if (overnight.length) notes.push(`${overnight.join(', ')}: shift runs past midnight and is counted on the day it started.`);
    if (!res.hasRate) notes.push('Add an hourly rate to see regular, overtime and total pay.');
    noteText.textContent = notes.join(' ');
    noteText.hidden = notes.length === 0;

    const lines = res.days.filter(d => !d.empty).map(d => `${d.day}: ${d.hhmm}`);
    lines.push(`Total: ${res.hhmm} (${num.format(res.totalMinutes / 60)} h)`);
    if (res.hasRate) {
      lines.push(`Regular pay: ${num.format(res.regularPay)}`);
      if (otEnabled.checked) lines.push(`Overtime pay: ${num.format(res.overtimePay)}`);
      lines.push(`Total pay: ${num.format(res.totalPay)}`);
    }
    setCopyText(lines.join('\n'));
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update(forms.week);
  }

  function calculate() {
    clearError();
    if (activeMode === 'week') calculateWeek();
    else calculateSingle();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  Object.values(forms).forEach(form => {
    form.addEventListener('input', debounced);
    form.addEventListener('change', debounced);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(debounceTimer);
      calculate();
      if (!errorBox.classList.contains('hidden')) {
        const bad = document.querySelector('.tool-container [aria-invalid="true"]');
        if (bad) bad.focus();
      }
    });
  });

  function resetMode(form) {
    form.querySelectorAll('input').forEach(el => {
      if (!defaults.has(el)) return;
      if (el.type === 'checkbox') el.checked = defaults.get(el);
      else el.value = defaults.get(el);
    });
    clearError();
    calculate();
  }

  document.getElementById('reset-btn').addEventListener('click', () => resetMode(forms.single));
  document.getElementById('reset-week-btn').addEventListener('click', () => resetMode(forms.week));

  // Empty fields are left out of links, so a shared week starts from a blank timesheet
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'week') {
      forms.week.querySelectorAll('.timesheet input').forEach(el => { el.value = ''; });
      otEnabled.checked = params.has('ot');
    }
  } catch (e) {}
  ToolsBuilt.resultLink.restore();
  switchMode(modeInput.value);
});
