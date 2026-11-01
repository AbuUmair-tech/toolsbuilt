/**
 * Percentage Calculator Core Logic
 * Pure, DOM-free mathematical functions for 4 core percentage calculations:
 * 1. What is X% of Y?
 * 2. X is what % of Y?
 * 3. Increase or decrease Y by X%
 * 4. Find the original value (Reverse Percentage)
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PercentageCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('percentage-calculator')
    : require('../../../scripts/i18n-client.js').scope('percentage-calculator');

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

    const decimalRate = cleanFloat(p / 100);
    const result = cleanFloat(decimalRate * y);
    const rounded = roundSensible(result, 4);

    return {
      percent: p,
      total: y,
      result: rounded,
      formula: `(${p} ÷ 100) × ${y}`,
      steps: [
        T('steps.percentToDecimal', { p, decimal: roundSensible(decimalRate, 6) }),
        T('steps.multiplyBase', { decimal: roundSensible(decimalRate, 6), y, result: rounded })
      ]
    };
  }

  /**
   * Mode 2: X is what % of Y?
   * Formula: (X / Y) * 100
   */
  function calculateWhatPercentIs(part, whole) {
    const x = parseFloat(part);
    const y = parseFloat(whole);

    if (isNaN(x) || isNaN(y)) {
      throw new Error(T('errors.partAndWhole'));
    }

    if (y === 0) {
      throw new Error(T('errors.divideByZeroWhole'));
    }

    const ratio = cleanFloat(x / y);
    const percent = cleanFloat(ratio * 100);
    const rounded = roundSensible(percent, 4);

    return {
      part: x,
      whole: y,
      result: rounded,
      formattedPercent: `${rounded}%`,
      formula: `(${x} ÷ ${y}) × 100`,
      steps: [
        T('steps.dividePartTotal', { x, y, ratio: roundSensible(ratio, 6) }),
        T('steps.multiply100', { ratio: roundSensible(ratio, 6), result: rounded })
      ]
    };
  }

  /**
   * Mode 3: Increase or Decrease Y by X%
   * Increase: Y * (1 + X/100)
   * Decrease: Y * (1 - X/100)
   */
  function calculateIncreaseDecrease(baseVal, percent, isDecrease = false) {
    const y = parseFloat(baseVal);
    const p = parseFloat(percent);

    if (isNaN(y) || isNaN(p)) {
      throw new Error(T('errors.baseAndPercent'));
    }

    const delta = cleanFloat((p / 100) * y);
    const result = isDecrease ? cleanFloat(y - delta) : cleanFloat(y + delta);
    const rounded = roundSensible(result, 4);
    const roundedDelta = roundSensible(delta, 4);
    const sign = isDecrease ? '-' : '+';
    const multiplier = isDecrease ? cleanFloat(1 - p / 100) : cleanFloat(1 + p / 100);

    return {
      base: y,
      percent: p,
      isDecrease,
      delta: roundedDelta,
      result: rounded,
      formula: isDecrease
        ? `${y} × (1 - ${p} ÷ 100) = ${rounded}`
        : `${y} × (1 + ${p} ÷ 100) = ${rounded}`,
      steps: [
        T('steps.changeAmount', { p, y, delta: roundedDelta }),
        T(isDecrease ? 'steps.subtractFromInitial' : 'steps.addToInitial', { y, sign, delta: roundedDelta, result: rounded })
      ]
    };
  }

  /**
   * Mode 4: Find the Original Value (Reverse Percentage)
   * Sub-types:
   *  - 'of': X is P% of Original -> Original = X / (P / 100)
   *  - 'increase': X is the result after P% increase -> Original = X / (1 + P / 100)
   *  - 'decrease': X is the result after P% decrease -> Original = X / (1 - P / 100)
   */
  function calculateOriginalValue(val, percent, type = 'of') {
    const x = parseFloat(val);
    const p = parseFloat(percent);

    if (isNaN(x) || isNaN(p)) {
      throw new Error(T('errors.valueAndPercent'));
    }

    if (type === 'of') {
      if (p === 0) throw new Error(T('errors.zeroPercentOriginal'));
      const rate = cleanFloat(p / 100);
      const original = cleanFloat(x / rate);
      const rounded = roundSensible(original, 4);
      return {
        value: x,
        percent: p,
        type,
        result: rounded,
        formula: `${x} ÷ (${p} ÷ 100)`,
        steps: [
          T('steps.percentToDecimal', { p, decimal: roundSensible(rate, 6) }),
          T('steps.divideByRate', { x, rate: roundSensible(rate, 6), result: rounded })
        ]
      };
    } else if (type === 'increase') {
      const divisor = cleanFloat(1 + p / 100);
      if (divisor === 0) throw new Error(T('errors.divisionByZero'));
      const original = cleanFloat(x / divisor);
      const rounded = roundSensible(original, 4);
      return {
        value: x,
        percent: p,
        type,
        result: rounded,
        formula: `${x} ÷ (1 + ${p} ÷ 100)`,
        steps: [
          T('steps.markupMultiplier', { p, divisor: roundSensible(divisor, 6) }),
          T('steps.divideIncreased', { x, divisor: roundSensible(divisor, 6), result: rounded })
        ]
      };
    } else if (type === 'decrease') {
      const divisor = cleanFloat(1 - p / 100);
      if (divisor === 0) throw new Error(T('errors.fullDiscount'));
      const original = cleanFloat(x / divisor);
      const rounded = roundSensible(original, 4);
      return {
        value: x,
        percent: p,
        type,
        result: rounded,
        formula: `${x} ÷ (1 - ${p} ÷ 100)`,
        steps: [
          T('steps.discountFactor', { p, divisor: roundSensible(divisor, 6) }),
          T('steps.divideDecreased', { x, divisor: roundSensible(divisor, 6), result: rounded })
        ]
      };
    }

    throw new Error(T('errors.unsupportedType', { type }));
  }

  return {
    roundSensible,
    calculatePercentOf,
    calculateWhatPercentIs,
    calculateIncreaseDecrease,
    calculateOriginalValue
  };
});
