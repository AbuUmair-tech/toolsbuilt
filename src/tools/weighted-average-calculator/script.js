/**
 * Weighted Average Calculator UI Controller
 * Powered by WeightedAverageLogic. Dynamic rows (each with data-param n#/v#/w#
 * so shared links recreate them), % or plain weights, contributions and steps.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.WeightedAverageLogic;
  const form = document.getElementById('calculator-form');
  const rowsBox = document.getElementById('wavg-rows');
  const template = document.getElementById('row-template');
  const typeRadios = Array.from(document.querySelectorAll('input[name="wt"]'));
  const weightHead = document.getElementById('weight-head');
  const addBtn = document.getElementById('add-row-btn');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('result-note');
  const contribBody = document.getElementById('contrib-rows');
  const stepsList = document.getElementById('result-steps');

  const MAX_UI_ROWS = 20;
  const DEFAULT_ROWS = [['Assignments', '90', '30'], ['Midterm', '80', '50'], ['Quizzes', '70', '20']];
  let debounceTimer = null;
  let rowSeq = 0;

  const weightType = () => (typeRadios.find(r => r.checked) || typeRadios[0]).value;
  const rows = () => Array.from(rowsBox.querySelectorAll('.wavg-row'));

  // Row inputs are named by position (n1, v1, w1 …) so a shared link restores them in order
  function renumber() {
    rows().forEach((row, i) => {
      const n = i + 1;
      row.querySelector('.row-name').dataset.param = `n${n}`;
      row.querySelector('.row-value').dataset.param = `v${n}`;
      row.querySelector('.row-weight').dataset.param = `w${n}`;
      row.querySelector('.wavg-remove').setAttribute('aria-label', `Remove row ${n}`);
      row.querySelector('.wavg-remove').disabled = rows().length === 1;
    });
    addBtn.disabled = rows().length >= MAX_UI_ROWS;
    syncWeightLabels();
  }

  function addRow(values = ['', '', '']) {
    if (rows().length >= MAX_UI_ROWS) return null;
    const frag = template.content.cloneNode(true);
    const row = frag.querySelector('.wavg-row');
    rowSeq++;
    row.querySelectorAll('input').forEach((input, i) => {
      const id = `row${rowSeq}-${['name', 'value', 'weight'][i]}`;
      input.id = id;
      row.querySelector(`[data-for="${['name', 'value', 'weight'][i]}"]`).htmlFor = id;
      input.value = values[i] || '';
    });
    row.querySelector('.wavg-remove').addEventListener('click', () => {
      row.remove();
      renumber();
      calculate();
    });
    rowsBox.appendChild(frag);
    renumber();
    return row;
  }

  function setRows(list) {
    rows().forEach(r => r.remove());
    list.forEach(values => addRow(values));
  }

  function syncWeightLabels() {
    const label = weightType() === 'percent' ? 'Weight (%)' : 'Weight';
    weightHead.textContent = label;
    rowsBox.querySelectorAll('.wavg-weight-label').forEach(l => { l.textContent = label; });
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    rowsBox.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
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
    const rowEls = rows();
    const data = rowEls.map(r => ({
      label: r.querySelector('.row-name').value,
      value: r.querySelector('.row-value').value,
      weight: r.querySelector('.row-weight').value
    }));
    const res = logic.weightedAverage(data, { weightType: weightType() });
    if (res.error) {
      const row = res.rowIndex !== undefined ? rowEls[res.rowIndex] : null;
      return showError(res.error, row ? row.querySelector(res.field === 'value' ? '.row-value' : '.row-weight') : null);
    }

    const f = (n) => logic.fmt(n, 4);
    const unit = res.weightType === 'percent' ? '%' : '';
    headerText.textContent = `Weighted average of ${res.rows.length} value${res.rows.length === 1 ? '' : 's'}`;
    primaryText.textContent = f(res.average);
    noteText.textContent = res.normalised
      ? `Your percentage weights add up to ${f(res.totalWeight)}%, not 100%, so they were normalised: each weight counts as its share of ${f(res.totalWeight)}.`
      : `Total weight: ${f(res.totalWeight)}${unit}.`;
    noteText.hidden = false;

    contribBody.replaceChildren(...res.rows.map(r => {
      const tr = document.createElement('tr');
      [r.label, f(r.value), `${f(r.weight)}${unit}`, `${f(r.share)}%`, f(r.contribution)].forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 1 || i === 2) td.className = 'wide-only';
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
      barCopy.dataset.copyText = res.rows.map(r => `${r.label}: ${f(r.value)} × ${f(r.weight)}${unit}`).join('\n') + `\nWeighted average: ${f(res.average)}`;
    }
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  rowsBox.addEventListener('input', debounced);
  typeRadios.forEach(r => r.addEventListener('change', () => { syncWeightLabels(); calculate(); }));
  addBtn.addEventListener('click', () => {
    const row = addRow();
    if (row) row.querySelector('.row-value').focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    typeRadios[0].checked = true;
    setRows(DEFAULT_ROWS);
    calculate();
  });

  // A shared link lists rows as n1/v1/w1, n2/v2/w2 …: create that many rows before restoring
  let linkRows = 0;
  try {
    new URLSearchParams(window.location.search).forEach((_, key) => {
      const m = key.match(/^[nvw](\d+)$/);
      if (m) linkRows = Math.max(linkRows, Number(m[1]));
    });
  } catch (e) {}
  if (linkRows) {
    setRows(Array.from({ length: Math.min(linkRows, MAX_UI_ROWS) }, () => ['', '', '']));
  } else {
    setRows(DEFAULT_ROWS);
  }
  ToolsBuilt.resultLink.restore();
  syncWeightLabels();
  calculate();
});
