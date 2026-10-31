/**
 * Duplicate Line Remover Core Logic
 * Pure, DOM-free de-duplication of lines. Comparison can ignore case and
 * surrounding spaces; the kept lines keep their original text unless trimOutput is on.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DuplicateLinesLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function splitLines(text) {
    if (text === undefined || text === null || text === '') return [];
    const lines = String(text).split(/\r\n|\r|\n/);
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  /**
   * @param {string} text
   * @param {Object} options
   * @param {boolean} options.caseInsensitive - "Apple" and "apple" are duplicates
   * @param {boolean} options.trim            - ignore leading/trailing spaces when comparing
   * @param {boolean} options.trimOutput      - also trim the lines that are kept
   * @param {boolean} options.removeEmpty     - drop blank lines entirely
   * @param {'first'|'last'} options.keep     - which occurrence to keep (in its position)
   * @param {'none'|'asc'|'desc'} options.sort
   */
  function removeDuplicates(text, options = {}) {
    const lines = splitLines(text);
    const keepLast = options.keep === 'last';
    const keyOf = (line) => {
      let k = options.trim ? line.trim() : line;
      if (options.caseInsensitive) k = k.toLocaleLowerCase();
      return k;
    };

    let emptyRemoved = 0;
    const candidates = [];
    lines.forEach((line, index) => {
      if (options.removeEmpty && line.trim() === '') { emptyRemoved++; return; }
      candidates.push({ line, index });
    });

    const seen = new Map();
    const order = keepLast ? candidates.slice().reverse() : candidates;
    const kept = [];
    const duplicates = [];
    order.forEach(c => {
      const key = keyOf(c.line);
      if (seen.has(key)) {
        seen.get(key).count++;
        duplicates.push(c);
      } else {
        const entry = { line: c.line, index: c.index, count: 1 };
        seen.set(key, entry);
        kept.push(entry);
      }
    });
    if (keepLast) kept.reverse();

    let out = kept.map(k => (options.trimOutput ? k.line.trim() : k.line));
    if (options.sort === 'asc' || options.sort === 'desc') {
      const collator = new Intl.Collator('en', { numeric: true, sensitivity: options.caseInsensitive ? 'base' : 'variant' });
      out.sort(collator.compare);
      if (options.sort === 'desc') out.reverse();
    }

    // The most repeated lines, for the summary
    const repeated = kept.filter(k => k.count > 1)
      .sort((x, y) => y.count - x.count || x.index - y.index)
      .slice(0, 10)
      .map(k => ({ line: options.trimOutput ? k.line.trim() : k.line, count: k.count }));

    return {
      lines: out,
      output: out.join('\n'),
      totalLines: lines.length,
      keptLines: out.length,
      duplicatesRemoved: duplicates.length,
      emptyRemoved,
      uniqueValues: seen.size,
      repeated
    };
  }

  return { splitLines, removeDuplicates };
});
