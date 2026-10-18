/**
 * Random Name Picker Pure Logic
 * Dual UMD / Node / Browser module. No DOM dependencies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RandomPickerLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseNames(rawText, options) {
    if (!rawText || typeof rawText !== 'string') return [];
    const opts = Object.assign({ dedupe: false }, options);

    // Split on newlines, commas, or semicolons
    const tokens = rawText
      .split(/[\r\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (opts.dedupe) {
      return Array.from(new Set(tokens));
    }
    return tokens;
  }

  function getRandomIndex(max, customPrng) {
    if (max <= 1) return 0;
    if (typeof customPrng === 'function') {
      return customPrng(max);
    }

    // Web Crypto API in browser
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
    } catch (e) {}

    return Math.floor(Math.random() * max);
  }

  function shuffle(array, customPrng) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = getRandomIndex(i + 1, customPrng);
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function pickWinner(names, customPrng) {
    if (!names || names.length === 0) return null;
    const index = getRandomIndex(names.length, customPrng);
    return {
      index,
      winner: names[index]
    };
  }

  function pickMultipleWinners(names, count, options, customPrng) {
    if (!names || names.length === 0) {
      return { winners: [], remaining: [] };
    }
    const opts = Object.assign({ allowDuplicates: false }, options);
    const numToPick = Math.max(1, parseInt(count, 10) || 1);

    if (opts.allowDuplicates) {
      const winners = [];
      for (let i = 0; i < numToPick; i++) {
        const idx = getRandomIndex(names.length, customPrng);
        winners.push(names[idx]);
      }
      return {
        winners,
        remaining: names.slice()
      };
    }

    // Pick without replacement
    const pool = names.slice();
    const winners = [];
    const limit = Math.min(numToPick, pool.length);

    for (let i = 0; i < limit; i++) {
      const idx = getRandomIndex(pool.length, customPrng);
      winners.push(pool[idx]);
      pool.splice(idx, 1);
    }

    return {
      winners,
      remaining: pool
    };
  }

  return {
    parseNames,
    getRandomIndex,
    shuffle,
    pickWinner,
    pickMultipleWinners
  };
});
