/**
 * Percentage Change Calculator Script
 * Supports 3 modes:
 * Mode 1: Percentage Change (Old Value -> New Value)
 * Mode 2: Increase / Decrease a Value by X%
 * Mode 3: What Percent is X of Y?
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.mode-tab-btn');
  const modeForms = document.querySelectorAll('.calculator-mode-form');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  let activeMode = 'mode-1';

  // Tab Switcher Logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode === activeMode) return;

      activeMode = mode;

      tabBtns.forEach(b => {
        const isCurrent = b === btn;
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

      resultBox.classList.remove('is-visible');
      errorBox.classList.add('hidden');
    });
  });

  // Mode 1 Form Submit (Percentage Change)
  const form1 = document.getElementById('mode-1-form');
  form1.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateMode1();
  });

  document.getElementById('reset-mode-1').addEventListener('click', () => {
    form1.reset();
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateMode1() {
    const oldVal = parseFloat(document.getElementById('m1-old-val').value);
    const newVal = parseFloat(document.getElementById('m1-new-val').value);

    if (isNaN(oldVal) || isNaN(newVal)) {
      showError('Please enter valid numeric values for both fields.');
      return;
    }

    if (oldVal === 0) {
      showError('Percentage change cannot be calculated when the initial (old) value is zero (division by zero).');
      return;
    }

    errorBox.classList.add('hidden');

    const difference = newVal - oldVal;
    const percentChange = (difference / Math.abs(oldVal)) * 100;
    const isIncrease = difference > 0;
    const isDecrease = difference < 0;

    const absPercent = Math.abs(percentChange).toFixed(2);
    const absDiff = Math.abs(difference).toFixed(2);

    let statusText = 'No Change (0%)';
    if (isIncrease) statusText = `+${absPercent}% Increase`;
    if (isDecrease) statusText = `-${absPercent}% Decrease`;

    renderResult({
      header: 'Percentage Change Result',
      primary: statusText,
      stats: [
        { label: 'Initial (Old) Value', value: oldVal.toLocaleString() },
        { label: 'Final (New) Value', value: newVal.toLocaleString() },
        { label: 'Absolute Difference', value: `${difference >= 0 ? '+' : ''}${parseFloat(absDiff).toLocaleString()}` },
        { label: 'Percentage Change', value: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(4)}%` }
      ],
      formulaHtml: `
        <strong>Formula Used:</strong><br>
        <code>Percentage Change = ((New Value - Old Value) / |Old Value|) × 100</code><br><br>
        <strong>Calculation Steps:</strong><br>
        1. Difference = ${newVal} - ${oldVal} = ${difference}<br>
        2. Divide by Initial Value = ${difference} / |${oldVal}| = ${(difference / Math.abs(oldVal)).toFixed(6)}<br>
        3. Multiply by 100 = ${(difference / Math.abs(oldVal)).toFixed(6)} × 100 = <strong>${percentChange.toFixed(4)}%</strong>
      `
    });
  }

  // Mode 2 Form Submit (Increase / Decrease Value by X%)
  const form2 = document.getElementById('mode-2-form');
  form2.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateMode2();
  });

  document.getElementById('reset-mode-2').addEventListener('click', () => {
    form2.reset();
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateMode2() {
    const baseVal = parseFloat(document.getElementById('m2-base-val').value);
    const percentVal = parseFloat(document.getElementById('m2-percent-val').value);
    const operation = document.getElementById('m2-operation').value;

    if (isNaN(baseVal) || isNaN(percentVal)) {
      showError('Please enter valid numbers for the base value and percentage.');
      return;
    }

    errorBox.classList.add('hidden');

    const amount = (baseVal * Math.abs(percentVal)) / 100;
    let finalVal = 0;

    if (operation === 'increase') {
      finalVal = baseVal + amount;
    } else {
      finalVal = baseVal - amount;
    }

    renderResult({
      header: `${operation === 'increase' ? 'Percentage Increase' : 'Percentage Decrease'} Result`,
      primary: `${finalVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
      stats: [
        { label: 'Starting Value', value: baseVal.toLocaleString() },
        { label: `Percentage (${operation})`, value: `${percentVal}%` },
        { label: 'Calculated Amount', value: `${operation === 'increase' ? '+' : '-'}${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}` },
        { label: 'Final Result', value: finalVal.toLocaleString(undefined, { maximumFractionDigits: 4 }) }
      ],
      formulaHtml: `
        <strong>Formula Used:</strong><br>
        <code>Final Value = Base Value ${operation === 'increase' ? '+' : '-'} (Base Value × (Percent / 100))</code><br><br>
        <strong>Calculation Steps:</strong><br>
        1. ${percentVal}% of ${baseVal} = (${baseVal} × ${percentVal}) / 100 = ${amount}<br>
        2. ${operation === 'increase' ? 'Add to' : 'Subtract from'} Base = ${baseVal} ${operation === 'increase' ? '+' : '-'} ${amount} = <strong>${finalVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
      `
    });
  }

  // Mode 3 Form Submit (What Percent is X of Y)
  const form3 = document.getElementById('mode-3-form');
  form3.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateMode3();
  });

  document.getElementById('reset-mode-3').addEventListener('click', () => {
    form3.reset();
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateMode3() {
    const xVal = parseFloat(document.getElementById('m3-x-val').value);
    const yVal = parseFloat(document.getElementById('m3-y-val').value);

    if (isNaN(xVal) || isNaN(yVal)) {
      showError('Please enter valid numeric values for X and Y.');
      return;
    }

    if (yVal === 0) {
      showError('Total value (Y) cannot be zero (division by zero is undefined).');
      return;
    }

    errorBox.classList.add('hidden');

    const percentage = (xVal / yVal) * 100;

    renderResult({
      header: 'Percentage Proportion Result',
      primary: `${percentage.toFixed(2)}%`,
      stats: [
        { label: 'Part Value (X)', value: xVal.toLocaleString() },
        { label: 'Total Value (Y)', value: yVal.toLocaleString() },
        { label: 'Proportion Ratio', value: (xVal / yVal).toFixed(6) },
        { label: 'Percentage Result', value: `${percentage.toFixed(4)}%` }
      ],
      formulaHtml: `
        <strong>Formula Used:</strong><br>
        <code>Percentage = (X / Y) × 100</code><br><br>
        <strong>Calculation Steps:</strong><br>
        1. Divide Part by Total = ${xVal} / ${yVal} = ${(xVal / yVal).toFixed(6)}<br>
        2. Multiply by 100 = ${(xVal / yVal).toFixed(6)} × 100 = <strong>${percentage.toFixed(4)}%</strong>
      `
    });
  }

  function renderResult({ header, primary, stats, formulaHtml }) {
    document.getElementById('result-header-text').textContent = header;
    document.getElementById('result-primary-text').textContent = primary;

    const statsGrid = document.getElementById('result-grid-container');
    statsGrid.innerHTML = '';

    stats.forEach(s => {
      const card = document.createElement('div');
      card.className = 'result-stat-card';
      card.innerHTML = `
        <div class="result-stat-label">${s.label}</div>
        <div class="result-stat-value">${s.value}</div>
      `;
      statsGrid.appendChild(card);
    });

    document.getElementById('formula-breakdown-box').innerHTML = formulaHtml;

    resultBox.classList.add('is-visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }
});
