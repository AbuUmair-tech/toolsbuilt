/**
 * Add or Subtract Days from Date UI Controller
 * Powered by AddDaysLogic pure engine.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.AddDaysLogic;
  const startDateInput = document.getElementById('startDate');
  const amountInput = document.getElementById('amount');
  const unitSelect = document.getElementById('unit');
  const operationSelect = document.getElementById('operation');
  const businessDaysOnlyCheckbox = document.getElementById('businessDaysOnly');
  const businessDaysNote = document.getElementById('businessDaysNote');
  const todayBtn = document.getElementById('todayBtn');
  const calcBtn = document.getElementById('calcBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  const resultBox = document.getElementById('resultBox');
  const primaryResult = document.getElementById('primaryResult');
  const resultDetails = document.getElementById('resultDetails');
  const copyResultBtn = document.getElementById('copyResultBtn');

  const STORAGE_KEY = 'toolsbuilt:add-days-to-date-calculator';
  let debounceTimer = null;
  let lastResultText = '';

  function getTodayString() {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
  }

  function initInputs() {
    const todayStr = getTodayString();
    const params = new URLSearchParams(window.location.search);
    const urlStart = params.get('start');
    const urlOp = params.get('op');
    const urlAmount = params.get('amount');
    const urlUnit = params.get('unit');
    const urlBiz = params.get('biz');

    if (urlStart) {
      startDateInput.value = urlStart;
      if (urlOp) operationSelect.value = urlOp;
      if (urlAmount) amountInput.value = urlAmount;
      if (urlUnit) unitSelect.value = urlUnit;
      if (urlBiz) businessDaysOnlyCheckbox.checked = (urlBiz === '1' || urlBiz === 'true');
      updateBusinessDaysAvailability();
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.start) startDateInput.value = data.start;
        if (data.op) operationSelect.value = data.op;
        if (data.amount) amountInput.value = data.amount;
        if (data.unit) unitSelect.value = data.unit;
        if (typeof data.biz === 'boolean') businessDaysOnlyCheckbox.checked = data.biz;
        updateBusinessDaysAvailability();
        return;
      }
    } catch (e) {}

    startDateInput.value = todayStr;
    operationSelect.value = 'add';
    amountInput.value = '30';
    unitSelect.value = 'days';
    businessDaysOnlyCheckbox.checked = false;
    updateBusinessDaysAvailability();
  }

  function saveState(start, op, amount, unit, biz) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ start, op, amount, unit, biz }));
    } catch (e) {}

    const todayStr = getTodayString();
    const url = new URL(window.location.href);
    if (start && start !== todayStr) url.searchParams.set('start', start); else url.searchParams.delete('start');
    if (op && op !== 'add') url.searchParams.set('op', op); else url.searchParams.delete('op');
    if (amount && amount !== '30') url.searchParams.set('amount', amount); else url.searchParams.delete('amount');
    if (unit && unit !== 'days') url.searchParams.set('unit', unit); else url.searchParams.delete('unit');
    if (biz) url.searchParams.set('biz', '1'); else url.searchParams.delete('biz');
    window.history.replaceState({}, '', url.toString());
  }

  function updateBusinessDaysAvailability() {
    const unit = unitSelect.value;
    const allowsBusinessDays = (unit === 'days' || unit === 'weeks');
    if (allowsBusinessDays) {
      businessDaysOnlyCheckbox.disabled = false;
      if (businessDaysNote) businessDaysNote.style.display = 'none';
    } else {
      businessDaysOnlyCheckbox.disabled = true;
      if (businessDaysNote) businessDaysNote.style.display = 'block';
    }
  }

  function calculate() {
    const startDateStr = startDateInput.value;
    const rawAmount = amountInput.value.trim();
    const amount = parseInt(rawAmount, 10);
    const unit = unitSelect.value;
    const operation = operationSelect.value;
    const businessOnly = businessDaysOnlyCheckbox.checked && !businessDaysOnlyCheckbox.disabled;

    if (!startDateStr) {
      startDateInput.setAttribute('aria-invalid', 'true');
      primaryResult.textContent = 'Please enter a valid start date.';
      resultDetails.innerHTML = '';
      return;
    }
    startDateInput.removeAttribute('aria-invalid');

    if (rawAmount === '' || isNaN(amount) || amount < 0) {
      amountInput.setAttribute('aria-invalid', 'true');
      primaryResult.textContent = 'Please enter a valid non-negative amount.';
      resultDetails.innerHTML = '';
      return;
    }
    amountInput.removeAttribute('aria-invalid');

    try {
      const res = logic.calculateAddDays(startDateStr, amount, unit, operation, { businessDaysOnly: businessOnly });
      renderResult(res, amount, unit, operation, businessOnly);
      saveState(startDateStr, operation, String(amount), unit, businessOnly);
    } catch (err) {
      primaryResult.textContent = err.message;
      resultDetails.innerHTML = '';
    }
  }

  function renderResult(res, amount, unit, operation, businessOnly) {
    const numFormatter = new Intl.NumberFormat('en-US');
    primaryResult.textContent = `${res.weekday}, ${res.formattedDate}`;
    lastResultText = `Resulting Date: ${res.weekday}, ${res.formattedDate} (${res.resultDate}). Elapsed Calendar Days: ${numFormatter.format(res.elapsedCalendarDays)}. Business Days: ${numFormatter.format(res.businessDays)}.`;

    const opText = operation === 'add' ? 'Added' : 'Subtracted';
    const bizText = businessOnly ? ' (Business Days Only)' : '';

    resultDetails.innerHTML = `
      <div class="result-grid" style="margin-top: 1rem;">
        <div class="result-stat-card">
          <div class="result-stat-label">Operation</div>
          <div class="result-stat-value">${opText} ${numFormatter.format(amount)} ${unit}${bizText}</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">ISO 8601 Date</div>
          <div class="result-stat-value">${res.resultDate}</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">Elapsed Calendar Days</div>
          <div class="result-stat-value">${numFormatter.format(res.elapsedCalendarDays)} Days</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">Working Business Days</div>
          <div class="result-stat-value">${numFormatter.format(res.businessDays)} Days (${numFormatter.format(res.weekendDays)} Weekend)</div>
        </div>
      </div>
    `;

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  [startDateInput, amountInput, unitSelect, operationSelect, businessDaysOnlyCheckbox].forEach(el => {
    el.addEventListener('input', () => {
      updateBusinessDaysAvailability();
      debouncedCalculate();
    });
    el.addEventListener('change', () => {
      updateBusinessDaysAvailability();
      debouncedCalculate();
    });
  });

  [startDateInput, amountInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounceTimer);
        calculate();
      }
    });
  });

  todayBtn.addEventListener('click', () => {
    startDateInput.value = getTodayString();
    calculate();
  });

  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      clearTimeout(debounceTimer);
      calculate();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      startDateInput.value = getTodayString();
      operationSelect.value = 'add';
      amountInput.value = '30';
      unitSelect.value = 'days';
      businessDaysOnlyCheckbox.checked = false;
      updateBusinessDaysAvailability();
      saveState(getTodayString(), 'add', '30', 'days', false);
      calculate();
    });
  }

  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Target date copied to clipboard');
      }
    });
  }

  initInputs();
  calculate();
});
