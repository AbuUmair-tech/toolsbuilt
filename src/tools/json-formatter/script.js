/**
 * JSON Formatter & Validator UI Controller
 * Client-side script handling formatting, minification, error highlighting, copy, and download.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.JsonFormatterLogic;
  if (!logic) return;
  const T = ToolsBuilt.scope('json-formatter');
  const locale = ToolsBuilt.pageLocale();

  const jsonInput = document.getElementById('json-input');
  const jsonOutput = document.getElementById('json-output');
  const indentSelect = document.getElementById('indent-select');
  const sortKeysToggle = document.getElementById('sort-keys-toggle');
  const formatBtn = document.getElementById('format-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const validateBtn = document.getElementById('validate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const sampleBtn = document.getElementById('sample-btn');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const statusBox = document.getElementById('json-status');
  const sizeMeter = document.getElementById('size-meter');

  let debounceTimer = null;

  const SAMPLE_JSON = JSON.stringify({
    name: "ToolsBuilt",
    category: "Developer & Text Tools",
    version: 1.0,
    features: ["Format JSON", "Validate Syntax", "Minify Payloads", "Sort Keys"],
    private: true,
    stats: {
      latencyMs: 0,
      clientSide: true
    }
  }, null, 2);

  function updateSizeMeter(text) {
    if (!sizeMeter) return;
    const len = text.length;
    const max = logic.MAX_INPUT_BYTES;
    const kb = (len / 1024).toFixed(1);
    const maxMb = (max / (1024 * 1024)).toFixed(0);
    sizeMeter.textContent = T('sizeMeter', { kb, max: maxMb });
    if (len > max) {
      sizeMeter.classList.add('is-over-limit');
    } else {
      sizeMeter.classList.remove('is-over-limit');
    }
  }

  function showStatus(message, type = 'info') {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.className = `alert-box alert-${type}`;
    statusBox.removeAttribute('hidden');
    if (type === 'error') {
      statusBox.setAttribute('role', 'alert');
      jsonInput.setAttribute('aria-invalid', 'true');
    } else {
      statusBox.setAttribute('role', 'status');
      jsonInput.removeAttribute('aria-invalid');
    }
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.textContent = '';
    statusBox.className = 'alert-box';
    statusBox.setAttribute('hidden', '');
    jsonInput.removeAttribute('aria-invalid');
  }

  function processFormat() {
    const text = jsonInput.value;
    if (!text.trim()) {
      jsonOutput.value = '';
      clearStatus();
      return;
    }

    const indent = indentSelect ? indentSelect.value : '2';
    const sortKeys = sortKeysToggle ? sortKeysToggle.checked : false;

    const res = logic.formatJson(text, { indent, sortKeys });
    if (res.success) {
      jsonOutput.value = res.formatted;
      showStatus(T('status.formatted', { lines: res.stats.lines, kb: (res.stats.characterCount / 1024).toFixed(1) }), 'success');
    } else {
      showStatus(res.error, 'error');
    }
  }

  function processMinify() {
    const text = jsonInput.value;
    if (!text.trim()) {
      jsonOutput.value = '';
      clearStatus();
      return;
    }

    const res = logic.minifyJson(text);
    if (res.success) {
      jsonOutput.value = res.minified;
      showStatus(T('status.minified', { chars: res.stats.characterCount.toLocaleString(locale) }), 'success');
    } else {
      showStatus(res.error, 'error');
    }
  }

  function processValidate() {
    const text = jsonInput.value;
    if (!text.trim()) {
      showStatus(T('errors.empty'), 'info');
      return;
    }

    const res = logic.validateJson(text);
    if (res.valid) {
      showStatus(T('status.valid', { lines: res.stats.lineCount, kb: (res.stats.characterCount / 1024).toFixed(1) }), 'success');
    } else {
      showStatus(res.error, 'error');
    }
  }

  function handleInputDebounced() {
    const text = jsonInput.value;
    updateSizeMeter(text);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!text.trim()) {
        jsonOutput.value = '';
        clearStatus();
        return;
      }
      processFormat();
    }, 150);
  }

  // Event Listeners
  jsonInput.addEventListener('input', handleInputDebounced);

  if (indentSelect) {
    indentSelect.addEventListener('change', () => {
      if (jsonInput.value.trim()) processFormat();
    });
  }

  if (sortKeysToggle) {
    sortKeysToggle.addEventListener('change', () => {
      if (jsonInput.value.trim()) processFormat();
    });
  }

  if (formatBtn) {
    formatBtn.addEventListener('click', processFormat);
  }

  if (minifyBtn) {
    minifyBtn.addEventListener('click', processMinify);
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', processValidate);
  }

  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      jsonInput.value = SAMPLE_JSON;
      updateSizeMeter(SAMPLE_JSON);
      processFormat();
      jsonInput.focus();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      jsonInput.value = '';
      jsonOutput.value = '';
      updateSizeMeter('');
      clearStatus();
      jsonInput.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = jsonOutput.value || jsonInput.value;
      if (!textToCopy) {
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast(T('toast.nothingToCopy'));
        }
        return;
      }
      if (window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(textToCopy, T('toast.copied'));
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const textToDownload = jsonOutput.value || jsonInput.value;
      if (!textToDownload) {
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast(T('toast.nothingToDownload'));
        }
        return;
      }

      try {
        const blob = new Blob([textToDownload], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formatted.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast(T('toast.downloaded', { file: 'formatted.json' }));
        }
      } catch (e) {
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast(T('toast.downloadFailed'));
        }
      }
    });
  }

  // Initial check
  if (jsonInput.value) {
    updateSizeMeter(jsonInput.value);
    processFormat();
  }
});
