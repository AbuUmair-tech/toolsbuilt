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

  const MAX_ROWS = 50;

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  /** Display rounding without trailing zeros: 81.000000001 -> "81" */
  function fmt(n, dp = 4) {
    const f = Math.pow(10, dp);
    const r = Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
    return (Object.is(r, -0) ? 0 : r).toLocaleString('en-US', { maximumFractionDigits: dp });
  }

  /**
   * @param {Array<{label?:string, value:(number|string), weight:(number|string)}>} rows
   * @param {Object} options - { weightType: 'percent' | 'number' }
   */
  function weightedAverage(rows, options = {}) {
    const weightType = options.weightType === 'number' ? 'number' : 'percent';
    if (!Array.isArray(rows)) return { error: 'Add at least one value and weight.' };
    if (rows.length > MAX_ROWS) return { error: `Use ${MAX_ROWS} rows or fewer.` };

    const used = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const hasValue = !isBlank(row.value);
      const hasWeight = !isBlank(row.weight);
      if (!hasValue && !hasWeight) continue;
      const name = row.label && String(row.label).trim() ? String(row.label).trim() : `Row ${i + 1}`;
      if (!hasValue) return { error: `${name}: enter a value for this weight.`, rowIndex: i, field: 'value' };
      if (!hasWeight) return { error: `${name}: enter a weight for this value.`, rowIndex: i, field: 'weight' };
      const value = Number(row.value);
      const weight = Number(row.weight);
      if (!Number.isFinite(value)) return { error: `${name}: the value must be a number.`, rowIndex: i, field: 'value' };
      if (!Number.isFinite(weight) || weight < 0) return { error: `${name}: the weight must be 0 or a positive number.`, rowIndex: i, field: 'weight' };
      used.push({ index: i, label: name, value, weight });
    }

    if (!used.length) return { error: 'Add at least one value and weight.' };
    const totalWeight = used.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) {
      return { error: 'All the weights are zero, so there is nothing to average. Give at least one row a weight above 0.', field: 'weight', rowIndex: used[0].index };
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
      `Multiply each value by its weight: ${rowsOut.map(r => `${fmt(r.value)} × ${fmt(r.weight)} = ${fmt(r.product)}`).join('; ')}`,
      `Add the products: ${rowsOut.map(r => fmt(r.product)).join(' + ')} = ${fmt(weightedSum)}`,
      `Add the weights: ${rowsOut.map(r => fmt(r.weight)).join(' + ')} = ${fmt(totalWeight)}`,
      `Divide: ${fmt(weightedSum)} ÷ ${fmt(totalWeight)} = ${fmt(average)}`
    ];
    if (normalised) {
      steps.push(`The percentage weights add up to ${fmt(totalWeight)}%, not 100%, so each weight was treated as its share of ${fmt(totalWeight)}.`);
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
