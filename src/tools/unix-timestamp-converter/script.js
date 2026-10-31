/**
 * Unix Timestamp Converter UI Controller
 * Powered by UnixTimestampLogic. Live current timestamp, timestamp -> date with
 * unit detection, date -> timestamp in UTC or local time, shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.UnixTimestampLogic;
  const tsForm = document.getElementById('ts-form');
  const tsInput = document.getElementById('ts-input');
  const unitSelect = document.getElementById('ts-unit');
  const nowBtn = document.getElementById('ts-now-btn');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const detectedText = document.getElementById('ts-detected');
  const tsDetails = document.getElementById('ts-details');
  const dateForm = document.getElementById('date-form');
  const dateInput = document.getElementById('date-input');
  const zoneSelect = document.getElementById('date-zone');
  const dateError = document.getElementById('date-error');
  const dateResult = document.getElementById('date-result');
  const dateDetails = document.getElementById('date-details');
  const nowSeconds = document.getElementById('now-seconds');
  const nowMs = document.getElementById('now-ms');
  const pauseBtn = document.getElementById('now-pause');

  const locale = /^en\b/i.test(navigator.language || '') ? navigator.language : 'en-US';
  let userZone = 'your time zone';
  try { userZone = Intl.DateTimeFormat().resolvedOptions().timeZone || userZone; } catch (e) {}
  const pad = (n) => String(n).padStart(2, '0');
  const group = (n) => Number(n).toLocaleString('en-US');

  let debounceTimer = null;
  let paused = false;

  // ---- Live clock -------------------------------------------------------
  function tick() {
    if (paused) return;
    const ms = Date.now();
    nowSeconds.textContent = String(Math.floor(ms / 1000));
    nowMs.textContent = String(ms);
  }
  tick();
  setInterval(tick, 1000);

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (!paused) tick();
  });

  document.querySelectorAll('[data-copy-now]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copyNow === 'ms' ? nowMs.textContent : nowSeconds.textContent;
      ToolsBuilt.copy(text, `Copied ${text}`);
    });
  });

  // ---- Helpers ----------------------------------------------------------
  function renderList(dl, rows) {
    dl.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'epoch-row';
      const dt = document.createElement('dt');
      dt.textContent = label;
      // <dl> rows may only hold <dt>/<dd>, so the copy button lives inside the <dd>
      const dd = document.createElement('dd');
      const val = document.createElement('span');
      val.className = 'epoch-value';
      val.textContent = value;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-ghost';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', `Copy ${label}`);
      btn.addEventListener('click', () => ToolsBuilt.copy(value, `${label} copied`));
      dd.append(val, btn);
      row.append(dt, dd);
      return row;
    }));
  }

  function formatLocal(ms) {
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
      }).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toString();
    }
  }

  function formatUtc(ms) {
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'UTC'
      }).format(new Date(ms)) + ' UTC';
    } catch (e) {
      return new Date(ms).toUTCString();
    }
  }

  function localOffsetMinutes(ms) {
    return -new Date(ms).getTimezoneOffset();
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

  function clearError(box, field) {
    box.textContent = '';
    box.classList.add('hidden');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-errormessage');
  }

  // ---- Timestamp -> date -----------------------------------------------
  function convertTimestamp() {
    clearError(errorBox, tsInput);
    if (!tsInput.value.trim()) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, 'Enter a Unix timestamp, for example 1700000000.', tsInput);
      return false;
    }
    const res = logic.convertTimestamp(tsInput.value, { unit: unitSelect.value, now: Date.now() });
    if (res.error) {
      resultBox.classList.remove('is-visible');
      showError(errorBox, res.error, tsInput);
      return false;
    }

    const offset = localOffsetMinutes(res.ms);
    primaryText.textContent = res.iso;
    detectedText.textContent = (res.detected ? `Detected as ${res.unitLabel}` : `Read as ${res.unitLabel}`) +
      ` · ${res.relative}` +
      (res.beyond2038 ? ' · after the 32-bit limit of 2038-01-19T03:14:07Z' : '');

    const rows = [
      ['UTC', formatUtc(res.ms)],
      [`Local time (${userZone})`, formatLocal(res.ms)],
      ['ISO 8601 (UTC)', res.iso],
      ['ISO 8601 (local offset)', logic.toIsoWithOffset(res.ms, offset)],
      ['RFC 2822', res.rfc2822],
      ['Relative', res.relative],
      ['Seconds', String(res.seconds)],
      ['Milliseconds', String(res.milliseconds)]
    ];
    renderList(tsDetails, rows);
    setCopyText(rows.map(([l, v]) => `${l}: ${v}`).join('\n'));
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
    return true;
  }

  // ---- Date -> timestamp -----------------------------------------------
  function convertDate() {
    clearError(dateError, dateInput);
    if (!dateInput.value) {
      dateResult.hidden = true;
      showError(dateError, 'Pick a date and time to convert.', dateInput);
      return;
    }
    const zone = zoneSelect.value === 'utc' ? 'utc' : 'local';
    const res = logic.dateToTimestamp(dateInput.value, { zone });
    if (res.error) {
      dateResult.hidden = true;
      showError(dateError, res.error, dateInput);
      return;
    }
    renderList(dateDetails, [
      ['Timestamp (seconds)', String(res.seconds)],
      ['Milliseconds', String(res.milliseconds)],
      ['ISO 8601 (UTC)', res.iso],
      [zone === 'utc' ? `In your local time (${userZone})` : 'In UTC', zone === 'utc' ? formatLocal(res.ms) : formatUtc(res.ms)]
    ]);
    dateResult.hidden = false;
    ToolsBuilt.resultLink.update();
  }

  function localInputValue(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // ---- Events -----------------------------------------------------------
  function debounce(fn) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, 200);
  }

  tsInput.addEventListener('input', () => debounce(convertTimestamp));
  unitSelect.addEventListener('change', convertTimestamp);
  tsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    if (!convertTimestamp()) tsInput.focus();
  });

  nowBtn.addEventListener('click', () => {
    tsInput.value = String(Math.floor(Date.now() / 1000));
    unitSelect.value = 'auto';
    convertTimestamp();
  });

  resetBtn.addEventListener('click', () => {
    tsInput.value = String(Math.floor(Date.now() / 1000));
    unitSelect.value = 'auto';
    dateInput.value = localInputValue(Date.now());
    zoneSelect.value = 'local';
    convertTimestamp();
    convertDate();
  });

  dateInput.addEventListener('input', () => debounce(convertDate));
  zoneSelect.addEventListener('change', convertDate);
  dateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    convertDate();
  });

  // Keep "x minutes ago" fresh while the page is open
  setInterval(() => {
    if (resultBox.classList.contains('is-visible') && !paused && tsInput.value.trim()) {
      const res = logic.convertTimestamp(tsInput.value, { unit: unitSelect.value, now: Date.now() });
      if (!res.error) {
        const rel = tsDetails.querySelector('.epoch-row:nth-child(6) .epoch-value');
        if (rel && rel.textContent !== res.relative) {
          rel.textContent = res.relative;
          detectedText.textContent = detectedText.textContent.replace(/ · [^·]+(?= ·|$)/, ` · ${res.relative}`);
        }
      }
    }
  }, 30000);

  // ---- Init -------------------------------------------------------------
  ToolsBuilt.resultLink.restore();
  if (!tsInput.value) tsInput.value = String(Math.floor(Date.now() / 1000));
  if (!dateInput.value) dateInput.value = localInputValue(Date.now());
  convertTimestamp();
  convertDate();
});
