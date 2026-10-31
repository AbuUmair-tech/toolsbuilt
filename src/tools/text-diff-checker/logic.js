/**
 * Text Diff Checker Core Logic
 * Pure, DOM-free line diff using Myers' O(ND) algorithm, with word-level
 * highlighting inside changed lines. Lines are interned to integer ids and the
 * common prefix and suffix are trimmed first, so large, mostly similar texts are fast.
 * If two texts differ in more than MAX_EDITS lines, the middle is split at lines that
 * occur once in each text (patience diff anchors) and each part is diffed on its own;
 * only a part that is still too different is reported as removed + added.
 * Works in the page and in a Web Worker (worker.js loads this file with importScripts).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TextDiffLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const MAX_EDITS = 3000;
  const MAX_WORD_TOKENS = 2000;

  function splitLines(text) {
    if (text === undefined || text === null || text === '') return [];
    const lines = String(text).split(/\r\n|\r|\n/);
    // A trailing newline does not start an extra empty line
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function normaliser(options) {
    return (line) => {
      let s = line;
      if (options.ignoreWhitespace) s = s.replace(/\s+/g, '');
      if (options.ignoreCase) s = s.toLowerCase();
      return s;
    };
  }

  /**
   * Myers' algorithm on a[aLo..aHi) and b[bLo..bHi).
   * Returns the edit script ('=', '-', '+' with indexes), or null if more than maxEdits edits are needed.
   */
  function myersCore(a, b, aLo, aHi, bLo, bHi, maxEdits) {
    const N = aHi - aLo;
    const M = bHi - bLo;
    const out = [];
    if (N === 0) { for (let j = 0; j < M; j++) out.push({ t: '+', b: bLo + j }); return out; }
    if (M === 0) { for (let i = 0; i < N; i++) out.push({ t: '-', a: aLo + i }); return out; }

    const max = N + M;
    const offset = max;
    const v = new Int32Array(2 * max + 2);
    const trace = [];
    let found = -1;
    for (let d = 0; d <= max && d <= maxEdits; d++) {
      // Keep only the diagonals reachable in d steps: 2d + 1 values
      trace.push(v.slice(offset - d, offset + d + 1));
      for (let k = -d; k <= d; k += 2) {
        let x;
        if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) x = v[offset + k + 1];
        else x = v[offset + k - 1] + 1;
        let y = x - k;
        while (x < N && y < M && a[aLo + x] === b[bLo + y]) { x++; y++; }
        v[offset + k] = x;
        if (x >= N && y >= M) { found = d; break; }
      }
      if (found >= 0) break;
    }
    if (found < 0) return null;

    // Walk the trace backwards to recover the edit script
    let x = N, y = M;
    for (let d = found; d > 0; d--) {
      const vd = trace[d]; // v before step d, indexed k + d
      const k = x - y;
      const at = (kk) => vd[kk + d];
      const prevK = (k === -d || (k !== d && at(k - 1) < at(k + 1))) ? k + 1 : k - 1;
      const prevX = at(prevK);
      const prevY = prevX - prevK;
      while (x > prevX && y > prevY) { x--; y--; out.push({ t: '=', a: aLo + x, b: bLo + y }); }
      if (x === prevX) { y--; out.push({ t: '+', b: bLo + y }); }
      else { x--; out.push({ t: '-', a: aLo + x }); }
    }
    while (x > 0 && y > 0) { x--; y--; out.push({ t: '=', a: aLo + x, b: bLo + y }); }
    return out.reverse();
  }

  /**
   * Patience-style anchors: lines that occur exactly once in each range, kept in
   * the longest order-preserving run (longest increasing subsequence).
   */
  function uniqueAnchors(a, b, aLo, aHi, bLo, bHi) {
    const countA = new Map(), countB = new Map(), posB = new Map();
    for (let i = aLo; i < aHi; i++) countA.set(a[i], (countA.get(a[i]) || 0) + 1);
    for (let j = bLo; j < bHi; j++) { countB.set(b[j], (countB.get(b[j]) || 0) + 1); posB.set(b[j], j); }
    const pairs = [];
    for (let i = aLo; i < aHi; i++) {
      if (countA.get(a[i]) === 1 && countB.get(a[i]) === 1) pairs.push([i, posB.get(a[i])]);
    }
    // LIS on the b positions (patience sorting), O(k log k)
    const tails = [], prev = new Array(pairs.length);
    pairs.forEach((p, idx) => {
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (pairs[tails[mid]][1] < p[1]) lo = mid + 1; else hi = mid; }
      prev[idx] = lo > 0 ? tails[lo - 1] : -1;
      tails[lo] = idx;
    });
    const anchors = [];
    for (let idx = tails.length ? tails[tails.length - 1] : -1; idx >= 0; idx = prev[idx]) anchors.push(pairs[idx]);
    return anchors.reverse();
  }

  /**
   * Line diff of two integer arrays. Returns { ops, approximate }.
   * Common prefix/suffix are trimmed; if Myers needs more than maxEdits edits, the
   * middle is split at unique matching lines and each gap is diffed on its own.
   */
  function myers(a, b, maxEdits = MAX_EDITS) {
    const n = a.length;
    const m = b.length;
    const ops = [];
    let approximate = false;

    let start = 0;
    while (start < n && start < m && a[start] === b[start]) start++;
    let endA = n, endB = m;
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
    for (let i = 0; i < start; i++) ops.push({ t: '=', a: i, b: i });

    let middle = myersCore(a, b, start, endA, start, endB, maxEdits);
    if (!middle) {
      middle = [];
      const anchors = uniqueAnchors(a, b, start, endA, start, endB);
      let pa = start, pb = start;
      anchors.concat([[endA, endB]]).forEach(([ai, bj], idx) => {
        const gap = myersCore(a, b, pa, ai, pb, bj, maxEdits);
        if (gap) middle.push(...gap);
        else {
          approximate = true;
          for (let i = pa; i < ai; i++) middle.push({ t: '-', a: i });
          for (let j = pb; j < bj; j++) middle.push({ t: '+', b: j });
        }
        if (idx < anchors.length) middle.push({ t: '=', a: ai, b: bj });
        pa = ai + 1; pb = bj + 1;
      });
    }

    // Within each change block list removals before additions
    let i = 0;
    while (i < middle.length) {
      if (middle[i].t === '=') { ops.push(middle[i]); i++; continue; }
      const dels = [], adds = [];
      while (i < middle.length && middle[i].t !== '=') {
        (middle[i].t === '-' ? dels : adds).push(middle[i]);
        i++;
      }
      ops.push(...dels, ...adds);
    }

    for (let j = 0; j < n - endA; j++) ops.push({ t: '=', a: endA + j, b: endB + j });
    return { ops, approximate };
  }

  function intern(listA, listB) {
    const ids = new Map();
    const id = (s) => {
      let v = ids.get(s);
      if (v === undefined) { v = ids.size; ids.set(s, v); }
      return v;
    };
    return [listA.map(id), listB.map(id)];
  }

  /** Splits a line into words and the whitespace/punctuation between them. */
  function tokenize(line) {
    return line.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) || [];
  }

  /**
   * Word-level diff of two lines: segments of { type: 'equal' | 'removed' | 'added', text }.
   */
  function wordDiff(oldLine, newLine, options = {}) {
    const ta = tokenize(oldLine);
    const tb = tokenize(newLine);
    if (ta.length + tb.length > MAX_WORD_TOKENS) {
      return { old: [{ type: 'removed', text: oldLine }], new: [{ type: 'added', text: newLine }] };
    }
    const norm = normaliser(options);
    const [ia, ib] = intern(ta.map(t => (options.ignoreWhitespace && /^\s+$/.test(t) ? ' ' : norm(t))), tb.map(t => (options.ignoreWhitespace && /^\s+$/.test(t) ? ' ' : norm(t))));
    const { ops } = myers(ia, ib, MAX_WORD_TOKENS);
    const oldSegs = [], newSegs = [];
    const push = (list, type, text) => {
      const last = list[list.length - 1];
      if (last && last.type === type) last.text += text;
      else list.push({ type, text });
    };
    ops.forEach(op => {
      if (op.t === '=') { push(oldSegs, 'equal', ta[op.a]); push(newSegs, 'equal', tb[op.b]); }
      else if (op.t === '-') push(oldSegs, 'removed', ta[op.a]);
      else push(newSegs, 'added', tb[op.b]);
    });
    return { old: oldSegs, new: newSegs };
  }

  /**
   * Compares two texts line by line.
   * @param {string} oldText
   * @param {string} newText
   * @param {Object} options - { ignoreCase, ignoreWhitespace, ignoreBlankLines, wordDiff = true }
   * @returns {{ rows, inline, stats, identical, approximate }}
   *   rows:   side-by-side rows { type: 'equal'|'changed'|'removed'|'added', left?, right? }
   *   inline: inline lines { type: 'equal'|'removed'|'added', oldNo?, newNo?, text, segments? }
   */
  function diffTexts(oldText, newText, options = {}) {
    const linesA = splitLines(oldText);
    const linesB = splitLines(newText);
    const norm = normaliser(options);

    // Blank lines can be left out of the comparison but keep their original line numbers
    const keep = (line) => !(options.ignoreBlankLines && line.trim() === '');
    const idxA = [], idxB = [];
    linesA.forEach((l, i) => { if (keep(l)) idxA.push(i); });
    linesB.forEach((l, i) => { if (keep(l)) idxB.push(i); });

    const [ia, ib] = intern(idxA.map(i => norm(linesA[i])), idxB.map(i => norm(linesB[i])));
    const { ops, approximate } = myers(ia, ib);

    const stats = { added: 0, removed: 0, unchanged: 0, changed: 0, oldLines: linesA.length, newLines: linesB.length };
    const inline = [];
    const rows = [];
    const withWords = options.wordDiff !== false;

    let i = 0;
    while (i < ops.length) {
      const op = ops[i];
      if (op.t === '=') {
        const a = idxA[op.a], b = idxB[op.b];
        stats.unchanged++;
        inline.push({ type: 'equal', oldNo: a + 1, newNo: b + 1, text: linesB[b] });
        rows.push({ type: 'equal', left: { no: a + 1, text: linesA[a] }, right: { no: b + 1, text: linesB[b] } });
        i++;
        continue;
      }
      const dels = [], adds = [];
      while (i < ops.length && ops[i].t === '-') { dels.push(idxA[ops[i].a]); i++; }
      while (i < ops.length && ops[i].t === '+') { adds.push(idxB[ops[i].b]); i++; }
      stats.removed += dels.length;
      stats.added += adds.length;

      // Pair removed and added lines in order: a pair is a modified line with word highlights
      const pairs = Math.min(dels.length, adds.length);
      const words = [];
      for (let p = 0; p < pairs; p++) {
        words.push(withWords ? wordDiff(linesA[dels[p]], linesB[adds[p]], options) : null);
      }
      stats.changed += pairs;
      dels.forEach((a, p) => inline.push({ type: 'removed', oldNo: a + 1, text: linesA[a], segments: words[p] ? words[p].old : null }));
      adds.forEach((b, p) => inline.push({ type: 'added', newNo: b + 1, text: linesB[b], segments: words[p] ? words[p].new : null }));
      for (let p = 0; p < Math.max(dels.length, adds.length); p++) {
        const a = dels[p], b = adds[p];
        rows.push({
          type: a !== undefined && b !== undefined ? 'changed' : (a !== undefined ? 'removed' : 'added'),
          left: a !== undefined ? { no: a + 1, text: linesA[a], segments: words[p] ? words[p].old : null } : null,
          right: b !== undefined ? { no: b + 1, text: linesB[b], segments: words[p] ? words[p].new : null } : null
        });
      }
    }

    return {
      rows,
      inline,
      stats,
      identical: stats.added === 0 && stats.removed === 0,
      approximate
    };
  }

  return { MAX_EDITS, splitLines, myers, tokenize, wordDiff, diffTexts };
});
