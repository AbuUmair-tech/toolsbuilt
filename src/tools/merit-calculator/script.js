/**
 * Merit & Aggregate Calculator UI Controller
 * Powered by MeritLogic. Custom weights for up to five components, or verified
 * presets from src/_data/meritPresets.json (rendered into #merit-presets).
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.MeritLogic;
  const T = ToolsBuilt.scope('merit-calculator');
  const form = document.getElementById('calculator-form');
  const presetSelect = document.getElementById('preset');
  const presetNotes = Array.from(document.querySelectorAll('[data-preset-note]'));
  const rowEls = Array.from(document.querySelectorAll('.merit-row'));
  const weightTotalText = document.getElementById('weight-total');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const tableBody = document.getElementById('merit-table-rows');
  const stepsList = document.getElementById('result-steps');

  let presets = [];
  try { presets = JSON.parse(document.getElementById('merit-presets').textContent) || []; } catch (e) {}

  const DEFAULT_CUSTOM = [
    [T('defaults.matric'), '900', '1100', '10'],
    [T('defaults.intermediate'), '950', '1100', '40'],
    [T('defaults.entryTest'), '300', '400', '50']
  ];
  const FIELD_CLASS = { name: '.comp-name', obtained: '.comp-obtained', total: '.comp-total', weight: '.comp-weight' };
  let debounceTimer = null;

  const fieldOf = (row, key) => row.querySelector(FIELD_CLASS[key]);
  const round = (n, dp) => Math.round((n + Number.EPSILON) * Math.pow(10, dp)) / Math.pow(10, dp);

  function fillRows(list) {
    rowEls.forEach((row, i) => {
      const values = list[i] || ['', '', '', ''];
      ['name', 'obtained', 'total', 'weight'].forEach((key, k) => { fieldOf(row, key).value = values[k]; });
    });
  }

  /** Shows the chosen preset: fixed names and weights, unused rows hidden. keepMarks keeps typed marks. */
  function applyPreset(keepMarks) {
    const preset = presets.find(p => p.id === presetSelect.value);
    rowEls.forEach((row, i) => {
      const comp = preset ? preset.components[i] : null;
      const name = fieldOf(row, 'name');
      const weight = fieldOf(row, 'weight');
      name.readOnly = !!preset;
      weight.readOnly = !!preset;
      row.hidden = !!preset && !comp;
      if (preset) {
        name.value = comp ? comp.name : '';
        weight.value = comp ? String(comp.weight) : '';
        if (!comp || !keepMarks) {
          fieldOf(row, 'obtained').value = '';
          fieldOf(row, 'total').value = '';
        }
      }
    });
    presetNotes.forEach(note => { note.hidden = !preset || note.dataset.presetNote !== preset.id; });
  }

  function updateWeightTotal() {
    const total = rowEls.filter(r => !r.hidden).reduce((s, r) => s + (Number(fieldOf(r, 'weight').value) || 0), 0);
    weightTotalText.textContent = T(Math.abs(total - 100) < 1e-6 ? 'weights.ok' : 'weights.notOk', { total: round(total, 4) });
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    form.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
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

  function calculate() {
    clearError();
    updateWeightTotal();
    const visible = rowEls.filter(r => !r.hidden);
    const res = logic.calculateMerit(visible.map(r => ({
      name: fieldOf(r, 'name').value,
      obtained: fieldOf(r, 'obtained').value,
      total: fieldOf(r, 'total').value,
      weight: fieldOf(r, 'weight').value
    })));
    if (res.error) {
      const row = res.rowIndex !== undefined ? visible[res.rowIndex] : null;
      return showError(res.error, row && res.field ? fieldOf(row, res.field) : null);
    }

    const preset = presets.find(p => p.id === presetSelect.value);
    headerText.textContent = preset ? T('result.headerPreset', { preset: preset.name }) : T('result.header');
    primaryText.textContent = `${res.aggregateRounded.toFixed(2)}%`;
    tableBody.replaceChildren(...res.rows.map(r => {
      const tr = document.createElement('tr');
      [r.name, `${r.obtained} / ${r.total}`, `${round(r.percentage, 2).toFixed(2)}%`, `${r.weight}%`, round(r.contribution, 2).toFixed(2)].forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 1 || i === 3) td.className = 'wide-only';
        tr.appendChild(td);
      });
      return tr;
    }));
    stepsList.replaceChildren(...res.steps.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) {
      barCopy.dataset.copyText = res.rows.map(r => T('copy.row', { name: r.name, obtained: r.obtained, total: r.total, weight: r.weight, contribution: round(r.contribution, 4) })).join('\n') + '\n' + T('copy.aggregate', { aggregate: res.aggregateRounded.toFixed(2) });
    }
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  form.querySelector('.merit-rows').addEventListener('input', debounced);
  // Switching to Custom keeps the current rows editable; switching to a preset keeps typed marks
  presetSelect.addEventListener('change', () => {
    applyPreset(true);
    if (presetSelect.value === 'custom') rowEls.forEach(r => { r.hidden = false; });
    calculate();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    presetSelect.value = 'custom';
    fillRows(DEFAULT_CUSTOM);
    applyPreset(false);
    calculate();
  });

  // A link with any component fields describes the rows itself; otherwise start from the example
  let fromLink = false;
  try {
    new URLSearchParams(window.location.search).forEach((_, key) => { if (/^c\d[notw]$/.test(key)) fromLink = true; });
  } catch (e) {}
  if (!fromLink) fillRows(DEFAULT_CUSTOM);
  ToolsBuilt.resultLink.restore();
  applyPreset(true);
  calculate();
});
