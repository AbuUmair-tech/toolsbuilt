/**
 * Unified Salary Tax Calculator UI Controller
 * One controller for every country page and the hub (partials/salary-tax-calculator.njk).
 * Powered by SalaryTaxEngine and #stc-data (every country, every tax dataset). Nothing here
 * knows a country's rules: statuses, options and contributions are rendered from the dataset.
 * - Searchable country combobox, preselected from the page, a result link, the visitor's saved
 *   choice, time zone or browser language (no network)
 * - Built-in rules, "no income tax" countries, and Custom Tax Mode (own brackets and levies,
 *   saved per country in localStorage and shared in the URL)
 * - Annual / monthly / weekly breakdown, chart, bracket table, comparison with another tax year
 */
document.addEventListener('DOMContentLoaded', () => {
  const engine = window.SalaryTaxEngine;
  const T = ToolsBuilt.scope('salary-tax-calculator');
  const data = (() => {
    try { return JSON.parse(document.getElementById('stc-data').textContent); } catch (e) { return null; }
  })();
  const root = document.querySelector('.stc');
  if (!engine || !data || !root) return;

  const $ = (id) => document.getElementById(id);
  const form = $('calculator-form');
  const comboInput = $('stc-country-input');
  const countryField = $('stc-country');
  const listbox = $('stc-country-list');
  const yearGroup = $('stc-year-group');
  const yearSelect = $('stc-year');
  const modeNote = $('stc-mode-note');
  const salaryInput = $('salary-amount');
  const periodInputs = document.querySelectorAll('input[name="salary-period"]');
  const hoursGroup = $('stc-hours-group');
  const hoursInput = $('stc-hours');
  const statusGroup = $('stc-status-group');
  const statusLabel = $('stc-status-label');
  const statusSelect = $('stc-status');
  const optionsBox = $('stc-options');
  const customBox = $('stc-custom');
  const currencySelect = $('stc-currency');
  const templateSelect = $('stc-template');
  const bracketRows = $('stc-bracket-rows');
  const levyRows = $('stc-levy-rows');
  const customState = $('stc-custom-state');
  const resultBox = $('result-box');
  const errorBox = $('error-box');

  const STORE = 'toolsbuilt:salary-tax-calculator';
  const lang = document.documentElement.lang || 'en';
  const countries = data.countries;
  const byCode = (code) => countries.find(c => c.code === code);
  const regionNames = (() => { try { return new Intl.DisplayNames([lang], { type: 'region' }); } catch (e) { return null; } })();
  const currencyNames = (() => { try { return new Intl.DisplayNames([lang], { type: 'currency' }); } catch (e) { return null; } })();
  const nameOf = (c) => { try { return (regionNames && regionNames.of(c.code)) || c.name; } catch (e) { return c.name; } };
  const flagOf = (code) => String.fromCodePoint(...code.split('').map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pct = (n) => `${Number(n).toFixed(2)}%`;
  const ratePct = (rate) => `${Number((rate * 100).toFixed(4))}%`;
  // A translated string, or the dataset's own English text when there is no translation yet
  const L = (key, fallback, vars) => {
    const value = T(key, vars);
    return value === key.split('.').pop() && fallback !== undefined ? fallback : value;
  };
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(`${STORE}:${key}`)); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(`${STORE}:${key}`, JSON.stringify(value)); } catch (e) {} },
    remove(key) { try { localStorage.removeItem(`${STORE}:${key}`); } catch (e) {} }
  };

  // country: code; year: tax year (built-in rules); customForced: custom rates for a no-tax country
  const state = { country: null, year: null, customForced: false };
  let debounceTimer = null;

  const country = () => byCode(state.country);
  const mode = () => {
    const c = country();
    if (c.rules === 'builtin') return 'builtin';
    if (c.rules === 'noTax' && !state.customForced) return 'noTax';
    return 'custom';
  };
  const builtinDataset = (code, year) => data.datasets[`${code}:${year}`];
  const yearLabel = (d) => L(`calc.years.${d.country}.${d.taxYear}`, d.label);

  // --- Country combobox -------------------------------------------------------------------

  let activeIndex = -1;
  let shown = [];

  function badge(c) {
    // Built-in rules: the country's current tax year, e.g. "Tax year 2026-27"
    if (c.rules === 'builtin') return yearLabel(builtinDataset(c.code, c.currentYear));
    if (c.rules === 'noTax') return T('calc.badges.noTax');
    return T('calc.badges.custom');
  }

  function renderList(query) {
    const q = fold(query || '').trim();
    const sorted = countries.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b), lang));
    shown = q ? sorted.filter(c => fold(nameOf(c)).includes(q) || fold(c.name).includes(q) || c.code.toLowerCase() === q) : sorted;
    listbox.innerHTML = shown.length
      ? shown.map((c, i) => `<li role="option" id="stc-opt-${c.code}" data-code="${c.code}" aria-selected="${c.code === state.country}"${i === activeIndex ? ' class="is-active"' : ''}>`
        + `<span class="stc-flag" aria-hidden="true">${flagOf(c.code)}</span><span class="stc-opt-name">${escapeHtml(nameOf(c))}</span>`
        + `<span class="stc-opt-badge">${escapeHtml(badge(c))}</span></li>`).join('')
      : `<li class="stc-opt-empty" role="presentation">${escapeHtml(T('calc.noMatch'))}</li>`;
  }

  function setActive(index) {
    activeIndex = Math.max(0, Math.min(index, shown.length - 1));
    listbox.querySelectorAll('[role="option"]').forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
    const active = shown[activeIndex];
    if (active) {
      comboInput.setAttribute('aria-activedescendant', `stc-opt-${active.code}`);
      const li = $(`stc-opt-${active.code}`);
      if (li) li.scrollIntoView({ block: 'nearest' });
    }
  }

  function openList() {
    if (!listbox.hidden) return;
    activeIndex = -1;
    renderList(comboInput.value === displayName(state.country) ? '' : comboInput.value);
    listbox.hidden = false;
    comboInput.setAttribute('aria-expanded', 'true');
    const current = shown.findIndex(c => c.code === state.country);
    if (current >= 0) setActive(current);
  }

  function closeList(restore) {
    listbox.hidden = true;
    comboInput.setAttribute('aria-expanded', 'false');
    comboInput.removeAttribute('aria-activedescendant');
    if (restore) comboInput.value = displayName(state.country);
  }

  const displayName = (code) => `${flagOf(code)} ${nameOf(byCode(code))}`;

  comboInput.addEventListener('focus', () => comboInput.select());
  comboInput.addEventListener('click', openList);
  comboInput.addEventListener('input', () => {
    listbox.hidden = false;
    comboInput.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
    renderList(comboInput.value);
    if (shown.length) setActive(0);
  });
  comboInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (listbox.hidden) { openList(); return; }
      setActive(activeIndex + (e.key === 'ArrowDown' ? 1 : -1));
    } else if ((e.key === 'Home' || e.key === 'End') && !listbox.hidden) {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : shown.length - 1);
    } else if (e.key === 'Enter') {
      if (!listbox.hidden) {
        e.preventDefault();
        if (shown[activeIndex]) chooseCountry(shown[activeIndex].code);
      }
    } else if (e.key === 'Escape') {
      if (!listbox.hidden) { e.preventDefault(); closeList(true); }
    } else if (e.key === 'Tab') {
      closeList(true);
    }
  });
  comboInput.addEventListener('blur', () => setTimeout(() => {
    if (document.activeElement !== comboInput) closeList(true);
  }, 150));
  // mousedown keeps focus in the input; the click picks the country
  listbox.addEventListener('mousedown', (e) => e.preventDefault());
  listbox.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) chooseCountry(li.dataset.code);
  });

  function chooseCountry(code) {
    closeList(false);
    if (code !== state.country) {
      saveState();
      state.customForced = false;
      selectCountry(code);
      ToolsBuilt.rememberCountry(code);
      store.set('last', code);
      loadInputs();
      calculate();
    }
    comboInput.value = displayName(code);
  }

  // --- Country, year, status and options ----------------------------------------------------

  function selectCountry(code, year) {
    const c = byCode(code);
    state.country = c.code;
    countryField.value = c.code;
    comboInput.value = displayName(c.code);

    yearGroup.hidden = c.rules !== 'builtin';
    if (c.rules === 'builtin') {
      state.year = c.years.includes(year) ? year : c.currentYear;
      yearSelect.innerHTML = c.years.map(y => `<option value="${y}">${escapeHtml(yearLabel(builtinDataset(c.code, y)))}</option>`).join('');
      yearSelect.value = state.year;
      // One tax year: show it as text; several: let the visitor choose
      yearSelect.hidden = c.years.length < 2;
      $('stc-year-text').hidden = c.years.length > 1;
      $('stc-year-text').textContent = yearLabel(builtinDataset(c.code, state.year));
    } else {
      state.year = null;
      yearSelect.innerHTML = '';
    }
    renderMode();
  }

  function renderMode() {
    const c = country();
    const m = mode();
    customBox.hidden = m !== 'custom';
    if (m === 'custom') {
      if (!bracketRows.children.length || customBox.dataset.country !== c.code) writeCustom(loadCustom(c.code));
      customBox.dataset.country = c.code;
    }
    $('stc-currency-code').textContent = currencyOf();
    $('stc-currency-wrap').hidden = false;
    renderStatus();
    renderNote();
  }

  function currencyOf() {
    const m = mode();
    if (m === 'builtin') return builtinDataset(state.country, state.year).currency;
    if (m === 'custom') return currencySelect.value || country().currency;
    return country().currency;
  }

  function renderStatus() {
    const d = mode() === 'builtin' ? builtinDataset(state.country, state.year) : null;
    const previous = statusSelect.value;
    statusGroup.hidden = !(d && d.statuses);
    if (d && d.statuses) {
      statusLabel.textContent = L(`calc.statusLabels.${d.country}`, d.statusLabel || T('calc.status'));
      statusSelect.innerHTML = Object.entries(d.statuses).map(([id, st]) =>
        `<option value="${id}">${escapeHtml(L(`calc.statuses.${d.country}.${id}`, st.label))}</option>`).join('');
      statusSelect.value = d.statuses[previous] ? previous : (d.defaultStatus || Object.keys(d.statuses)[0]);
    } else {
      statusSelect.innerHTML = '';
    }
    renderOptions();
  }

  // Option inputs keep their values while the visitor switches status or year
  const optionValues = {};

  function readOptions() {
    optionsBox.querySelectorAll('[data-option]').forEach(el => {
      optionValues[el.dataset.option] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return { ...optionValues };
  }

  function renderOptions() {
    readOptions();
    const d = mode() === 'builtin' ? engine.variant(builtinDataset(state.country, state.year), statusSelect.value || undefined) : null;
    const cur = currencyOf();
    optionsBox.innerHTML = '';
    (d && d.options || []).filter(o => !(mode() === 'custom' && o.id === 'pension')).forEach(o => {
      const id = `stc-opt-input-${o.id}`;
      const label = escapeHtml(L(`calc.options.${o.id}.label`, o.label || o.id));
      const value = optionValues[o.id] !== undefined ? optionValues[o.id] : o.default;
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      if (o.type === 'select') {
        wrap.innerHTML = `<label for="${id}">${label}</label><select id="${id}" class="form-control" data-option="${o.id}" data-param="o-${o.id}">`
          + o.choices.map(ch => `<option value="${ch}">${escapeHtml(L(`calc.options.${o.id}.choices.${ch}`, (o.choiceLabels || {})[ch] || ch))}</option>`).join('')
          + '</select>';
        wrap.querySelector('select').value = o.choices.includes(value) ? value : o.default;
      } else if (o.type === 'checkbox') {
        wrap.innerHTML = `<label class="checkbox-label" for="${id}"><input type="checkbox" id="${id}" data-option="${o.id}" data-param="o-${o.id}"> ${label}</label>`;
        wrap.querySelector('input').checked = value === true || value === '1' || value === 'true';
      } else {
        const hint = typeof o.max === 'number' && o.type === 'amount' ? T('calc.optionMax', { max: ToolsBuilt.money(o.max, cur) }) : '';
        wrap.innerHTML = `<label for="${id}">${label}</label>`
          + `<input type="number" inputmode="decimal" min="0"${o.type === 'percent' ? ' max="100"' : ''} step="any" id="${id}" class="form-control" data-option="${o.id}" data-param="o-${o.id}"${hint ? ` aria-describedby="${id}-hint"` : ''}>`
          + (hint ? `<p class="form-hint" id="${id}-hint">${escapeHtml(hint)}</p>` : '');
        wrap.querySelector('input').value = value ? value : '';
      }
      optionsBox.appendChild(wrap);
    });
  }

  function renderNote() {
    const c = country();
    const m = mode();
    const name = escapeHtml(nameOf(c));
    let html = '';
    if (m === 'builtin') {
      const d = builtinDataset(c.code, state.year);
      html = `<p>${T('calc.note.builtin', { name, label: escapeHtml(yearLabel(d)), date: escapeHtml(ToolsBuilt.formatIsoDate(d.verifiedOn)) })}</p>`;
    } else if (m === 'noTax') {
      const st = data.noTax[c.code] || {};
      html = `<p>${T('calc.note.noTax', { name })}${st.url ? ` <a href="${escapeHtml(st.url)}" rel="noopener" target="_blank">${T('calc.note.statement')}</a>` : ''}</p>`
        + `<button type="button" class="btn btn-sm btn-secondary" id="stc-use-custom">${T('calc.note.useCustom')}</button>`;
    } else {
      const email = root.dataset.requestEmail;
      const subject = encodeURIComponent(T('calc.note.requestSubject', { name: c.name }));
      html = `<p><strong>${T('calc.note.customTitle')}</strong> ${T('calc.note.custom')}</p>`
        + (email ? `<p><a href="mailto:${escapeHtml(email)}?subject=${subject}" id="stc-request">${T('calc.note.request', { name })}</a></p>` : '');
    }
    modeNote.innerHTML = html;
    modeNote.dataset.mode = m;
    const useCustom = $('stc-use-custom');
    if (useCustom) useCustom.addEventListener('click', () => { state.customForced = true; renderMode(); calculate(); });
  }

  // --- Custom Tax Mode ----------------------------------------------------------------------

  function fillCurrencies() {
    let codes = [];
    try { codes = Intl.supportedValuesOf('currency'); } catch (e) {}
    countries.forEach(c => { if (!codes.includes(c.currency)) codes.push(c.currency); });
    codes.sort();
    currencySelect.innerHTML = codes.map(code => {
      let name = '';
      try { name = currencyNames ? currencyNames.of(code) : ''; } catch (e) {}
      return `<option value="${code}">${code}${name && name !== code ? ` – ${escapeHtml(name)}` : ''}</option>`;
    }).join('');
  }

  function fillTemplates() {
    const copies = [];
    countries.filter(c => c.rules === 'builtin').forEach(c => {
      const d = builtinDataset(c.code, c.currentYear);
      const statuses = d.statuses ? Object.entries(d.statuses) : [[null, null]];
      statuses.forEach(([id, st]) => {
        const name = nameOf(c) + (st ? ` – ${L(`calc.statuses.${c.code}.${id}`, st.label)}` : '');
        copies.push(`<option value="copy:${c.code}:${c.currentYear}:${id || ''}">${escapeHtml(T('calc.custom.templates.copy', { name }))}</option>`);
      });
    });
    templateSelect.insertAdjacentHTML('beforeend', copies.join(''));
  }

  function numberCell(value, label, field) {
    return `<td><input type="number" inputmode="decimal" min="0" step="any" class="form-control" data-field="${field}" value="${escapeHtml(value === undefined || value === null ? '' : value)}" aria-label="${escapeHtml(label)}"></td>`;
  }

  function addBracketRow(b) {
    const n = bracketRows.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = numberCell(b.from, T('calc.custom.fromRow', { n }), 'from')
      + numberCell(b.to, T('calc.custom.toRow', { n }), 'to')
      + numberCell(b.rate, T('calc.custom.rateRow', { n }), 'rate')
      + `<td><button type="button" class="btn btn-sm btn-ghost" data-remove aria-label="${escapeHtml(T('calc.custom.removeBracket', { n }))}">✕</button></td>`;
    bracketRows.appendChild(tr);
  }

  function addLevyRow(l) {
    const n = levyRows.children.length + 1;
    const row = document.createElement('div');
    row.className = 'stc-levy';
    row.innerHTML = `<input type="text" class="form-control" data-field="label" maxlength="60" value="${escapeHtml(l.label || '')}" aria-label="${escapeHtml(T('calc.custom.levyName', { n }))}" placeholder="${escapeHtml(T('calc.custom.levyPlaceholder'))}">`
      + `<input type="number" inputmode="decimal" min="0" max="100" step="any" class="form-control" data-field="rate" value="${escapeHtml(l.rate || '')}" aria-label="${escapeHtml(T('calc.custom.levyRate', { n }))}">`
      + `<select class="form-control" data-field="base" aria-label="${escapeHtml(T('calc.custom.levyBase', { n }))}">`
      + `<option value="gross">${escapeHtml(T('calc.custom.baseGross'))}</option><option value="incomeTax"${l.base === 'incomeTax' ? ' selected' : ''}>${escapeHtml(T('calc.custom.baseTax'))}</option></select>`
      + `<button type="button" class="btn btn-sm btn-ghost" data-remove aria-label="${escapeHtml(T('calc.custom.removeLevy', { n }))}">✕</button>`;
    levyRows.appendChild(row);
  }

  // Row labels say "bracket 2": renumber after a removal
  function renumber() {
    Array.from(bracketRows.children).forEach((tr, i) => {
      const n = i + 1;
      tr.querySelector('[data-field="from"]').setAttribute('aria-label', T('calc.custom.fromRow', { n }));
      tr.querySelector('[data-field="to"]').setAttribute('aria-label', T('calc.custom.toRow', { n }));
      tr.querySelector('[data-field="rate"]').setAttribute('aria-label', T('calc.custom.rateRow', { n }));
      tr.querySelector('[data-remove]').setAttribute('aria-label', T('calc.custom.removeBracket', { n }));
    });
    Array.from(levyRows.children).forEach((row, i) => {
      const n = i + 1;
      row.querySelector('[data-field="label"]').setAttribute('aria-label', T('calc.custom.levyName', { n }));
      row.querySelector('[data-field="rate"]').setAttribute('aria-label', T('calc.custom.levyRate', { n }));
      row.querySelector('[data-field="base"]').setAttribute('aria-label', T('calc.custom.levyBase', { n }));
      row.querySelector('[data-remove]').setAttribute('aria-label', T('calc.custom.removeLevy', { n }));
    });
  }

  function readCustom() {
    const field = (el, name) => el.querySelector(`[data-field="${name}"]`).value.trim();
    const settings = {
      currency: currencySelect.value,
      brackets: Array.from(bracketRows.children).map(tr => ({ from: field(tr, 'from'), to: field(tr, 'to'), rate: field(tr, 'rate') })),
      levies: Array.from(levyRows.children).map(row => ({ label: field(row, 'label'), rate: field(row, 'rate'), base: field(row, 'base') }))
    };
    customBox.querySelectorAll('[data-custom]').forEach(el => { settings[el.dataset.custom] = el.value.trim(); });
    return settings;
  }

  function writeCustom(s) {
    if (Array.from(currencySelect.options).some(o => o.value === s.currency)) currencySelect.value = s.currency;
    bracketRows.innerHTML = '';
    (s.brackets || []).forEach(addBracketRow);
    if (!bracketRows.children.length) addBracketRow({ from: 0, to: '', rate: '' });
    levyRows.innerHTML = '';
    (s.levies || []).forEach(addLevyRow);
    customBox.querySelectorAll('[data-custom]').forEach(el => { el.value = s[el.dataset.custom] === undefined ? '' : s[el.dataset.custom]; });
    $('stc-currency-code').textContent = currencyOf();
  }

  function typicalAnnual() {
    try { return engine.toAnnual(salaryInput.value || 0, getPeriod(), hoursInput.value) || undefined; } catch (e) { return undefined; }
  }

  function loadCustom(code) {
    const saved = store.get(`custom:${code}`);
    if (saved && saved.brackets) return saved;
    return engine.customTemplate('progressive', byCode(code).currency, typicalAnnual());
  }

  function applyTemplate() {
    const value = templateSelect.value;
    const cur = currencySelect.value || country().currency;
    let settings;
    if (value.startsWith('copy:')) {
      const [, code, year, status] = value.split(':');
      settings = engine.customFromDataset(builtinDataset(code, year), status || undefined);
    } else {
      settings = engine.customTemplate(value, cur, typicalAnnual());
    }
    writeCustom(settings);
    calculate();
  }

  customBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const row = btn.closest('tr, .stc-levy');
    const rows = row.parentElement;
    row.remove();
    if (rows === bracketRows && !rows.children.length) addBracketRow({ from: 0, to: '', rate: '' });
    renumber();
    calculate();
  });
  $('stc-add-bracket').addEventListener('click', () => {
    const last = bracketRows.lastElementChild;
    const from = last ? last.querySelector('[data-field="to"]').value : '';
    addBracketRow({ from, to: '', rate: '' });
    bracketRows.lastElementChild.querySelector(from ? '[data-field="rate"]' : '[data-field="from"]').focus();
  });
  $('stc-add-levy').addEventListener('click', () => {
    addLevyRow({ label: '', rate: '', base: 'gross' });
    levyRows.lastElementChild.querySelector('[data-field="label"]').focus();
  });
  $('stc-template-apply').addEventListener('click', applyTemplate);
  currencySelect.addEventListener('change', () => { $('stc-currency-code').textContent = currencyOf(); calculate(); });

  // --- Inputs and saved state ---------------------------------------------------------------

  const getPeriod = () => (Array.from(periodInputs).find(i => i.checked) || {}).value || 'monthly';
  const setPeriod = (value) => periodInputs.forEach(i => { i.checked = i.value === value; });
  const syncHours = () => { hoursGroup.hidden = getPeriod() !== 'hourly'; };

  function defaults() {
    const d = mode() === 'builtin' ? builtinDataset(state.country, state.year) : null;
    return { salary: d && d.defaults ? String(d.defaults.salary) : '', period: (d && d.defaults && d.defaults.period) || 'monthly', hours: '40' };
  }

  function applyInputs(v) {
    salaryInput.value = v.salary || '';
    setPeriod(v.period || 'monthly');
    hoursInput.value = v.hours || '40';
    syncHours();
    if (v.status && statusSelect.querySelector(`option[value="${v.status}"]`)) {
      statusSelect.value = v.status;
      renderOptions();
    }
    if (v.options) {
      Object.assign(optionValues, v.options);
      renderOptions();
    }
  }

  function loadInputs() {
    const saved = store.get(`state:${state.country}`);
    const start = defaults();
    // No saved state and no default salary (custom and no-tax countries): keep what was typed
    if (!saved && !start.salary) Object.assign(start, { salary: salaryInput.value.trim(), period: getPeriod(), hours: hoursInput.value });
    applyInputs({ ...start, ...(saved || {}) });
  }

  function saveState() {
    if (!state.country) return;
    store.set(`state:${state.country}`, {
      salary: salaryInput.value.trim(), period: getPeriod(), hours: hoursInput.value.trim(),
      status: statusSelect.value, options: readOptions()
    });
    if (mode() === 'custom') store.set(`custom:${state.country}`, readCustom());
  }

  // --- Calculation and result ---------------------------------------------------------------

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    salaryInput.removeAttribute('aria-invalid');
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    salaryInput.setAttribute('aria-invalid', 'true');
  }

  function currentDataset() {
    const m = mode();
    if (m === 'builtin') return builtinDataset(state.country, state.year);
    if (m === 'noTax') return { country: state.country, currency: country().currency, noTax: true, slabs: [{ over: 0, upTo: null, rate: 0 }] };
    return engine.customDataset({ ...readCustom(), country: state.country });
  }

  function payInput() {
    return { amount: salaryInput.value.trim(), period: getPeriod(), hoursPerWeek: hoursInput.value, status: statusSelect.value || undefined, options: readOptions() };
  }

  function calculate(fromSubmit) {
    clearError();
    const raw = salaryInput.value.trim();
    if (!raw) {
      if (fromSubmit === true) showError(T('calc.errors.salaryRequired'));
      else resultBox.classList.remove('is-visible');
      return;
    }
    try {
      const dataset = currentDataset();
      const res = engine.calculatePay(dataset, payInput());
      renderResult(res, dataset);
      saveState();
      customState.value = mode() === 'custom' ? engine.encodeCustom(readCustom()) : '';
      ToolsBuilt.resultLink.update();
    } catch (err) {
      showError(err.message);
    }
  }

  function lineLabel(l, i) {
    if (l.id === 'incomeTax') return T('calc.lines.incomeTax');
    if (/^levy\d+$/.test(l.id)) return l.label || T('calc.lines.levy', { n: l.id.slice(4) });
    return L(`calc.lines.${l.id}`, l.label || l.id);
  }

  function deductionLabel(d) {
    return L(`calc.deductions.${d.id}`, L(`calc.options.${d.id}.label`, d.label || d.id));
  }

  function renderResult(res, dataset) {
    const cur = dataset.currency;
    const money = (n) => ToolsBuilt.money(n, cur);
    const c = country();
    const name = nameOf(c);

    $('result-primary-text').textContent = T('calc.result.primary', { net: money(res.views.net.monthly) });
    $('stat-net-annual').textContent = money(res.net);
    $('stat-total-tax').textContent = money(res.totalTaxes);
    $('stat-effective-rate').textContent = pct(res.effectiveRate);
    $('stat-marginal-rate').textContent = pct(res.marginalRate);

    // Lines worth showing: income tax always, other lines only when they cost something
    const lines = res.lines.filter(l => l.id === 'incomeTax' || l.amount > 0);
    const row = (label, v, cls) => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${escapeHtml(label)}</th><td>${money(v.annual)}</td><td>${money(v.monthly)}</td><td>${money(v.weekly)}</td></tr>`;
    $('stc-breakdown-rows').innerHTML = row(T('calc.result.gross'), res.views.gross, 'stc-row-gross')
      + lines.map((l, i) => row(`− ${lineLabel(l, i)}`, l, `stc-row-${l.kind}`)).join('')
      + row(T('calc.result.totalDeducted'), res.views.totalDeducted, 'stc-row-total')
      + row(T('calc.result.net'), res.views.net, 'stc-row-net');

    renderChart(res, lines, money);

    // Taxable income: what came off before the brackets, then rebate, surcharge and cess
    const parts = res.deductions.filter(d => d.amount > 0).map(d => T('calc.result.deductionItem', { label: escapeHtml(deductionLabel(d)), amount: money(d.amount) }));
    const tax = res.incomeTax;
    const extras = [];
    if (tax.rebate) extras.push(T('calc.result.rebate', { amount: money(tax.rebate) }));
    if (tax.surcharge) extras.push(T('calc.result.surcharge', { amount: money(tax.surcharge) }));
    if (tax.cess) extras.push(T('calc.result.cess', { amount: money(tax.cess), rate: ratePct(dataset.cess.rate) }));
    $('stc-taxable').innerHTML = dataset.noTax ? T('calc.result.noTax', { name: escapeHtml(name) })
      : T('calc.result.taxable', { amount: money(res.taxableIncome) })
        + (parts.length ? ` ${T('calc.result.afterDeductions', { list: parts.join(', ') })}` : '')
        + (extras.length ? ` ${extras.join(' ')}` : '');

    const bandRows = res.bands.map(b => {
      const current = res.taxableIncome > b.over && (b.upTo === null || res.taxableIncome <= b.upTo) || (res.taxableIncome === 0 && b.index === 0);
      const range = b.upTo === null ? T('calc.result.over', { from: money(b.over) }) : T('calc.result.range', { from: money(b.over), to: money(b.upTo) });
      return `<tr${current ? ' class="is-current" aria-current="true"' : ''}><td>${range}${current ? ` <span class="stc-you">${T('calc.result.yourBand')}</span>` : ''}</td><td>${ratePct(b.rate)}</td><td>${money(b.amount)}</td><td>${money(b.tax)}</td></tr>`;
    }).join('');
    $('stc-band-rows').innerHTML = bandRows
      + `<tr class="stc-row-total"><th scope="row" colspan="3">${T('calc.result.bandsTotal')}</th><td>${money(tax.grossTax)}</td></tr>`;

    renderCompare(res, money);

    // Where the rules come from
    const m = mode();
    let source = '';
    if (m === 'builtin') {
      const links = (dataset.sources || []).map((s, i) => `<a href="${escapeHtml(s.url)}" rel="noopener" target="_blank">${escapeHtml(new URL(s.url).hostname.replace(/^www\./, ''))}${dataset.sources.length > 1 ? ` (${i + 1})` : ''}</a>`);
      source = T('calc.result.source', { label: escapeHtml(yearLabel(dataset)), date: escapeHtml(ToolsBuilt.formatIsoDate(dataset.verifiedOn)), links: links.join(', ') });
    } else if (m === 'custom') {
      source = T('calc.result.customSource');
    }
    $('stc-source').innerHTML = source;

    const copyText = T('calc.result.copyText', {
      country: name, label: m === 'builtin' ? yearLabel(dataset) : T('calc.badges.custom'),
      gross: money(res.gross), tax: money(res.totalTaxes), net: money(res.net), monthly: money(res.views.net.monthly), effective: res.effectiveRate.toFixed(2)
    });
    const actionCopyBtn = $('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = copyText;
    resultBox.classList.add('is-visible');
  }

  function renderChart(res, lines, money) {
    const svg = $('stc-chart');
    const segments = [{ key: 'net', label: T('calc.result.net'), amount: Math.max(0, res.net) }]
      .concat(lines.filter(l => l.amount > 0).map((l, i) => ({ key: l.kind === 'tax' ? 'tax' : l.kind, label: lineLabel(l, i), amount: l.amount })));
    const total = segments.reduce((s, x) => s + x.amount, 0);
    let x = 0;
    const rects = total > 0 ? segments.map((s, i) => {
      const w = (s.amount / total) * 100;
      const rect = `<rect class="stc-seg stc-seg-${s.key}${i > 1 ? ` stc-seg-${s.key}-${i % 3}` : ''}" x="${x.toFixed(3)}" y="0" width="${w.toFixed(3)}" height="10"></rect>`;
      x += w;
      return rect;
    }).join('') : '';
    const summary = segments.map(s => `${s.label} ${money(s.amount)} (${pct(total ? (s.amount / total) * 100 : 0)})`).join(', ');
    svg.innerHTML = `<title id="stc-chart-desc">${escapeHtml(T('calc.result.chartTitle'))}: ${escapeHtml(summary)}</title>${rects}`;
    $('stc-legend').innerHTML = segments.map((s, i) =>
      `<li><span class="stc-swatch stc-seg-${s.key}${i > 1 ? ` stc-seg-${s.key}-${i % 3}` : ''}" aria-hidden="true"></span>${escapeHtml(s.label)} <strong>${pct(total ? (s.amount / total) * 100 : 0)}</strong></li>`).join('');
  }

  // Same salary under another tax year of the same country (e.g. Pakistan 2026-27 vs 2025-26)
  function renderCompare(res, money) {
    const box = $('stc-compare');
    box.textContent = '';
    if (mode() !== 'builtin') return;
    const c = country();
    const other = c.years.find(y => y !== state.year);
    if (!other) return;
    try {
      const d = builtinDataset(c.code, other);
      const input = payInput();
      if (input.status && !(d.statuses && d.statuses[input.status])) return;
      const otherRes = engine.calculatePay(d, input);
      const diff = (otherRes.totalTaxes - res.totalTaxes) / 12;
      const vars = { amount: money(Math.abs(diff)), year: yearLabel(d) };
      box.textContent = Math.abs(diff) < 0.005 ? T('calc.result.compareSame', vars)
        : diff > 0 ? T('calc.result.compareLess', vars) : T('calc.result.compareMore', vars);
    } catch (e) {}
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  // --- Events -------------------------------------------------------------------------------

  salaryInput.addEventListener('input', debouncedCalculate);
  hoursInput.addEventListener('input', debouncedCalculate);
  periodInputs.forEach(el => el.addEventListener('change', () => { syncHours(); calculate(); }));
  yearSelect.addEventListener('change', () => {
    state.year = yearSelect.value;
    renderMode();
    calculate();
  });
  statusSelect.addEventListener('change', () => { renderOptions(); calculate(); });
  optionsBox.addEventListener('input', debouncedCalculate);
  optionsBox.addEventListener('change', calculate);
  customBox.addEventListener('input', (e) => { if (!e.target.closest('#stc-template')) debouncedCalculate(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate(true);
  });

  $('reset-btn').addEventListener('click', () => {
    store.remove(`state:${state.country}`);
    store.remove(`custom:${state.country}`);
    Object.keys(optionValues).forEach(k => delete optionValues[k]);
    state.customForced = false;
    customBox.dataset.country = '';
    renderMode();
    applyInputs(defaults());
    if (mode() === 'custom') writeCustom(loadCustom(state.country));
    calculate();
  });

  // --- Start: URL, page preset, saved choice, then a guess ------------------------------------

  function initialCountry(params) {
    const fromUrl = (params.get('country') || '').toUpperCase();
    if (byCode(fromUrl)) return fromUrl;
    if (byCode(root.dataset.presetCountry)) return root.dataset.presetCountry;
    const last = store.get('last');
    if (byCode(last)) return last;
    const guess = ToolsBuilt.guessCountry();
    if (guess && byCode(guess.code)) return guess.code;
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const l of langs) {
      const region = (l.split('-')[1] || '').toUpperCase();
      if (byCode(region)) return region;
    }
    return 'PK';
  }

  fillCurrencies();
  fillTemplates();
  let params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = new URLSearchParams(); }
  const startCode = initialCountry(params);
  const custom = engine.decodeCustom(params.get('custom'));
  if (custom && byCode(startCode).rules === 'noTax') state.customForced = true;
  selectCountry(startCode, params.get('year') || root.dataset.presetYear);
  if (custom && mode() === 'custom') {
    writeCustom(custom);
    customBox.dataset.country = startCode;
  }
  if (params.get('status') && statusSelect.querySelector(`option[value="${params.get('status')}"]`)) {
    statusSelect.value = params.get('status');
    renderOptions();
  }
  // Result links (?salary=&period=&status=&o-<option>=) take priority over saved state
  // (a link with only ?country= / ?year= still starts from the saved or default salary)
  if (!ToolsBuilt.resultLink.restore().includes(salaryInput)) loadInputs();
  syncHours();
  calculate();
});
