/**
 * Cryptographic Hash Generator Core Logic
 * Pure async functions for computing SHA-1, SHA-256, SHA-384, and SHA-512 hashes via Web Crypto API.
 * Notice: MD5 is intentionally omitted as per security guidelines.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HashLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('hash-generator')
    : require('../../../scripts/i18n-client.js').scope('hash-generator');

  const SUPPORTED_ALGORITHMS = ['SHA-256', 'SHA-512', 'SHA-384', 'SHA-1'];

  const PASSWORD_WARNING = T('warnings.password');

  /**
   * Get cryptographic subtle crypto object across Browser and Node environments
   */
  function getSubtleCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      return globalThis.crypto.subtle;
    }
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      return window.crypto.subtle;
    }
    try {
      const nodeCrypto = require('crypto');
      if (nodeCrypto.webcrypto && nodeCrypto.webcrypto.subtle) {
        return nodeCrypto.webcrypto.subtle;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Convert ArrayBuffer to Hex String
   */
  function bufferToHex(buffer, uppercase = false) {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return uppercase ? hex.toUpperCase() : hex.toLowerCase();
  }

  /**
   * Compute single hash asynchronously
   * @param {string} text - Input plain text
   * @param {string} algorithm - 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'
   * @param {Object} options - { uppercase: boolean }
   * @returns {Promise<string>} Hexadecimal hash string
   */
  async function computeHash(text, algorithm = 'SHA-256', options = {}) {
    const algo = algorithm.toUpperCase();
    if (!SUPPORTED_ALGORITHMS.includes(algo)) {
      throw new Error(T('errors.unsupportedAlgorithm', { algorithm, supported: SUPPORTED_ALGORITHMS.join(', ') }));
    }

    const uppercase = !!options.uppercase;
    const str = typeof text === 'string' ? text : String(text || '');

    const subtle = getSubtleCrypto();
    if (subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await subtle.digest(algo, data);
      return bufferToHex(hashBuffer, uppercase);
    }

    // Node fallback if webcrypto subtle is unavailable
    try {
      const nodeCrypto = require('crypto');
      const nodeAlgoName = algo.toLowerCase().replace('-', '');
      const hex = nodeCrypto.createHash(nodeAlgoName).update(str, 'utf8').digest('hex');
      return uppercase ? hex.toUpperCase() : hex.toLowerCase();
    } catch (e) {
      throw new Error(T('errors.computationFailed', { message: e.message }));
    }
  }

  /**
   * Compute all 4 hashes in parallel
   * @param {string} text - Input text
   * @param {Object} options - { uppercase: boolean }
   * @returns {Promise<Object>} Map of algorithm to hex hash
   */
  async function computeAllHashes(text, options = {}) {
    const [sha256, sha512, sha384, sha1] = await Promise.all([
      computeHash(text, 'SHA-256', options),
      computeHash(text, 'SHA-512', options),
      computeHash(text, 'SHA-384', options),
      computeHash(text, 'SHA-1', options)
    ]);

    return {
      'SHA-256': sha256,
      'SHA-512': sha512,
      'SHA-384': sha384,
      'SHA-1': sha1
    };
  }

  /**
   * Compare two hash strings (case and whitespace insensitive)
   * @param {string} hashA
   * @param {string} hashB
   * @returns {Object} { match: boolean, normalizedA: string, normalizedB: string }
   */
  function compareHashes(hashA, hashB) {
    if (!hashA || !hashB) {
      return { match: false, normalizedA: '', normalizedB: '' };
    }
    const normA = String(hashA).trim().toLowerCase();
    const normB = String(hashB).trim().toLowerCase();
    return {
      match: normA.length > 0 && normA === normB,
      normalizedA: normA,
      normalizedB: normB
    };
  }

  /**
   * Find if a target hash matches any of computed hashes
   * @param {Object} computedMap - Map of algorithm to hash
   * @param {string} targetHash - Hash to match
   * @returns {Object} { matched: boolean, algorithm: string|null }
   */
  function findMatchingAlgorithm(computedMap, targetHash) {
    if (!computedMap || !targetHash) {
      return { matched: false, algorithm: null };
    }
    const normTarget = String(targetHash).trim().toLowerCase();
    if (!normTarget) {
      return { matched: false, algorithm: null };
    }

    for (const algo of SUPPORTED_ALGORITHMS) {
      const val = computedMap[algo];
      if (val && val.toLowerCase() === normTarget) {
        return { matched: true, algorithm: algo };
      }
    }
    return { matched: false, algorithm: null };
  }

  return {
    SUPPORTED_ALGORITHMS,
    PASSWORD_WARNING,
    computeHash,
    computeAllHashes,
    compareHashes,
    findMatchingAlgorithm
  };
});
