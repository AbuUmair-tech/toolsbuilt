/**
 * Weighted Average Calculator Core Logic
 * Pure, DOM-free weighted mean with per-row contributions and worked steps.
 * Weights can be percentages or plain numbers; percentages that do not add up
 * to 100 are normalised (divided by their total) and flagged.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeightedAverageLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('weighted-average-calculator')
    : require('../../../scripts/i18n-client.js').scope('weighted-average-calculator');
  const locale = () => ((typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale('en-US') : 'en-US');

  const MAX_ROWS = 50;

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  /** Display rounding without trailing zeros: 81.000000001 -> "81" */
  function fmt(n, dp = 4) {
    const f = Math.pow(10, dp);
    const r = Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
    return (Object.is(r, -0) ? 0 : r).toLocaleString(locale(), { maximumFractionDigits: dp });
  }

  /**
   * @param {Array<{label?:string, value:(number|string), weight:(number|string)}>} rows
   * @param {Object} options - { weightType: 'percent' | 'number' }
   */
  function weightedAverage(rows, options = {}) {
    const weightType = options.weightType === 'number' ? 'number' : 'percent';
    if (!Array.isArray(rows)) return { error: T('errors.addRow') };
    if (rows.length > MAX_ROWS) return { error: T('errors.tooMany', { max: MAX_ROWS }) };

    const used = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const hasValue = !isBlank(row.value);
      const hasWeight = !isBlank(row.weight);
      if (!hasValue && !hasWeight) continue;
      const name = row.label && String(row.label).trim() ? String(row.label).trim() : T('rowName', { n: i + 1 });
      if (!hasValue) return { error: T('errors.enterValue', { name }), rowIndex: i, field: 'value' };
      if (!hasWeight) return { error: T('errors.enterWeight', { name }), rowIndex: i, field: 'weight' };
      const value = Number(row.value);
      const weight = Number(row.weight);
      if (!Number.isFinite(value)) return { error: T('errors.valueNumber', { name }), rowIndex: i, field: 'value' };
      if (!Number.isFinite(weight) || weight < 0) return { error: T('errors.weightPositive', { name }), rowIndex: i, field: 'weight' };
      used.push({ index: i, label: name, value, weight });
    }

    if (!used.length) return { error: T('errors.addRow') };
    const totalWeight = used.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) {
      return { error: T('errors.allZero'), field: 'weight', rowIndex: used[0].index };
    }

    const weightedSum = used.reduce((s, r) => s + r.value * r.weight, 0);
    const average = weightedSum / totalWeight;
    const normalised = weightType === 'percent' && Math.abs(totalWeight - 100) > 1e-9;

    const rowsOut = used.map(r => ({
      index: r.index,
      label: r.label,
      value: r.value,
      weight: r.weight,
      share: r.weight / totalWeight * 100,
      product: r.value * r.weight,
      contribution: r.value * r.weight / totalWeight
    }));

    const steps = [
      T('steps.multiply', { products: rowsOut.map(r => `${fmt(r.value)} × ${fmt(r.weight)} = ${fmt(r.product)}`).join('; ') }),
      T('steps.addProducts', { sum: rowsOut.map(r => fmt(r.product)).join(' + '), total: fmt(weightedSum) }),
      T('steps.addWeights', { sum: rowsOut.map(r => fmt(r.weight)).join(' + '), total: fmt(totalWeight) }),
      T('steps.divide', { sum: fmt(weightedSum), weights: fmt(totalWeight), average: fmt(average) })
    ];
    if (normalised) {
      steps.push(T('steps.normalised', { total: fmt(totalWeight) }));
    }

    return {
      average,
      averageRounded: Math.round((average + Math.sign(average) * Number.EPSILON) * 100) / 100,
      totalWeight,
      weightedSum,
      weightType,
      normalised,
      rows: rowsOut,
      steps
    };
  }

  return { MAX_ROWS, fmt, weightedAverage };
});
