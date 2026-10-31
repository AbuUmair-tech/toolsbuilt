/**
 * Duplicate Line Remover UI Controller
 * Powered by DuplicateLinesLogic. Live results, copy and .txt download.
 * The text is never stored, sent anywhere or written to the URL.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DuplicateLinesLogic;
  const input = document.getElementById('dedupe-input');
  const optCase = document.getElementById('opt-case');
  const optTrim = document.getElementById('opt-trim');
  const optTrimOutput = document.getElementById('opt-trim-output');
  const optEmpty = document.getElementById('opt-empty');
  const optKeep = document.getElementById('opt-keep');
  const optSort = document.getElementById('opt-sort');
  const exampleBtn = document.getElementById('example-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const noteText = document.getElementById('dedupe-note');
  const output = document.getElementById('dedupe-output');
  const copyBtn = document.getElementById('copy-output-btn');
  const downloadBtn = document.getElementById('download-btn');

  const EXAMPLE = 'apple\nBanana\napple\ncherry\n banana\n\nCherry\ndate\n\napple';
  let debounceTimer = null;

  const plural = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

  function run() {
    if (!input.value) {
      resultBox.classList.remove('is-visible');
      output.value = '';
      return;
    }
    const res = logic.removeDuplicates(input.value, {
      caseInsensitive: optCase.checked,
      trim: optTrim.checked,
      trimOutput: optTrimOutput.checked,
      removeEmpty: optEmpty.checked,
      keep: optKeep.value,
      sort: optSort.value
    });
    primaryText.textContent = `${plural(res.duplicatesRemoved, 'duplicate')} removed`;
    const parts = [`${plural(res.totalLines, 'line')} in, ${plural(res.keptLines, 'line')} out`];
    if (res.emptyRemoved) parts.push(`${plural(res.emptyRemoved, 'empty line')} removed`);
    if (res.repeated.length) {
      const label = (line) => (line.trim() === '' ? '(empty line)' : `"${line.length > 30 ? `${line.slice(0, 30)}…` : line}"`);
      parts.push(`Most repeated: ${res.repeated.slice(0, 3).map(r => `${label(r.line)} ×${r.count}`).join(', ')}`);
    }
    noteText.textContent = `${parts.join('. ')}.`;
    output.value = res.output;
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = res.output;
    resultBox.classList.add('is-visible');
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, input.value.length > 200000 ? 400 : 120);
  }

  input.addEventListener('input', debounced);
  [optCase, optTrim, optTrimOutput, optEmpty, optKeep, optSort].forEach(el => el.addEventListener('change', run));
  document.getElementById('dedupe-form').addEventListener('submit', (e) => { e.preventDefault(); run(); });

  exampleBtn.addEventListener('click', () => {
    input.value = EXAMPLE;
    run();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    run();
    input.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (output.value) ToolsBuilt.copy(output.value, 'Result copied');
  });

  downloadBtn.addEventListener('click', () => {
    if (!output.value) return;
    const blob = new Blob([output.value + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unique-lines.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});
