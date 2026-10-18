/**
 * Strong Password & Passphrase Generator Logic
 * Cryptographically sound, rejection-sampled, dual UMD / Node / Browser module.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const effWords = require('./eff-words.js');
    module.exports = factory(effWords);
  } else {
    root.PasswordLogic = factory(root.EFFWordlist || []);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultWordlist) {
  'use strict';

  const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const CHARS_NUMBERS = '0123456789';
  const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const AMBIGUOUS_CHARS = /[O0l1I|]/g;

  /**
   * Cryptographically secure random integer in [0, max) using rejection sampling to eliminate modulo bias.
   * Accepts optional custom PRNG function `prng(max)` returning an integer [0, max) for deterministic unit testing.
   */
  function getRandomIndex(max, customPrng) {
    if (max <= 1) return 0;
    if (typeof customPrng === 'function') {
      return customPrng(max);
    }

    // Browser Web Crypto
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      const maxValid = Math.floor(0x100000000 / max) * max;
      const buffer = new Uint32Array(1);
      while (true) {
        globalThis.crypto.getRandomValues(buffer);
        if (buffer[0] < maxValid) {
          return buffer[0] % max;
        }
      }
    }

    // Node.js crypto
    try {
      const crypto = require('crypto');
      if (crypto.randomInt) {
        return crypto.randomInt(0, max);
      }
    } catch (e) {
      // Fallback if no crypto available (should not occur in modern environments)
    }

    return Math.floor(Math.random() * max);
  }

  function FisherYatesShuffle(array, customPrng) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = getRandomIndex(i + 1, customPrng);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Generates a random character password.
   */
  function generatePassword(options, customPrng) {
    const opts = Object.assign({
      length: 16,
      upper: true,
      lower: true,
      numbers: true,
      symbols: true,
      excludeSimilar: false
    }, options);

    const length = Math.max(4, Math.min(128, parseInt(opts.length, 10) || 16));
    const activeSets = [];

    if (opts.upper) {
      const s = opts.excludeSimilar ? CHARS_UPPER.replace(AMBIGUOUS_CHARS, '') : CHARS_UPPER;
      if (s.length) activeSets.push(s);
    }
    if (opts.lower) {
      const s = opts.excludeSimilar ? CHARS_LOWER.replace(AMBIGUOUS_CHARS, '') : CHARS_LOWER;
      if (s.length) activeSets.push(s);
    }
    if (opts.numbers) {
      const s = opts.excludeSimilar ? CHARS_NUMBERS.replace(AMBIGUOUS_CHARS, '') : CHARS_NUMBERS;
      if (s.length) activeSets.push(s);
    }
    if (opts.symbols) {
      const s = opts.excludeSimilar ? CHARS_SYMBOLS.replace(AMBIGUOUS_CHARS, '') : CHARS_SYMBOLS;
      if (s.length) activeSets.push(s);
    }

    if (activeSets.length === 0) {
      throw new Error('Please select at least one character set.');
    }

    const charPool = activeSets.join('');
    const passwordChars = [];

    // Guarantee at least one character from each selected set
    for (let i = 0; i < Math.min(activeSets.length, length); i++) {
      const set = activeSets[i];
      const idx = getRandomIndex(set.length, customPrng);
      passwordChars.push(set.charAt(idx));
    }

    // Fill remaining positions uniformly from combined pool
    while (passwordChars.length < length) {
      const idx = getRandomIndex(charPool.length, customPrng);
      passwordChars.push(charPool.charAt(idx));
    }

    // Shuffle so guaranteed set characters are not always at the front
    FisherYatesShuffle(passwordChars, customPrng);

    const result = passwordChars.join('');
    const entropy = calculateEntropy(result.length, charPool.length);
    const strength = evaluateStrength(entropy);

    return {
      password: result,
      length: result.length,
      poolSize: charPool.length,
      entropyBits: Math.round(entropy * 10) / 10,
      strength
    };
  }

  /**
   * Generates a pronounceable passphrase using the EFF short wordlist.
   */
  function generatePassphrase(options, customPrng, wordlistOverride) {
    const opts = Object.assign({
      wordCount: 4,
      separator: '-',
      capitalize: 'title', // 'none', 'title', 'upper'
      includeNumber: false
    }, options);

    const wordlist = (wordlistOverride && wordlistOverride.length > 0) ? wordlistOverride : defaultWordlist;
    if (!wordlist || wordlist.length === 0) {
      throw new Error('Passphrase wordlist is empty.');
    }

    const wordCount = Math.max(3, Math.min(10, parseInt(opts.wordCount, 10) || 4));
    const words = [];

    for (let i = 0; i < wordCount; i++) {
      const idx = getRandomIndex(wordlist.length, customPrng);
      let word = wordlist[idx];
      if (opts.capitalize === 'title') {
        word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      } else if (opts.capitalize === 'upper') {
        word = word.toUpperCase();
      } else {
        word = word.toLowerCase();
      }
      words.push(word);
    }

    let phrase = words.join(opts.separator || '-');

    if (opts.includeNumber) {
      const num = getRandomIndex(10, customPrng);
      phrase += (opts.separator || '-') + num;
    }

    // Passphrase entropy: wordCount * log2(wordlistSize) + optional number entropy
    let entropy = wordCount * Math.log2(wordlist.length);
    if (opts.includeNumber) {
      entropy += Math.log2(10);
    }

    const strength = evaluateStrength(entropy);

    return {
      password: phrase,
      wordCount,
      separator: opts.separator,
      entropyBits: Math.round(entropy * 10) / 10,
      strength
    };
  }

  function calculateEntropy(length, poolSize) {
    if (poolSize <= 1 || length <= 0) return 0;
    return length * Math.log2(poolSize);
  }

  function evaluateStrength(entropyBits) {
    if (entropyBits >= 80) {
      return { score: 'Very Strong', level: 4, color: 'var(--color-success-text, #065f46)', barColor: 'var(--color-success-icon, #10b981)', width: '100%', timeToCrack: 'Centuries' };
    }
    if (entropyBits >= 60) {
      return { score: 'Strong', level: 3, color: 'var(--color-success-text, #065f46)', barColor: 'var(--color-success-icon, #10b981)', width: '80%', timeToCrack: 'Decades' };
    }
    if (entropyBits >= 45) {
      return { score: 'Moderate', level: 2, color: 'var(--color-warning-text, #92400e)', barColor: 'var(--color-warning-icon, #f59e0b)', width: '60%', timeToCrack: 'Months to Years' };
    }
    if (entropyBits >= 28) {
      return { score: 'Weak', level: 1, color: 'var(--color-warning-text, #92400e)', barColor: '#f97316', width: '40%', timeToCrack: 'Minutes to Hours' };
    }
    return { score: 'Very Weak', level: 0, color: 'var(--color-danger-text, #9f1239)', barColor: 'var(--color-danger-border, #ef4444)', width: '20%', timeToCrack: 'Seconds' };
  }

  function generateMultiple(count, options, customPrng) {
    const n = Math.max(1, Math.min(10, parseInt(count, 10) || 1));
    const list = [];
    for (let i = 0; i < n; i++) {
      if (options && options.mode === 'passphrase') {
        list.push(generatePassphrase(options, customPrng));
      } else {
        list.push(generatePassword(options, customPrng));
      }
    }
    return list;
  }

  return {
    CHARS_UPPER,
    CHARS_LOWER,
    CHARS_NUMBERS,
    CHARS_SYMBOLS,
    AMBIGUOUS_CHARS,
    getRandomIndex,
    FisherYatesShuffle,
    generatePassword,
    generatePassphrase,
    calculateEntropy,
    evaluateStrength,
    generateMultiple
  };
});
