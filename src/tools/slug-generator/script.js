/**
 * URL Slug Generator UI Controller
 * Powered by SlugLogic. Single and bulk modes with live results, copy and download.
 * Input is never stored, sent anywhere or written to the URL.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.SlugLogic;
  const form = document.getElementById('slug-form');
  const tabBtns = Array.from(document.querySelectorAll('.mode-tab-btn'));
  const modeFields = Array.from(document.querySelectorAll('[data-mode-field]'));
  const input = document.getElementById('slug-input');
  const bulkInput = document.getElementById('slug-bulk');
  const sepSelect = document.getElementById('slug-sep');
  const maxInput = document.getElementById('slug-max');
  const lowerBox = document.getElementById('slug-lower');
  const stopBox = document.getElementById('slug-stop');
  const uniqueBox = document.getElementById('slug-unique');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('slug-note');
  const output = document.getElementById('slug-output');
  const copyBtn = document.getElementById('copy-slug-btn');
  const downloadBtn = document.getElementById('download-btn');

  let mode = 'single';
  let copyText = '';

  function switchMode(next, focusTab) {
    mode = next === 'bulk' ? 'bulk' : 'single';
    tabBtns.forEach(btn => {
      const current = btn.dataset.mode === mode;
      btn.classList.toggle('active', current);
      btn.setAttribute('aria-selected', current ? 'true' : 'false');
      btn.tabIndex = current ? 0 : -1;
      if (current) form.setAttribute('aria-labelledby', btn.id);
      if (current && focusTab) btn.focus();
    });
    modeFields.forEach(el => { el.hidden = el.dataset.modeField !== mode; });
    run();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      switchMode(mode === 'single' ? 'bulk' : 'single', true);
    });
  });

  function options() {
    return {
      separator: sepSelect.value,
      lowercase: lowerBox.checked,
      removeStopWords: stopBox.checked,
      maxLength: Number(maxInput.value) || 0,
      unique: uniqueBox.checked
    };
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    maxInput.setAttribute('aria-invalid', 'true');
    maxInput.setAttribute('aria-errormessage', 'error-box');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    maxInput.removeAttribute('aria-invalid');
    maxInput.removeAttribute('aria-errormessage');
  }

  function run() {
    clearError();
    const max = maxInput.value === '' ? 0 : Number(maxInput.value);
    if (!Number.isInteger(max) || max < 0 || max > 500) {
      return showError('Max length must be a whole number from 0 (no limit) to 500.');
    }

    if (mode === 'single') {
      const slug = logic.slugify(input.value, options());
      headerText.textContent = 'Slug';
      primaryText.textContent = slug || '--';
      noteText.textContent = input.value.trim() && !slug
        ? 'This title has no letters or numbers to use. Add some words.'
        : (slug ? `${slug.length} character${slug.length === 1 ? '' : 's'} · /${slug}/` : 'Type a title to get its slug.');
      copyText = slug;
    } else {
      const rows = logic.slugifyLines(bulkInput.value, options());
      const repeated = rows.filter(r => r.duplicate).length;
      headerText.textContent = 'Bulk slugs';
      primaryText.textContent = `${rows.length} slug${rows.length === 1 ? '' : 's'}`;
      noteText.textContent = repeated
        ? `${repeated} title${repeated === 1 ? '' : 's'} gave a slug that was already used${uniqueBox.checked ? ', so a number was added' : ''}.`
        : 'Each title has its own slug.';
      output.value = rows.map(r => r.slug).join('\n');
      copyText = output.value;
    }
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = copyText;
    resultBox.classList.add('is-visible');
  }

  [input, bulkInput, maxInput].forEach(el => el.addEventListener('input', run));
  [sepSelect, lowerBox, stopBox, uniqueBox].forEach(el => el.addEventListener('change', run));
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });

  copyBtn.addEventListener('click', () => {
    if (copyText) ToolsBuilt.copy(copyText, mode === 'single' ? 'Slug copied' : 'Slugs copied');
  });

  downloadBtn.addEventListener('click', () => {
    if (!output.value) return;
    const blob = new Blob([output.value + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slugs.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  switchMode('single');
});
