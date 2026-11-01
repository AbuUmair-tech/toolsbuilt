/**
 * Base64 Encoder & Decoder UI Controller
 * Client-side script handling live conversion, URL-safe toggle, mode switching, copy, and error alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.Base64Logic;
  if (!logic) return;
  const T = ToolsBuilt.scope('base64-encoder-decoder');
  const locale = ToolsBuilt.pageLocale();

  const modeRadios = document.querySelectorAll('input[name="base64-mode"]');
  const urlSafeToggle = document.getElementById('url-safe-toggle');
  const base64Input = document.getElementById('base64-input');
  const base64Output = document.getElementById('base64-output');
  const inputLabel = document.getElementById('input-label');
  const outputLabel = document.getElementById('output-label');
  const convertBtn = document.getElementById('convert-btn');
  const swapBtn = document.getElementById('swap-btn');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusBox = document.getElementById('base64-status');
  const sizeMeter = document.getElementById('size-meter');

  let currentMode = 'encode'; // 'encode' or 'decode'
  let debounceTimer = null;

  function getMode() {
    const checked = document.querySelector('input[name="base64-mode"]:checked');
    return checked ? checked.value : 'encode';
  }

  function updateLabels() {
    currentMode = getMode();
    const labels = currentMode === 'encode' ? 'labels.encode' : 'labels.decode';
    if (inputLabel) inputLabel.textContent = T(`${labels}.input`);
    if (outputLabel) outputLabel.textContent = T(`${labels}.output`);
    if (convertBtn) convertBtn.textContent = T(`${labels}.button`);
    base64Input.placeholder = T(`${labels}.placeholder`);
  }

  function updateSizeMeter(text) {
    if (!sizeMeter) return;
    const len = text.length;
    const max = logic.MAX_INPUT_BYTES;
    const kb = (len / 1024).toFixed(1);
    const maxMb = (max / (1024 * 1024)).toFixed(0);
    sizeMeter.textContent = T('sizeMeter', { kb, max: maxMb });
    if (len > max) {
      sizeMeter.style.color = 'var(--color-error-text, #ef4444)';
      sizeMeter.style.fontWeight = 'bold';
    } else {
      sizeMeter.style.color = 'var(--text-secondary)';
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
      base64Input.setAttribute('aria-invalid', 'true');
    } else {
      statusBox.setAttribute('role', 'status');
      base64Input.removeAttribute('aria-invalid');
    }
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.textContent = '';
    statusBox.className = 'alert-box';
    statusBox.setAttribute('hidden', '');
    base64Input.removeAttribute('aria-invalid');
  }

  function processConversion() {
    const text = base64Input.value;
    if (!text.trim()) {
      base64Output.value = '';
      clearStatus();
      return;
    }

    currentMode = getMode();
    const urlSafe = urlSafeToggle ? urlSafeToggle.checked : false;

    if (currentMode === 'encode') {
      const res = logic.encode(text, { urlSafe });
      if (res.success) {
        base64Output.value = res.result;
        showStatus(T('status.encoded', {
          input: res.stats.inputChars.toLocaleString(locale),
          output: res.stats.outputChars.toLocaleString(locale),
          bytes: res.stats.byteSize
        }), 'success');
      } else {
        showStatus(res.error, 'error');
      }
    } else {
      const res = logic.decode(text, { urlSafe });
      if (res.success) {
        base64Output.value = res.result;
        showStatus(T('status.decoded', {
          input: res.stats.inputChars.toLocaleString(locale),
          output: res.stats.outputChars.toLocaleString(locale)
        }), 'success');
      } else {
        showStatus(res.error, 'error');
      }
    }
  }

  function handleInputDebounced() {
    const text = base64Input.value;
    updateSizeMeter(text);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!text.trim()) {
        base64Output.value = '';
        clearStatus();
        return;
      }
      processConversion();
    }, 150);
  }

  // Event Listeners
  base64Input.addEventListener('input', handleInputDebounced);

  modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateLabels();
      processConversion();
    });
  });

  if (urlSafeToggle) {
    urlSafeToggle.addEventListener('change', () => {
      processConversion();
    });
  }

  if (convertBtn) {
    convertBtn.addEventListener('click', processConversion);
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const currentOut = base64Output.value;
      if (!currentOut) return;

      // Swap inputs
      base64Input.value = currentOut;
      updateSizeMeter(currentOut);

      // Flip mode
      const newMode = getMode() === 'encode' ? 'decode' : 'encode';
      const targetRadio = document.querySelector(`input[name="base64-mode"][value="${newMode}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }
      updateLabels();
      processConversion();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = base64Output.value;
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

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      base64Input.value = '';
      base64Output.value = '';
      updateSizeMeter('');
      clearStatus();
      base64Input.focus();
    });
  }

  // Enter key submits calculation
  base64Input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      processConversion();
    }
  });

  // Initialize
  updateLabels();
  if (base64Input.value) {
    updateSizeMeter(base64Input.value);
    processConversion();
  }
});
