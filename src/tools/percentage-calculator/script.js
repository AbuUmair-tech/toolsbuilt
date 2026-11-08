/**
 * Percentage Calculator UI Controller
 * Integrates PercentageCalculatorLogic pure module with live 150ms debounce,
 * accessible keyboard interactions, and responsive result cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PercentageCalculatorLogic;
  const T = ToolsBuilt.scope('percentage-calculator');
  const locale = ToolsBuilt.pageLocale();
  const tabBtns = document.querySelectorAll('.mode-tab-btn');
  const modeForms = document.querySelectorAll('.calculator-mode-form');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const copyBtn = document.getElementById('copy-result-btn');

  let debounceTimer = null;
  let activeMode = 'mode-1';
  let lastResultText = '';

  // Mode tab switching
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
      b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
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
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('.calculator-mode-form input').forEach(inp => {
      inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg, targetInput) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    if (resultBox) {
      resultBox.classList.remove('is-visible');
    }
    if (targetInput) {
      targetInput.setAttribute('aria-invalid', 'true');
      targetInput.focus();
    }
  }

  function renderResult({ header, primary, stats = [], formulaSteps = [] }) {
    clearError();
    if (!resultBox) return;

    resultBox.classList.add('is-visible');
    const headerEl = document.getElementById('result-header-text');
    const primaryEl = document.getElementById('result-primary-text');
    const statsGrid = document.getElementById('result-stats-grid');
    const formulaBox = document.getElementById('formula-explanation');

    if (headerEl) headerEl.textContent = header;
    if (primaryEl) primaryEl.textContent = primary;

    if (statsGrid) {
      statsGrid.innerHTML = stats.map(s => `
        <div class="result-stat-card">
          <span class="stat-label">${s.label}</span>
          <span class="stat-value">${s.value}</span>
        </div>
      `).join('');
    }

    if (formulaBox) {
      if (formulaSteps && formulaSteps.length > 0) {
        formulaBox.innerHTML = `
          <strong>${T('steps.heading')}</strong>
          <ul class="mt-2 mb-0 ml-4 p-0">
            ${formulaSteps.map(st => `<li>${st}</li>`).join('')}
          </ul>
        `;
        formulaBox.classList.remove('hidden');
      } else {
        formulaBox.classList.add('hidden');
      }
    }

    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) {
      actionCopyBtn.setAttribute('data-copy-text', lastResultText);
    }

    ToolsBuilt.resultLink.update(document.getElementById(`${activeMode}-form`));
  }

  // Mode 1: What is X% of Y?
  function calculateMode1() {
    const percentInput = document.getElementById('m1-percent-val');
    const totalInput = document.getElementById('m1-total-val');
    if (!percentInput || !totalInput) return;

    const p = parseFloat(percentInput.value);
    const y = parseFloat(totalInput.value);

    if (isNaN(p) || isNaN(y)) {
      if (percentInput.value === '' && totalInput.value === '') return;
      showError(T('errors.mode1Fields'), isNaN(p) ? percentInput : totalInput);
      return;
    }

    try {
      const res = logic.calculatePercentOf(p, y);
      lastResultText = T('result.copyMode1', { percent: res.percent, total: res.total, result: res.result });

      renderResult({
        header: T('result.headerMode1'),
        primary: res.result.toLocaleString(locale),
        stats: [
          { label: T('stats.percentage'), value: `${res.percent}%` },
          { label: T('stats.baseAmount'), value: res.total.toLocaleString(locale) },
          { label: T('stats.calculatedAmount'), value: res.result.toLocaleString(locale) }
        ],
        formulaSteps: res.steps
      });
    } catch (err) {
      showError(err.message, percentInput);
    }
  }

  // Mode 2: X is what % of Y?
  function calculateMode2() {
    const partInput = document.getElementById('m2-part-val');
    const wholeInput = document.getElementById('m2-whole-val');
    if (!partInput || !wholeInput) return;

    const x = parseFloat(partInput.value);
    const y = parseFloat(wholeInput.value);

    if (isNaN(x) || isNaN(y)) {
      if (partInput.value === '' && wholeInput.value === '') return;
      showError(T('errors.mode2Fields'), isNaN(x) ? partInput : wholeInput);
      return;
    }

    try {
      const res = logic.calculateWhatPercentIs(x, y);
      lastResultText = T('result.copyMode2', { part: res.part, pct: res.formattedPercent, whole: res.whole });

      renderResult({
        header: T('result.headerMode2'),
        primary: res.formattedPercent,
        stats: [
          { label: T('stats.partValue'), value: res.part.toLocaleString(locale) },
          { label: T('stats.totalValue'), value: res.whole.toLocaleString(locale) },
          { label: T('stats.proportion'), value: res.formattedPercent }
        ],
        formulaSteps: res.steps
      });
    } catch (err) {
      showError(err.message, wholeInput);
    }
  }

  // Mode 3: Increase / Decrease Y by X%
  function calculateMode3() {
    const baseInput = document.getElementById('m3-base-val');
    const percentInput = document.getElementById('m3-percent-val');
    const opSelect = document.getElementById('m3-operation');
    if (!baseInput || !percentInput || !opSelect) return;

    const baseVal = parseFloat(baseInput.value);
    const percentVal = parseFloat(percentInput.value);
    const isDecrease = opSelect.value === 'decrease';

    if (isNaN(baseVal) || isNaN(percentVal)) {
      if (baseInput.value === '' && percentInput.value === '') return;
      showError(T('errors.mode3Fields'), isNaN(baseVal) ? baseInput : percentInput);
      return;
    }

    try {
      const res = logic.calculateIncreaseDecrease(baseVal, percentVal, isDecrease);
      const actionWord = isDecrease ? T('result.decreased') : T('result.increased');
      lastResultText = T('result.copyMode3', {
        base: res.base, action: actionWord, percent: res.percent, result: res.result, sign: isDecrease ? '-' : '+', delta: res.delta
      });

      renderResult({
        header: T('result.headerMode3', { action: actionWord }),
        primary: res.result.toLocaleString(locale),
        stats: [
          { label: T('stats.startingValue'), value: res.base.toLocaleString(locale) },
          { label: isDecrease ? T('stats.subtractedAmount') : T('stats.addedAmount'), value: `${isDecrease ? '-' : '+'}${res.delta.toLocaleString(locale)}` },
          { label: T('stats.finalValue'), value: res.result.toLocaleString(locale) }
        ],
        formulaSteps: res.steps
      });
    } catch (err) {
      showError(err.message, percentInput);
    }
  }

  // Mode 4: Find Original Value (Reverse Percentage)
  function calculateMode4() {
    const valInput = document.getElementById('m4-val');
    const percentInput = document.getElementById('m4-percent-val');
    const typeSelect = document.getElementById('m4-type');
    if (!valInput || !percentInput || !typeSelect) return;

    const val = parseFloat(valInput.value);
    const percent = parseFloat(percentInput.value);
    const type = typeSelect.value;

    if (isNaN(val) || isNaN(percent)) {
      if (valInput.value === '' && percentInput.value === '') return;
      showError(T('errors.mode4Fields'), isNaN(val) ? valInput : percentInput);
      return;
    }

    try {
      const res = logic.calculateOriginalValue(val, percent, type);
      const copyKey = type === 'increase' ? 'increase' : (type === 'decrease' ? 'decrease' : 'of');
      lastResultText = T(`result.copyMode4.${copyKey}`, { percent: res.percent, result: res.result });

      renderResult({
        header: T('result.headerMode4'),
        primary: res.result.toLocaleString(locale),
        stats: [
          { label: T('stats.knownValue'), value: res.value.toLocaleString(locale) },
          { label: T('stats.percentApplied'), value: `${res.percent}%` },
          { label: T('stats.originalValue'), value: res.result.toLocaleString(locale) }
        ],
        formulaSteps: res.steps
      });
    } catch (err) {
      showError(err.message, percentInput);
    }
  }

  function calculateActiveMode() {
    if (activeMode === 'mode-1') calculateMode1();
    else if (activeMode === 'mode-2') calculateMode2();
    else if (activeMode === 'mode-3') calculateMode3();
    else if (activeMode === 'mode-4') calculateMode4();
  }

  function triggerDebouncedCalc() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateActiveMode();
    }, 150);
  }

  // Attach inputs and form submissions
  modeForms.forEach(form => {
    form.addEventListener('input', triggerDebouncedCalc);
    form.addEventListener('change', triggerDebouncedCalc);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(debounceTimer);
      calculateActiveMode();
    });
  });

  // Reset buttons
  const resetBtns = [
    { btnId: 'reset-mode-1', formId: 'mode-1-form' },
    { btnId: 'reset-mode-2', formId: 'mode-2-form' },
    { btnId: 'reset-mode-3', formId: 'mode-3-form' },
    { btnId: 'reset-mode-4', formId: 'mode-4-form' }
  ];

  resetBtns.forEach(({ btnId, formId }) => {
    const btn = document.getElementById(btnId);
    const form = document.getElementById(formId);
    if (btn && form) {
      btn.addEventListener('click', () => {
        form.reset();
        clearError();
        calculateActiveMode();
      });
    }
  });

  // Action Reset Button
  const globalResetBtn = document.getElementById('action-reset-btn');
  if (globalResetBtn) {
    globalResetBtn.addEventListener('click', () => {
      modeForms.forEach(f => f.reset());
      clearError();
      calculateActiveMode();
    });
  }

  // Copy result button
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!lastResultText) return;
      try {
        await navigator.clipboard.writeText(lastResultText);
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span>${T('result.copied')}</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
        }, 2000);
      } catch (e) {
        console.error('Clipboard copy failed:', e);
      }
    });
  }

  // Result links open the matching mode; otherwise show the default calculation
  const filled = ToolsBuilt.resultLink.restore(els => {
    switchMode(els[0].closest('.calculator-mode-form').id.replace('-form', ''));
  });
  if (!filled.length) calculateActiveMode();
});
