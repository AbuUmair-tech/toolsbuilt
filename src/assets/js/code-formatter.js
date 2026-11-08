/**
 * Shared Code Formatter controller (used with partials/code-formatter.njk).
 * Wires the input, options, Format / Clear / Copy buttons and error reporting to a tool's
 * logic module, which must expose format(code, options) -> Promise<{ output, changed }>.
 * The engine is warmed up on first focus of the input so formatting feels instant.
 */
window.ToolsBuilt = window.ToolsBuilt || {};

ToolsBuilt.codeFormatter = (function () {
  'use strict';

  function init(cfg) {
    const logic = cfg.logic;
    const form = document.getElementById('calculator-form');
    const input = document.getElementById('code-input');
    const output = document.getElementById('code-output');
    const status = document.getElementById('code-status');
    const errorBox = document.getElementById('error-box');
    const formatBtn = document.getElementById('format-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const sampleTemplate = document.getElementById('code-sample');
    const sample = sampleTemplate ? sampleTemplate.content.textContent : '';
    const optionFields = Array.from(form.querySelectorAll('[data-option]'));
    const warningsBox = document.getElementById('code-warnings');
    const storageKey = cfg.storageKey;
    let busy = false;

    // Options are remembered on this device; code is never stored
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      optionFields.forEach(el => {
        const value = saved[el.dataset.option];
        if (value !== undefined && Array.from(el.options).some(o => o.value === String(value))) el.value = String(value);
      });
    } catch (e) {}

    function readOptions() {
      const options = {};
      optionFields.forEach(el => { options[el.dataset.option] = el.value; });
      return options;
    }

    function saveOptions() {
      try { localStorage.setItem(storageKey, JSON.stringify(readOptions())); } catch (e) {}
    }

    function setStatus(text) {
      status.textContent = text;
    }

    function clearError() {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
      input.removeAttribute('aria-invalid');
      showWarnings([]);
    }

    // Non-fatal problems reported by the logic module (e.g. an element that is never closed)
    function showWarnings(list) {
      if (!warningsBox) return;
      warningsBox.replaceChildren(...(list || []).map(w => {
        const li = document.createElement('li');
        li.textContent = w.message || String(w);
        return li;
      }));
      warningsBox.hidden = !(list && list.length);
    }

    // Put the caret on the reported line so the problem is easy to find
    function selectPosition(line, column) {
      const lines = input.value.split('\n');
      let index = 0;
      for (let i = 0; i < Math.min(line - 1, lines.length); i++) index += lines[i].length + 1;
      index += Math.max(0, (column || 1) - 1);
      input.focus();
      input.setSelectionRange(index, Math.min(index + 1, input.value.length));
    }

    function showError(err) {
      errorBox.textContent = err.message || String(err);
      errorBox.classList.remove('hidden');
      input.setAttribute('aria-invalid', 'true');
      setStatus('');
      if (err.line) selectPosition(err.line, err.column);
    }

    let warmed = false;
    function warmUp() {
      if (warmed || typeof logic.loadEngine !== 'function') return;
      warmed = true;
      logic.loadEngine().catch(() => { warmed = false; });
    }

    async function run() {
      if (busy) return;
      clearError();
      busy = true;
      formatBtn.disabled = true;
      setStatus(ToolsBuilt.t('codeFormatter.formatting'));
      try {
        const res = await logic.format(input.value, readOptions());
        output.value = res.output;
        copyBtn.disabled = false;
        const lines = res.output.replace(/\n$/, '').split('\n').length;
        setStatus(res.changed
          ? ToolsBuilt.tp(res.options && res.options.mode === 'minify' ? 'codeFormatter.minifiedLines' : 'codeFormatter.formattedLines', lines)
          : ToolsBuilt.t('codeFormatter.alreadyFormatted'));
        showWarnings(res.warnings);
        saveOptions();
      } catch (err) {
        output.value = '';
        copyBtn.disabled = true;
        // Syntax and input errors come from the logic module; anything else means the engine failed to load
        const expected = /^(Python|Java|Html)SyntaxError$/.test(err && err.name) || /^(Paste|Unsupported)/.test(err && err.message);
        if (expected) {
          showError(err);
        } else {
          console.error(err);
          showError(new Error(ToolsBuilt.t('codeFormatter.loadFailed')));
        }
      } finally {
        busy = false;
        formatBtn.disabled = false;
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      run();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        run();
      }
    });
    input.addEventListener('focus', warmUp, { once: true });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid')) clearError();
    });

    optionFields.forEach(el => el.addEventListener('change', () => {
      saveOptions();
      if (output.value) run();
    }));

    clearBtn.addEventListener('click', () => {
      input.value = '';
      output.value = '';
      copyBtn.disabled = true;
      clearError();
      setStatus('');
      input.focus();
    });

    sampleBtn.addEventListener('click', () => {
      input.value = sample;
      clearError();
      input.focus();
    });

    copyBtn.addEventListener('click', () => {
      if (output.value && ToolsBuilt.copy) ToolsBuilt.copy(output.value, ToolsBuilt.t('codeFormatter.copied'));
    });
  }

  return { init };
})();
