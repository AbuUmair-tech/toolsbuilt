/**
 * CGPA to Percentage Calculator Core Logic
 * Pure, DOM-free conversions between CGPA and percentage in both directions.
 *
 * Formulas:
 * - simple: percentage = CGPA ÷ scale × 100 (proportion of the maximum CGPA)
 * - cbse:   percentage = CGPA × 9.5 (CBSE's published 10-point conversion; 10.0 scale only)
 * - custom: percentage = m × CGPA + c, using the multiplier and offset printed on the
 *           student's own transcript. No university or HEC preset is built in: there is no
 *           single official formula, and any future preset must cite an official source.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CgpaToPercentageLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCALES = [4, 5, 10];
  const CBSE_MULTIPLIER = 9.5;

  const FORMULAS = {
    simple: { label: 'Simple proportion', scales: SCALES },
    cbse: { label: 'CBSE (10-point)', scales: [10] },
    custom: { label: "My university's formula", scales: SCALES }
  };

  function toNumber(value, name) {
    const n = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw new Error(`Please enter a valid ${name}.`);
    }
    return n;
  }

  function checkOptions(options) {
    const opts = options || {};
    const scale = Number(opts.scale || 4);
    const formula = opts.formula || 'simple';
    if (!SCALES.includes(scale)) {
      throw new Error(`Choose a CGPA scale of ${SCALES.join(', ')}.`);
    }
    if (!FORMULAS[formula]) {
      throw new Error('Choose a conversion formula.');
    }
    if (!FORMULAS[formula].scales.includes(scale)) {
      throw new Error('The CBSE formula is only for the 10-point scale. Choose the 10.0 scale or another formula.');
    }
    let multiplier = null;
    let offset = null;
    if (formula === 'custom') {
      multiplier = toNumber(opts.multiplier, 'multiplier (m) from your transcript');
      offset = opts.offset === '' || opts.offset === undefined || opts.offset === null ? 0 : toNumber(opts.offset, 'offset (c)');
      if (multiplier === 0) {
        throw new Error('The multiplier (m) cannot be 0.');
      }
    }
    return { scale, formula, multiplier, offset };
  }

  function describe(o) {
    if (o.formula === 'cbse') return `Percentage = CGPA × ${CBSE_MULTIPLIER}`;
    if (o.formula === 'custom') return `Percentage = ${o.multiplier} × CGPA ${o.offset < 0 ? '−' : '+'} ${Math.abs(o.offset)}`;
    return `Percentage = CGPA ÷ ${o.scale} × 100`;
  }

  /**
   * CGPA -> percentage
   * options: { scale: 4|5|10, formula: 'simple'|'cbse'|'custom', multiplier, offset }
   */
  function cgpaToPercentage(cgpaValue, options) {
    const o = checkOptions(options);
    const cgpa = toNumber(cgpaValue, 'CGPA');
    if (cgpa < 0 || cgpa > o.scale) {
      throw new Error(`CGPA must be between 0 and ${o.scale} on a ${o.scale}.0 scale.`);
    }
    let percentage;
    if (o.formula === 'cbse') percentage = cgpa * CBSE_MULTIPLIER;
    else if (o.formula === 'custom') percentage = o.multiplier * cgpa + o.offset;
    else percentage = (cgpa / o.scale) * 100;

    if (percentage < 0 || percentage > 100) {
      throw new Error(`This formula gives ${percentage.toFixed(2)}%, which is outside 0–100%. Check the numbers from your transcript.`);
    }
    return { direction: 'cgpa-to-percentage', cgpa, percentage, ...o, formulaText: describe(o) };
  }

  /**
   * Percentage -> CGPA (the same formulas solved for CGPA)
   */
  function percentageToCgpa(percentageValue, options) {
    const o = checkOptions(options);
    const percentage = toNumber(percentageValue, 'percentage');
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100.');
    }
    let cgpa;
    if (o.formula === 'cbse') cgpa = percentage / CBSE_MULTIPLIER;
    else if (o.formula === 'custom') cgpa = (percentage - o.offset) / o.multiplier;
    else cgpa = (percentage / 100) * o.scale;

    if (cgpa < 0 || cgpa > o.scale) {
      throw new Error(`This formula gives a CGPA of ${cgpa.toFixed(2)}, which is outside 0–${o.scale}. Check the formula or the percentage.`);
    }
    return { direction: 'percentage-to-cgpa', cgpa, percentage, ...o, formulaText: describe(o) };
  }

  return {
    SCALES,
    FORMULAS,
    CBSE_MULTIPLIER,
    cgpaToPercentage,
    percentageToCgpa
  };
});
