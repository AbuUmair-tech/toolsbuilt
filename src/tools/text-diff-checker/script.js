/**
 * Text Diff Checker UI Controller
 * Runs TextDiffLogic in a Web Worker (worker.js) so large texts do not block the page,
 * falling back to the main thread if workers are unavailable. The texts are never
 * stored, sent anywhere or written to the URL.
 */
document.addEventListener('DOMContentLoaded', () => {
  const T = ToolsBuilt.scope('text-diff-checker');
  const locale = ToolsBuilt.pageLocale('en-US');
  const form = document.getElementById('diff-form');
  const oldInput = document.getElementById('diff-old');
  const newInput = document.getElementById('diff-new');
  const oldCount = document.getElementById('old-count');
  const newCount = document.getElementById('new-count');
  const optCase = document.getElementById('opt-case');
  const optSpace = document.getElementById('opt-space');
  const optBlank = document.getElementById('opt-blank');
  const optContext = document.getElementById('opt-context');
  const viewRadios = Array.from(document.querySelectorAll('input[name="diff-view"]'));
  const swapBtn = document.getElementById('swap-btn');
  const exampleBtn = document.getElementById('example-btn');
  const clearBtn = document.getElementById('clear-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const primaryText = document.getElementById('result-primary-text');
  const summary = document.getElementById('diff-summary');
  const noteText = document.getElementById('diff-note');
  const output = document.getElementById('diff-output');

  const CONTEXT = 3;
  const MAX_CHARS = 5000000;

  let worker = null;
  let requestId = 0;
  let lastResult = null;
  let debounceTimer = null;

  // Phones default to the inline view, which fits narrow screens
  if (window.matchMedia && window.matchMedia('(max-width: 639px)').matches) {
    viewRadios.forEach(r => { r.checked = r.value === 'inline'; });
  }

  try {
    worker = new Worker('/tools/text-diff-checker/worker.js');
    worker.onmessage = (e) => {
      if (!e.data || e.data.id !== requestId) return; // a newer comparison has started
      if (e.data.error) return showError(e.data.message || T('errors.failed'));
      render(e.data.result);
    };
    worker.onerror = () => { worker = null; };
  } catch (e) {
    worker = null;
  }

  const lineCount = (text) => (text ? window.TextDiffLogic.splitLines(text).length : 0);
  // '<key>.one' for 1, '<key>.other' otherwise, with the count formatted for the page
  const plural = (n, key) => T(`${key}.${n === 1 ? 'one' : 'other'}`, { n: n.toLocaleString(locale) });

  function updateCounts() {
    oldCount.textContent = plural(lineCount(oldInput.value), 'lines');
    newCount.textContent = plural(lineCount(newInput.value), 'lines');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function options() {
    return { ignoreCase: optCase.checked, ignoreWhitespace: optSpace.checked, ignoreBlankLines: optBlank.checked };
  }

  function compare() {
    clearError();
    if (!oldInput.value && !newInput.value) {
      resultBox.classList.remove('is-visible');
      return;
    }
    if (oldInput.value.length + newInput.value.length > MAX_CHARS) {
      return showError(T('errors.tooLarge'));
    }
    requestId++;
    primaryText.textContent = T('result.comparing');
    if (worker) {
      worker.postMessage({ id: requestId, oldText: oldInput.value, newText: newInput.value, options: options() });
    } else {
      try {
        render(window.TextDiffLogic.diffTexts(oldInput.value, newInput.value, options()));
      } catch (err) {
        showError(err.message || T('errors.failed'));
      }
    }
  }

  // ---- Rendering ---------------------------------------------------------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function textCell(line, extraClass) {
    const cell = el('span', `diff-text${extraClass ? ` ${extraClass}` : ''}`);
    if (line && line.segments) {
      line.segments.forEach(seg => {
        if (seg.type === 'equal') cell.appendChild(document.createTextNode(seg.text));
        else cell.appendChild(el(seg.type === 'removed' ? 'del' : 'ins', seg.type === 'removed' ? 'diff-word-removed' : 'diff-word-added', seg.text));
      });
    } else {
      cell.textContent = line ? line.text : '';
    }
    if (line && line.text === '') cell.appendChild(document.createTextNode(' '));
    return cell;
  }

  /** Indexes to show when folding unchanged runs: changes plus CONTEXT lines each side. */
  function visibleMask(items, isChange) {
    if (!optContext.checked) return null;
    const show = new Array(items.length).fill(false);
    items.forEach((item, i) => {
      if (!isChange(item)) return;
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(items.length - 1, i + CONTEXT); j++) show[j] = true;
    });
    return show;
  }

  function appendWithFolds(frag, items, mask, renderItem) {
    let hidden = 0;
    items.forEach((item, i) => {
      if (mask && !mask[i]) { hidden++; return; }
      if (hidden) { frag.appendChild(el('div', 'diff-fold', plural(hidden, 'fold'))); hidden = 0; }
      frag.appendChild(renderItem(item));
    });
    if (hidden) frag.appendChild(el('div', 'diff-fold', plural(hidden, 'fold')));
  }

  function renderInline(result) {
    const frag = document.createDocumentFragment();
    const mask = visibleMask(result.inline, l => l.type !== 'equal');
    appendWithFolds(frag, result.inline, mask, (line) => {
      const row = el('div', `diff-line${line.type === 'removed' ? ' is-removed-line' : line.type === 'added' ? ' is-added-line' : ''}`);
      row.append(
        el('span', 'diff-no', line.oldNo ? String(line.oldNo) : ''),
        el('span', 'diff-no', line.newNo ? String(line.newNo) : ''),
        el('span', 'diff-sign', line.type === 'removed' ? '−' : line.type === 'added' ? '+' : ''),
        textCell(line)
      );
      if (line.type !== 'equal') row.setAttribute('aria-label', T(line.type === 'removed' ? 'aria.removed' : 'aria.added', { no: line.oldNo || line.newNo, text: line.text }));
      return row;
    });
    return frag;
  }

  function renderSplit(result) {
    const frag = document.createDocumentFragment();
    const mask = visibleMask(result.rows, r => r.type !== 'equal');
    appendWithFolds(frag, result.rows, mask, (r) => {
      const row = el('div', 'diff-row');
      const side = (cell, kind) => {
        const changed = r.type !== 'equal' && cell;
        const cls = !cell ? 'is-empty-cell' : (changed ? (kind === 'left' ? 'is-removed-line' : 'is-added-line') : '');
        const no = el('span', `diff-no ${cls}`.trim(), cell ? String(cell.no) : '');
        const sign = el('span', `diff-sign ${cls}`.trim(), changed ? (kind === 'left' ? '−' : '+') : '');
        return [no, sign, textCell(cell, cls)];
      };
      row.append(...side(r.left, 'left'), ...side(r.right, 'right'));
      return row;
    });
    return frag;
  }

  function render(result) {
    lastResult = result;
    const s = result.stats;
    summary.replaceChildren(
      el('li', 'is-added', T('summary.added', { n: s.added.toLocaleString(locale) })),
      el('li', 'is-removed', T('summary.removed', { n: s.removed.toLocaleString(locale) })),
      el('li', '', T('summary.unchanged', { n: s.unchanged.toLocaleString(locale) }))
    );

    if (result.identical) {
      const ignoring = [optCase.checked && T('ignored.case'), optSpace.checked && T('ignored.whitespace'), optBlank.checked && T('ignored.blankLines')].filter(Boolean);
      primaryText.textContent = T('result.identical');
      noteText.textContent = ignoring.length
        ? T(ignoring.length === 1 ? 'note.identicalIgnoring.one' : 'note.identicalIgnoring.other', { list: ignoring.join(T('ignored.separator')) })
        : T('note.identical');
      noteText.hidden = false;
      output.replaceChildren();
    } else {
      const changes = s.added + s.removed;
      primaryText.textContent = plural(changes, 'result.differ');
      noteText.textContent = result.approximate ? T('note.approximate') : '';
      noteText.hidden = !result.approximate;
      const view = (viewRadios.find(r => r.checked) || viewRadios[0]).value;
      output.replaceChildren(view === 'inline' ? renderInline(result) : renderSplit(result));
    }

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = T('copySummary', { added: s.added, removed: s.removed, unchanged: s.unchanged });
    resultBox.classList.add('is-visible');
  }

  // ---- Events ------------------------------------------------------------
  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(compare, 400);
  }

  [oldInput, newInput].forEach(t => t.addEventListener('input', () => { updateCounts(); debounced(); }));
  [optCase, optSpace, optBlank].forEach(c => c.addEventListener('change', compare));
  [optContext, ...viewRadios].forEach(c => c.addEventListener('change', () => { if (lastResult) render(lastResult); }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    if (!oldInput.value && !newInput.value) {
      showError(T('errors.empty'));
      oldInput.focus();
      return;
    }
    compare();
  });

  swapBtn.addEventListener('click', () => {
    [oldInput.value, newInput.value] = [newInput.value, oldInput.value];
    updateCounts();
    compare();
  });

  exampleBtn.addEventListener('click', () => {
    oldInput.value = T('example.old');
    newInput.value = T('example.new');
    updateCounts();
    compare();
  });

  clearBtn.addEventListener('click', () => {
    oldInput.value = '';
    newInput.value = '';
    lastResult = null;
    updateCounts();
    clearError();
    output.replaceChildren();
    resultBox.classList.remove('is-visible');
    oldInput.focus();
  });

  updateCounts();
});
