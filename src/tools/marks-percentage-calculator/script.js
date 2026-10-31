/**
 * Marks Percentage Calculator UI Controller
 * Powered by MarksPercentageLogic pure module.
 * Total and subject-wise modes, add/remove subject rows, grade highlighting,
 * debounced live calculation, shareable result links (total mode), localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.MarksPercentageLogic;
  const form = document.getElementById('calculator-form');
  const modeFieldset = document.getElementById('mode-fieldset');
  const modeInputs = document.querySelectorAll('input[name="marks-mode"]');
  const panelTotal = document.getElementById('panel-total');
  const panelSubjects = document.getElementById('panel-subjects');
  const obtainedInput = document.getElementById('obtained-marks');
  const totalInput = document.getElementById('total-marks');
  const tbody = document.getElementById('subjects-tbody');
  const addBtn = document.getElementById('add-subject-btn');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const scaleSelect = document.getElementById('grading-scale');
  const customPanel = document.getElementById('custom-scale-panel');
  const customTbody = document.getElementById('custom-scale-tbody');
  const addGradeBtn = document.getElementById('add-grade-btn');
  const gradingTbody = document.getElementById('grading-tbody');
  const gradingNote = document.getElementById('grading-note');
  const gradeLabel = document.getElementById('stat-grade-label');
  const SCALES = (() => {
    try { return JSON.parse(document.getElementById('grading-data').textContent); } catch (e) { return []; }
  })();
  // Starting rows for a new custom scale
  const CUSTOM_START = [{ grade: 'A', min: '90' }, { grade: 'B', min: '80' }, { grade: 'C', min: '70' }, { grade: 'D', min: '60' }, { grade: 'F', min: '0' }];

  const STORAGE_KEY = 'toolsbuilt:marks-percentage-calculator';
  const START_ROWS = 5;
  const DEFAULTS = { mode: 'total', obtained: '870', total: '1100', subjects: [], scale: SCALES.length ? SCALES[0].code : 'custom', custom: CUSTOM_START };
  let debounceTimer = null;
  let lastResultText = '';

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  const fmtNum = (n) => Number(n.toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const getMode = () => (Array.from(modeInputs).find(i => i.checked) || {}).value || 'total';
  const setMode = (value) => modeInputs.forEach(i => { i.checked = i.value === value; });

  // ---- Subject rows ----
  const rowTemplate = tbody.querySelector('.subject-row').cloneNode(true);

  function renumberRows() {
    tbody.querySelectorAll('.subject-row').forEach((tr, i) => {
      const n = i + 1;
      tr.querySelector('.subject-name').placeholder = `Subject ${n}`;
      tr.querySelector('.subject-name').setAttribute('aria-label', `Subject ${n} name`);
      tr.querySelector('.subject-obtained').setAttribute('aria-label', `Subject ${n} obtained marks`);
      tr.querySelector('.subject-total').setAttribute('aria-label', `Subject ${n} total marks`);
      tr.querySelector('.remove-subject-btn').setAttribute('aria-label', `Remove subject ${n}`);
    });
  }

  function addRow(values) {
    const tr = rowTemplate.cloneNode(true);
    tr.querySelectorAll('input').forEach(i => { i.value = ''; i.removeAttribute('aria-invalid'); });
    tr.querySelector('.subject-percent').textContent = '–';
    if (values) {
      tr.querySelector('.subject-name').value = values.name || '';
      tr.querySelector('.subject-obtained').value = values.obtained || '';
      tr.querySelector('.subject-total').value = values.total || '';
    }
    tbody.appendChild(tr);
    renumberRows();
    return tr;
  }

  function setRows(subjects) {
    tbody.innerHTML = '';
    const list = subjects && subjects.length ? subjects : [];
    list.forEach(s => addRow(s));
    for (let i = list.length; i < START_ROWS; i++) addRow();
  }

  function readRows() {
    return Array.from(tbody.querySelectorAll('.subject-row')).map(tr => ({
      name: tr.querySelector('.subject-name').value.trim(),
      obtained: tr.querySelector('.subject-obtained').value.trim(),
      total: tr.querySelector('.subject-total').value.trim()
    }));
  }

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-subject-btn');
    if (!btn) return;
    const rows = tbody.querySelectorAll('.subject-row');
    if (rows.length <= 1) {
      rows[0].querySelectorAll('input').forEach(i => { i.value = ''; });
    } else {
      btn.closest('.subject-row').remove();
      renumberRows();
    }
    calculate();
  });

  addBtn.addEventListener('click', () => {
    addRow().querySelector('.subject-name').focus();
  });

  // ---- State ----
  function syncPanels() {
    const subjectsMode = getMode() === 'subjects';
    panelTotal.hidden = subjectsMode;
    panelSubjects.hidden = !subjectsMode;
  }

  function applyValues(v) {
    scaleSelect.value = SCALES.some(sc => sc.code === v.scale) || v.scale === 'custom' ? v.scale : DEFAULTS.scale;
    setCustomRows(v.custom);
    setMode(v.mode);
    obtainedInput.value = v.obtained;
    totalInput.value = v.total;
    setRows(v.subjects);
    syncPanels();
  }

  function initInputs() {
    // Result links (?mode=&obtained=&total=&scale=) take priority over saved state
    DEFAULTS.scale = guessScale();
    scaleSelect.value = DEFAULTS.scale;
    setCustomRows(CUSTOM_START);
    if (ToolsBuilt.resultLink.restore().length) {
      setRows([]);
      syncPanels();
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        applyValues({ ...DEFAULTS, ...JSON.parse(saved) });
        return;
      }
    } catch (e) {}

    applyValues(DEFAULTS);
  }

  function saveState() {
    const rows = readRows().filter(r => r.name || r.obtained || r.total);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: getMode(), obtained: obtainedInput.value.trim(), total: totalInput.value.trim(), subjects: rows,
        scale: scaleSelect.value, custom: readCustomRows()
      }));
    } catch (e) {}

    // Subject rows and custom scales are not put in the URL; in subject-wise mode the link
    // only opens that mode
    ToolsBuilt.resultLink.update(getMode() === 'subjects' ? modeFieldset : form);
  }

  // ---- Grading scales ----
  const customRowTemplate = customTbody.querySelector('.custom-scale-row').cloneNode(true);

  function setCustomRows(rows) {
    customTbody.innerHTML = '';
    (rows && rows.length ? rows : CUSTOM_START).forEach(r => {
      const tr = customRowTemplate.cloneNode(true);
      tr.querySelector('.custom-grade').value = r.grade || '';
      tr.querySelector('.custom-min').value = r.min === undefined ? '' : r.min;
      customTbody.appendChild(tr);
    });
    renumberCustomRows();
  }

  function renumberCustomRows() {
    customTbody.querySelectorAll('.custom-scale-row').forEach((tr, i) => {
      const n = i + 1;
      tr.querySelector('.custom-grade').setAttribute('aria-label', `Grade ${n} name`);
      tr.querySelector('.custom-min').setAttribute('aria-label', `Grade ${n} minimum percentage`);
      tr.querySelector('.remove-grade-btn').setAttribute('aria-label', `Remove grade ${n}`);
    });
  }

  function readCustomRows() {
    return Array.from(customTbody.querySelectorAll('.custom-scale-row')).map(tr => ({
      grade: tr.querySelector('.custom-grade').value.trim(),
      min: tr.querySelector('.custom-min').value.trim()
    }));
  }

  // The scale to grade with; a custom scale is validated here and may throw
  function currentScale() {
    if (scaleSelect.value === 'custom') {
      const scale = logic.customScale(readCustomRows());
      return { ...scale, code: 'custom', name: 'Custom scale', note: 'Your own grading scale.' };
    }
    return SCALES.find(sc => sc.code === scaleSelect.value) || SCALES[0];
  }

  function bandRange(bands, i) {
    const band = bands[i];
    if (band.label) return band.label;
    const next = bands[i - 1];
    if (!next) return `${band.min}% and above`;
    if (band.min === 0) return `Below ${next.min}%`;
    return `${band.min}% to below ${next.min}%`;
  }

  // Reference table and note for the chosen scale
  function renderScale() {
    customPanel.hidden = scaleSelect.value !== 'custom';
    let scale;
    try { scale = currentScale(); } catch (e) { scale = null; }
    const rows = !scale ? []
      : scale.type === 'pass'
        ? [[scale.passLabel, `${scale.passMark}% or more`], [scale.failLabel, `Below ${scale.passMark}%`]]
        : scale.bands.map((b, i) => [b.grade, bandRange(scale.bands, i)]);
    gradingTbody.innerHTML = '';
    rows.forEach(([grade, range], i) => {
      const tr = document.createElement('tr');
      tr.dataset.gradeIndex = i;
      const name = document.createElement('td');
      name.textContent = grade;
      const you = document.createElement('span');
      you.className = 'grade-you';
      you.textContent = ' · your grade';
      name.appendChild(you);
      const pct = document.createElement('td');
      pct.textContent = range;
      tr.append(name, pct);
      gradingTbody.appendChild(tr);
    });
    gradingNote.textContent = scale ? scale.note : 'Complete your custom scale to see it here.';
    if (scale && scale.source) {
      const link = document.createElement('a');
      link.href = scale.source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = scale.source.name;
      const checked = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(`${scale.verifiedOn}T00:00:00`));
      gradingNote.append(' Source: ', link, `, checked ${checked}.`);
    }
    gradeLabel.textContent = scale && scale.type === 'pass' ? 'Result' : 'Grade';
  }

  // Preset for the visitor's country, if there is one
  function guessScale() {
    const guess = ToolsBuilt.guessCountry();
    const match = guess && SCALES.find(sc => sc.country === guess.code);
    return match ? match.code : DEFAULTS.scale;
  }

  customTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-grade-btn');
    if (!btn) return;
    if (customTbody.querySelectorAll('.custom-scale-row').length <= 1) return;
    btn.closest('.custom-scale-row').remove();
    renumberCustomRows();
    renderScale();
    calculate(false);
  });

  addGradeBtn.addEventListener('click', () => {
    const tr = customRowTemplate.cloneNode(true);
    tr.querySelectorAll('input').forEach(i => { i.value = ''; });
    customTbody.appendChild(tr);
    renumberCustomRows();
    tr.querySelector('.custom-grade').focus();
  });

  scaleSelect.addEventListener('change', () => {
    renderScale();
    calculate(false);
  });

  // ---- Calculation ----
  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    highlightGrade(null);
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  function hideResult() {
    resultBox.classList.remove('is-visible');
    highlightGrade(null);
  }

  function calculate(fromSubmit) {
    clearError();
    syncPanels();
    renderScale();
    try {
      const res = getMode() === 'subjects' ? calculateSubjects(fromSubmit) : calculateTotal(fromSubmit);
      if (!res) return;
      renderResult(res);
      saveState();
    } catch (err) {
      showError(err.message, err.field);
    }
  }

  function calculateTotal(fromSubmit) {
    const obtained = obtainedInput.value.trim();
    const total = totalInput.value.trim();
    if (!obtained && !total && !fromSubmit) { hideResult(); return null; }
    const scale = currentScale();
    try {
      return { ...logic.calculatePercentage(obtained, total, scale), scale };
    } catch (err) {
      err.field = /total/i.test(err.message) && !/obtained/i.test(err.message) ? totalInput : obtainedInput;
      throw err;
    }
  }

  function calculateSubjects(fromSubmit) {
    const trs = Array.from(tbody.querySelectorAll('.subject-row'));
    const rows = readRows();

    // Live per-subject percentages, even before the whole table is valid
    trs.forEach((tr, i) => {
      const o = parseFloat(rows[i].obtained);
      const t = parseFloat(rows[i].total);
      tr.querySelector('.subject-percent').textContent = isFinite(o) && isFinite(t) && t > 0 && o >= 0 && o <= t
        ? `${fmtNum((o / t) * 100)}%` : '–';
    });

    if (rows.every(r => !r.obtained && !r.total) && !fromSubmit) { hideResult(); return null; }
    const scale = currentScale();
    try {
      return { ...logic.calculateSubjects(rows, scale), scale };
    } catch (err) {
      // Point at the row named in the message
      const match = err.message.match(/Subject (\d+)/) || null;
      const named = rows.findIndex(r => r.name && err.message.includes(r.name));
      const index = match ? Number(match[1]) - 1 : named;
      if (index >= 0 && trs[index]) {
        const field = /total/i.test(err.message) && !/obtained/i.test(err.message) ? '.subject-total' : '.subject-obtained';
        err.field = trs[index].querySelector(field);
      }
      throw err;
    }
  }

  function renderResult(res) {
    const pct = `${fmtNum(res.percentage)}%`;
    const marks = `${fmtNum(res.obtained)} / ${fmtNum(res.total)}`;
    document.getElementById('result-header-text').textContent = res.subjects ? `Overall percentage (${res.subjects.length} ${res.subjects.length === 1 ? 'subject' : 'subjects'})` : 'Your percentage';
    document.getElementById('result-primary-text').textContent = pct;
    document.getElementById('stat-marks').textContent = marks;
    document.getElementById('stat-percentage').textContent = pct;
    document.getElementById('stat-grade').textContent = res.grade;

    let steps = '';
    if (res.subjects) {
      steps += `Grand total obtained: ${res.subjects.map(s => fmtNum(s.obtained)).join(' + ')} = <code>${fmtNum(res.obtained)}</code><br>`;
      steps += `Grand total marks: ${res.subjects.map(s => fmtNum(s.total)).join(' + ')} = <code>${fmtNum(res.total)}</code><br>`;
    }
    steps += `Percentage: ${fmtNum(res.obtained)} ÷ ${fmtNum(res.total)} × 100 = <strong>${pct}</strong><br>`;
    const scaleName = res.scale.name;
    steps += `${res.scale.type === 'pass' ? 'Result' : 'Grade'}: <strong>${escapeHtml(res.grade)}</strong> (${escapeHtml(scaleName)})`;
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = res.subjects
      ? `${res.subjects.map(s => `${s.name}: ${fmtNum(s.obtained)}/${fmtNum(s.total)} (${fmtNum(s.percentage)}%)`).join(', ')}. Total ${marks} = ${pct}, ${res.grade} (${scaleName}).`
      : `${marks} = ${pct}, ${res.grade} (${scaleName}).`;
    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    highlightGrade(res.index);
    resultBox.classList.add('is-visible');
  }

  function highlightGrade(index) {
    document.querySelectorAll('.grading-table tr[data-grade-index]').forEach(tr => {
      const isCurrent = index !== null && Number(tr.dataset.gradeIndex) === index;
      tr.classList.toggle('is-current', isCurrent);
      if (isCurrent) tr.setAttribute('aria-current', 'true');
      else tr.removeAttribute('aria-current');
    });
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => calculate(false), 150);
  }

  form.addEventListener('input', (e) => {
    if (e.target.matches('input[type="number"], input[type="text"]')) debouncedCalculate();
  });
  modeInputs.forEach(el => el.addEventListener('change', () => calculate(false)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate(true);
  });

  resetBtn.addEventListener('click', () => {
    applyValues(DEFAULTS);
    clearError();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate(false);
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Marks percentage copied to clipboard');
      }
    });
  }

  initInputs();
  calculate(false);
});
