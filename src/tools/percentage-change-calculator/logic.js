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
      throw new Error('Please enter valid numbers for percentage and total.');
    }

    const result = cleanFloat((p / 100) * y);
    const formula = `(${p} ÷ 100) × ${y}`;
    const steps = [
      `Convert percentage to decimal: ${p} ÷ 100 = ${roundSensible(p / 100, 6)}`,
      `Multiply decimal by ${y}: ${roundSensible(p / 100, 6)} × ${y} = ${roundSensible(result, 4)}`
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
      throw new Error('Please enter valid numbers for part and whole.');
    }

    if (y === 0) {
      throw new Error('Cannot divide by zero. Whole (Y) cannot be 0.');
    }

    const ratio = x / y;
    const result = cleanFloat(ratio * 100);
    const rounded = roundSensible(result, 4);
    const formula = `(${x} ÷ ${y}) × 100`;
    const steps = [
      `Divide part by whole: ${x} ÷ ${y} = ${roundSensible(ratio, 6)}`,
      `Convert ratio to percentage: ${roundSensible(ratio, 6)} × 100 = ${rounded}%`
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
      throw new Error('Please enter valid initial and final numbers.');
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
          steps: ['Both starting and ending values are 0: 0% change.']
        };
      }
      throw new Error('Percentage change from 0 is mathematically undefined because division by zero is undefined.');
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
      `Calculate difference (New - Old): ${b} - ${a} = ${roundSensible(diff, 6)}`,
      `Divide by absolute old value: ${roundSensible(diff, 6)} ÷ ${absA} = ${roundSensible(ratio, 6)}`,
      `Multiply by 100: ${roundSensible(ratio, 6)} × 100 = ${roundedChange}%`
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
      throw new Error('Please enter valid numbers for both values.');
    }

    const sum = cleanFloat(a + b);
    if (sum === 0) {
      throw new Error('Sum of both values is zero; percentage difference is undefined.');
    }

    const absDiff = Math.abs(cleanFloat(a - b));
    const average = cleanFloat(sum / 2);
    const ratio = absDiff / average;
    const diffPercent = cleanFloat(ratio * 100);
    const roundedDiff = roundSensible(diffPercent, 4);

    const formula = `(|${a} - ${b}| ÷ ((${a} + ${b}) ÷ 2)) × 100`;
    const steps = [
      `Calculate absolute difference: |${a} - ${b}| = ${roundSensible(absDiff, 6)}`,
      `Calculate average: (${a} + ${b}) ÷ 2 = ${roundSensible(average, 6)}`,
      `Divide difference by average: ${roundSensible(absDiff, 6)} ÷ ${roundSensible(average, 6)} = ${roundSensible(ratio, 6)}`,
      `Multiply by 100: ${roundSensible(ratio, 6)} × 100 = ${roundedDiff}%`
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
