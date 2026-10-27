/**
 * JSON Formatter & Validator UI Controller
 * Client-side script handling formatting, minification, error highlighting, copy, and download.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.JsonFormatterLogic;
  if (!logic) return;

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
    sizeMeter.textContent = `${kb} KB / ${maxMb} MB`;
    if (len > max) {
      sizeMeter.style.color = 'var(--text-danger, #ef4444)';
      sizeMeter.style.fontWeight = 'bold';
    } else {
      sizeMeter.style.color = 'var(--text-muted)';
      sizeMeter.style.fontWeight = 'normal';
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
      showStatus(`✓ Valid JSON: formatted ${res.stats.lines} lines (${(res.stats.characterCount / 1024).toFixed(1)} KB)`, 'success');
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
      showStatus(`✓ Minified JSON: 1 line (${res.stats.characterCount.toLocaleString()} chars)`, 'success');
    } else {
      showStatus(res.error, 'error');
    }
  }

  function processValidate() {
    const text = jsonInput.value;
    if (!text.trim()) {
      showStatus('JSON input is empty. Paste or type JSON to validate.', 'info');
      return;
    }

    const res = logic.validateJson(text);
    if (res.valid) {
      showStatus(`✓ Valid JSON syntax: ${res.stats.lineCount} lines (${(res.stats.characterCount / 1024).toFixed(1)} KB)`, 'success');
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
          window.ToolsBuilt.toast('Nothing to copy. Enter valid JSON first.');
        }
        return;
      }
      if (window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(textToCopy, 'JSON copied to clipboard');
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const textToDownload = jsonOutput.value || jsonInput.value;
      if (!textToDownload) {
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast('Nothing to download. Enter valid JSON first.');
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
          window.ToolsBuilt.toast('Downloaded formatted.json');
        }
      } catch (e) {
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast('Download failed. Use copy instead.');
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
