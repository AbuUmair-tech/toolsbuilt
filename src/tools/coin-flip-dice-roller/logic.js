/**
 * Coin Flip & Dice Roller Core Logic
 * Pure, DOM-free coin flips and dice rolls using the Web Crypto API with
 * rejection sampling, so every face is exactly equally likely.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CoinDiceLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const DICE = [4, 6, 8, 10, 12, 20];
  const MAX_COINS = 100;
  const MAX_DICE = 10;
  const HISTORY_SIZE = 20;
  const TWO_32 = 4294967296;

  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) return globalThis.crypto;
    if (typeof require === 'function') {
      try { return require('crypto').webcrypto; } catch (e) {}
    }
    throw new Error('Secure random numbers are not available in this browser.');
  }

  /** Uniform integer in [0, n) with rejection sampling (n <= 2^32). */
  function randomBelow(n) {
    const limit = TWO_32 - (TWO_32 % n);
    const word = new Uint32Array(1);
    const c = getCrypto();
    for (;;) {
      c.getRandomValues(word);
      if (word[0] < limit) return word[0] % n;
    }
  }

  /**
   * Flips `count` fair coins.
   * @returns {{results: string[], heads: number, tails: number, count: number}|{error: string}}
   */
  function flipCoins(count = 1, rand = randomBelow) {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > MAX_COINS) return { error: `Flip between 1 and ${MAX_COINS} coins.`, field: 'coins' };
    const results = [];
    let heads = 0;
    for (let i = 0; i < n; i++) {
      const side = rand(2) === 0 ? 'H' : 'T';
      if (side === 'H') heads++;
      results.push(side);
    }
    return { results, heads, tails: n - heads, count: n };
  }

  /**
   * Rolls `count` dice with `sides` faces (d4, d6, d8, d10, d12 or d20).
   * @returns {{rolls: number[], sum: number, count: number, sides: number, minSum: number, maxSum: number, notation: string}|{error: string}}
   */
  function rollDice(count = 1, sides = 6, rand = randomBelow) {
    const n = Number(count);
    const s = Number(sides);
    if (!Number.isInteger(n) || n < 1 || n > MAX_DICE) return { error: `Roll between 1 and ${MAX_DICE} dice.`, field: 'dice' };
    if (!DICE.includes(s)) return { error: `Choose a d${DICE.join(', d')} die.`, field: 'sides' };
    const rolls = [];
    for (let i = 0; i < n; i++) rolls.push(1 + rand(s));
    return {
      rolls,
      sum: rolls.reduce((a, b) => a + b, 0),
      count: n,
      sides: s,
      minSum: n,
      maxSum: n * s,
      notation: `${n}d${s}`
    };
  }

  /** Adds an entry to the front of a history list, keeping the newest HISTORY_SIZE. */
  function pushHistory(history, entry) {
    return [entry].concat(Array.isArray(history) ? history : []).slice(0, HISTORY_SIZE);
  }

  return { DICE, MAX_COINS, MAX_DICE, HISTORY_SIZE, randomBelow, flipCoins, rollDice, pushHistory };
});
