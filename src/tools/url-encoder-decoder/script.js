/**
 * URL Encoder & Decoder UI Controller
 * Client-side script handling live encoding/decoding, encodeURIComponent vs encodeURI modes,
 * query string parameter table rendering, copy, and error alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.UrlEncoderLogic;
  if (!logic) return;
  const T = ToolsBuilt.scope('url-encoder-decoder');
  const locale = ToolsBuilt.pageLocale();

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
    const modeName = T(mode === 'full' ? 'modeName.full' : 'modeName.component');

    if (dir === 'encode') {
      if (inputLabel) inputLabel.textContent = T('labels.encode.input', { mode: modeName });
      if (outputLabel) outputLabel.textContent = T('labels.encode.output');
      if (convertBtn) convertBtn.textContent = T('labels.encode.button');
      urlInput.placeholder = T(mode === 'full' ? 'labels.encode.placeholderFull' : 'labels.encode.placeholderComponent');
    } else {
      if (inputLabel) inputLabel.textContent = T('labels.decode.input');
      if (outputLabel) outputLabel.textContent = T('labels.decode.output');
      if (convertBtn) convertBtn.textContent = T('labels.decode.button');
      urlInput.placeholder = T('labels.decode.placeholder');
    }
  }

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
      if (queryCountBadge) queryCountBadge.textContent = T('params.other', { n: 0 });
      return;
    }

    queryTableContainer.removeAttribute('hidden');
    if (queryCountBadge) queryCountBadge.textContent = T(params.length === 1 ? 'params.one' : 'params.other', { n: params.length });

    let html = '';
    params.forEach((p, idx) => {
      html += `<tr>
        <td class="font-mono font-semibold break-words">${escapeHtml(p.key)}</td>
        <td class="font-mono text-sm break-words text-secondary">${escapeHtml(p.encodedValue)}</td>
        <td class="font-mono text-sm break-words">${escapeHtml(p.decodedValue)}</td>
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
        showStatus(T('status.encoded', { mode: res.mode, input: res.stats.inputChars.toLocaleString(locale), output: res.stats.outputChars.toLocaleString(locale) }), 'success');
      } else {
        showStatus(res.error, 'error');
      }
    } else {
      const res = logic.decode(text, mode);
      if (res.success) {
        urlOutput.value = res.result;
        showStatus(T('status.decoded', { mode: res.mode, input: res.stats.inputChars.toLocaleString(locale), output: res.stats.outputChars.toLocaleString(locale) }), 'success');
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
