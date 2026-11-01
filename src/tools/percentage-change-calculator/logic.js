/**
 * Percentage Calculator Core Logic
 * Pure, DOM-free functions for 4 core percentage modes:
 * 1. What is X% of Y?
 * 2. X is what % of Y?
 * 3. Percentage Change from A to B
 * 4. Percentage Difference between A and B
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PercentageChangeLogic = root.PercentageCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('percentage-change-calculator')
    : require('../../../scripts/i18n-client.js').scope('percentage-change-calculator');

  function roundSensible(num, maxDecimals = 6) {
    if (!isFinite(num)) return num;
    const factor = Math.pow(10, maxDecimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  function cleanFloat(num) {
    if (isNaN(num)) return NaN;
    return parseFloat(num.toPrecision(12));
  }

  /**
   * Mode 1: What is X% of Y?
   * Formula: (X / 100) * Y
   */
  function calculatePercentOf(percent, total) {
    const p = parseFloat(percent);
    const y = parseFloat(total);

    if (isNaN(p) || isNaN(y)) {
      throw new Error(T('errors.percentAndTotal'));
    }

    const result = cleanFloat((p / 100) * y);
    const formula = `(${p} ÷ 100) × ${y}`;
    const steps = [
      T('steps.percentToDecimal', { p, decimal: roundSensible(p / 100, 6) }),
      T('steps.multiplyDecimal', { y, decimal: roundSensible(p / 100, 6), result: roundSensible(result, 4) })
    ];

    return {
      result: roundSensible(result, 4),
      percent: p,
      total: y,
      formula,
      steps
    };
  }

  /**
   * Mode 2: X is what % of Y?
   * Formula: (X / Y) * 100
   */
  function calculateIsWhatPercent(part, whole) {
    const x = parseFloat(part);
    const y = parseFloat(whole);

    if (isNaN(x) || isNaN(y)) {
      throw new Error(T('errors.partAndWhole'));
    }

    if (y === 0) {
      throw new Error(T('errors.divideByZeroWhole'));
    }

    const ratio = x / y;
    const result = cleanFloat(ratio * 100);
    const rounded = roundSensible(result, 4);
    const formula = `(${x} ÷ ${y}) × 100`;
    const steps = [
      T('steps.dividePartWhole', { x, y, ratio: roundSensible(ratio, 6) }),
      T('steps.ratioToPercent', { ratio: roundSensible(ratio, 6), percent: rounded })
    ];

    return {
      result: rounded,
      percent: rounded,
      formattedPercent: Math.abs(rounded).toFixed(2),
      part: x,
      whole: y,
      formula,
      steps
    };
  }

  /**
   * Mode 3: Percentage Change from A to B
   * Formula: ((B - A) / |A|) * 100
   */
  function calculatePercentChange(oldValue, newValue) {
    const a = parseFloat(oldValue);
    const b = parseFloat(newValue);

    if (isNaN(a) || isNaN(b)) {
      throw new Error(T('errors.initialAndFinal'));
    }

    if (a === 0) {
      if (b === 0) {
        return {
          change: 0,
          percentChange: 0,
          formattedPercent: '0.00',
          difference: 0,
          absoluteDiff: 0,
          isIncrease: false,
          isDecrease: false,
          isZero: true,
          direction: 'none',
          formula: `(0 - 0) / |0|`,
          steps: [T('steps.bothZero')]
        };
      }
      throw new Error(T('errors.changeFromZero'));
    }

    const diff = cleanFloat(b - a);
    const absA = Math.abs(a);
    const ratio = diff / absA;
    const change = cleanFloat(ratio * 100);
    const roundedChange = roundSensible(change, 4);

    const isIncrease = change > 0;
    const isDecrease = change < 0;
    const isZero = change === 0;
    const direction = isIncrease ? 'increase' : (isDecrease ? 'decrease' : 'none');

    const formula = `((${b} - ${a}) ÷ |${a}|) × 100`;
    const steps = [
      T('steps.difference', { b, a, diff: roundSensible(diff, 6) }),
      T('steps.divideAbsOld', { diff: roundSensible(diff, 6), absA, ratio: roundSensible(ratio, 6) }),
      T('steps.multiply100', { ratio: roundSensible(ratio, 6), percent: roundedChange })
    ];

    return {
      change: roundedChange,
      percentChange: roundedChange,
      formattedPercent: Math.abs(roundedChange).toFixed(2),
      difference: roundSensible(diff, 4),
      absoluteDiff: roundSensible(Math.abs(diff), 4),
      oldValue: a,
      newValue: b,
      isIncrease,
      isDecrease,
      isZero,
      direction,
      formula,
      steps
    };
  }

  /**
   * Mode 4: Percentage Difference between A and B
   * Formula: (|A - B| / ((A + B) / 2)) * 100
   */
  function calculatePercentDifference(val1, val2) {
    const a = parseFloat(val1);
    const b = parseFloat(val2);

    if (isNaN(a) || isNaN(b)) {
      throw new Error(T('errors.bothValues'));
    }

    const sum = cleanFloat(a + b);
    if (sum === 0 && a === 0 && b === 0) {
      throw new Error(T('errors.sumZero'));
    }

    const absDiff = Math.abs(cleanFloat(a - b));
    const average = cleanFloat(sum / 2);
    // Percentage difference is always positive; divide by |average| to handle
    // cases where both values are negative (average would be negative, flipping sign).
    if (average === 0) {
      throw new Error(T('errors.averageZero'));
    }
    const ratio = absDiff / Math.abs(average);
    const diffPercent = cleanFloat(ratio * 100);
    const roundedDiff = roundSensible(diffPercent, 4);

    const formula = `(|${a} - ${b}| ÷ ((${a} + ${b}) ÷ 2)) × 100`;
    const steps = [
      T('steps.absDifference', { a, b, diff: roundSensible(absDiff, 6) }),
      T('steps.average', { a, b, average: roundSensible(average, 6) }),
      T('steps.divideByAverage', { diff: roundSensible(absDiff, 6), average: roundSensible(average, 6), ratio: roundSensible(ratio, 6) }),
      T('steps.multiply100', { ratio: roundSensible(ratio, 6), percent: roundedDiff })
    ];

    return {
      difference: roundSensible(absDiff, 4),
      percentDifference: roundedDiff,
      formattedPercent: roundedDiff.toFixed(2),
      average: roundSensible(average, 4),
      val1: a,
      val2: b,
      formula,
      steps
    };
  }

  return {
    roundSensible,
    calculatePercentOf,
    calculateIsWhatPercent,
    calculateWhatPercentIs: calculateIsWhatPercent,
    calculatePercentChange,
    calculatePercentDifference
  };
});
