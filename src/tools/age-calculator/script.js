/**
 * Age Calculator UI Controller
 * Uses AgeCalculatorLogic pure engine.
 * Handles debounced live calculation, URL query sync, localStorage, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.AgeCalculatorLogic;
  const form = document.getElementById('calculator-form');
  const dobInput = document.getElementById('dob-date');
  const targetDateInput = document.getElementById('target-date');
  const leapConventionInputs = document.querySelectorAll('input[name="leap-convention"]');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-result-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  const STORAGE_KEY = 'toolsbuilt:age-calculator';
  let debounceTimer = null;
  let lastResultText = '';

  // Helper: get selected leap convention ('mar1' or 'feb28')
  function getSelectedConvention() {
    const checked = document.querySelector('input[name="leap-convention"]:checked');
    return checked ? checked.value : 'mar1';
  }

  function setSelectedConvention(val) {
    leapConventionInputs.forEach(radio => {
      radio.checked = (radio.value === val);
    });
  }

  // Pre-fill target date as today (local calendar format YYYY-MM-DD)
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  // 1. Initialize from URL params or localStorage or default
  function initInputs() {
    const params = new URLSearchParams(window.location.search);
    const urlDob = params.get('dob');
    const urlTarget = params.get('target');
    const urlConv = params.get('conv');

    if (urlDob) {
      dobInput.value = urlDob;
      targetDateInput.value = urlTarget || todayStr;
      if (urlConv && (urlConv === 'feb28' || urlConv === 'mar1')) {
        setSelectedConvention(urlConv);
      }
      return;
    }

    // Try localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.dob) dobInput.value = data.dob;
        if (data.target) targetDateInput.value = data.target;
        if (data.conv) setSelectedConvention(data.conv);
        return;
      }
    } catch (e) {}

    // Default sample
    dobInput.value = '2000-01-01';
    targetDateInput.value = todayStr;
  }

  function saveState(dob, target, conv) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dob, target, conv }));
    } catch (e) {}

    // Update URL query string without reloading
    const url = new URL(window.location.href);
    if (dob && dob !== '2000-01-01') {
      url.searchParams.set('dob', dob);
    } else {
      url.searchParams.delete('dob');
    }
    if (target && target !== todayStr) {
      url.searchParams.set('target', target);
    } else {
      url.searchParams.delete('target');
    }
    if (conv && conv !== 'mar1') {
      url.searchParams.set('conv', conv);
    } else {
      url.searchParams.delete('conv');
    }
    window.history.replaceState({}, '', url.toString());
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    dobInput.removeAttribute('aria-invalid');
    dobInput.removeAttribute('aria-describedby');
    targetDateInput.removeAttribute('aria-invalid');
    targetDateInput.removeAttribute('aria-describedby');
  }

  function showError(msg, targetField) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    if (targetField) {
      targetField.setAttribute('aria-invalid', 'true');
      targetField.setAttribute('aria-describedby', 'error-box');
      targetField.focus();
    }
  }

  function calculate() {
    clearError();
    const dob = dobInput.value;
    const target = targetDateInput.value;
    const conv = getSelectedConvention();

    if (!dob) {
      showError('Please enter a valid date of birth.', dobInput);
      return;
    }
    if (!target) {
      showError('Please enter a target calculation date.', targetDateInput);
      return;
    }

    try {
      const res = logic.calculateAge(dob, target, { leapConvention: conv });
      renderResult(res);
      saveState(dob, target, conv);
    } catch (err) {
      showError(err.message, dobInput);
    }
  }

  function renderResult(res) {
    const numFormatter = new Intl.NumberFormat('en-US');
    const primaryStr = `${res.years} Years, ${res.months} Months, ${res.days} Days`;
    lastResultText = `Exact Age: ${primaryStr}. Total Days: ${numFormatter.format(res.totalDays)}. Next Birthday: ${res.nextBirthday.daysUntil} days left (${res.nextBirthday.weekday}, ${res.nextBirthday.formattedDate}).`;

    document.getElementById('result-primary-text').textContent = primaryStr;
    document.getElementById('stat-years-months-days').textContent = `${res.years}y ${res.months}m ${res.days}d`;
    document.getElementById('stat-total-months').textContent = `${numFormatter.format(res.totalMonths)} Months`;
    document.getElementById('stat-total-weeks').textContent = `${numFormatter.format(res.totalWeeks)} Weeks`;
    document.getElementById('stat-total-days').textContent = `${numFormatter.format(res.totalDays)} Days`;
    document.getElementById('stat-total-hours').textContent = `${numFormatter.format(res.totalHours)} Hours`;

    const bdayEl = document.getElementById('stat-next-birthday');
    if (res.nextBirthday.isToday) {
      bdayEl.textContent = `Today is your Birthday! (${res.nextBirthday.weekday})`;
    } else {
      bdayEl.textContent = `${res.nextBirthday.daysUntil} days left (${res.nextBirthday.weekday}, ${res.nextBirthday.formattedDate})`;
    }

    resultBox.classList.add('is-visible');
  }

  function debouncedCalculate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  // Event Listeners
  dobInput.addEventListener('input', debouncedCalculate);
  targetDateInput.addEventListener('input', debouncedCalculate);
  leapConventionInputs.forEach(radio => radio.addEventListener('change', debouncedCalculate));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
  });

  resetBtn.addEventListener('click', () => {
    dobInput.value = '2000-01-01';
    targetDateInput.value = todayStr;
    setSelectedConvention('mar1');
    clearError();
    resultBox.classList.remove('is-visible');
    saveState('2000-01-01', todayStr, 'mar1');
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (lastResultText && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(lastResultText, 'Age result copied to clipboard');
      }
    });
  }

  // Init
  initInputs();
  calculate();
});
