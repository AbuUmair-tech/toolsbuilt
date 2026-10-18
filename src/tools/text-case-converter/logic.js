/**
 * Text Case Converter Pure Logic
 * Dual UMD / Node / Browser module. No DOM dependencies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CaseConverterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Helper to split text into words while respecting Unicode letters, numbers, hyphens, and underscores
  function extractWords(text) {
    if (!text) return [];
    // Split on transitions between lower/upper, numbers, underscores, hyphens, whitespace
    // Handles camelCase, PascalCase, snake_case, kebab-case, normal text
    const cleaned = text
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1 $2');
    
    // Match unicode letters and numbers
    const matches = cleaned.match(/[\p{L}\p{N}]+/gu);
    return matches || [];
  }

  // Small words typically lowercased in title case (unless first or last word)
  const MINOR_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if', 'in', 'nor',
    'of', 'on', 'or', 'per', 'the', 'to', 'v', 'vs', 'via', 'with'
  ]);

  function toUpperCase(text) {
    return text ? text.toUpperCase() : '';
  }

  function toLowerCase(text) {
    return text ? text.toLowerCase() : '';
  }

  function toSentenceCase(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/(^\s*|[.!?]\s+)([\p{L}])/gu, function (_, p1, p2) {
      return p1 + p2.toUpperCase();
    });
  }

  function toTitleCase(text) {
    if (!text) return '';
    // Preserve layout/whitespace/newlines while titling words
    const tokens = text.toLowerCase().split(/(\s+)/);
    const wordIndices = [];
    tokens.forEach((t, i) => {
      if (t.trim().length > 0) wordIndices.push(i);
    });

    const firstWordIndex = wordIndices.length > 0 ? wordIndices[0] : -1;
    const lastWordIndex = wordIndices.length > 0 ? wordIndices[wordIndices.length - 1] : -1;

    return tokens.map((token, index) => {
      if (!token.trim()) return token;

      // Find previous non-empty word index
      let prevWordIdx = -1;
      for (let p = index - 1; p >= 0; p--) {
        if (tokens[p].trim().length > 0) {
          prevWordIdx = p;
          break;
        }
      }
      const followsPunctuation = prevWordIdx !== -1 && /[:.!?]$/.test(tokens[prevWordIdx]);

      // Handle hyphenated words inside title case
      const parts = token.split(/([-–—])/);
      return parts.map(part => {
        if (/^[-–—]$/.test(part)) return part;
        const clean = part.toLowerCase();
        if (index !== firstWordIndex && index !== lastWordIndex && !followsPunctuation && MINOR_WORDS.has(clean)) {
          return clean;
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join('');
    }).join('');
  }

  function toCapitalizeEachWord(text) {
    if (!text) return '';
    // Capitalize every single word regardless of minor word status
    return text.replace(/\b([\p{L}])/gu, function (_, char) {
      return char.toUpperCase();
    });
  }

  function toCamelCase(text) {
    const words = extractWords(text);
    if (words.length === 0) return '';
    return words.map((w, idx) => {
      const lower = w.toLowerCase();
      if (idx === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
  }

  function toPascalCase(text) {
    const words = extractWords(text);
    if (words.length === 0) return '';
    return words.map(w => {
      const lower = w.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
  }

  function toSnakeCase(text) {
    const words = extractWords(text);
    return words.map(w => w.toLowerCase()).join('_');
  }

  function toKebabCase(text) {
    const words = extractWords(text);
    return words.map(w => w.toLowerCase()).join('-');
  }

  function toConstantCase(text) {
    const words = extractWords(text);
    return words.map(w => w.toUpperCase()).join('_');
  }

  function toDotCase(text) {
    const words = extractWords(text);
    return words.map(w => w.toLowerCase()).join('.');
  }

  function toAlternatingCase(text) {
    if (!text) return '';
    let upper = false;
    let res = '';
    for (const char of text) {
      if (/\p{L}/u.test(char)) {
        res += upper ? char.toUpperCase() : char.toLowerCase();
        upper = !upper;
      } else {
        res += char;
      }
    }
    return res;
  }

  function convertCase(text, mode) {
    if (!text) return '';
    switch (mode) {
      case 'upper':
        return toUpperCase(text);
      case 'lower':
        return toLowerCase(text);
      case 'title':
        return toTitleCase(text);
      case 'sentence':
        return toSentenceCase(text);
      case 'capitalize':
        return toCapitalizeEachWord(text);
      case 'camel':
        return toCamelCase(text);
      case 'pascal':
        return toPascalCase(text);
      case 'snake':
        return toSnakeCase(text);
      case 'kebab':
        return toKebabCase(text);
      case 'constant':
        return toConstantCase(text);
      case 'dot':
        return toDotCase(text);
      case 'alternating':
        return toAlternatingCase(text);
      default:
        return text;
    }
  }

  function getStats(text) {
    if (!text) {
      return { characters: 0, charactersNoSpaces: 0, words: 0, sentences: 0, lines: 0 };
    }
    const words = extractWords(text).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const lines = text.split(/\r\n|\r|\n/).length;
    const sentenceMatches = text.match(/[^.!?]+[.!?]+(\s|$)/g);
    const sentences = sentenceMatches ? sentenceMatches.length : (words > 0 ? 1 : 0);

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      lines
    };
  }

  return {
    toUpperCase,
    toLowerCase,
    toSentenceCase,
    toTitleCase,
    toCapitalizeEachWord,
    toCamelCase,
    toPascalCase,
    toSnakeCase,
    toKebabCase,
    toConstantCase,
    toDotCase,
    toAlternatingCase,
    convertCase,
    extractWords,
    getStats
  };
});
