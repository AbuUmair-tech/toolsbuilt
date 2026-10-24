/**
 * URL Encoder & Decoder UI Controller
 * Client-side script handling live encoding/decoding, encodeURIComponent vs encodeURI modes,
 * query string parameter table rendering, copy, and error alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.UrlEncoderLogic;
  if (!logic) return;

  const directionRadios = document.querySelectorAll('input[name="url-direction"]');
  const modeRadios = document.querySelectorAll('input[name="url-mode"]');
  const urlInput = document.getElementById('url-input');
  const urlOutput = document.getElementById('url-output');
  const inputLabel = document.getElementById('input-label');
  const outputLabel = document.getElementById('output-label');
  const convertBtn = document.getElementById('convert-btn');
  const swapBtn = document.getElementById('swap-btn');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusBox = document.getElementById('url-status');
  const sizeMeter = document.getElementById('size-meter');
  const queryTableContainer = document.getElementById('query-table-container');
  const queryTableBody = document.getElementById('query-table-body');
  const queryCountBadge = document.getElementById('query-count-badge');

  let debounceTimer = null;

  function getDirection() {
    const checked = document.querySelector('input[name="url-direction"]:checked');
    return checked ? checked.value : 'encode';
  }

  function getMode() {
    const checked = document.querySelector('input[name="url-mode"]:checked');
    return checked ? checked.value : 'component';
  }

  function updateLabels() {
    const dir = getDirection();
    const mode = getMode();
    const modeName = mode === 'full' ? 'Full URL (encodeURI)' : 'Component (encodeURIComponent)';

    if (dir === 'encode') {
      if (inputLabel) inputLabel.textContent = `Text or URL to Encode (${modeName}):`;
      if (outputLabel) outputLabel.textContent = `Encoded URL Output:`;
      if (convertBtn) convertBtn.textContent = 'Encode URL';
      urlInput.placeholder = mode === 'full'
        ? 'Paste full URL here... e.g. https://example.com/search?q=toolsbuilt & more=yes'
        : 'Paste parameter or text here... e.g. hello world & symbols=?';
    } else {
      if (inputLabel) inputLabel.textContent = `Encoded URL to Decode:`;
      if (outputLabel) outputLabel.textContent = `Decoded Plain Text:`;
      if (convertBtn) convertBtn.textContent = 'Decode URL';
      urlInput.placeholder = 'Paste encoded URL or string here... e.g. https%3A%2F%2Fexample.com%3Fq%3Dtoolsbuilt';
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
      urlInput.setAttribute('aria-invalid', 'true');
    } else {
      statusBox.setAttribute('role', 'status');
      urlInput.removeAttribute('aria-invalid');
    }
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.textContent = '';
    statusBox.className = 'alert-box';
    statusBox.setAttribute('hidden', '');
    urlInput.removeAttribute('aria-invalid');
  }

  function updateQueryTable(text) {
    if (!queryTableContainer || !queryTableBody) return;

    const params = logic.parseQueryString(text);
    if (params.length === 0) {
      queryTableContainer.setAttribute('hidden', '');
      queryTableBody.innerHTML = '';
      if (queryCountBadge) queryCountBadge.textContent = '0 parameters';
      return;
    }

    queryTableContainer.removeAttribute('hidden');
    if (queryCountBadge) queryCountBadge.textContent = `${params.length} parameter${params.length === 1 ? '' : 's'}`;

    let html = '';
    params.forEach((p, idx) => {
      html += `<tr>
        <td style="font-family: monospace; font-weight: 600; word-break: break-all;">${escapeHtml(p.key)}</td>
        <td style="font-family: monospace; font-size: 0.85rem; word-break: break-all; color: var(--text-muted);">${escapeHtml(p.encodedValue)}</td>
        <td style="font-family: monospace; font-size: 0.85rem; word-break: break-all;">${escapeHtml(p.decodedValue)}</td>
      </tr>`;
    });
    queryTableBody.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function processConversion() {
    const text = urlInput.value;
    updateQueryTable(text);

    if (!text.trim()) {
      urlOutput.value = '';
      clearStatus();
      return;
    }

    const dir = getDirection();
    const mode = getMode();

    if (dir === 'encode') {
      const res = logic.encode(text, mode);
      if (res.success) {
        urlOutput.value = res.result;
        showStatus(`✓ Encoded using ${res.mode}: ${res.stats.inputChars.toLocaleString()} &rarr; ${res.stats.outputChars.toLocaleString()} characters`, 'success');
      } else {
        showStatus(res.error, 'error');
      }
    } else {
      const res = logic.decode(text, mode);
      if (res.success) {
        urlOutput.value = res.result;
        showStatus(`✓ Decoded using ${res.mode}: ${res.stats.inputChars.toLocaleString()} &rarr; ${res.stats.outputChars.toLocaleString()} characters`, 'success');
      } else {
        showStatus(res.error, 'error');
      }
    }
  }

  function handleInputDebounced() {
    const text = urlInput.value;
    updateSizeMeter(text);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processConversion();
    }, 150);
  }

  // Event Listeners
  urlInput.addEventListener('input', handleInputDebounced);

  directionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateLabels();
      processConversion();
    });
  });

  modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateLabels();
      processConversion();
    });
  });

  if (convertBtn) {
    convertBtn.addEventListener('click', processConversion);
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const currentOut = urlOutput.value;
      if (!currentOut) return;

      urlInput.value = currentOut;
      updateSizeMeter(currentOut);

      // Flip direction
      const newDir = getDirection() === 'encode' ? 'decode' : 'encode';
      const targetRadio = document.querySelector(`input[name="url-direction"][value="${newDir}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }
      updateLabels();
      processConversion();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = urlOutput.value;
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
      urlInput.value = '';
      urlOutput.value = '';
      updateSizeMeter('');
      clearStatus();
      updateQueryTable('');
      urlInput.focus();
    });
  }

  // Initialize
  updateLabels();
  if (urlInput.value) {
    updateSizeMeter(urlInput.value);
    processConversion();
  }
});
