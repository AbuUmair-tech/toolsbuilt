/**
 * Java Formatter Logic
 * Wraps Prettier with prettier-plugin-java behind a small, testable API:
 * format(code, options) -> Promise<{ output, changed }>.
 *
 * Engines are loaded lazily with import('prettier') and import('prettier-plugin-java'):
 * - in Node (unit tests) they resolve to the packages in node_modules;
 * - in the browser the Java Formatter page's import map points them (and the plugin's own
 *   web-tree-sitter dependency) at self-hosted copies in /assets/vendor/. No other page loads them.
 *
 * When Prettier cannot parse the code, the snippet is parsed again with the plugin's tree-sitter
 * grammar to report the line and column of the first missing or unexpected token.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(true);
  } else {
    root.JavaFormatterLogic = factory(false);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (isNode) {
  'use strict';

  // Messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('java-formatter')
    : require('../../../scripts/i18n-client.js').scope('java-formatter');

  const OPTIONS = {
    indentWidth: { values: [2, 4], default: 4 },
    printWidth: { values: [80, 100, 120], default: 80 }
  };

  // Where the Java grammar (.wasm) lives; the browser page sets it with configure()
  let grammarUrl = null;
  if (isNode) {
    const path = require('path');
    grammarUrl = path.join(path.dirname(require.resolve('prettier-plugin-java')), 'tree-sitter-java_orchard.wasm');
  }

  let enginePromise = null;
  let parserPromise = null;

  function configure(settings) {
    if (settings && settings.grammarUrl) grammarUrl = settings.grammarUrl;
  }

  function loadEngine() {
    if (!enginePromise) {
      enginePromise = Promise.all([import('prettier'), import('prettier-plugin-java')])
        .then(([prettier, plugin]) => ({ prettier, plugin: plugin.default || plugin }))
        .catch((err) => {
          enginePromise = null;
          throw err;
        });
    }
    return enginePromise;
  }

  function loadParser() {
    if (!parserPromise) {
      parserPromise = import('web-tree-sitter').then(async ({ Parser, Language }) => {
        await Parser.init();
        const parser = new Parser();
        parser.setLanguage(await Language.load(grammarUrl));
        return parser;
      }).catch((err) => {
        parserPromise = null;
        throw err;
      });
    }
    return parserPromise;
  }

  function normalizeOptions(options) {
    const o = options || {};
    const pick = (key) => {
      const value = Number(o[key] === undefined || o[key] === '' ? OPTIONS[key].default : o[key]);
      if (!OPTIONS[key].values.includes(value)) {
        throw new Error(T('errors.unsupportedOption', { key, value: o[key], choices: OPTIONS[key].values.join(', ') }));
      }
      return value;
    };
    return { indentWidth: pick('indentWidth'), printWidth: pick('printWidth') };
  }

  /** First missing or unexpected token in the snippet, as 1-based line/column */
  async function locateSyntaxError(code) {
    try {
      const parser = await loadParser();
      const tree = parser.parse(code);
      let found = null;
      (function walk(node) {
        if (found) return;
        if (node.isMissing || node.type === 'ERROR') {
          found = {
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            reason: node.isMissing ? T('errors.missing', { token: node.type }) : T('errors.unexpected')
          };
          return;
        }
        for (const child of node.children) walk(child);
      })(tree.rootNode);
      tree.delete();
      return found;
    } catch (e) {
      return null;
    }
  }

  /**
   * Format Java source.
   * options: { indentWidth: 2|4, printWidth: 80|100|120 }
   * Resolves to { output, changed }; rejects with an Error that has line/column when it can be found.
   */
  async function format(code, options) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new Error(T('errors.empty'));
    }
    const o = normalizeOptions(options);
    const { prettier, plugin } = await loadEngine();
    let output;
    try {
      output = await prettier.format(code, {
        parser: 'java',
        plugins: [plugin],
        tabWidth: o.indentWidth,
        useTabs: false,
        printWidth: o.printWidth
      });
    } catch (raw) {
      const where = await locateSyntaxError(code);
      const err = new Error(where
        ? T('errors.at', { line: where.line, column: where.column, reason: where.reason })
        : T('errors.unparsed'));
      err.name = 'JavaSyntaxError';
      if (where) Object.assign(err, where);
      throw err;
    }
    return { output, changed: output !== code, options: o };
  }

  return { OPTIONS, configure, format, loadEngine };
});
