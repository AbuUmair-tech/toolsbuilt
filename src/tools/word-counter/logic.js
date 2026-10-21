/**
 * Word & Character Counter Core Logic
 * Pure, DOM-free functions for lexical analysis.
 * Uses Unicode property escapes (\p{L}, \p{N}) for accurate international word extraction.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WordCounterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Curated set of common English stop words
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
    'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
    'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
    'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
    'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
    'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
    'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
    'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  /**
   * Comprehensive text analysis.
   * @param {string} text - Raw input text
   * @param {Object} options - { readingWpm: 225, speakingWpm: 140 }
   */
  function analyzeText(text, options = {}) {
    const raw = typeof text === 'string' ? text : '';
    const readingWpm = options.readingWpm || 225;
    const speakingWpm = options.speakingWpm || 140;

    // Characters with spaces: Unicode code points count (handles surrogate pairs like emojis correctly)
    const charsWithSpaces = Array.from(raw).length;

    // Characters without spaces: removes all Unicode whitespace
    const withoutSpaces = raw.replace(/\s/gu, '');
    const charsWithoutSpaces = Array.from(withoutSpaces).length;

    // Word tokens: Unicode letters/numbers, with contractions (apostrophe between letters)
    // treated as single words. Hyphens between letters also join compound words.
    // Pattern: one or more (letter|digit) with optional internal apostrophe/hyphen sequences.
    const wordMatches = raw.match(/[\p{L}\p{N}]+(?:['\u2018\u2019-][\p{L}\p{N}]+)*/gu) || [];
    const words = wordMatches.length;

    // Sentences: split on sentence terminators (. ! ?)
    const sentenceMatches = raw.match(/[^.!?]+[.!?]+(\s|$)/gu);
    const sentences = sentenceMatches ? sentenceMatches.length : (words > 0 ? 1 : 0);

    // Paragraphs: split on 1 or more consecutive newlines
    const paragraphs = raw.trim().length === 0 ? 0 : raw.split(/\n+/).filter(p => p.trim().length > 0).length;

    // Lines count
    const lines = raw.length === 0 ? 0 : raw.split(/\r\n|\r|\n/).length;

    // Reading & Speaking Time
    function formatTime(totalMinutes) {
      if (totalMinutes === 0) return { minutes: 0, seconds: 0, text: '0 sec' };
      const totalSec = Math.round(totalMinutes * 60);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      let text = '';
      if (m > 0) text += `${m} min `;
      text += `${s} sec`;
      return { minutes: m, seconds: s, text: text.trim() };
    }

    const readingTimeObj = formatTime(words > 0 ? words / readingWpm : 0);
    const speakingTimeObj = formatTime(words > 0 ? words / speakingWpm : 0);

    // Top keyword frequencies
    const freqMap = new Map();
    for (const w of wordMatches) {
      const lower = w.toLowerCase();
      if (lower.length > 1 && !STOP_WORDS.has(lower) && !/^\d+$/.test(lower)) {
        freqMap.set(lower, (freqMap.get(lower) || 0) + 1);
      }
    }

    const sortedKeywords = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([word, count]) => ({
        word,
        count,
        percentage: words > 0 ? Math.round((count / words) * 1000) / 10 : 0
      }));

    return {
      characters: charsWithSpaces,
      charsWithSpaces,
      charactersNoSpaces: charsWithoutSpaces,
      charsWithoutSpaces,
      words,
      sentences,
      paragraphs,
      lines,
      readingWpm,
      speakingWpm,
      readingTime: readingTimeObj.text,
      readingTimeObj,
      speakingTime: speakingTimeObj.text,
      speakingTimeObj,
      topWords: sortedKeywords,
      topKeywords: sortedKeywords
    };
  }

  return {
    STOP_WORDS,
    analyzeText
  };
});
