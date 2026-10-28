/**
 * URL Encoder & Decoder Core Logic
 * Pure, DOM-independent functions for encodeURIComponent vs encodeURI transformations
 * and query string key-value parsing.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UrlEncoderLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_INPUT_BYTES = 1048576; // 1 MB (1,048,576 characters)

  /**
   * Encode text as either URI Component or Full URI
   */
  function encode(text, mode = 'component') {
    if (typeof text !== 'string') {
      return { success: false, error: 'Input must be a valid text string.' };
    }

    if (text.length > MAX_INPUT_BYTES) {
      return {
        success: false,
        error: `Input exceeds the 1 MB safety limit (max 1,048,576 characters). Current size: ${text.length.toLocaleString()} characters.`,
        isSizeLimit: true
      };
    }

    if (text === '') {
      return {
        success: true,
        result: '',
        stats: { inputChars: 0, outputChars: 0 }
      };
    }

    try {
      const isFull = mode === 'full' || mode === 'uri';
      const encoded = isFull ? encodeURI(text) : encodeURIComponent(text);

      return {
        success: true,
        result: encoded,
        mode: isFull ? 'encodeURI' : 'encodeURIComponent',
        stats: {
          inputChars: text.length,
          outputChars: encoded.length
        }
      };
    } catch (err) {
      return {
        success: false,
        error: `Encoding error: ${err.message}`
      };
    }
  }

  /**
   * Decode text from URI Component or Full URI
   */
  function decode(text, mode = 'component') {
    if (typeof text !== 'string') {
      return { success: false, error: 'Input must be a valid text string.' };
    }

    if (text.length > MAX_INPUT_BYTES) {
      return {
        success: false,
        error: `Input exceeds the 1 MB safety limit (max 1,048,576 characters). Current size: ${text.length.toLocaleString()} characters.`,
        isSizeLimit: true
      };
    }

    if (text === '') {
      return {
        success: true,
        result: '',
        stats: { inputChars: 0, outputChars: 0 }
      };
    }

    try {
      const isFull = mode === 'full' || mode === 'uri';
      // In component mode, also decode application/x-www-form-urlencoded '+' as spaces
      const toDecode = isFull ? text : text.replace(/\+/g, ' ');
      const decoded = isFull ? decodeURI(toDecode) : decodeURIComponent(toDecode);

      return {
        success: true,
        result: decoded,
        mode: isFull ? 'decodeURI' : 'decodeURIComponent',
        stats: {
          inputChars: text.length,
          outputChars: decoded.length
        }
      };
    } catch (err) {
      return {
        success: false,
        error: `Decoding error: Invalid percent-encoded sequence (${err.message}). Check for incomplete % hex pairs.`
      };
    }
  }

  /**
   * Parse query string parameters into key-value table items
   */
  function parseQueryString(input) {
    if (typeof input !== 'string' || !input.trim()) {
      return [];
    }

    let query = input.trim();
    // Strip hash fragment if present
    const hashIdx = query.indexOf('#');
    if (hashIdx !== -1) query = query.slice(0, hashIdx);

    // If full URL with '?', isolate query portion
    const qIdx = query.indexOf('?');
    if (qIdx !== -1) query = query.slice(qIdx + 1);

    // Only process if there is at least one '='
    if (!query.includes('=')) {
      return [];
    }

    const pairs = query.split('&');
    const items = [];

    for (const pair of pairs) {
      if (!pair.trim()) continue;
      const eqIdx = pair.indexOf('=');
      const rawKey = eqIdx === -1 ? pair : pair.slice(0, eqIdx);
      const rawVal = eqIdx === -1 ? '' : pair.slice(eqIdx + 1);

      let decodedKey = rawKey;
      let decodedVal = rawVal;

      try {
        decodedKey = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      } catch (e) {
        decodedKey = rawKey;
      }

      try {
        decodedVal = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      } catch (e) {
        decodedVal = rawVal;
      }

      items.push({
        key: decodedKey,
        encodedValue: rawVal,
        decodedValue: decodedVal
      });
    }

    return items;
  }

  return {
    MAX_INPUT_BYTES,
    encode,
    decode,
    parseQueryString
  };
});
