/**
 * Password & Passphrase Generator UI Controller
 * Powered by PasswordLogic pure engine and EFF short wordlist.
 * PRIVACY GUARD: Never saves generated passwords to localStorage or URLs.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.PasswordLogic;
  const wordlist = window.EFFWordlist || [];

  // DOM elements
  const modeRandomBtn = document.getElementById('mode-random-btn');
  const modePassphraseBtn = document.getElementById('mode-passphrase-btn');
  const randomOptionsPanel = document.getElementById('random-options-panel');
  const passphraseOptionsPanel = document.getElementById('passphrase-options-panel');

  const passwordDisplay = document.getElementById('password-display');
  const copyBtn = document.getElementById('copy-btn');
  const generateBtn = document.getElementById('generate-btn');
  const strengthText = document.getElementById('strength-text');
  const strengthBar = document.getElementById('strength-bar-fill');
  const errorBox = document.getElementById('error-box');

  // Random options
  const lengthRange = document.getElementById('length-range');
  const lengthVal = document.getElementById('length-val');
  const optUpper = document.getElementById('opt-upper');
  const optLower = document.getElementById('opt-lower');
  const optNumbers = document.getElementById('opt-numbers');
  const optSymbols = document.getElementById('opt-symbols');
  const optExcludeSimilar = document.getElementById('opt-exclude-similar');

  // Passphrase options
  const wordsRange = document.getElementById('words-range');
  const wordsVal = document.getElementById('words-val');
  const separatorSelect = document.getElementById('passphrase-separator');
  const capitalizeSelect = document.getElementById('passphrase-capitalize');
  const optNumberPassphrase = document.getElementById('opt-passphrase-number');

  // Multiple passwords
  const countSelect = document.getElementById('password-count');
  const multiPasswordsContainer = document.getElementById('multi-passwords-container');
  const multiPasswordsList = document.getElementById('multi-passwords-list');

  const STORAGE_KEY = 'toolsbuilt:password-generator-settings';
  let currentMode = 'random'; // 'random' | 'passphrase'

  function initSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.mode) setMode(data.mode);
        if (data.length && lengthRange) {
          lengthRange.value = data.length;
          lengthVal.textContent = data.length;
        }
        if (typeof data.upper === 'boolean') optUpper.checked = data.upper;
        if (typeof data.lower === 'boolean') optLower.checked = data.lower;
        if (typeof data.numbers === 'boolean') optNumbers.checked = data.numbers;
        if (typeof data.symbols === 'boolean') optSymbols.checked = data.symbols;
        if (typeof data.excludeSimilar === 'boolean') optExcludeSimilar.checked = data.excludeSimilar;
        if (data.words && wordsRange) {
          wordsRange.value = data.words;
          wordsVal.textContent = data.words;
        }
        if (data.sep && separatorSelect) separatorSelect.value = data.sep;
        if (data.cap && capitalizeSelect) capitalizeSelect.value = data.cap;
        if (typeof data.num === 'boolean') optNumberPassphrase.checked = data.num;
        return;
      }
    } catch (e) {}

    // Default: 16 chars random
    lengthRange.value = '16';
    lengthVal.textContent = '16';
    setMode('random');
  }

  function saveSettings() {
    try {
      const data = {
        mode: currentMode,
        length: lengthRange.value,
        upper: optUpper.checked,
        lower: optLower.checked,
        numbers: optNumbers.checked,
        symbols: optSymbols.checked,
        excludeSimilar: optExcludeSimilar.checked,
        words: wordsRange ? wordsRange.value : '4',
        sep: separatorSelect ? separatorSelect.value : '-',
        cap: capitalizeSelect ? capitalizeSelect.value : 'title',
        num: optNumberPassphrase ? optNumberPassphrase.checked : false
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function setMode(mode) {
    currentMode = mode;
    if (mode === 'passphrase') {
      modePassphraseBtn.classList.add('active');
      modePassphraseBtn.setAttribute('aria-selected', 'true');
      modeRandomBtn.classList.remove('active');
      modeRandomBtn.setAttribute('aria-selected', 'false');
      passphraseOptionsPanel.classList.remove('hidden');
      randomOptionsPanel.classList.add('hidden');
    } else {
      modeRandomBtn.classList.add('active');
      modeRandomBtn.setAttribute('aria-selected', 'true');
      modePassphraseBtn.classList.remove('active');
      modePassphraseBtn.setAttribute('aria-selected', 'false');
      randomOptionsPanel.classList.remove('hidden');
      passphraseOptionsPanel.classList.add('hidden');
    }
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function generate() {
    clearError();
    const count = parseInt(countSelect.value, 10) || 1;

    try {
      if (currentMode === 'random') {
        const opts = {
          length: parseInt(lengthRange.value, 10),
          upper: optUpper.checked,
          lower: optLower.checked,
          numbers: optNumbers.checked,
          symbols: optSymbols.checked,
          excludeSimilar: optExcludeSimilar.checked
        };

        const res = logic.generatePassword(opts);
        passwordDisplay.value = res.password;
        renderStrength(res.strength, res.entropyBits);

        // Multiple passwords if count > 1
        renderMultiplePasswords(count, opts);
      } else {
        const opts = {
          wordCount: parseInt(wordsRange.value, 10),
          separator: separatorSelect.value,
          capitalize: capitalizeSelect.value,
          includeNumber: optNumberPassphrase.checked
        };

        const res = logic.generatePassphrase(opts, null, wordlist);
        passwordDisplay.value = res.password;
        renderStrength(res.strength, res.entropyBits);

        renderMultiplePassphrases(count, opts);
      }

      saveSettings();
    } catch (err) {
      showError(err.message);
    }
  }

  function renderStrength(strength, entropyBits) {
    strengthText.textContent = `${strength.score} (~${entropyBits} bits entropy)`;
    strengthText.style.color = strength.color;
    strengthBar.style.width = strength.width;
    strengthBar.style.backgroundColor = strength.barColor || strength.color;
  }

  function renderMultiplePasswords(count, opts) {
    if (count <= 1) {
      multiPasswordsContainer.classList.add('hidden');
      return;
    }

    const items = [];
    for (let i = 0; i < count; i++) {
      const p = logic.generatePassword(opts).password;
      items.push(p);
    }

    renderMultiList(items);
  }

  function renderMultiplePassphrases(count, opts) {
    if (count <= 1) {
      multiPasswordsContainer.classList.add('hidden');
      return;
    }

    const items = [];
    for (let i = 0; i < count; i++) {
      const p = logic.generatePassphrase(opts, null, wordlist).password;
      items.push(p);
    }

    renderMultiList(items);
  }

  function renderMultiList(items) {
    multiPasswordsList.innerHTML = items.map((pw, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: var(--surface-default); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
        <code style="font-size: 0.95rem; font-weight: 600; word-break: break-all;">${pw}</code>
        <button type="button" class="btn btn-sm btn-ghost copy-multi-btn" data-password="${pw}" title="Copy this password" style="flex-shrink: 0; margin-left: 0.5rem;">
          <span data-icon="copy"></span> Copy
        </button>
      </div>
    `).join('');

    multiPasswordsContainer.classList.remove('hidden');

    document.querySelectorAll('.copy-multi-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-password');
        if (window.ToolsBuilt && window.ToolsBuilt.copy) {
          window.ToolsBuilt.copy(val, 'Password copied to clipboard');
        }
      });
    });
  }

  // Event handlers
  modeRandomBtn.addEventListener('click', () => {
    setMode('random');
    generate();
  });

  modePassphraseBtn.addEventListener('click', () => {
    setMode('passphrase');
    generate();
  });

  lengthRange.addEventListener('input', (e) => {
    lengthVal.textContent = e.target.value;
    generate();
  });

  if (wordsRange) {
    wordsRange.addEventListener('input', (e) => {
      wordsVal.textContent = e.target.value;
      generate();
    });
  }

  [optUpper, optLower, optNumbers, optSymbols, optExcludeSimilar].forEach(chk => {
    chk.addEventListener('change', generate);
  });

  if (separatorSelect) separatorSelect.addEventListener('change', generate);
  if (capitalizeSelect) capitalizeSelect.addEventListener('change', generate);
  if (optNumberPassphrase) optNumberPassphrase.addEventListener('change', generate);
  countSelect.addEventListener('change', generate);

  generateBtn.addEventListener('click', generate);

  copyBtn.addEventListener('click', () => {
    if (!passwordDisplay.value) return;
    if (window.ToolsBuilt && window.ToolsBuilt.copy) {
      window.ToolsBuilt.copy(passwordDisplay.value, 'Password copied to clipboard');
    }
  });

  // Init
  initSettings();
  generate();
});
