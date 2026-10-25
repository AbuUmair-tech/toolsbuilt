/**
 * Cryptographic Hash Generator Interactive Controller
 * Handles real-time Web Crypto hash generation, case toggling, hash comparison, and clipboard copy.
 */

(function () {
  'use strict';

  const logic = window.HashLogic;
  if (!logic) {
    console.error('HashLogic module not loaded.');
    return;
  }

  // DOM Elements
  const inputText = document.getElementById('hash-input-text');
  const byteCounter = document.getElementById('hash-byte-counter');
  const optUpper = document.getElementById('opt-hash-uppercase');
  const clearBtn = document.getElementById('clear-input-btn');

  const sha256Val = document.getElementById('hash-sha256-val');
  const sha512Val = document.getElementById('hash-sha512-val');
  const sha384Val = document.getElementById('hash-sha384-val');
  const sha1Val = document.getElementById('hash-sha1-val');

  const cardSha256 = document.getElementById('card-sha256');
  const cardSha512 = document.getElementById('card-sha512');
  const cardSha384 = document.getElementById('card-sha384');
  const cardSha1 = document.getElementById('card-sha1');

  const compareInput = document.getElementById('hash-compare-input');
  const compareStatus = document.getElementById('hash-compare-status');

  let currentHashes = {
    'SHA-256': '',
    'SHA-512': '',
    'SHA-384': '',
    'SHA-1': ''
  };

  let debounceTimer = null;

  function updateByteCount() {
    if (!inputText || !byteCounter) return;
    const text = inputText.value;
    const bytes = new TextEncoder().encode(text).length;
    byteCounter.textContent = `${text.length} chars / ${bytes} bytes`;
  }

  function showToast(btn) {
    if (!btn) return;
    const prevHtml = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('btn-success');
    setTimeout(() => {
      btn.innerHTML = prevHtml;
      btn.classList.remove('btn-success');
    }, 1800);
  }

  function copyText(text, triggerBtn) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(triggerBtn);
      }).catch(() => {
        fallbackCopy(text, triggerBtn);
      });
    } else {
      fallbackCopy(text, triggerBtn);
    }
  }

  function fallbackCopy(text, triggerBtn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(triggerBtn);
    } catch (e) {
      alert('Copying failed.');
    }
    document.body.removeChild(ta);
  }

  async function updateHashes() {
    const text = inputText ? inputText.value : '';
    const uppercase = !!(optUpper && optUpper.checked);

    try {
      currentHashes = await logic.computeAllHashes(text, { uppercase });

      if (sha256Val) sha256Val.textContent = currentHashes['SHA-256'];
      if (sha512Val) sha512Val.textContent = currentHashes['SHA-512'];
      if (sha384Val) sha384Val.textContent = currentHashes['SHA-384'];
      if (sha1Val) sha1Val.textContent = currentHashes['SHA-1'];

      updateComparison();
    } catch (err) {
      console.error('Hash calculation error:', err);
    }
  }

  function updateComparison() {
    if (!compareInput || !compareStatus) return;
    const target = compareInput.value.trim();

    // Reset highlights
    [cardSha256, cardSha512, cardSha384, cardSha1].forEach(c => {
      if (c) c.classList.remove('matched-highlight');
    });

    if (!target) {
      compareStatus.innerHTML = '<span style="color: var(--text-muted);">Paste a hash above to verify match against calculated values.</span>';
      return;
    }

    const matchInfo = logic.findMatchingAlgorithm(currentHashes, target);

    if (matchInfo.matched) {
      compareStatus.innerHTML = `<span class="hash-match-pill matched">✓ MATCH CONFIRMED (${matchInfo.algorithm})</span>`;
      // Highlight matched card
      if (matchInfo.algorithm === 'SHA-256' && cardSha256) cardSha256.classList.add('matched-highlight');
      if (matchInfo.algorithm === 'SHA-512' && cardSha512) cardSha512.classList.add('matched-highlight');
      if (matchInfo.algorithm === 'SHA-384' && cardSha384) cardSha384.classList.add('matched-highlight');
      if (matchInfo.algorithm === 'SHA-1' && cardSha1) cardSha1.classList.add('matched-highlight');
    } else {
      compareStatus.innerHTML = '<span class="hash-match-pill unmatched">✕ NO MATCH FOUND</span>';
    }
  }

  function debouncedInput() {
    updateByteCount();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateHashes();
    }, 150);
  }

  // Event Listeners
  if (inputText) {
    inputText.addEventListener('input', debouncedInput);
    inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        updateHashes();
      }
    });
  }

  if (optUpper) {
    optUpper.addEventListener('change', updateHashes);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (inputText) {
        inputText.value = '';
        inputText.focus();
        updateByteCount();
        updateHashes();
      }
    });
  }

  if (compareInput) {
    compareInput.addEventListener('input', updateComparison);
  }

  // Copy Buttons
  document.querySelectorAll('[data-copy-hash]').forEach(btn => {
    btn.addEventListener('click', () => {
      const algo = btn.getAttribute('data-copy-hash');
      const val = currentHashes[algo];
      if (val) {
        copyText(val, btn);
      }
    });
  });

  // Initial Run on Default / Sample Text
  if (inputText && !inputText.value) {
    inputText.value = 'Hello ToolsBuilt!';
  }
  updateByteCount();
  updateHashes();
})();
