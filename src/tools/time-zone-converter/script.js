/**
 * Time Zone Converter UI Controller
 * Powered by TimeZoneLogic (Intl.DateTimeFormat, IANA zones built into the browser).
 * Searchable zone fields, up to four target zones, a 24-hour working-hours strip
 * and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.TimeZoneLogic;
  const T = ToolsBuilt.scope('time-zone-converter');
  const form = document.getElementById('tz-form');
  const dateInput = document.getElementById('tz-date');
  const timeInput = document.getElementById('tz-time');
  const fromInput = document.getElementById('tz-from');
  const targetInputs = Array.from(document.querySelectorAll('.tz-target'));
  const zoneInputs = [fromInput].concat(targetInputs);
  const datalist = document.getElementById('tz-list');
  const nowBtn = document.getElementById('tz-now-btn');
  const swapBtn = document.getElementById('tz-swap-btn');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('tz-note');
  const cards = document.getElementById('tz-cards');
  const strip = document.getElementById('tz-strip');
  const overlapSummary = document.getElementById('overlap-summary');

  const ZONES = logic.listZones();
  const pad = (n) => String(n).padStart(2, '0');
  let userZone = 'UTC';
  try { userZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
  userZone = logic.isValidZone(userZone) ? logic.canonicalZone(userZone) : 'UTC';

  const DEFAULT_TARGETS = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Karachi']
    .filter(z => z !== userZone)
    .concat(['Asia/Tokyo'])
    .slice(0, 4);

  let debounceTimer = null;

  // ---- Zone list --------------------------------------------------------
  (function fillDatalist() {
    const now = Date.now();
    const frag = document.createDocumentFragment();
    ZONES.forEach(zone => {
      const opt = document.createElement('option');
      opt.value = zone;
      let offset = '';
      try { offset = logic.formatOffset(logic.offsetMinutes(zone, now)); } catch (e) {}
      opt.label = `${logic.cityName(zone)} · ${offset}`;
      frag.appendChild(opt);
    });
    datalist.appendChild(frag);
  })();

  function cityLabel(zone) {
    return zone === userZone ? T('city.you', { city: logic.cityName(zone) }) : logic.cityName(zone);
  }

  /** Turns what was typed into an IANA id; returns null for an unknown zone. */
  function normaliseZoneInput(input) {
    const raw = input.value.trim();
    if (!raw) return '';
    const zone = logic.resolveZone(raw, ZONES);
    if (zone && zone !== raw) input.value = zone;
    return zone;
  }

  // ---- Helpers ----------------------------------------------------------
  function nowInZone(zone) {
    const w = logic.wallTime(Date.now(), zone);
    return { date: `${w.year}-${pad(w.month)}-${pad(w.day)}`, time: `${pad(w.hour)}:${pad(w.minute)}` };
  }

  function niceDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    try {
      const locale = ToolsBuilt.pageLocale(/^en\b/i.test(navigator.language || '') ? navigator.language : 'en-US');
      return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(y, m - 1, d)));
    } catch (e) {
      return iso;
    }
  }

  function setCopyText(text) {
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = text;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('#tz-form [aria-invalid]').forEach(el => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-errormessage');
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

  function tag(text, variant) {
    const span = document.createElement('span');
    span.className = `badge ${variant || ''}`.trim();
    span.textContent = text;
    return span;
  }

  // ---- Render -----------------------------------------------------------
  function renderCards(res) {
    const all = [res.source].concat(res.targets);
    cards.replaceChildren(...all.map((info, i) => {
      const li = document.createElement('li');
      li.className = 'tz-card';
      const city = document.createElement('span');
      city.className = 'tz-card-city';
      city.textContent = i === 0 ? T('city.from', { city: cityLabel(info.zone) }) : cityLabel(info.zone);
      city.title = info.zone;
      const time = document.createElement('span');
      time.className = 'tz-card-time';
      time.textContent = info.time;
      const meta = document.createElement('span');
      meta.className = 'tz-card-meta';
      const abbr = info.abbreviation && !/^GMT[+-]/.test(info.abbreviation) && info.abbreviation !== 'UTC' ? ` (${info.abbreviation})` : '';
      meta.textContent = `${niceDate(info.date)} · ${info.offsetLabel}${abbr}`;
      const tags = document.createElement('span');
      tags.className = 'tz-card-tags';
      if (i > 0 && info.dayDiff !== 0) tags.appendChild(tag(info.dayLabel, 'badge-primary'));
      tags.appendChild(info.isWorkingHours ? tag(T('badges.working'), 'badge-success') : tag(T('badges.outside'), 'badge-warning'));
      li.append(city, time, meta, tags);
      return li;
    }));
  }

  function hourRanges(indexes) {
    const ranges = [];
    indexes.forEach(i => {
      const last = ranges[ranges.length - 1];
      if (last && last[1] === i - 1) last[1] = i;
      else ranges.push([i, i]);
    });
    return ranges;
  }

  function renderStrip(dateStr, fromZone, targets, selectedTime) {
    const res = logic.overlapStrip(dateStr, fromZone, targets);
    if (res.error) {
      strip.replaceChildren(strip.querySelector('caption'));
      overlapSummary.textContent = '';
      return;
    }
    const caption = strip.querySelector('caption');
    const selectedHour = parseInt(selectedTime.split(':')[0], 10);
    const body = document.createElement('tbody');
    res.rows.forEach(row => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = cityLabel(row.zone);
      th.title = row.zone;
      tr.appendChild(th);
      row.slots.forEach((slot, i) => {
        const td = document.createElement('td');
        td.textContent = slot.label;
        const classes = [];
        if (slot.working) classes.push('is-work');
        if (res.overlap.includes(i)) classes.push('is-overlap');
        if (i === selectedHour) classes.push('is-selected');
        td.className = classes.join(' ');
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    strip.replaceChildren(caption, body);

    const fromCity = logic.cityName(fromZone);
    if (res.rows.length < 2) {
      overlapSummary.textContent = T('overlap.needMore');
    } else if (res.overlap.length) {
      const text = hourRanges(res.overlap)
        .map(([a, b]) => `${pad(a)}:00–${pad((b + 1) % 24)}:00`)
        .join(', ');
      overlapSummary.textContent = T(res.overlap.length === 1 ? 'overlap.all.one' : 'overlap.all.other', { ranges: text, city: fromCity, count: res.overlap.length });
    } else {
      // No full overlap: report the hour(s) where the most zones are working
      const counts = Array.from({ length: 24 }, (_, i) => res.rows.filter(r => r.slots[i].working).length);
      const best = Math.max(...counts);
      const bestHours = counts.map((c, i) => (c === best ? i : -1)).filter(i => i >= 0);
      const text = hourRanges(bestHours).slice(0, 3).map(([a, b]) => `${pad(a)}:00–${pad((b + 1) % 24)}:00`).join(', ');
      overlapSummary.textContent = T('overlap.none', { ranges: text, city: fromCity, best, total: res.rows.length });
    }
  }

  // ---- Calculate --------------------------------------------------------
  function calculate() {
    clearError();
    if (!dateInput.value) return showError(T('errors.pickDate'), dateInput);
    if (!timeInput.value) return showError(T('errors.pickTime'), timeInput);

    const from = normaliseZoneInput(fromInput);
    if (!from) return showError(fromInput.value.trim() ? T('errors.noMatchFrom', { query: fromInput.value.trim() }) : T('errors.chooseFrom'), fromInput);

    const targets = [];
    for (const input of targetInputs) {
      if (!input.value.trim()) continue;
      const zone = normaliseZoneInput(input);
      if (!zone) return showError(T('errors.noMatchTarget', { query: input.value.trim() }), input);
      targets.push(zone);
    }

    const res = logic.convert(dateInput.value, timeInput.value, from, targets);
    if (res.error) return showError(res.error, dateInput);

    const src = res.source;
    const sourceText = T('result.timeIn', { time: src.time, city: logic.cityName(from) });
    primaryText.textContent = res.targets.length
      ? `${sourceText} = ${res.targets.map(t => (t.dayDiff
        ? T('result.timeInDay', { time: t.time, day: logic.dayLabelInline(t.dayDiff), city: logic.cityName(t.zone) })
        : T('result.timeIn', { time: t.time, city: logic.cityName(t.zone) }))).join(' · ')}`
      : `${sourceText} · ${res.iso}`;

    const notes = [];
    if (res.nonexistent) notes.push(T('notes.nonexistent', { time: timeInput.value, zone: from, moved: src.time }));
    if (res.ambiguous) notes.push(T('notes.ambiguous', { time: timeInput.value, zone: from, offset: src.offsetLabel }));
    noteText.textContent = notes.join(' ');
    noteText.hidden = notes.length === 0;

    renderCards(res);
    renderStrip(dateInput.value, from, targets, timeInput.value);

    const lines = [`${src.time} ${src.date} ${from} (${src.offsetLabel})`]
      .concat(res.targets.map(t => `${t.time} ${t.date} ${t.zone} (${t.offsetLabel})${t.dayDiff ? ` – ${logic.dayLabelInline(t.dayDiff)}` : ''}`));
    setCopyText(lines.join('\n'));
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 200);
  }

  // Zone fields: recalculate when a zone is picked or the field is left, not on every keystroke
  zoneInputs.forEach(input => {
    input.addEventListener('change', calculate);
    input.addEventListener('input', () => {
      if (!input.value.trim() || ZONES.includes(input.value.trim())) debounced();
    });
  });
  [dateInput, timeInput].forEach(el => el.addEventListener('input', debounced));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  nowBtn.addEventListener('click', () => {
    const zone = normaliseZoneInput(fromInput) || userZone;
    fromInput.value = zone;
    const now = nowInZone(zone);
    dateInput.value = now.date;
    timeInput.value = now.time;
    calculate();
  });

  swapBtn.addEventListener('click', () => {
    const first = targetInputs[0];
    if (!first.value.trim()) return;
    const from = normaliseZoneInput(fromInput);
    const to = normaliseZoneInput(first);
    if (!from || !to) return calculate();
    // Keep the same instant: show it as the wall time in the new "from" zone
    const res = logic.convert(dateInput.value, timeInput.value, from, [to]);
    if (!res.error) {
      dateInput.value = res.targets[0].date;
      timeInput.value = res.targets[0].time;
    }
    fromInput.value = to;
    first.value = from;
    calculate();
  });

  function setDefaults() {
    fromInput.value = userZone;
    const now = nowInZone(userZone);
    dateInput.value = now.date;
    timeInput.value = `${now.time.slice(0, 2)}:00`;
    targetInputs.forEach((input, i) => { input.value = DEFAULT_TARGETS[i] || ''; });
  }

  resetBtn.addEventListener('click', () => {
    setDefaults();
    calculate();
  });

  // ---- Init -------------------------------------------------------------
  const restored = ToolsBuilt.resultLink.restore();
  if (restored.length) {
    // A shared link lists only the zones it uses
    targetInputs.forEach(input => { if (!restored.includes(input)) input.value = ''; });
    if (!fromInput.value) fromInput.value = userZone;
    const now = nowInZone(normaliseZoneInput(fromInput) || userZone);
    if (!dateInput.value) dateInput.value = now.date;
    if (!timeInput.value) timeInput.value = `${now.time.slice(0, 2)}:00`;
  } else {
    setDefaults();
  }
  calculate();
});
