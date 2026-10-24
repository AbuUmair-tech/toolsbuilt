/**
 * JSON Formatter & Validator Core Logic
 * Pure, DOM-independent functions for JSON validation, formatting, minification, and key sorting.
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.JsonFormatterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_INPUT_BYTES = 1048576; // 1 MB (1,048,576 characters)

  /**
   * Calculate 1-indexed line and column number from string offset
   */
  function computeLineCol(text, pos) {
    if (typeof pos !== 'number' || isNaN(pos) || pos < 0) {
      return { line: 1, column: 1 };
    }
    const clampedPos = Math.min(pos, text.length);
    const sub = text.slice(0, clampedPos);
    const lines = sub.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
  }

  /**
   * Extract line, column, and position from JSON syntax error
   */
  function extractErrorLocation(err, text) {
    const raw = typeof text === 'string' ? text : '';
    const msg = (err && err.message) ? err.message : 'Invalid JSON';

    // 1. Check for explicit "at position X" in error message
    const posMatch = msg.match(/at\s+position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const { line, column } = computeLineCol(raw, pos);
      return { line, column, position: pos, message: msg };
    }

    // 2. Check for explicit "line X column Y" in error message
    const lineColMatch = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (lineColMatch) {
      const line = parseInt(lineColMatch[1], 10);
      const column = parseInt(lineColMatch[2], 10);
      return { line, column, position: null, message: msg };
    }

    // 3. Extract snippet from V8 error: ..."(...)" is not valid JSON
    const snippetIdx = msg.indexOf('..."');
    if (snippetIdx !== -1) {
      const endQuote = msg.lastIndexOf('" is not valid JSON');
      if (endQuote !== -1) {
        let snippet = msg.slice(snippetIdx + 4, endQuote);
        if (snippet.startsWith('"') && !raw.includes(snippet) && raw.includes(snippet.slice(1))) {
          snippet = snippet.slice(1);
        }
        const idx = raw.lastIndexOf(snippet);
        if (idx !== -1) {
          const pos = idx + snippet.length - 1;
          const { line, column } = computeLineCol(raw, pos);
          return { line, column, position: pos, message: msg };
        }
      }
    }

    // 4. Fallback search for unexpected token
    const tokenMatch = msg.match(/Unexpected token '([^']+)'/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      const idx = raw.lastIndexOf(token);
      if (idx !== -1) {
        const { line, column } = computeLineCol(raw, idx);
        return { line, column, position: idx, message: msg };
      }
    }

    return { line: 1, column: 1, position: 0, message: msg };
  }

  /**
   * Recursively sort object keys alphabetically
   */
  function sortKeysDeep(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(sortKeysDeep);
    }
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      sorted[k] = sortKeysDeep(obj[k]);
    }
    return sorted;
  }

  /**
   * Validate JSON text
   */
  function validateJson(text) {
    if (typeof text !== 'string' || text.trim() === '') {
      return {
        valid: false,
        error: 'JSON input is empty. Paste or type JSON to validate.',
        line: 1,
        column: 1,
        position: 0
      };
    }

    if (text.length > MAX_INPUT_BYTES) {
      return {
        valid: false,
        error: `Input exceeds the 1 MB safety limit (max 1,048,576 characters). Current size: ${text.length.toLocaleString()} characters.`,
        isSizeLimit: true,
        line: 1,
        column: 1,
        position: 0
      };
    }

    try {
      const parsed = JSON.parse(text);
      const lines = text.split('\n').length;
      return {
        valid: true,
        stats: {
          lineCount: lines,
          characterCount: text.length,
          byteSize: new Blob ? new Blob([text]).size : text.length
        },
        parsed
      };
    } catch (err) {
      const loc = extractErrorLocation(err, text);
      return {
        valid: false,
        error: `Syntax Error: ${loc.message} at line ${loc.line}, column ${loc.column}`,
        line: loc.line,
        column: loc.column,
        position: loc.position
      };
    }
  }

  /**
   * Format JSON with indentation and optional key sorting
   */
  function formatJson(text, options = {}) {
    const val = validateJson(text);
    if (!val.valid) {
      return {
        success: false,
        error: val.error,
        line: val.line,
        column: val.column,
        position: val.position,
        isSizeLimit: val.isSizeLimit || false
      };
    }

    let parsed = val.parsed;
    if (options.sortKeys) {
      parsed = sortKeysDeep(parsed);
    }

    let indent = 2;
    if (options.indent === '4' || options.indent === 4) {
      indent = 4;
    } else if (options.indent === 'tab' || options.indent === '\t') {
      indent = '\t';
    } else if (typeof options.indent === 'number') {
      indent = options.indent;
    }

    const formatted = JSON.stringify(parsed, null, indent);
    const lines = formatted.split('\n').length;

    return {
      success: true,
      formatted,
      stats: {
        lines,
        characterCount: formatted.length,
        byteSize: formatted.length
      }
    };
  }

  /**
   * Minify JSON by stripping all optional whitespace
   */
  function minifyJson(text) {
    const val = validateJson(text);
    if (!val.valid) {
      return {
        success: false,
        error: val.error,
        line: val.line,
        column: val.column,
        position: val.position,
        isSizeLimit: val.isSizeLimit || false
      };
    }

    const minified = JSON.stringify(val.parsed);
    return {
      success: true,
      minified,
      stats: {
        lines: 1,
        characterCount: minified.length,
        byteSize: minified.length
      }
    };
  }

  return {
    MAX_INPUT_BYTES,
    computeLineCol,
    extractErrorLocation,
    sortKeysDeep,
    validateJson,
    formatJson,
    minifyJson
  };
});
