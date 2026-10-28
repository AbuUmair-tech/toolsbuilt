/**
 * UUID / GUID Generator Core Logic
 * Pure, DOM-independent functions for generating RFC 4122 compliant version 4 UUIDs.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UuidLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIN_COUNT = 1;
  const MAX_COUNT = 100;
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Get cryptographic crypto object across Browser and Node environments
   */
  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    try {
      return require('crypto');
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate a raw canonical RFC 4122 v4 UUID (lowercase with hyphens)
   */
  function generateRawV4() {
    const c = getCrypto();
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID();
    }

    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      // Set version 4: bits 12-15 of time_hi_and_version to 0100
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      // Set variant: bits 6-7 of clock_seq_hi_and_reserved to 10
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    // Node crypto.randomBytes fallback
    if (c && typeof c.randomBytes === 'function') {
      const bytes = c.randomBytes(16);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = bytes.toString('hex');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    throw new Error('Cryptographically secure PRNG unavailable.');
  }

  /**
   * Format a canonical UUID according to options
   * @param {string} rawUuid - Canonical lowercase hyphenated UUID
   * @param {Object} options - { uppercase: boolean, hyphens: boolean, braces: boolean }
   * @returns {string} Formatted UUID
   */
  function formatUuid(rawUuid, options = {}) {
    const {
      uppercase = false,
      hyphens = true,
      braces = false
    } = options;

    let res = rawUuid.toLowerCase();

    if (!hyphens) {
      res = res.replace(/-/g, '');
    }

    if (uppercase) {
      res = res.toUpperCase();
    }

    if (braces) {
      res = `{${res}}`;
    }

    return res;
  }

  /**
   * Validate count parameter (must be integer between 1 and 100)
   */
  function validateCount(count) {
    const num = Number(count);
    if (!Number.isInteger(num)) {
      return { valid: false, error: 'Quantity must be a whole number between 1 and 100.', sanitized: 1 };
    }
    if (num < MIN_COUNT) {
      return { valid: false, error: `Quantity cannot be less than ${MIN_COUNT}.`, sanitized: MIN_COUNT };
    }
    if (num > MAX_COUNT) {
      return { valid: false, error: `Quantity cannot exceed ${MAX_COUNT} for bulk generation.`, sanitized: MAX_COUNT };
    }
    return { valid: true, error: null, sanitized: num };
  }

  /**
   * Generate bulk UUIDs
   * @param {number} count - Number of UUIDs (1 to 100)
   * @param {Object} options - Formatting options
   * @returns {Array<string>} Array of formatted UUIDs
   */
  function generateBulk(count = 1, options = {}) {
    const val = validateCount(count);
    if (!val.valid) {
      throw new Error(val.error);
    }

    const list = [];
    for (let i = 0; i < val.sanitized; i++) {
      const raw = generateRawV4();
      list.push(formatUuid(raw, options));
    }
    return list;
  }

  /**
   * Check if a string is a valid v4 UUID (canonical or formatted)
   */
  function isValidV4(uuidStr) {
    if (typeof uuidStr !== 'string') return false;
    let clean = uuidStr.trim();
    if (clean.startsWith('{') && clean.endsWith('}')) {
      clean = clean.slice(1, -1);
    }
    if (clean.length === 32) {
      // Re-insert hyphens
      clean = `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
    }
    return UUID_V4_REGEX.test(clean);
  }

  /**
   * Generate newline-delimited text export string
   */
  function generateTxtExport(uuids) {
    if (!Array.isArray(uuids)) return '';
    return uuids.join('\r\n') + '\r\n';
  }

  return {
    MIN_COUNT,
    MAX_COUNT,
    generateRawV4,
    formatUuid,
    validateCount,
    generateBulk,
    isValidV4,
    generateTxtExport
  };
});
