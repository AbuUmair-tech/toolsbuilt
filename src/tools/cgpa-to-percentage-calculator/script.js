/**
 * CGPA to Percentage Calculator UI Controller
 * Powered by CgpaToPercentageLogic pure module.
 * Two directions, three formulas, debounced live calculation, shareable result links,
 * localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.CgpaToPercentageLogic;
  const form = document.getElementById('calculator-form');
  const modeInputs = document.querySelectorAll('input[name="cgpa-mode"]');
  const valueInput = document.getElementById('cgpa-value');
  const valueLabel = document.getElementById('value-label');
  const scaleSelect = document.getElementById('cgpa-scale');
  const formulaSelect = document.getElementById('cgpa-formula');
  const cbseOption = formulaSelect.querySelector('option[value="cbse"]');
  const customFields = document.getElementById('custom-formula-fields');
  const mInput = document.getElementById('custom-m');
  const cInput = document.getElementById('custom-c');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:cgpa-to-percentage-calculator';
  const DEFAULTS = { mode: 'to-percentage', value: '3.2', scale: '4', formula: 'simple', m: '', c: '0' };
  let debounceTimer = null;
  let lastResultText = '';

  const getMode = () => (Array.from(modeInputs).find(i => i.checked) || {}).value || 'to-percentage';
  const setMode = (value) => modeInputs.forEach(i => { i.checked = i.value === value; });
  const trimNumber = (n, digits) => Number(n.toFixed(digits)).toString();

  function applyValues(v) {
    setMode(v.mode);
    valueInput.value = v.value;
    scaleSelect.value = v.scale;
    formulaSelect.value = v.formula;
    mInput.value = v.m;
    cInput.value = v.c;
  }

  // Keep the form consistent: labels follow the direction, CBSE needs the 10.0 scale,
  // and the m / c fields show only for "My university's formula"
  function syncForm() {
    const toPercentage = getMode() === 'to-percentage';
    valueLabel.firstChild.textContent = toPercentage ? 'Your CGPA ' : 'Your percentage ';
    valueInput.placeholder = toPercentage ? 'e.g. 3.2' : 'e.g. 80';

    const isTen = scaleSelect.value === '10';
    cbseOption.disabled = !isTen;
    if (!isTen && formulaSelect.value === 'cbse') formulaSelect.value = 'simple';
    customFields.hidden = formulaSelect.value !== 'custom';
  }

  function initInputs() {
    // Result links (?mode=&value=&scale=&formula=&m=&c=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) {
      syncForm();
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        applyValues({ ...DEFAULTS, ...JSON.parse(saved) });
        syncForm();
        return;
      }
    } catch (e) {}

    applyValues(DEFAULTS);
    syncForm();
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}

    ToolsBuilt.resultLink.update();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    [valueInput, mInput, cInput].forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  function calculate() {
    clearError();
    syncForm();
    const mode = getMode();
    const state = {
      mode,
      value: valueInput.value.trim(),
      scale: scaleSelect.value,
      formula: formulaSelect.value,
      m: mInput.value.trim(),
      c: cInput.value.trim()
    };

    if (!state.value) {
      showError(mode === 'to-percentage' ? 'Please enter your CGPA.' : 'Please enter your percentage.', valueInput);
      return;
    }
    if (state.formula === 'custom' && !state.m) {
      showError('Enter the multiplier (m) from your transcript formula, or choose another formula.', mInput);
      return;
    }

    const options = { scale: Number(state.scale), formula: state.formula, multiplier: state.m, offset: state.c };
    try {
      const res = mode === 'to-percentage'
        ? logic.cgpaToPercentage(state.value, options)
        : logic.percentageToCgpa(state.value, options);
      renderResult(res);
      saveState(state);
    } catch (err) {
      const field = /multiplier|offset|\(m\)|\(c\)/i.test(err.message) ? (/offset|\(c\)/i.test(err.message) ? cInput : mInput) : valueInput;
      showError(err.message, field);
    }
  }

  function renderResult(res) {
    const scaleText = `${res.scale.toFixed(1)}`;
    const percentText = `${trimNumber(res.percentage, 2)}%`;
    const cgpaText = trimNumber(res.cgpa, 2);
    const toPercentage = res.direction === 'cgpa-to-percentage';

    document.getElementById('result-header-text').textContent = toPercentage ? 'Percentage' : `CGPA on a ${scaleText} scale`;
    document.getElementById('result-primary-text').textContent = toPercentage ? percentText : cgpaText;
    document.getElementById('stat-input-label').textContent = toPercentage ? 'CGPA' : 'Percentage';
    document.getElementById('stat-input').textContent = toPercentage ? trimNumber(res.cgpa, 4) : `${trimNumber(res.percentage, 4)}%`;
    document.getElementById('stat-scale').textContent = scaleText;
    document.getElementById('stat-formula').textContent = logic.FORMULAS[res.formula].label;

    let steps = `<strong>Formula:</strong> <code>${res.formulaText}</code><br>`;
    if (toPercentage) {
      if (res.formula === 'cbse') steps += `${cgpaText} × ${logic.CBSE_MULTIPLIER} = <strong>${percentText}</strong>`;
      else if (res.formula === 'custom') steps += `${res.multiplier} × ${cgpaText} + ${res.offset} = <strong>${percentText}</strong>`;
      else steps += `${cgpaText} ÷ ${scaleText} × 100 = <strong>${percentText}</strong>`;
    } else {
      steps += 'Solved for CGPA: ';
      if (res.formula === 'cbse') steps += `${trimNumber(res.percentage, 2)} ÷ ${logic.CBSE_MULTIPLIER} = <strong>${cgpaText}</strong>`;
      else if (res.formula === 'custom') steps += `(${trimNumber(res.percentage, 2)} − ${res.offset}) ÷ ${res.multiplier} = <strong>${cgpaText}</strong>`;
      else steps += `${trimNumber(res.percentage, 2)} ÷ 100 × ${scaleText} = <strong>${cgpaText}</strong>`;
    }
    document.getElementById('formula-breakdown-box').innerHTML = steps;

    lastResultText = toPercentage
      ? `CGPA ${cgpaText} on a ${scaleText} scale = ${percentText} (${logic.FORMULAS[res.formula].label}: ${res.formulaText}).`
      : `${percentText} = CGPA ${cgpaText} on a ${scaleText} scale (${logic.FORMULAS[res.formula].label}: ${res.formulaText}).`;
    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) actionCopyBtn.dataset.copyText = lastResultText;

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [valueInput, mInput, cInput].forEach(el => el.addEventListener('input', debouncedCalculate));
  [scaleSelect, formulaSelect].forEach(el => el.addEventListener('change', calculate));
  modeInputs.forEach(el => el.addEventListener('change', () => {
    // Switching direction starts from the converted value, so the numbers stay meaningful
    const primary = document.getElementById('result-primary-text').textContent;
    if (resultBox.classList.contains('is-visible')) valueInput.value = parseFloat(primary) || '';
    calculate();
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    applyValues(DEFAULTS);
    clearError();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    calculate();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Conversion copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
