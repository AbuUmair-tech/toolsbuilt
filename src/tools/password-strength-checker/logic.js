/**
 * Password Strength Checker Core Logic
 * Pure, DOM-free wrapper around zxcvbn-ts (self-hosted, loaded on this page only)
 * plus character-set facts. The password is never stored, logged or sent anywhere.
 *
 * In the browser, script.js loads the three zxcvbn-ts browser builds, which set
 * window.zxcvbnts.{core, 'language-common', 'language-en'}, and passes that object
 * to createChecker(). Tests pass the same object built in Node.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PasswordStrengthLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const MAX_CHECK_LENGTH = 256; // zxcvbn-ts only analyses the first 256 characters

  /** Length (in characters, not UTF-16 units) and which character sets are used. */
  function characterInfo(password) {
    const chars = Array.from(String(password || ''));
    const sets = { lower: 0, upper: 0, digits: 0, symbols: 0, spaces: 0, other: 0 };
    chars.forEach(ch => {
      if (/[a-z]/.test(ch)) sets.lower++;
      else if (/[A-Z]/.test(ch)) sets.upper++;
      else if (/[0-9]/.test(ch)) sets.digits++;
      else if (ch === ' ') sets.spaces++;
      else if (/[!-/:-@[-`{-~]/.test(ch)) sets.symbols++;
      else sets.other++;
    });
    // Pool size if every character had been chosen at random from the sets used
    let pool = 0;
    if (sets.lower) pool += 26;
    if (sets.upper) pool += 26;
    if (sets.digits) pool += 10;
    if (sets.symbols) pool += 32;
    if (sets.spaces) pool += 1;
    if (sets.other) pool += 100;
    const unique = new Set(chars).size;
    return {
      length: chars.length,
      sets,
      setsUsed: Object.keys(sets).filter(k => sets[k] > 0),
      uniqueCharacters: unique,
      poolSize: pool,
      // An upper bound: real passwords are rarely random, which is what zxcvbn measures
      randomEntropyBits: pool > 1 ? Math.round(chars.length * Math.log2(pool) * 10) / 10 : 0
    };
  }

  /**
   * Builds a checker from the zxcvbn-ts namespace.
   * @param {{core: object, 'language-common': object, 'language-en': object}} ns
   */
  function createChecker(ns) {
    if (!ns || !ns.core || !ns['language-common'] || !ns['language-en']) {
      throw new Error('The password checker library did not load.');
    }
    const common = ns['language-common'];
    const en = ns['language-en'];
    const engine = new ns.core.ZxcvbnFactory({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: Object.assign({}, common.dictionary, en.dictionary),
      // Also match near-misspellings of dictionary words (e.g. "troubador"), as cracking
      // rules do. It makes a check take up to about a second, so the page runs it in a worker.
      useLevenshteinDistance: true
    });

    /** Returns null for empty input. */
    function check(password, userInputs = []) {
      if (password === undefined || password === null || password === '') return null;
      const pw = String(password);
      const r = engine.check(pw, userInputs.filter(Boolean));
      const times = r.crackTimes || {};
      const pick = (key) => (times[key] ? { seconds: times[key].seconds, display: times[key].display } : null);
      return {
        score: r.score,
        label: LABELS[r.score],
        guesses: r.guesses,
        guessesLog10: Math.round(r.guessesLog10 * 100) / 100,
        crackTimes: {
          onlineThrottled: pick('onlineThrottlingXPerHour'),
          onlineUnthrottled: pick('onlineNoThrottlingXPerSecond'),
          offlineSlow: pick('offlineSlowHashingXPerSecond'),
          offlineFast: pick('offlineFastHashingXPerSecond')
        },
        warning: (r.feedback && r.feedback.warning) || '',
        suggestions: (r.feedback && r.feedback.suggestions) || [],
        patterns: (r.sequence || []).map(m => m.pattern).filter((p, i, all) => all.indexOf(p) === i),
        truncated: Array.from(pw).length > MAX_CHECK_LENGTH,
        info: characterInfo(pw)
      };
    }

    return { check };
  }

  return { LABELS, characterInfo, createChecker };
});
