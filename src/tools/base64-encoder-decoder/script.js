/**
 * Base64 Encoder & Decoder UI Controller
 * Client-side script handling live conversion, URL-safe toggle, mode switching, copy, and error alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.Base64Logic;
  if (!logic) return;

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
    if (currentMode === 'encode') {
      if (inputLabel) inputLabel.textContent = 'Text to Encode (UTF-8 Plain Text):';
      if (outputLabel) outputLabel.textContent = 'Base64 Encoded Output:';
      if (convertBtn) convertBtn.textContent = 'Encode to Base64';
      base64Input.placeholder = 'Type or paste plain text here (supports emojis, foreign alphabets, and symbols)...';
    } else {
      if (inputLabel) inputLabel.textContent = 'Base64 String to Decode:';
      if (outputLabel) outputLabel.textContent = 'Decoded Plain Text (UTF-8):';
      if (convertBtn) convertBtn.textContent = 'Decode from Base64';
      base64Input.placeholder = 'Paste Base64 string here (e.g. TWFu or Y2Fmw6k=)...';
    }
  }

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
        showStatus(`✓ Encoded ${res.stats.inputChars.toLocaleString()} characters into ${res.stats.outputChars.toLocaleString()} Base64 characters (${res.stats.byteSize} bytes)`, 'success');
      } else {
        showStatus(res.error, 'error');
      }
    } else {
      const res = logic.decode(text, { urlSafe });
      if (res.success) {
        base64Output.value = res.result;
        showStatus(`✓ Decoded ${res.stats.inputChars.toLocaleString()} Base64 characters into ${res.stats.outputChars.toLocaleString()} plain text characters`, 'success');
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
          window.ToolsBuilt.toast('Nothing to copy. Enter text first.');
        }
        return;
      }
      if (window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(textToCopy, 'Result copied to clipboard');
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
