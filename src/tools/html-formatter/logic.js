/**
 * HTML Formatter Logic
 * Wraps Prettier's HTML printer (with the postcss and babel plugins for inline <style>
 * and <script>) behind a small, testable API: format(code, options) -> Promise<{ output, changed, warnings }>.
 *
 * Engines are loaded lazily with import('prettier') and import('prettier/plugins/…'):
 * - in Node (unit tests) they resolve to the packages in node_modules;
 * - in the browser the HTML Formatter page's import map points them at self-hosted copies
 *   in /assets/vendor/. No other page loads them.
 *
 * Prettier reports mismatched closing tags with a line and column. Elements that are never
 * closed at all are silently closed by the parser, so they are reported as warnings by a
 * small tag scanner (findUnclosed). Minify mode removes comments and whitespace between tags.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HtmlFormatterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPTIONS = {
    mode: { values: ['format', 'minify'], default: 'format' },
    indentWidth: { values: ['2', '4', 'tab'], default: '2' },
    printWidth: { values: [80, 100, 120], default: 80 },
    whitespace: { values: ['css', 'strict', 'ignore'], default: 'css' }
  };

  // Elements that never have content or an end tag
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  // Elements whose end tag may be omitted (WHATWG HTML "Optional tags")
  const OPTIONAL_END = new Set(['html', 'head', 'body', 'p', 'li', 'dt', 'dd', 'option', 'optgroup', 'rb', 'rt', 'rtc', 'rp', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'colgroup', 'caption']);
  // Raw text: content is not markup, and whitespace inside must be kept when minifying
  const RAW = new Set(['script', 'style', 'textarea', 'title', 'pre']);
  // Block-level elements: whitespace next to them never renders, so minify can drop it
  const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'br', 'caption', 'col', 'colgroup', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'li', 'link', 'main', 'meta', 'nav', 'ol', 'optgroup', 'option', 'p', 'pre', 'script', 'section', 'style', 'summary', 'table', 'tbody', 'td', 'template', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul', '!doctype']);

  let enginePromise = null;

  function loadEngine() {
    if (!enginePromise) {
      enginePromise = Promise.all([
        import('prettier'),
        import('prettier/plugins/html'),
        import('prettier/plugins/postcss'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree')
      ]).then(([prettier, ...plugins]) => ({ prettier, plugins: plugins.map(p => p.default || p) }))
        .catch((err) => {
          enginePromise = null;
          throw err;
        });
    }
    return enginePromise;
  }

  function normalizeOptions(options) {
    const o = options || {};
    const pick = (key) => {
      const raw = o[key] === undefined || o[key] === '' ? OPTIONS[key].default : o[key];
      const value = typeof OPTIONS[key].default === 'number' ? Number(raw) : String(raw);
      if (!OPTIONS[key].values.includes(value)) {
        throw new Error(`Unsupported ${key}: ${raw}. Choose one of ${OPTIONS[key].values.join(', ')}.`);
      }
      return value;
    };
    return { mode: pick('mode'), indentWidth: pick('indentWidth'), printWidth: pick('printWidth'), whitespace: pick('whitespace') };
  }

  function lineAt(code, index) {
    let line = 1;
    for (let i = 0; i < index; i++) if (code.charCodeAt(i) === 10) line++;
    return line;
  }

  /**
   * Walks the tags (skipping comments, doctype and raw-text content) and calls
   * onTag({ name, closing, selfClosing, start, end }) for each.
   */
  function scanTags(code, onTag) {
    const tagRe = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
    let m;
    while ((m = tagRe.exec(code))) {
      if (!m[2]) continue; // comment, doctype or processing instruction
      const name = m[2].toLowerCase();
      const tag = { name, closing: m[1] === '/', selfClosing: m[4] === '/', start: m.index, end: tagRe.lastIndex };
      onTag(tag);
      if (!tag.closing && RAW.has(name) && name !== 'pre') {
        // Skip raw text up to the matching end tag
        const endRe = new RegExp(`</${name}\\s*>`, 'ig');
        endRe.lastIndex = tagRe.lastIndex;
        const end = endRe.exec(code);
        if (!end) return;
        onTag({ name, closing: true, selfClosing: false, start: end.index, end: endRe.lastIndex });
        tagRe.lastIndex = endRe.lastIndex;
      }
    }
  }

  /** Elements that are opened but never closed (other than void and optional-end-tag elements). */
  function findUnclosed(code) {
    const stack = [];
    scanTags(code, (tag) => {
      if (tag.closing) {
        const idx = stack.map(t => t.name).lastIndexOf(tag.name);
        if (idx >= 0) stack.length = idx; // implicitly closes anything opened inside it
        return;
      }
      if (VOID.has(tag.name) || tag.selfClosing) return;
      stack.push(tag);
    });
    return stack
      .filter(t => !OPTIONAL_END.has(t.name))
      .map(t => {
        const line = lineAt(code, t.start);
        return { line, tag: t.name, message: `Line ${line}: <${t.name}> is never closed. Browsers close it at the end of its parent, which may not be where you meant.` };
      });
  }

  /**
   * Conservative minifier: removes comments (except conditional comments) and whitespace
   * between tags. Whitespace next to a block element is removed; between inline elements and
   * text it is collapsed to one space, because removing it would join words visually.
   * Content of <pre>, <textarea>, <script> and <style> is left exactly as written.
   */
  function minify(code) {
    const pieces = [];
    let last = 0;
    const keep = [];
    // Protect raw-text elements
    const rawRe = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
    let m;
    while ((m = rawRe.exec(code))) {
      pieces.push(code.slice(last, m.index));
      pieces.push(`\u0000${keep.length}\u0000`);
      keep.push(m[0]);
      last = rawRe.lastIndex;
    }
    pieces.push(code.slice(last));
    let s = pieces.join('');

    s = s.replace(/<!--(?!\[if|<!|>)[\s\S]*?-->/g, '');
    const tagName = (t) => {
      const mm = t.match(/^<\/?\s*(!doctype|[A-Za-z][\w:.-]*)/i);
      return mm ? mm[1].toLowerCase() : '';
    };
    // Whitespace between two tags, or at the start/end of the document
    s = s.replace(/(<[^>]+>|\u0000\d+\u0000)(\s+)(?=(<[^>]+>|\u0000\d+\u0000))/g, (all, left, space, right) => {
      const l = left.startsWith('\u0000') ? 'pre' : tagName(left);
      const r = right.startsWith('\u0000') ? 'pre' : tagName(right);
      return BLOCK.has(l) || BLOCK.has(r) ? left : `${left} `;
    });
    // Runs of whitespace inside text collapse to one space (the browser does the same)
    s = s.replace(/[ \t\r\n]{2,}/g, ' ').trim();
    return s.replace(/\u0000(\d+)\u0000/g, (all, i) => keep[Number(i)]);
  }

  /**
   * Format or minify HTML.
   * options: { mode: 'format'|'minify', indentWidth: '2'|'4'|'tab', printWidth: 80|100|120, whitespace: 'css'|'strict'|'ignore' }
   * Resolves to { output, changed, warnings }; rejects with an HtmlSyntaxError that has line/column.
   */
  async function format(code, options) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new Error('Paste some HTML to format.');
    }
    const o = normalizeOptions(options);
    const warnings = findUnclosed(code);

    if (o.mode === 'minify') {
      const output = minify(code);
      return { output, changed: output !== code, warnings, options: o, saved: code.length - output.length };
    }

    const { prettier, plugins } = await loadEngine();
    let output;
    try {
      output = await prettier.format(code, {
        parser: 'html',
        plugins,
        printWidth: o.printWidth,
        tabWidth: o.indentWidth === '4' ? 4 : 2,
        useTabs: o.indentWidth === 'tab',
        htmlWhitespaceSensitivity: o.whitespace
      });
    } catch (raw) {
      const loc = raw && raw.loc && raw.loc.start;
      const reason = String((raw && raw.message) || '').split('\n')[0]
        .replace(/\s*\(\d+:\d+\)\s*$/, '')
        .replace(/ For more info see \S+/, '');
      const err = new Error(loc
        ? `Line ${loc.line}, column ${loc.column}: ${reason}`
        : `The HTML could not be parsed. ${reason}`);
      err.name = 'HtmlSyntaxError';
      if (loc) Object.assign(err, { line: loc.line, column: loc.column });
      throw err;
    }
    return { output, changed: output !== code, warnings, options: o };
  }

  return { OPTIONS, format, minify, findUnclosed, loadEngine };
});
