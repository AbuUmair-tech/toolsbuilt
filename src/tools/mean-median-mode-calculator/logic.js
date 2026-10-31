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

  const MAX_VALUES = 100000;

  /** Rounds for display without trailing zeros: 2.13808993 -> "2.1381" (4 dp) */
  function fmt(value, dp = 4) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const f = Math.pow(10, dp);
    const r = Math.round((value + Math.sign(value) * Number.EPSILON) * f) / f;
    return (Object.is(r, -0) ? 0 : r).toLocaleString('en-US', { maximumFractionDigits: dp, useGrouping: false });
  }

  /**
   * Splits text on commas, semicolons, spaces, tabs and new lines.
   * Use a dot for decimals (2.5); a comma always separates values.
   */
  function parseNumbers(text) {
    const raw = String(text === undefined || text === null ? '' : text).replace(/[−–]/g, '-');
    const tokens = raw.split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) return { error: 'Enter at least one number. Separate values with commas, spaces or new lines.' };
    const values = [];
    const bad = [];
    tokens.forEach(t => {
      if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) values.push(Number(t));
      else bad.push(t);
    });
    if (bad.length) {
      const shown = bad.slice(0, 3).map(b => `"${b}"`).join(', ');
      return { error: `${shown}${bad.length > 3 ? ` and ${bad.length - 3} more` : ''} ${bad.length === 1 ? 'is' : 'are'} not a number. Use digits with a dot for decimals (2.5), separated by commas, spaces or new lines.` };
    }
    if (values.length > MAX_VALUES) return { error: `Enter at most ${MAX_VALUES.toLocaleString('en-US')} values.` };
    if (values.some(v => !Number.isFinite(v))) return { error: 'One of the values is too large to work with.' };
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
      if (!values.length) return { error: 'Enter at least one number.' };
      if (values.some(v => !Number.isFinite(v))) return { error: 'Every value must be a number.' };
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
      quartileMethod: 'Median of halves: Q1 is the median of the lower half and Q3 the median of the upper half, leaving out the overall median when the count is odd.',
      sorted
    };
    stats.steps = buildSteps(stats, values);
    return stats;
  }

  function buildSteps(s, values) {
    const listed = (arr, limit = 12) => arr.length > limit
      ? `${arr.slice(0, limit).map(v => fmt(v)).join(' + ')} + … (${arr.length - limit} more)`
      : arr.map(v => fmt(v)).join(' + ');

    const n = s.count;
    const mean = [
      `Add the ${n} value${n === 1 ? '' : 's'}: ${listed(values)} = ${fmt(s.sum)}`,
      `Divide by the count: ${fmt(s.sum)} ÷ ${n} = ${fmt(s.mean)}`
    ];

    const median = [`Sort the values: ${s.sorted.length > 20 ? `${s.sorted.slice(0, 20).map(v => fmt(v)).join(', ')}, …` : s.sorted.map(v => fmt(v)).join(', ')}`];
    if (n % 2) {
      median.push(`${n} is odd, so the median is the middle value, number ${(n + 1) / 2}: ${fmt(s.median)}`);
    } else {
      const a = s.sorted[n / 2 - 1], b = s.sorted[n / 2];
      median.push(`${n} is even, so the median is the average of values ${n / 2} and ${n / 2 + 1}: (${fmt(a)} + ${fmt(b)}) ÷ 2 = ${fmt(s.median)}`);
    }

    const devs = values.slice(0, 12).map(v => `(${fmt(v)} − ${fmt(s.mean)})² = ${fmt((v - s.mean) ** 2)}`);
    const sd = [
      `Subtract the mean from each value and square it: ${devs.join('; ')}${values.length > 12 ? `; … (${values.length - 12} more)` : ''}`,
      `Add the squared deviations: sum of squares = ${fmt(s.sumOfSquares)}`,
      `Population variance σ² = ${fmt(s.sumOfSquares)} ÷ ${n} = ${fmt(s.populationVariance)}, so σ = √${fmt(s.populationVariance)} = ${fmt(s.populationSD)}`
    ];
    if (s.sampleVariance !== null) {
      sd.push(`Sample variance s² = ${fmt(s.sumOfSquares)} ÷ (${n} − 1) = ${fmt(s.sampleVariance)}, so s = √${fmt(s.sampleVariance)} = ${fmt(s.sampleSD)}`);
    } else {
      sd.push('The sample standard deviation needs at least 2 values (it divides by n − 1).');
    }
    return { mean, median, sd };
  }

  return { parseNumbers, analyse, fmt, medianOf };
});
