/**
 * Python Formatter Logic
 * Wraps the Ruff formatter (compiled to WebAssembly, @wasm-fmt/ruff_fmt) behind a small,
 * testable API: format(code, options) -> Promise<{ output, changed }>.
 *
 * The engine is loaded lazily with import('@wasm-fmt/ruff_fmt'):
 * - in Node (unit tests) that resolves to the package in node_modules;
 * - in the browser the Python Formatter page's import map points it at the self-hosted copy in
 *   /assets/vendor/ruff_fmt-<version>/, which also serves the .wasm file. No other page loads it.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PythonFormatterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('python-formatter')
    : require('../../../scripts/i18n-client.js').scope('python-formatter');

  const OPTIONS = {
    lineLength: { values: [79, 88, 100, 120], default: 88 },
    indentWidth: { values: [2, 4], default: 4 },
    quoteStyle: { values: ['double', 'single', 'preserve'], default: 'double' }
  };

  let enginePromise = null;

  function loadEngine() {
    if (!enginePromise) {
      enginePromise = import('@wasm-fmt/ruff_fmt').then(async (mod) => {
        // The browser build exports an init function that fetches the .wasm next to it;
        // the Node build is ready on import.
        if (typeof mod.default === 'function') await mod.default();
        return mod;
      }).catch((err) => {
        enginePromise = null;
        throw err;
      });
    }
    return enginePromise;
  }

  function normalizeOptions(options) {
    const o = options || {};
    const pick = (key) => {
      const value = o[key] === undefined || o[key] === '' ? OPTIONS[key].default : o[key];
      const parsed = typeof OPTIONS[key].default === 'number' ? Number(value) : value;
      if (!OPTIONS[key].values.includes(parsed)) {
        throw new Error(T('errors.unsupportedOption', { key, value, choices: OPTIONS[key].values.join(', ') }));
      }
      return parsed;
    };
    return { lineLength: pick('lineLength'), indentWidth: pick('indentWidth'), quoteStyle: pick('quoteStyle') };
  }

  /** Line and column (1-based) of a UTF-8 byte offset in the source */
  function positionFromByteOffset(code, byteOffset) {
    const bytes = new TextEncoder().encode(code);
    const before = new TextDecoder().decode(bytes.slice(0, Math.max(0, Math.min(byteOffset, bytes.length))));
    const lines = before.split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  }

  /** Turn a Ruff error ("... at byte range 6..7") into a message with a line number */
  function toSyntaxError(code, raw) {
    const text = String(raw && raw.message ? raw.message : raw);
    const match = text.match(/at byte range (\d+)\.\.(\d+)/);
    const reason = text.replace(/\s*at byte range \d+\.\.\d+\s*$/, '');
    const err = new Error(reason);
    err.name = 'PythonSyntaxError';
    if (match) {
      const pos = positionFromByteOffset(code, Number(match[1]));
      err.line = pos.line;
      err.column = pos.column;
      err.message = T('errors.at', { line: pos.line, column: pos.column, reason });
    }
    err.reason = reason;
    return err;
  }

  /**
   * Format Python source.
   * options: { lineLength: 79|88|100|120, indentWidth: 2|4, quoteStyle: 'double'|'single'|'preserve' }
   * Resolves to { output, changed }; rejects with an Error that has line/column for syntax errors.
   */
  async function format(code, options) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new Error(T('errors.empty'));
    }
    const o = normalizeOptions(options);
    const engine = await loadEngine();
    let output;
    try {
      output = engine.format(code, 'main.py', {
        line_width: o.lineLength,
        indent_style: 'space',
        indent_width: o.indentWidth,
        quote_style: o.quoteStyle
      });
    } catch (raw) {
      throw toSyntaxError(code, raw);
    }
    return { output, changed: output !== code, options: o };
  }

  return { OPTIONS, format, loadEngine, positionFromByteOffset };
});
