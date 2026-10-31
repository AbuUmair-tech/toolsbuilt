/**
 * Random Number Generator UI Controller
 * Powered by RandomNumberLogic (crypto.getRandomValues + rejection sampling).
 * Numbers are drawn only on Generate; the settings (not the numbers) go into shared links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.RandomNumberLogic;
  const form = document.getElementById('calculator-form');
  const minInput = document.getElementById('rng-min');
  const maxInput = document.getElementById('rng-max');
  const countInput = document.getElementById('rng-count');
  const dpSelect = document.getElementById('rng-dp');
  const dupesBox = document.getElementById('rng-dupes');
  const uniqueField = document.getElementById('rng-unique');
  const sortBox = document.getElementById('rng-sort');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-numbers-btn');
  const downloadBtn = document.getElementById('download-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const list = document.getElementById('rng-list');
  const noteText = document.getElementById('rng-note');

  const FIELDS = { min: minInput, max: maxInput, count: countInput, decimals: dpSelect };
  let lastText = '';

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

  function generate() {
    clearError();
    uniqueField.value = dupesBox.checked ? '' : '1';
    let res;
    try {
      res = logic.generate({
        min: minInput.value,
        max: maxInput.value,
        count: countInput.value,
        decimals: dpSelect.value,
        unique: !dupesBox.checked,
        sort: sortBox.checked
      });
    } catch (err) {
      return showError(err.message || 'Secure random numbers are not available in this browser.');
    }
    if (res.error) return showError(res.error, FIELDS[res.field]);

    const single = res.count === 1;
    headerText.textContent = single
      ? `Random ${res.decimals ? 'number' : 'whole number'} from ${res.min} to ${res.max}`
      : `${res.count.toLocaleString('en-US')} random numbers from ${res.min} to ${res.max}`;
    primaryText.textContent = single ? res.text[0] : `${res.count.toLocaleString('en-US')} numbers${res.unique ? ', no repeats' : ''}${res.sorted ? ', sorted' : ''}`;
    list.replaceChildren(...(single ? [] : res.text.map(t => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    })));
    const chance = res.possible <= 1e6 ? `1 in ${res.possible.toLocaleString('en-US')}` : `about 1 in ${res.possible.toExponential(2)}`;
    noteText.textContent = `${res.possible.toLocaleString('en-US')} possible value${res.possible === 1 ? '' : 's'}; each draw gives every value a ${chance} chance.`;

    lastText = res.text.join('\n');
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = res.text.join(', ');
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (lastText) ToolsBuilt.copy(lastText, 'Numbers copied');
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastText) return;
    const blob = new Blob([lastText + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'random-numbers.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  resetBtn.addEventListener('click', () => {
    minInput.value = '1';
    maxInput.value = '100';
    countInput.value = '1';
    dpSelect.value = '0';
    dupesBox.checked = true;
    sortBox.checked = false;
    generate();
  });

  ToolsBuilt.resultLink.restore();
  dupesBox.checked = uniqueField.value !== '1';
  generate();
});
