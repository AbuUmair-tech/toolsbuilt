/**
 * UUID / GUID Generator Interactive Controller
 * Handles live bulk generation, format updates, clipboard copy, and file download.
 */

(function () {
  'use strict';

  const logic = window.UuidLogic;
  if (!logic) {
    console.error('UuidLogic module not loaded.');
    return;
  }

  // DOM Elements
  const quickDisplay = document.getElementById('quick-uuid-display');
  const copySingleBtn = document.getElementById('copy-single-btn');
  const regenSingleBtn = document.getElementById('regen-single-btn');

  const countInput = document.getElementById('uuid-count');
  const optUpper = document.getElementById('opt-uppercase');
  const optHyphens = document.getElementById('opt-hyphens');
  const optBraces = document.getElementById('opt-braces');
  const generateBtn = document.getElementById('generate-btn');

  const bulkOutput = document.getElementById('bulk-output');
  const copyAllBtn = document.getElementById('copy-all-btn');
  const downloadTxtBtn = document.getElementById('download-txt-btn');
  const errorBox = document.getElementById('error-box');
  const statusMeta = document.getElementById('uuid-meta-count');

  let currentUuids = [];
  let debounceTimer = null;

  function getOptions() {
    return {
      uppercase: !!(optUpper && optUpper.checked),
      hyphens: !optHyphens || optHyphens.checked,
      braces: !!(optBraces && optBraces.checked)
    };
  }

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
    if (countInput) {
      countInput.setAttribute('aria-invalid', 'true');
    }
  }

  function clearError() {
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    if (countInput) {
      countInput.removeAttribute('aria-invalid');
    }
  }

  function showToast(btn, originalText = 'Copy') {
    if (!btn) return;
    const prevHtml = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('btn-success');
    setTimeout(() => {
      btn.innerHTML = prevHtml;
      btn.classList.remove('btn-success');
    }, 1800);
  }

  function copyTextToClipboard(text, triggerBtn) {
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
      alert('Copying failed. Please copy manually.');
    }
    document.body.removeChild(ta);
  }

  function generateSingle() {
    const options = getOptions();
    const raw = logic.generateRawV4();
    const formatted = logic.formatUuid(raw, options);
    if (quickDisplay) {
      quickDisplay.value = formatted;
    }
  }

  function generateBulk() {
    const rawCount = countInput ? countInput.value.trim() : '5';
    const validation = logic.validateCount(rawCount);

    if (!validation.valid) {
      showError(validation.error);
      return;
    }

    clearError();
    const options = getOptions();

    try {
      currentUuids = logic.generateBulk(validation.sanitized, options);
      if (bulkOutput) {
        bulkOutput.value = currentUuids.join('\n');
      }
      if (statusMeta) {
        statusMeta.textContent = `${currentUuids.length} UUID${currentUuids.length === 1 ? '' : 's'} generated`;
      }
      // Also update single quick display with the first one
      if (quickDisplay && currentUuids.length > 0) {
        quickDisplay.value = currentUuids[0];
      }
    } catch (err) {
      showError(err.message);
    }
  }

  function debouncedGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      generateBulk();
    }, 150);
  }

  function downloadAsTxt() {
    if (!currentUuids || currentUuids.length === 0) {
      generateBulk();
    }
    const txtContent = logic.generateTxtExport(currentUuids);
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${currentUuids.length}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  // Event Listeners
  if (countInput) {
    countInput.addEventListener('input', debouncedGenerate);
    countInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        generateBulk();
      }
    });
  }

  [optUpper, optHyphens, optBraces].forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        generateBulk();
      });
    }
  });

  if (generateBtn) {
    generateBtn.addEventListener('click', generateBulk);
  }

  if (regenSingleBtn) {
    regenSingleBtn.addEventListener('click', generateSingle);
  }

  if (copySingleBtn) {
    copySingleBtn.addEventListener('click', () => {
      if (quickDisplay) {
        copyTextToClipboard(quickDisplay.value, copySingleBtn);
      }
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (bulkOutput) {
        copyTextToClipboard(bulkOutput.value, copyAllBtn);
      }
    });
  }

  if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener('click', downloadAsTxt);
  }

  // Initial Run on Load
  generateBulk();
})();
