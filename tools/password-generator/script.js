/**
 * Strong Password Generator Script
 * Uses window.crypto.getRandomValues for cryptographically secure random number generation.
 * Operates strictly inside local browser memory.
 */

document.addEventListener('DOMContentLoaded', () => {
  const passwordDisplay = document.getElementById('password-display');
  const lengthRange = document.getElementById('length-range');
  const lengthVal = document.getElementById('length-val');
  const optUpper = document.getElementById('opt-upper');
  const optLower = document.getElementById('opt-lower');
  const optNumbers = document.getElementById('opt-numbers');
  const optSymbols = document.getElementById('opt-symbols');
  const optExcludeSimilar = document.getElementById('opt-exclude-similar');

  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyFeedback = document.getElementById('copy-feedback');
  const strengthText = document.getElementById('strength-text');
  const strengthBar = document.getElementById('strength-bar-fill');
  const errorBox = document.getElementById('error-box');

  const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const CHARS_NUMBERS = '0123456789';
  const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const SIMILAR_CHARS = /[O0l1I]/g;

  lengthRange.addEventListener('input', (e) => {
    lengthVal.textContent = e.target.value;
    generatePassword();
  });

  [optUpper, optLower, optNumbers, optSymbols, optExcludeSimilar].forEach(chk => {
    chk.addEventListener('change', generatePassword);
  });

  generateBtn.addEventListener('click', generatePassword);

  copyBtn.addEventListener('click', async () => {
    if (!passwordDisplay.value) return;
    try {
      await navigator.clipboard.writeText(passwordDisplay.value);
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    } catch (err) {
      passwordDisplay.select();
      document.execCommand('copy');
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    }
  });

  function generatePassword() {
    let charPool = '';

    if (optUpper.checked) charPool += CHARS_UPPER;
    if (optLower.checked) charPool += CHARS_LOWER;
    if (optNumbers.checked) charPool += CHARS_NUMBERS;
    if (optSymbols.checked) charPool += CHARS_SYMBOLS;

    if (optExcludeSimilar.checked) {
      charPool = charPool.replace(SIMILAR_CHARS, '');
    }

    if (!charPool.length) {
      showError('Please select at least one character set option (Uppercase, Lowercase, Numbers, or Symbols).');
      return;
    }

    errorBox.classList.add('hidden');

    const length = parseInt(lengthRange.value, 10);
    let result = '';

    // Use window.crypto.getRandomValues for cryptographic randomness
    const randomBuffer = new Uint32Array(length);
    window.crypto.getRandomValues(randomBuffer);

    for (let i = 0; i < length; i++) {
      const randomIndex = randomBuffer[i] % charPool.length;
      result += charPool.charAt(randomIndex);
    }

    passwordDisplay.value = result;

    // Assess strength
    evaluateStrength(result, charPool.length);
  }

  function evaluateStrength(password, poolSize) {
    const len = password.length;
    // Calculate Shannon entropy estimate: log2(poolSize^len)
    const entropy = len * (Math.log2(poolSize) || 1);

    let score = 'Weak';
    let color = '#dc2626'; // Red
    let width = '20%';

    if (entropy > 80) {
      score = 'Very Strong';
      color = '#16a34a'; // Green
      width = '100%';
    } else if (entropy > 60) {
      score = 'Strong';
      color = '#059669'; // Emerald
      width = '80%';
    } else if (entropy > 40) {
      score = 'Good';
      color = '#d97706'; // Amber
      width = '60%';
    } else if (entropy > 25) {
      score = 'Fair';
      color = '#ca8a04'; // Yellow-Amber
      width = '40%';
    }

    strengthText.textContent = `${score} (${Math.round(entropy)} bits entropy)`;
    strengthText.style.color = color;
    strengthBar.style.width = width;
    strengthBar.style.backgroundColor = color;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  // Initial generation
  generatePassword();
});
