/**
 * Percentage Calculator UI Controller
 * Integrates PercentageCalculatorLogic pure module with live 150ms debounce,
 * accessible keyboard interactions, and responsive result cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PercentageCalculatorLogic;
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
          <strong>Step-by-Step Calculation:</strong>
          <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0;">
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
      showError('Please enter valid numeric values for both percentage and total.', isNaN(p) ? percentInput : totalInput);
      return;
    }

    try {
      const res = logic.calculatePercentOf(p, y);
      lastResultText = `${res.percent}% of ${res.total} is ${res.result}.`;

      renderResult({
        header: 'Percentage Result',
        primary: res.result.toLocaleString(),
        stats: [
          { label: 'Percentage', value: `${res.percent}%` },
          { label: 'Base Amount (Y)', value: res.total.toLocaleString() },
          { label: 'Calculated Amount (X)', value: res.result.toLocaleString() }
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
      showError('Please enter valid numeric values for both part and whole.', isNaN(x) ? partInput : wholeInput);
      return;
    }

    try {
      const res = logic.calculateWhatPercentIs(x, y);
      lastResultText = `${res.part} is ${res.formattedPercent} of ${res.whole}.`;

      renderResult({
        header: 'Proportion Result',
        primary: res.formattedPercent,
        stats: [
          { label: 'Part Value (X)', value: res.part.toLocaleString() },
          { label: 'Total Value (Y)', value: res.whole.toLocaleString() },
          { label: 'Percentage Proportion', value: res.formattedPercent }
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
      showError('Please enter valid numeric values for starting number and percentage.', isNaN(baseVal) ? baseInput : percentInput);
      return;
    }

    try {
      const res = logic.calculateIncreaseDecrease(baseVal, percentVal, isDecrease);
      const actionWord = isDecrease ? 'Decreased' : 'Increased';
      lastResultText = `${res.base} ${actionWord} by ${res.percent}% = ${res.result} (difference of ${isDecrease ? '-' : '+'}${res.delta}).`;

      renderResult({
        header: `${actionWord} Value Result`,
        primary: res.result.toLocaleString(),
        stats: [
          { label: 'Starting Value', value: res.base.toLocaleString() },
          { label: isDecrease ? 'Subtracted Amount' : 'Added Amount', value: `${isDecrease ? '-' : '+'}${res.delta.toLocaleString()}` },
          { label: 'Final Value', value: res.result.toLocaleString() }
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
      showError('Please enter valid numeric values for both fields.', isNaN(val) ? valInput : percentInput);
      return;
    }

    try {
      const res = logic.calculateOriginalValue(val, percent, type);
      lastResultText = `Original value before ${res.percent}% ${type === 'increase' ? 'markup' : (type === 'decrease' ? 'discount' : 'proportion')} is ${res.result}.`;

      renderResult({
        header: 'Original Base Value Result',
        primary: res.result.toLocaleString(),
        stats: [
          { label: 'Known Value', value: res.value.toLocaleString() },
          { label: 'Percentage Applied', value: `${res.percent}%` },
          { label: 'Calculated Original Value', value: res.result.toLocaleString() }
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
        copyBtn.innerHTML = '<span>Copied!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
        }, 2000);
      } catch (e) {
        console.error('Clipboard copy failed:', e);
      }
    });
  }

  // Initial calculation
  calculateActiveMode();
});
