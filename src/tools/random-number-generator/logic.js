/**
 * Random Number Generator Core Logic
 * Pure, DOM-free generation with the Web Crypto API (crypto.getRandomValues).
 * Integers are drawn with rejection sampling, so every value in the range is
 * exactly equally likely (no modulo bias). Decimals are integers scaled by 10^N.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.RandomNumberLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const MAX_COUNT = 1000;
  const MAX_DECIMALS = 6;
  const TWO_32 = 4294967296;
  const TWO_53 = 9007199254740992;

  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) return globalThis.crypto;
    if (typeof require === 'function') {
      try { return require('crypto').webcrypto; } catch (e) {}
    }
    throw new Error('Secure random numbers are not available in this browser.');
  }

  /** Uniform 53-bit integer in [0, 2^53) from two 32-bit crypto words. */
  function random53() {
    const words = new Uint32Array(2);
    getCrypto().getRandomValues(words);
    return (words[0] >>> 11) * TWO_32 + words[1];
  }

  /**
   * Uniform integer in [0, n) for 1 <= n <= 2^53.
   * Draws above the largest multiple of n are rejected and redrawn.
   */
  function randomBelow(n) {
    if (!Number.isInteger(n) || n < 1 || n > TWO_53) throw new RangeError('Range size must be between 1 and 2^53.');
    if (n === 1) return 0;
    if (n <= TWO_32) {
      const limit = TWO_32 - (TWO_32 % n);
      const word = new Uint32Array(1);
      const c = getCrypto();
      for (;;) {
        c.getRandomValues(word);
        if (word[0] < limit) return word[0] % n;
      }
    }
    const limit = TWO_53 - (TWO_53 % n);
    for (;;) {
      const x = random53();
      if (x < limit) return x % n;
    }
  }

  /** Uniform integer in [min, max] (inclusive). */
  function randomInt(min, max) {
    return min + randomBelow(max - min + 1);
  }

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  /**
   * @param {Object} o
   * @param {number|string} o.min
   * @param {number|string} o.max
   * @param {number|string} o.count       how many numbers (1-1000)
   * @param {boolean} o.unique            no repeats
   * @param {boolean} o.sort              sort ascending
   * @param {number|string} o.decimals    0 for integers, up to 6 decimal places
   * @param {function} [o.randomInt]      injectable source for tests: (min, max) -> integer
   */
  function generate(o = {}) {
    if (isBlank(o.min)) return { error: 'Enter the minimum value.', field: 'min' };
    if (isBlank(o.max)) return { error: 'Enter the maximum value.', field: 'max' };
    const min = Number(o.min);
    const max = Number(o.max);
    if (!Number.isFinite(min)) return { error: 'The minimum must be a number.', field: 'min' };
    if (!Number.isFinite(max)) return { error: 'The maximum must be a number.', field: 'max' };
    if (min > max) return { error: `The minimum (${min}) is larger than the maximum (${max}). Swap them or change one.`, field: 'min' };

    const count = isBlank(o.count) ? 1 : Number(o.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
      return { error: `How many must be a whole number from 1 to ${MAX_COUNT.toLocaleString('en-US')}.`, field: 'count' };
    }
    const decimals = isBlank(o.decimals) ? 0 : Number(o.decimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      return { error: `Decimal places must be a whole number from 0 to ${MAX_DECIMALS}.`, field: 'decimals' };
    }

    // Work in whole units of 10^-decimals, kept inside [min, max]
    const scale = Math.pow(10, decimals);
    const lo = Math.ceil(Number((min * scale).toFixed(6)));
    const hi = Math.floor(Number((max * scale).toFixed(6)));
    if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || !Number.isSafeInteger(hi - lo + 1)) {
      return { error: 'That range is too large. Use smaller numbers or fewer decimal places.', field: 'max' };
    }
    if (lo > hi) {
      return { error: `There is no ${decimals ? `${decimals}-decimal` : 'whole'} number between ${min} and ${max}.`, field: 'max' };
    }
    const possible = hi - lo + 1;
    if (o.unique && count > possible) {
      return {
        error: `Only ${possible.toLocaleString('en-US')} different ${decimals ? 'values' : 'whole numbers'} exist from ${min} to ${max}, so ${count.toLocaleString('en-US')} numbers cannot all be different. Lower the count, widen the range or allow duplicates.`,
        field: 'count'
      };
    }

    const draw = typeof o.randomInt === 'function' ? o.randomInt : randomInt;
    const raw = [];
    if (o.unique) {
      const seen = new Set();
      if (possible <= 4 * count) {
        // Dense range: partial Fisher-Yates over the whole range
        const pool = Array.from({ length: possible }, (_, i) => lo + i);
        for (let i = 0; i < count; i++) {
          const j = draw(i, possible - 1);
          [pool[i], pool[j]] = [pool[j], pool[i]];
          raw.push(pool[i]);
        }
      } else {
        while (raw.length < count) {
          const v = draw(lo, hi);
          if (!seen.has(v)) { seen.add(v); raw.push(v); }
        }
      }
    } else {
      for (let i = 0; i < count; i++) raw.push(draw(lo, hi));
    }

    if (o.sort) raw.sort((a, b) => a - b);
    const numbers = raw.map(v => (decimals ? Number((v / scale).toFixed(decimals)) : v));
    return {
      numbers,
      text: numbers.map(n => (decimals ? n.toFixed(decimals) : String(n))),
      min,
      max,
      count,
      unique: !!o.unique,
      sorted: !!o.sort,
      decimals,
      possible,
      probabilityEach: 1 / possible
    };
  }

  return { MAX_COUNT, MAX_DECIMALS, randomBelow, randomInt, generate };
});
