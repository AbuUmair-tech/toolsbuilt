/**
 * Mean, Median, Mode & Standard Deviation Calculator Core Logic
 * Pure, DOM-free descriptive statistics with step-by-step working.
 * Quartiles use the median-of-halves method (the median is excluded from both
 * halves when the count is odd), as taught in most school courses and used by
 * TI graphing calculators.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.StatsLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('mean-median-mode-calculator')
    : require('../../../scripts/i18n-client.js').scope('mean-median-mode-calculator');
  const locale = () => ((typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale('en-US') : 'en-US');

  const MAX_VALUES = 100000;

  /** Rounds for display without trailing zeros: 2.13808993 -> "2.1381" (4 dp) */
  function fmt(value, dp = 4) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const f = Math.pow(10, dp);
    const r = Math.round((value + Math.sign(value) * Number.EPSILON) * f) / f;
    return (Object.is(r, -0) ? 0 : r).toLocaleString(locale(), { maximumFractionDigits: dp, useGrouping: false });
  }

  /**
   * Splits text on commas, semicolons, spaces, tabs and new lines.
   * Use a dot for decimals (2.5); a comma always separates values.
   */
  function parseNumbers(text) {
    const raw = String(text === undefined || text === null ? '' : text).replace(/[−–]/g, '-');
    const tokens = raw.split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) return { error: T('errors.empty') };
    const values = [];
    const bad = [];
    tokens.forEach(t => {
      if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) values.push(Number(t));
      else bad.push(t);
    });
    if (bad.length) {
      const shown = bad.slice(0, 3).map(b => `"${b}"`).join(', ');
      const key = bad.length > 3 ? 'errors.notNumber.more' : bad.length === 1 ? 'errors.notNumber.one' : 'errors.notNumber.other';
      return { error: T(key, { shown, more: bad.length - 3 }) };
    }
    if (values.length > MAX_VALUES) return { error: T('errors.tooMany', { max: MAX_VALUES.toLocaleString(locale()) }) };
    if (values.some(v => !Number.isFinite(v))) return { error: T('errors.tooLarge') };
    return { values };
  }

  function medianOf(sorted) {
    const n = sorted.length;
    if (!n) return null;
    const mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Kahan summation keeps long lists of decimals accurate
  function sum(values) {
    let s = 0, c = 0;
    for (const v of values) {
      const y = v - c;
      const t = s + y;
      c = (t - s) - y;
      s = t;
    }
    return s;
  }

  /** All values tied for the highest count; no mode when every value appears equally often. */
  function modesOf(sorted) {
    const counts = new Map();
    sorted.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    const max = Math.max(...counts.values());
    const distinctCounts = new Set(counts.values());
    if (max === 1 || distinctCounts.size === 1) return { modes: [], frequency: max === 1 ? 1 : max };
    return { modes: [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v), frequency: max };
  }

  /**
   * @param {string|number[]} input - text or an array of numbers
   */
  function analyse(input) {
    let values;
    if (Array.isArray(input)) {
      values = input.map(Number);
      if (!values.length) return { error: T('errors.noNumbers') };
      if (values.some(v => !Number.isFinite(v))) return { error: T('errors.notAllNumbers') };
    } else {
      const parsed = parseNumbers(input);
      if (parsed.error) return parsed;
      values = parsed.values;
    }

    const n = values.length;
    const sorted = values.slice().sort((a, b) => a - b);
    const total = sum(values);
    const mean = total / n;
    const median = medianOf(sorted);
    const { modes, frequency } = modesOf(sorted);
    const min = sorted[0];
    const max = sorted[n - 1];

    const squaredDeviations = values.map(v => (v - mean) * (v - mean));
    const ss = sum(squaredDeviations);
    const populationVariance = ss / n;
    const sampleVariance = n > 1 ? ss / (n - 1) : null;

    // Median-of-halves quartiles: exclude the median itself when n is odd
    const half = Math.floor(n / 2);
    const lower = sorted.slice(0, half);
    const upper = sorted.slice(n % 2 ? half + 1 : half);
    const q1 = n >= 2 ? medianOf(lower) : null;
    const q3 = n >= 2 ? medianOf(upper) : null;

    const stats = {
      count: n,
      sum: total,
      mean,
      median,
      modes,
      modeFrequency: frequency,
      min,
      max,
      range: max - min,
      sumOfSquares: ss,
      populationVariance,
      populationSD: Math.sqrt(populationVariance),
      sampleVariance,
      sampleSD: sampleVariance === null ? null : Math.sqrt(sampleVariance),
      q1,
      q3,
      iqr: q1 === null ? null : q3 - q1,
      quartileMethod: T('quartileMethod'),
      sorted
    };
    stats.steps = buildSteps(stats, values);
    return stats;
  }

  function buildSteps(s, values) {
    const listed = (arr, limit = 12) => arr.length > limit
      ? `${arr.slice(0, limit).map(v => fmt(v)).join(' + ')} + ${T('more', { count: arr.length - limit })}`
      : arr.map(v => fmt(v)).join(' + ');

    const n = s.count;
    const mean = [
      T(n === 1 ? 'steps.add.one' : 'steps.add.other', { count: n, values: listed(values), sum: fmt(s.sum) }),
      T('steps.divide', { sum: fmt(s.sum), count: n, mean: fmt(s.mean) })
    ];

    const median = [T('steps.sort', { values: s.sorted.length > 20 ? `${s.sorted.slice(0, 20).map(v => fmt(v)).join(', ')}, …` : s.sorted.map(v => fmt(v)).join(', ') })];
    if (n % 2) {
      median.push(T('steps.odd', { count: n, position: (n + 1) / 2, median: fmt(s.median) }));
    } else {
      const a = s.sorted[n / 2 - 1], b = s.sorted[n / 2];
      median.push(T('steps.even', { count: n, first: n / 2, second: n / 2 + 1, a: fmt(a), b: fmt(b), median: fmt(s.median) }));
    }

    const devs = values.slice(0, 12).map(v => `(${fmt(v)} − ${fmt(s.mean)})² = ${fmt((v - s.mean) ** 2)}`);
    const sd = [
      T('steps.deviations', { deviations: `${devs.join('; ')}${values.length > 12 ? `; ${T('more', { count: values.length - 12 })}` : ''}` }),
      T('steps.sumOfSquares', { ss: fmt(s.sumOfSquares) }),
      T('steps.populationVariance', { ss: fmt(s.sumOfSquares), count: n, variance: fmt(s.populationVariance), sd: fmt(s.populationSD) })
    ];
    if (s.sampleVariance !== null) {
      sd.push(T('steps.sampleVariance', { ss: fmt(s.sumOfSquares), count: n, variance: fmt(s.sampleVariance), sd: fmt(s.sampleSD) }));
    } else {
      sd.push(T('steps.sampleNeedsTwo'));
    }
    return { mean, median, sd };
  }

  return { parseNumbers, analyse, fmt, medianOf };
});
