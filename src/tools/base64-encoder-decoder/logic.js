/**
 * Base64 Encoder & Decoder Core Logic
 * Pure, DOM-independent functions for UTF-8 safe standard and URL-safe Base64 transformation.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Base64Logic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_INPUT_BYTES = 1048576; // 1 MB (1,048,576 characters)

  /**
   * Convert Unicode string into UTF-8 byte array
   */
  function stringToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    if (typeof Buffer !== 'undefined') {
      return Uint8Array.from(Buffer.from(str, 'utf8'));
    }
    // Fallback: manual UTF-8 encoder
    const utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        // Surrogate pair
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }
    return new Uint8Array(utf8);
  }

  /**
   * Convert byte array to Base64 string
   */
  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to byte array
   */
  function base64ToBytes(b64) {
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(b64, 'base64');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Convert UTF-8 byte array to Unicode string
   */
  function utf8BytesToString(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('utf8');
    }
    // Fallback: manual UTF-8 decoder
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      const c = bytes[i++];
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c > 191 && c < 224) {
        out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
      } else if (c > 223 && c < 240) {
        out += String.fromCharCode(((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
      } else {
        const u = (((c & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)) - 0x10000;
        out += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 1023));
      }
    }
    return out;
  }

  /**
   * Encode UTF-8 text to standard or URL-safe Base64
   */
  function encode(text, options = {}) {
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
        stats: { inputChars: 0, outputChars: 0, byteSize: 0 }
      };
    }

    try {
      const bytes = stringToUtf8Bytes(text);
      let b64 = bytesToBase64(bytes);

      if (options.urlSafe) {
        b64 = b64.replace(/\+/g, '-').replace(/\//g, '_');
        if (options.stripPadding) {
          b64 = b64.replace(/=+$/, '');
        }
      }

      return {
        success: true,
        result: b64,
        stats: {
          inputChars: text.length,
          outputChars: b64.length,
          byteSize: bytes.byteLength
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
   * Decode standard or URL-safe Base64 to UTF-8 text
   */
  function decode(base64Str, options = {}) {
    if (typeof base64Str !== 'string') {
      return { success: false, error: 'Input must be a valid Base64 string.' };
    }

    if (base64Str.length > MAX_INPUT_BYTES) {
      return {
        success: false,
        error: `Input exceeds the 1 MB safety limit (max 1,048,576 characters). Current size: ${base64Str.length.toLocaleString()} characters.`,
        isSizeLimit: true
      };
    }

    const cleanInput = base64Str.trim().replace(/\s+/g, '');
    if (cleanInput === '') {
      return {
        success: true,
        result: '',
        stats: { inputChars: 0, outputChars: 0, byteSize: 0 }
      };
    }

    // Convert URL-safe characters back to standard Base64
    let normalized = cleanInput.replace(/-/g, '+').replace(/_/g, '/');

    // Add back '=' padding if stripped
    while (normalized.length % 4 !== 0) {
      normalized += '=';
    }

    // Verify valid Base64 characters
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      return {
        success: false,
        error: 'Invalid Base64 format: contains characters outside the Base64 alphabet.'
      };
    }

    try {
      const bytes = base64ToBytes(normalized);
      const decodedText = utf8BytesToString(bytes);

      return {
        success: true,
        result: decodedText,
        stats: {
          inputChars: base64Str.length,
          outputChars: decodedText.length,
          byteSize: bytes.byteLength
        }
      };
    } catch (err) {
      return {
        success: false,
        error: `Decoding error: malformed Base64 data or invalid UTF-8 byte sequence (${err.message}).`
      };
    }
  }

  return {
    MAX_INPUT_BYTES,
    encode,
    decode,
    stringToUtf8Bytes,
    bytesToBase64,
    base64ToBytes,
    utf8BytesToString
  };
});
