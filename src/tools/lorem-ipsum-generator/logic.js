/**
 * Lorem Ipsum Generator Core Logic
 * Pure, DOM-independent functions for generating classical Latin placeholder text
 * by paragraphs, sentences, or word count, with optional canonical opening and HTML markup.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LoremIpsumLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_INPUT_BYTES = 1048576; // 1 MB cap

  // Curated Latin vocabulary from Cicero's De Finibus Bonorum et Malorum
  const WORDS = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur',
    'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'in', 'culpa',
    'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
    'at', 'vero', 'eos', 'accusamus', 'iusto', 'odio', 'dignissimos', 'ducimus',
    'blanditiis', 'praesentium', 'voluptatum', 'deleniti', 'atque', 'corrupti',
    'quos', 'dolores', 'quas', 'molestias', 'excepturi', 'sint', 'obcaecati',
    'cupiditate', 'provident', 'similique', 'mollitia', 'animi', 'fuga', 'harum',
    'quidem', 'rerum', 'facilis', 'expedita', 'distinctio', 'nam', 'libero',
    'tempore', 'cum', 'soluta', 'nobis', 'eligendi', 'optio', 'cumque', 'nihil',
    'impedit', 'quo', 'minus', 'maxime', 'placeat', 'facere', 'possimus', 'omnis',
    'voluptas', 'assumenda', 'repellendus', 'temporibus', 'autem', 'quibusdam',
    'debitis', 'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae',
    'itaque', 'earum', 'hic', 'tenetur', 'sapiente', 'delectus', 'reiciendis',
    'maiores', 'alias', 'perferendis', 'doloribus', 'asperiores', 'repellat'
  ];

  const STANDARD_START_WORDS = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua'
  ];

  const STANDARD_OPENING_SENTENCE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  /**
   * Simple deterministic or pseudo-random word picker
   */
  function getRandomWord(rng) {
    const idx = rng ? Math.floor(rng() * WORDS.length) : Math.floor(Math.random() * WORDS.length);
    return WORDS[idx % WORDS.length];
  }

  /**
   * Capitalize first character of string
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate a random sentence of 8-15 words
   */
  function generateSentence(isFirstSentence, startWithLorem, rng) {
    if (isFirstSentence && startWithLorem) {
      return STANDARD_OPENING_SENTENCE;
    }

    const length = 8 + (rng ? Math.floor(rng() * 8) : Math.floor(Math.random() * 8));
    const words = [];
    for (let i = 0; i < length; i++) {
      words.push(getRandomWord(rng));
    }

    // Add optional comma in middle for realistic cadence if sentence is long enough
    if (length > 10 && words.length > 5) {
      const commaIdx = Math.floor(words.length / 2);
      words[commaIdx] += ',';
    }

    return capitalize(words.join(' ')) + '.';
  }

  /**
   * Generate specified number of words
   */
  function generateWords(count, startWithLorem = true, rng) {
    const n = Math.max(1, Math.min(10000, parseInt(count, 10) || 1));
    const words = [];

    if (startWithLorem) {
      const startCount = Math.min(n, STANDARD_START_WORDS.length);
      for (let i = 0; i < startCount; i++) {
        words.push(STANDARD_START_WORDS[i]);
      }
    }

    while (words.length < n) {
      words.push(getRandomWord(rng));
    }

    const text = words.join(' ');
    return capitalize(text) + '.';
  }

  /**
   * Generate specified number of sentences
   */
  function generateSentences(count, startWithLorem = true, rng) {
    const n = Math.max(1, Math.min(500, parseInt(count, 10) || 1));
    const sentences = [];
    for (let i = 0; i < n; i++) {
      sentences.push(generateSentence(i === 0, startWithLorem, rng));
    }
    return sentences.join(' ');
  }

  /**
   * Generate specified number of paragraphs
   */
  function generateParagraphs(count, startWithLorem = true, asHtml = false, rng) {
    const n = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
    const paragraphs = [];

    for (let p = 0; p < n; p++) {
      const sentenceCount = 4 + (rng ? Math.floor(rng() * 3) : Math.floor(Math.random() * 3));
      const sentences = [];
      for (let s = 0; s < sentenceCount; s++) {
        const isFirst = (p === 0 && s === 0);
        sentences.push(generateSentence(isFirst, startWithLorem, rng));
      }
      const paragraphText = sentences.join(' ');
      if (asHtml) {
        paragraphs.push(`<p>${paragraphText}</p>`);
      } else {
        paragraphs.push(paragraphText);
      }
    }

    return asHtml ? paragraphs.join('\n\n') : paragraphs.join('\n\n');
  }

  /**
   * Main generation entry point
   */
  function generate(unit = 'paragraphs', count = 3, options = {}) {
    const startWithLorem = options.startWithLorem !== false;
    const asHtml = Boolean(options.asHtml);
    const rng = options.rng || null;

    let text = '';
    if (unit === 'words') {
      text = generateWords(count, startWithLorem, rng);
    } else if (unit === 'sentences') {
      text = generateSentences(count, startWithLorem, rng);
    } else {
      text = generateParagraphs(count, startWithLorem, asHtml, rng);
    }

    // Safety length check
    if (text.length > MAX_INPUT_BYTES) {
      text = text.slice(0, MAX_INPUT_BYTES);
    }

    const wordCount = text.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length;
    const charCount = text.length;
    const paragraphCount = unit === 'paragraphs' ? Math.max(1, parseInt(count, 10) || 1) : 1;

    return {
      success: true,
      text,
      stats: {
        words: wordCount,
        characters: charCount,
        paragraphs: paragraphCount
      }
    };
  }

  return {
    WORDS,
    STANDARD_OPENING_SENTENCE,
    MAX_INPUT_BYTES,
    generateWords,
    generateSentences,
    generateParagraphs,
    generate
  };
});
