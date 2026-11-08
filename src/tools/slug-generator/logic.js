/**
 * URL Slug Generator Core Logic
 * Pure, DOM-free slugs: Unicode NFD normalisation strips accents, letters that do
 * not decompose (ß, æ, ø, ł …) are transliterated, everything else that is not a
 * letter or digit becomes the separator. Letters from non-Latin scripts are kept.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.SlugLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Letters that NFD does not split into a base letter plus an accent
  const TRANSLITERATE = {
    'ß': 'ss', 'ẞ': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe', 'ø': 'o', 'Ø': 'o',
    'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd', 'ł': 'l', 'Ł': 'l', 'þ': 'th', 'Þ': 'th', 'ı': 'i', 'ħ': 'h', 'Ħ': 'h'
  };

  // Common English words that add little to a URL
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
    'its', 'of', 'on', 'or', 'so', 'than', 'that', 'the', 'their', 'then', 'there', 'these', 'this', 'those',
    'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your'
  ]);

  const MAX_INPUT = 10000;

  /**
   * @param {string} text
   * @param {Object} options
   * @param {'-'|'_'} options.separator        default '-'
   * @param {boolean} options.lowercase        default true
   * @param {boolean} options.removeStopWords  drop English stop words (never all words)
   * @param {number} options.maxLength         0 = no limit; cut at a word boundary
   */
  function slugify(text, options = {}) {
    const sep = options.separator === '_' ? '_' : '-';
    const lower = options.lowercase !== false;
    let s = String(text === undefined || text === null ? '' : text).slice(0, MAX_INPUT);

    s = s.replace(/[ßẞæÆœŒøØđĐðÐłŁþÞıħĦ]/g, ch => TRANSLITERATE[ch]);
    s = s.normalize('NFD').replace(/\p{M}+/gu, '');
    s = s.replace(/&/g, ' and ').replace(/['’`]/g, '');
    if (lower) s = s.toLowerCase();

    let words = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (options.removeStopWords) {
      const filtered = words.filter(w => !STOP_WORDS.has(w.toLowerCase()));
      if (filtered.length) words = filtered;
    }

    const max = Number(options.maxLength) || 0;
    if (max > 0) {
      const outWords = [];
      let length = 0;
      for (const w of words) {
        const add = (outWords.length ? 1 : 0) + w.length;
        if (length + add > max) break;
        outWords.push(w);
        length += add;
      }
      // A first word longer than the limit is cut rather than dropped
      words = outWords.length ? outWords : (words.length ? [Array.from(words[0]).slice(0, max).join('')] : []);
    }
    return words.join(sep);
  }

  /**
   * One slug per non-empty line. With unique on, repeats get -2, -3 … added.
   * @returns {Array<{input:string, slug:string, duplicate:boolean}>}
   */
  function slugifyLines(text, options = {}) {
    const sep = options.separator === '_' ? '_' : '-';
    const counts = new Map();
    return String(text || '').split(/\r\n|\r|\n/)
      .filter(line => line.trim() !== '')
      .map(line => {
        let slug = slugify(line, options);
        const n = (counts.get(slug) || 0) + 1;
        counts.set(slug, n);
        const duplicate = n > 1;
        if (duplicate && options.unique && slug) slug = `${slug}${sep}${n}`;
        return { input: line.trim(), slug, duplicate };
      });
  }

  return { STOP_WORDS, slugify, slugifyLines };
});
