/**
 * Add or Subtract Days from Date UI Controller
 * Powered by AddDaysLogic pure engine.
 * Debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.AddDaysLogic;
  const T = ToolsBuilt.scope('add-days-to-date-calculator');
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
    // Result links (?start=&op=&amount=&unit=&biz=) take priority over saved state
    if (ToolsBuilt.resultLink.restore().length) {
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

    ToolsBuilt.resultLink.update();
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
      primaryResult.textContent = T('errors.missingStart');
      resultDetails.innerHTML = '';
      return;
    }
    startDateInput.removeAttribute('aria-invalid');

    if (rawAmount === '' || isNaN(amount) || amount < 0) {
      amountInput.setAttribute('aria-invalid', 'true');
      primaryResult.textContent = T('errors.missingAmount');
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
    const numFormatter = new Intl.NumberFormat(ToolsBuilt.pageLocale('en-US'));
    primaryResult.textContent = ToolsBuilt.formatIsoDate(res.resultDate);
    lastResultText = T('copy.result', {
      date: ToolsBuilt.formatIsoDate(res.resultDate),
      iso: res.resultDate,
      elapsed: numFormatter.format(res.elapsedCalendarDays),
      business: numFormatter.format(res.businessDays)
    });

    const opKey = `${operation === 'add' ? 'add' : 'subtract'}${businessOnly ? 'Business' : ''}`;
    const opText = T(`stats.operation.${opKey}`, { amount: numFormatter.format(amount), unit: logic.unitLabel(unit) });

    resultDetails.innerHTML = `
      <div class="result-grid mt-4">
        <div class="result-stat-card">
          <div class="result-stat-label">${T('stats.operationLabel')}</div>
          <div class="result-stat-value">${opText}</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">${T('stats.isoDate')}</div>
          <div class="result-stat-value">${res.resultDate}</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">${T('stats.elapsedDays')}</div>
          <div class="result-stat-value">${T('stats.daysValue', { n: numFormatter.format(res.elapsedCalendarDays) })}</div>
        </div>
        <div class="result-stat-card">
          <div class="result-stat-label">${T('stats.businessDays')}</div>
          <div class="result-stat-value">${T('stats.businessDaysValue', { n: numFormatter.format(res.businessDays), weekend: numFormatter.format(res.weekendDays) })}</div>
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
        window.ToolsBuilt.copy(lastResultText, T('copy.toast'));
      }
    });
  }

  initInputs();
  calculate();
});
