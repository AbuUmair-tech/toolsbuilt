/**
 * Duplicate Line Remover UI Controller
 * Powered by DuplicateLinesLogic. Live results, copy and .txt download.
 * The text is never stored, sent anywhere or written to the URL.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.DuplicateLinesLogic;
  const T = ToolsBuilt.scope('remove-duplicate-lines');
  const locale = ToolsBuilt.pageLocale('en-US');
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

  let debounceTimer = null;

  // '<key>.one' for 1, '<key>.other' otherwise, with the count formatted for the page
  const plural = (n, key) => T(`${key}.${n === 1 ? 'one' : 'other'}`, { n: n.toLocaleString(locale) });

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
    primaryText.textContent = plural(res.duplicatesRemoved, 'result.removed');
    const parts = [T('note.inOut', { in: plural(res.totalLines, 'note.lines'), out: plural(res.keptLines, 'note.lines') })];
    if (res.emptyRemoved) parts.push(plural(res.emptyRemoved, 'note.emptyRemoved'));
    if (res.repeated.length) {
      const label = (line) => (line.trim() === '' ? T('note.emptyLine') : T('note.quoted', { text: line.length > 30 ? `${line.slice(0, 30)}…` : line }));
      const list = res.repeated.slice(0, 3).map(r => T('note.repeatedItem', { line: label(r.line), count: r.count })).join(T('note.listSeparator'));
      parts.push(T('note.mostRepeated', { list }));
    }
    noteText.textContent = T('note.sentences', { text: parts.join(T('note.sentenceSeparator')) });
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
    input.value = T('example');
    run();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    run();
    input.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (output.value) ToolsBuilt.copy(output.value, T('copied'));
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
