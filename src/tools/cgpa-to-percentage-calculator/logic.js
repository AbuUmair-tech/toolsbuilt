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

  // Labels, formulas and messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('cgpa-to-percentage-calculator')
    : require('../../../scripts/i18n-client.js').scope('cgpa-to-percentage-calculator');

  const SCALES = [4, 5, 10];
  const CBSE_MULTIPLIER = 9.5;

  const FORMULAS = {
    simple: { label: T('formulas.simple'), scales: SCALES },
    cbse: { label: T('formulas.cbse'), scales: [10] },
    custom: { label: T('formulas.custom'), scales: SCALES }
  };

  // Errors about the custom formula carry `field` ('multiplier' or 'offset') for the page
  function fail(message, field) {
    const err = new Error(message);
    if (field) err.field = field;
    return err;
  }

  function toNumber(value, message, field) {
    const n = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw fail(message, field);
    }
    return n;
  }

  function checkOptions(options) {
    const opts = options || {};
    const scale = Number(opts.scale || 4);
    const formula = opts.formula || 'simple';
    if (!SCALES.includes(scale)) {
      throw new Error(T('errors.scale', { scales: SCALES.join(', ') }));
    }
    if (!FORMULAS[formula]) {
      throw new Error(T('errors.formula'));
    }
    if (!FORMULAS[formula].scales.includes(scale)) {
      throw new Error(T('errors.cbseScale'));
    }
    let multiplier = null;
    let offset = null;
    if (formula === 'custom') {
      multiplier = toNumber(opts.multiplier, T('errors.multiplier'), 'multiplier');
      offset = opts.offset === '' || opts.offset === undefined || opts.offset === null ? 0 : toNumber(opts.offset, T('errors.offset'), 'offset');
      if (multiplier === 0) {
        throw fail(T('errors.multiplierZero'), 'multiplier');
      }
    }
    return { scale, formula, multiplier, offset };
  }

  function describe(o) {
    if (o.formula === 'cbse') return T('formulaText.cbse', { multiplier: CBSE_MULTIPLIER });
    if (o.formula === 'custom') return T('formulaText.custom', { m: o.multiplier, sign: o.offset < 0 ? '−' : '+', c: Math.abs(o.offset) });
    return T('formulaText.simple', { scale: o.scale });
  }

  /**
   * CGPA -> percentage
   * options: { scale: 4|5|10, formula: 'simple'|'cbse'|'custom', multiplier, offset }
   */
  function cgpaToPercentage(cgpaValue, options) {
    const o = checkOptions(options);
    const cgpa = toNumber(cgpaValue, T('errors.cgpa'));
    if (cgpa < 0 || cgpa > o.scale) {
      throw new Error(T('errors.cgpaRange', { scale: o.scale }));
    }
    let percentage;
    if (o.formula === 'cbse') percentage = cgpa * CBSE_MULTIPLIER;
    else if (o.formula === 'custom') percentage = o.multiplier * cgpa + o.offset;
    else percentage = (cgpa / o.scale) * 100;

    if (percentage < 0 || percentage > 100) {
      throw new Error(T('errors.percentageOutside', { percentage: percentage.toFixed(2) }));
    }
    return { direction: 'cgpa-to-percentage', cgpa, percentage, ...o, formulaText: describe(o) };
  }

  /**
   * Percentage -> CGPA (the same formulas solved for CGPA)
   */
  function percentageToCgpa(percentageValue, options) {
    const o = checkOptions(options);
    const percentage = toNumber(percentageValue, T('errors.percentage'));
    if (percentage < 0 || percentage > 100) {
      throw new Error(T('errors.percentageRange'));
    }
    let cgpa;
    if (o.formula === 'cbse') cgpa = percentage / CBSE_MULTIPLIER;
    else if (o.formula === 'custom') cgpa = (percentage - o.offset) / o.multiplier;
    else cgpa = (percentage / 100) * o.scale;

    if (cgpa < 0 || cgpa > o.scale) {
      throw new Error(T('errors.cgpaOutside', { cgpa: cgpa.toFixed(2), scale: o.scale }));
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
