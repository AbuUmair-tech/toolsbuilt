/**
 * Percentage Change Calculator UI Controller
 * Powered by PercentageChangeLogic pure module.
 * Supports 4 modes with debounced live calculation, shareable result links, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PercentageChangeLogic;
  const T = ToolsBuilt.scope('percentage-change-calculator');
  const locale = ToolsBuilt.pageLocale();
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
      showError(T('errors.mode1Fields'), isNaN(oldVal) ? oldInput : newInput);
      return;
    }

    try {
      const res = logic.calculatePercentChange(oldVal, newVal);
      let statusText = T('result.noChange');
      if (res.direction === 'increase') statusText = T('result.increase', { pct: res.formattedPercent });
      else if (res.direction === 'decrease') statusText = T('result.decrease', { pct: res.formattedPercent });

      lastResultText = T('result.copyMode1', { status: statusText, old: oldVal, new: newVal, diff: res.difference });

      renderResult({
        header: T('result.headerMode1'),
        primary: statusText,
        stats: [
          { label: T('stats.initialValue'), value: oldVal.toLocaleString(locale) },
          { label: T('stats.finalValue'), value: newVal.toLocaleString(locale) },
          { label: T('stats.absoluteDifference'), value: `${res.difference >= 0 ? '+' : ''}${res.difference.toLocaleString(locale)}` },
          { label: T('stats.exactChange'), value: `${res.percentChange >= 0 ? '+' : ''}${res.percentChange.toFixed(4)}%` }
        ],
        formulaHtml: T('formula.mode1', {
          new: newVal, old: oldVal, diff: res.difference,
          ratio: (res.difference / Math.abs(oldVal)).toFixed(6), pct: res.percentChange.toFixed(4)
        })
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
      showError(T('errors.mode2Fields'), isNaN(baseVal) ? baseInput : pctInput);
      return;
    }

    const pctOfTotal = (pctVal / 100) * baseVal;
    const finalVal = (op === 'increase') ? (baseVal + pctOfTotal) : (baseVal - pctOfTotal);
    const opLabel = (op === 'increase') ? T('result.increased') : T('result.decreased');
    const sign = (op === 'increase') ? '+' : '-';

    lastResultText = T('result.copyMode2', {
      op: opLabel, final: finalVal.toLocaleString(locale), base: baseVal, sign, pct: pctVal, delta: pctOfTotal.toLocaleString(locale)
    });

    renderResult({
      header: T('result.headerMode2', { op: opLabel, pct: pctVal }),
      primary: `${finalVal.toLocaleString(locale)}`,
      stats: [
        { label: T('stats.startingValue'), value: baseVal.toLocaleString(locale) },
        { label: T('stats.percentApplied'), value: `${pctVal}%` },
        { label: T('stats.delta'), value: `${sign}${pctOfTotal.toLocaleString(locale)}` },
        { label: T('stats.resultingValue'), value: finalVal.toLocaleString(locale) }
      ],
      formulaHtml: T('formula.mode2', { sign, base: baseVal, pct: pctVal, delta: pctOfTotal, final: finalVal })
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
      showError(T('errors.mode3Fields'), isNaN(xVal) ? xInput : yInput);
      return;
    }

    try {
      const res = logic.calculateWhatPercentIs(xVal, yVal);
      lastResultText = T('result.copyMode3', { x: xVal, pct: res.formattedPercent, y: yVal });

      renderResult({
        header: T('result.headerMode3'),
        primary: `${res.formattedPercent}%`,
        stats: [
          { label: T('stats.partValue'), value: xVal.toLocaleString(locale) },
          { label: T('stats.totalValue'), value: yVal.toLocaleString(locale) },
          { label: T('stats.ratio'), value: (xVal / yVal).toFixed(6) },
          { label: T('stats.exactPercentage'), value: `${res.percent.toFixed(4)}%` }
        ],
        formulaHtml: T('formula.mode3', { x: xVal, y: yVal, ratio: (xVal / yVal).toFixed(6), pct: res.percent.toFixed(4) })
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
      showError(T('errors.bothValues'), isNaN(aVal) ? aInput : bInput);
      return;
    }

    try {
      const res = logic.calculatePercentDifference(aVal, bVal);
      lastResultText = T('result.copyMode4', { a: aVal, b: bVal, pct: res.formattedPercent });

      renderResult({
        header: T('result.headerMode4'),
        primary: `${res.formattedPercent}%`,
        stats: [
          { label: T('stats.firstValue'), value: aVal.toLocaleString(locale) },
          { label: T('stats.secondValue'), value: bVal.toLocaleString(locale) },
          { label: T('stats.absoluteDifference'), value: res.difference.toLocaleString(locale) },
          { label: T('stats.averageOfValues'), value: res.average.toLocaleString(locale) }
        ],
        formulaHtml: T('formula.mode4', {
          a: aVal, b: bVal, diff: res.difference, average: res.average, pct: res.percentDifference.toFixed(4)
        })
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

    ToolsBuilt.resultLink.update(document.getElementById(`${state.mode}-form`));
  }

  function initInputs() {
    // Result links (?old=&new=, ?op=&base=&pct=, ?x=&y=, ?a=&b=) open the matching mode
    const filled = ToolsBuilt.resultLink.restore(els => {
      switchMode(els[0].closest('.calculator-mode-form').id.replace('-form', ''));
    });
    if (filled.length) return;

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
        window.ToolsBuilt.copy(lastResultText, T('result.copied'));
      }
    });
  }

  initInputs();
});
