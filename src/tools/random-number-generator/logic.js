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

  // Messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('random-number-generator')
    : require('../../../scripts/i18n-client.js').scope('random-number-generator');
  const locale = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale('en-US') : 'en-US';

  const MAX_COUNT = 1000;
  const MAX_DECIMALS = 6;
  const TWO_32 = 4294967296;
  const TWO_53 = 9007199254740992;

  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) return globalThis.crypto;
    if (typeof require === 'function') {
      try { return require('crypto').webcrypto; } catch (e) {}
    }
    throw new Error(T('errors.noCrypto'));
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
    if (!Number.isInteger(n) || n < 1 || n > TWO_53) throw new RangeError(T('errors.rangeSize'));
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
    if (isBlank(o.min)) return { error: T('errors.minEmpty'), field: 'min' };
    if (isBlank(o.max)) return { error: T('errors.maxEmpty'), field: 'max' };
    const min = Number(o.min);
    const max = Number(o.max);
    if (!Number.isFinite(min)) return { error: T('errors.minInvalid'), field: 'min' };
    if (!Number.isFinite(max)) return { error: T('errors.maxInvalid'), field: 'max' };
    if (min > max) return { error: T('errors.minAboveMax', { min, max }), field: 'min' };

    const count = isBlank(o.count) ? 1 : Number(o.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
      return { error: T('errors.count', { max: MAX_COUNT.toLocaleString(locale) }), field: 'count' };
    }
    const decimals = isBlank(o.decimals) ? 0 : Number(o.decimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      return { error: T('errors.decimals', { max: MAX_DECIMALS }), field: 'decimals' };
    }

    // Work in whole units of 10^-decimals, kept inside [min, max]
    const scale = Math.pow(10, decimals);
    const lo = Math.ceil(Number((min * scale).toFixed(6)));
    const hi = Math.floor(Number((max * scale).toFixed(6)));
    if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || !Number.isSafeInteger(hi - lo + 1)) {
      return { error: T('errors.rangeTooLarge'), field: 'max' };
    }
    if (lo > hi) {
      return { error: T(decimals ? 'errors.noValue.decimal' : 'errors.noValue.whole', { decimals, min, max }), field: 'max' };
    }
    const possible = hi - lo + 1;
    if (o.unique && count > possible) {
      return {
        error: T(decimals ? 'errors.tooFewUnique.decimal' : 'errors.tooFewUnique.whole', {
          possible: possible.toLocaleString(locale), min, max, count: count.toLocaleString(locale)
        }),
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
