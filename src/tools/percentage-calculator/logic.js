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
      throw new Error('Please enter valid numeric values for percentage and total.');
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
        `Convert percentage to decimal: ${p} ÷ 100 = ${roundSensible(decimalRate, 6)}`,
        `Multiply by base value: ${roundSensible(decimalRate, 6)} × ${y} = ${rounded}`
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
      throw new Error('Please enter valid numeric values for part and whole.');
    }

    if (y === 0) {
      throw new Error('Division by zero is undefined. Whole (Y) cannot be 0.');
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
        `Divide part by total: ${x} ÷ ${y} = ${roundSensible(ratio, 6)}`,
        `Multiply by 100 to get percentage: ${roundSensible(ratio, 6)} × 100 = ${rounded}%`
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
      throw new Error('Please enter valid numbers for the base value and percentage.');
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
        `Calculate ${p}% change amount: (${p} ÷ 100) × ${y} = ${roundedDelta}`,
        `${isDecrease ? 'Subtract from' : 'Add to'} initial value: ${y} ${sign} ${roundedDelta} = ${rounded}`
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
      throw new Error('Please enter valid numbers for value and percentage.');
    }

    if (type === 'of') {
      if (p === 0) throw new Error('Percentage cannot be 0% when finding original value.');
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
          `Convert percentage to decimal: ${p} ÷ 100 = ${roundSensible(rate, 6)}`,
          `Divide known value by decimal rate: ${x} ÷ ${roundSensible(rate, 6)} = ${rounded}`
        ]
      };
    } else if (type === 'increase') {
      const divisor = cleanFloat(1 + p / 100);
      if (divisor === 0) throw new Error('Mathematical division by zero.');
      const original = cleanFloat(x / divisor);
      const rounded = roundSensible(original, 4);
      return {
        value: x,
        percent: p,
        type,
        result: rounded,
        formula: `${x} ÷ (1 + ${p} ÷ 100)`,
        steps: [
          `Find markup multiplier: 1 + (${p} ÷ 100) = ${roundSensible(divisor, 6)}`,
          `Divide increased value by multiplier: ${x} ÷ ${roundSensible(divisor, 6)} = ${rounded}`
        ]
      };
    } else if (type === 'decrease') {
      const divisor = cleanFloat(1 - p / 100);
      if (divisor === 0) throw new Error('Discount cannot be 100% when recovering original baseline.');
      const original = cleanFloat(x / divisor);
      const rounded = roundSensible(original, 4);
      return {
        value: x,
        percent: p,
        type,
        result: rounded,
        formula: `${x} ÷ (1 - ${p} ÷ 100)`,
        steps: [
          `Find discount factor: 1 - (${p} ÷ 100) = ${roundSensible(divisor, 6)}`,
          `Divide decreased value by discount factor: ${x} ÷ ${roundSensible(divisor, 6)} = ${rounded}`
        ]
      };
    }

    throw new Error(`Unsupported reverse percentage type: ${type}`);
  }

  return {
    roundSensible,
    calculatePercentOf,
    calculateWhatPercentIs,
    calculateIncreaseDecrease,
    calculateOriginalValue
  };
});
