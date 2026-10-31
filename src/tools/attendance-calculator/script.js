/**
 * Attendance Calculator UI Controller
 * Powered by AttendanceLogic. Preset or custom target, classes needed / classes
 * you can miss, a 1-10 class projection table and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.AttendanceLogic;
  const form = document.getElementById('calculator-form');
  const attendedInput = document.getElementById('attended');
  const totalInput = document.getElementById('total');
  const targetInput = document.getElementById('target');
  const presets = Array.from(document.querySelectorAll('input[name="target-preset"]'));
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const adviceText = document.getElementById('attendance-advice');
  const caption = document.getElementById('projection-caption');
  const rowsBody = document.getElementById('projection-rows');

  const FIELDS = { attended: attendedInput, total: totalInput, target: targetInput };
  let debounceTimer = null;

  const pct = (n) => `${n.toFixed(2)}%`;
  const classes = (n) => `${n.toLocaleString('en-US')} class${n === 1 ? '' : 'es'}`;

  function syncPresets() {
    presets.forEach(r => { r.checked = targetInput.value !== '' && Number(r.value) === Number(targetInput.value); });
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    Object.values(FIELDS).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
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

  function cell(text, ok) {
    const td = document.createElement('td');
    td.textContent = `${text} ${ok ? '✓' : '✗'}`;
    td.className = ok ? 'is-ok' : 'is-below';
    td.setAttribute('aria-label', `${text}, ${ok ? 'meets' : 'below'} target`);
    return td;
  }

  function calculate() {
    clearError();
    const res = logic.calculateAttendance(attendedInput.value, totalInput.value, targetInput.value);
    if (res.error) return showError(res.error, FIELDS[res.field]);

    headerText.textContent = `Attendance: ${res.attended} of ${res.total} classes`;
    primaryText.textContent = pct(res.percentage);

    let advice;
    if (res.meetsTarget) {
      advice = res.canMiss > 0
        ? `You are at or above ${res.target}%. You can miss ${classes(res.canMiss)} and still have ${pct(res.afterMissing.percentage)} (${res.attended}/${res.afterMissing.total}).`
        : `You are exactly on ${res.target}% with no classes to spare: missing the next class would take you to ${pct(res.projection[0].ifMiss)}.`;
    } else if (!res.reachable) {
      advice = `You have missed ${classes(res.missed)}, so ${res.target}% can no longer be reached: attendance stays below 100% however many classes you attend.`;
    } else {
      advice = `You are below ${res.target}%. Attend the next ${classes(res.classesNeeded)} in a row to reach ${pct(res.afterNeeded.percentage)} (${res.afterNeeded.attended}/${res.afterNeeded.total}).`;
    }
    adviceText.textContent = advice;

    caption.textContent = `After the next 1-10 classes (target ${res.target}%)`;
    rowsBody.replaceChildren(...res.projection.map(p => {
      const tr = document.createElement('tr');
      const k = document.createElement('td');
      k.textContent = `+${p.classes}`;
      tr.append(k, cell(pct(p.ifAttend), p.attendMeets), cell(pct(p.ifMiss), p.missMeets));
      return tr;
    }));

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = `Attendance ${res.attended}/${res.total} = ${pct(res.percentage)}. ${advice}`;

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 150);
  }

  presets.forEach(r => r.addEventListener('change', () => {
    targetInput.value = r.value;
    calculate();
  }));
  targetInput.addEventListener('input', () => { syncPresets(); debounced(); });
  [attendedInput, totalInput].forEach(el => el.addEventListener('input', debounced));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  resetBtn.addEventListener('click', () => {
    attendedInput.value = '30';
    totalInput.value = '40';
    targetInput.value = '75';
    syncPresets();
    calculate();
  });

  ToolsBuilt.resultLink.restore();
  syncPresets();
  calculate();
});
