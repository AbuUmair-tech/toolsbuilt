/**
 * Percentage Change Calculator UI Controller
 * Powered by PercentageChangeLogic pure module.
 * Supports 4 modes with debounced live calculation, URL query sync, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PercentageChangeLogic;
  const tabBtns = document.querySelectorAll('.mode-tab-btn');
  const modeForms = document.querySelectorAll('.calculator-mode-form');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const copyBtn = document.getElementById('copy-result-btn');

  const STORAGE_KEY = 'toolsbuilt:percentage-change-calculator';
  let debounceTimer = null;
  let activeMode = 'mode-1';
  let lastResultText = '';

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      switchMode(mode);
    });
  });

  function switchMode(mode) {
    activeMode = mode;
    tabBtns.forEach(b => {
      const isCurrent = (b.getAttribute('data-mode') === mode);
      b.classList.toggle('active', isCurrent);
      b.setAttribute('aria-selected', isCurrent);
    });

    modeForms.forEach(form => {
      if (form.id === `${mode}-form`) {
        form.classList.remove('hidden');
      } else {
        form.classList.add('hidden');
      }
    });

    clearError();
    calculateActiveMode();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('.calculator-mode-form input').forEach(inp => {
      inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg, targetInput) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (targetInput) {
      targetInput.setAttribute('aria-invalid', 'true');
      targetInput.focus();
    }
  }

  function calculateActiveMode() {
    clearError();
    if (activeMode === 'mode-1') calculateMode1();
    else if (activeMode === 'mode-2') calculateMode2();
    else if (activeMode === 'mode-3') calculateMode3();
    else if (activeMode === 'mode-4') calculateMode4();
  }

  // Mode 1: Percent Change
  function calculateMode1() {
    const oldInput = document.getElementById('m1-old-val');
    const newInput = document.getElementById('m1-new-val');
    const oldVal = parseFloat(oldInput.value);
    const newVal = parseFloat(newInput.value);

    if (isNaN(oldVal) || isNaN(newVal)) {
      if (oldInput.value === '' && newInput.value === '') return;
      showError('Please enter valid numeric values for both fields.', isNaN(oldVal) ? oldInput : newInput);
      return;
    }

    try {
      const res = logic.calculatePercentChange(oldVal, newVal);
      let statusText = 'No Change (0%)';
      if (res.direction === 'increase') statusText = `+${res.formattedPercent}% Increase`;
      else if (res.direction === 'decrease') statusText = `-${res.formattedPercent}% Decrease`;

      lastResultText = `Percentage Change: ${statusText} (from ${oldVal} to ${newVal}, difference of ${res.difference}).`;

      renderResult({
        header: 'Percentage Change Result',
        primary: statusText,
        stats: [
          { label: 'Initial (Old) Value', value: oldVal.toLocaleString() },
          { label: 'Final (New) Value', value: newVal.toLocaleString() },
          { label: 'Absolute Difference', value: `${res.difference >= 0 ? '+' : ''}${res.difference.toLocaleString()}` },
          { label: 'Exact Percentage Change', value: `${res.percentChange >= 0 ? '+' : ''}${res.percentChange.toFixed(4)}%` }
        ],
        formulaHtml: `
          <strong>Formula:</strong> <code>Percentage Change = ((New - Old) / |Old|) × 100</code><br><br>
          <strong>Step-by-step:</strong><br>
          1. Difference = ${newVal} - ${oldVal} = ${res.difference}<br>
          2. Divide by |Initial| = ${res.difference} / |${oldVal}| = ${(res.difference / Math.abs(oldVal)).toFixed(6)}<br>
          3. Multiply by 100 = <strong>${res.percentChange.toFixed(4)}%</strong>
        `
      });

      saveState({ mode: 'mode-1', oldVal, newVal });
    } catch (err) {
      showError(err.message, oldInput);
    }
  }

  // Mode 2: Increase / Decrease Value by X%
  function calculateMode2() {
    const opSelect = document.getElementById('m2-operation');
    const baseInput = document.getElementById('m2-base-val');
    const pctInput = document.getElementById('m2-percent-val');
    const op = opSelect.value;
    const baseVal = parseFloat(baseInput.value);
    const pctVal = parseFloat(pctInput.value);

    if (isNaN(baseVal) || isNaN(pctVal)) {
      if (baseInput.value === '' && pctInput.value === '') return;
      showError('Please enter valid numeric values for starting value and percentage.', isNaN(baseVal) ? baseInput : pctInput);
      return;
    }

    const pctOfTotal = (pctVal / 100) * baseVal;
    const finalVal = (op === 'increase') ? (baseVal + pctOfTotal) : (baseVal - pctOfTotal);
    const opLabel = (op === 'increase') ? 'Increased' : 'Decreased';
    const sign = (op === 'increase') ? '+' : '-';

    lastResultText = `${opLabel} Result: ${finalVal.toLocaleString()} (${baseVal} ${sign} ${pctVal}%). Delta = ${pctOfTotal.toLocaleString()}.`;

    renderResult({
      header: `Value ${opLabel} by ${pctVal}%`,
      primary: `${finalVal.toLocaleString()}`,
      stats: [
        { label: 'Starting Value', value: baseVal.toLocaleString() },
        { label: 'Percentage Applied', value: `${pctVal}%` },
        { label: 'Delta / Amount Changed', value: `${sign}${pctOfTotal.toLocaleString()}` },
        { label: 'Resulting Value', value: finalVal.toLocaleString() }
      ],
      formulaHtml: `
        <strong>Formula:</strong> <code>Final Value = Starting Value ${sign} (Starting Value × (Percentage / 100))</code><br><br>
        <strong>Step-by-step:</strong><br>
        1. Delta = ${baseVal} × (${pctVal} / 100) = ${pctOfTotal}<br>
        2. Final = ${baseVal} ${sign} ${pctOfTotal} = <strong>${finalVal}</strong>
      `
    });

    saveState({ mode: 'mode-2', op, baseVal, pctVal });
  }

  // Mode 3: What % is X of Y
  function calculateMode3() {
    const xInput = document.getElementById('m3-x-val');
    const yInput = document.getElementById('m3-y-val');
    const xVal = parseFloat(xInput.value);
    const yVal = parseFloat(yInput.value);

    if (isNaN(xVal) || isNaN(yVal)) {
      if (xInput.value === '' && yInput.value === '') return;
      showError('Please enter valid numeric values for X and Y.', isNaN(xVal) ? xInput : yInput);
      return;
    }

    try {
      const res = logic.calculateWhatPercentIs(xVal, yVal);
      lastResultText = `${xVal} is ${res.formattedPercent}% of ${yVal}.`;

      renderResult({
        header: 'Proportion Percentage Result',
        primary: `${res.formattedPercent}%`,
        stats: [
          { label: 'Part Value (X)', value: xVal.toLocaleString() },
          { label: 'Total Value (Y)', value: yVal.toLocaleString() },
          { label: 'Ratio (X / Y)', value: (xVal / yVal).toFixed(6) },
          { label: 'Exact Percentage', value: `${res.percent.toFixed(4)}%` }
        ],
        formulaHtml: `
          <strong>Formula:</strong> <code>Percentage = (X / Y) × 100</code><br><br>
          <strong>Step-by-step:</strong><br>
          1. Divide X by Y = ${xVal} / ${yVal} = ${(xVal / yVal).toFixed(6)}<br>
          2. Multiply by 100 = ${(xVal / yVal).toFixed(6)} × 100 = <strong>${res.percent.toFixed(4)}%</strong>
        `
      });

      saveState({ mode: 'mode-3', xVal, yVal });
    } catch (err) {
      showError(err.message, yInput);
    }
  }

  // Mode 4: Percent Difference between two numbers
  function calculateMode4() {
    const aInput = document.getElementById('m4-a-val');
    const bInput = document.getElementById('m4-b-val');
    const aVal = parseFloat(aInput.value);
    const bVal = parseFloat(bInput.value);

    if (isNaN(aVal) || isNaN(bVal)) {
      if (aInput.value === '' && bInput.value === '') return;
      showError('Please enter valid numbers for both values.', isNaN(aVal) ? aInput : bInput);
      return;
    }

    try {
      const res = logic.calculatePercentDifference(aVal, bVal);
      lastResultText = `Percent Difference between ${aVal} and ${bVal}: ${res.formattedPercent}%.`;

      renderResult({
        header: 'Percent Difference Result',
        primary: `${res.formattedPercent}%`,
        stats: [
          { label: 'First Value (V1)', value: aVal.toLocaleString() },
          { label: 'Second Value (V2)', value: bVal.toLocaleString() },
          { label: 'Absolute Difference', value: res.difference.toLocaleString() },
          { label: 'Average of Values', value: res.average.toLocaleString() }
        ],
        formulaHtml: `
          <strong>Formula:</strong> <code>Percent Difference = (|V1 - V2| / ((V1 + V2) / 2)) × 100</code><br><br>
          <strong>Step-by-step:</strong><br>
          1. |V1 - V2| = |${aVal} - ${bVal}| = ${res.difference}<br>
          2. Average = (${aVal} + ${bVal}) / 2 = ${res.average}<br>
          3. Divide and multiply by 100 = (${res.difference} / ${res.average}) × 100 = <strong>${res.percentDifference.toFixed(4)}%</strong>
        `
      });

      saveState({ mode: 'mode-4', aVal, bVal });
    } catch (err) {
      showError(err.message, aInput);
    }
  }

  function renderResult(data) {
    document.getElementById('result-header-text').textContent = data.header;
    document.getElementById('result-primary-text').textContent = data.primary;

    const statsGrid = document.getElementById('result-stats-grid');
    statsGrid.innerHTML = data.stats.map(s => `
      <div class="result-stat-card">
        <div class="result-stat-label">${s.label}</div>
        <div class="result-stat-value">${s.value}</div>
      </div>
    `).join('');

    const formulaBox = document.getElementById('formula-explanation');
    if (formulaBox && data.formulaHtml) {
      formulaBox.innerHTML = data.formulaHtml;
    }

    resultBox.classList.add('is-visible');
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}

    const url = new URL(window.location.href);
    url.searchParams.set('mode', state.mode.replace('mode-', ''));
    if (state.mode === 'mode-1') {
      url.searchParams.set('old', state.oldVal);
      url.searchParams.set('new', state.newVal);
      ['op', 'base', 'pct', 'x', 'y', 'a', 'b'].forEach(k => url.searchParams.delete(k));
    } else if (state.mode === 'mode-2') {
      url.searchParams.set('op', state.op);
      url.searchParams.set('base', state.baseVal);
      url.searchParams.set('pct', state.pctVal);
      ['old', 'new', 'x', 'y', 'a', 'b'].forEach(k => url.searchParams.delete(k));
    } else if (state.mode === 'mode-3') {
      url.searchParams.set('x', state.xVal);
      url.searchParams.set('y', state.yVal);
      ['old', 'new', 'op', 'base', 'pct', 'a', 'b'].forEach(k => url.searchParams.delete(k));
    } else if (state.mode === 'mode-4') {
      url.searchParams.set('a', state.aVal);
      url.searchParams.set('b', state.bVal);
      ['old', 'new', 'op', 'base', 'pct', 'x', 'y'].forEach(k => url.searchParams.delete(k));
    }
    window.history.replaceState({}, '', url.toString());
  }

  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');

    if (m && ['1', '2', '3', '4'].includes(m)) {
      activeMode = `mode-${m}`;
      if (m === '1' && params.has('old') && params.has('new')) {
        document.getElementById('m1-old-val').value = params.get('old');
        document.getElementById('m1-new-val').value = params.get('new');
      } else if (m === '2' && params.has('base') && params.has('pct')) {
        document.getElementById('m2-operation').value = params.get('op') || 'increase';
        document.getElementById('m2-base-val').value = params.get('base');
        document.getElementById('m2-percent-val').value = params.get('pct');
      } else if (m === '3' && params.has('x') && params.has('y')) {
        document.getElementById('m3-x-val').value = params.get('x');
        document.getElementById('m3-y-val').value = params.get('y');
      } else if (m === '4' && params.has('a') && params.has('b')) {
        document.getElementById('m4-a-val').value = params.get('a');
        document.getElementById('m4-b-val').value = params.get('b');
      }
      switchMode(activeMode);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.mode) activeMode = data.mode;
        if (data.oldVal !== undefined) document.getElementById('m1-old-val').value = data.oldVal;
        if (data.newVal !== undefined) document.getElementById('m1-new-val').value = data.newVal;
        if (data.baseVal !== undefined) document.getElementById('m2-base-val').value = data.baseVal;
        if (data.pctVal !== undefined) document.getElementById('m2-percent-val').value = data.pctVal;
        if (data.op) document.getElementById('m2-operation').value = data.op;
        if (data.xVal !== undefined) document.getElementById('m3-x-val').value = data.xVal;
        if (data.yVal !== undefined) document.getElementById('m3-y-val').value = data.yVal;
        if (data.aVal !== undefined) document.getElementById('m4-a-val').value = data.aVal;
        if (data.bVal !== undefined) document.getElementById('m4-b-val').value = data.bVal;
        switchMode(activeMode);
        return;
      }
    } catch (e) {}

    // Default sample values
    document.getElementById('m1-old-val').value = '50';
    document.getElementById('m1-new-val').value = '75';
    switchMode('mode-1');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateActiveMode, 150);
  }

  // Bind live debounced calculation across all inputs
  document.querySelectorAll('.calculator-mode-form input, .calculator-mode-form select').forEach(el => {
    el.addEventListener('input', debouncedCalculate);
    el.addEventListener('change', debouncedCalculate);
  });

  // Mode form submits
  document.querySelectorAll('.calculator-mode-form').forEach(f => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(debounceTimer);
      calculateActiveMode();
    });
  });

  // Reset buttons
  document.getElementById('reset-mode-1').addEventListener('click', () => {
    document.getElementById('m1-old-val').value = '50';
    document.getElementById('m1-new-val').value = '75';
    calculateActiveMode();
  });
  document.getElementById('reset-mode-2').addEventListener('click', () => {
    document.getElementById('m2-base-val').value = '100';
    document.getElementById('m2-percent-val').value = '20';
    document.getElementById('m2-operation').value = 'increase';
    calculateActiveMode();
  });
  document.getElementById('reset-mode-3').addEventListener('click', () => {
    document.getElementById('m3-x-val').value = '25';
    document.getElementById('m3-y-val').value = '200';
    calculateActiveMode();
  });
  const reset4 = document.getElementById('reset-mode-4');
  if (reset4) {
    reset4.addEventListener('click', () => {
      document.getElementById('m4-a-val').value = '100';
      document.getElementById('m4-b-val').value = '120';
      calculateActiveMode();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Percentage result copied to clipboard');
      }
    });
  }

  initInputs();
});
