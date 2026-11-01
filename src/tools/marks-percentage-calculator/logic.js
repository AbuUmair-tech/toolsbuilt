/**
 * Marks Percentage Calculator Core Logic
 * Pure, DOM-free functions for exam marks percentages, totals and grades.
 *
 * GRADING holds the typical Pakistani board (BISE) grade bands, the default scale.
 * Other presets live in src/_data/grading-scales.json and are passed in as `scale`:
 *   { type: 'bands', bands: [{ grade, min }] }      grade = first band whose min the percentage reaches
 *   { type: 'pass', passMark, passLabel, failLabel } pass/fail only (e.g. CBSE, which grades by rank)
 * A student's own result card is the final authority.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MarksPercentageLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages and labels come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('marks-percentage-calculator')
    : require('../../../scripts/i18n-client.js').scope('marks-percentage-calculator');

  const GRADING = {
    label: T('grading.label'),
    note: T('grading.note'),
    bands: [
      { grade: 'A+', min: 80, max: null },
      { grade: 'A', min: 70, max: 79 },
      { grade: 'B', min: 60, max: 69 },
      { grade: 'C', min: 50, max: 59 },
      { grade: 'D', min: 40, max: 49 },
      { grade: 'E', min: 33, max: 39 },
      { grade: 'F', min: 0, max: 32, label: T('grading.lowestBandLabel') }
    ]
  };

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  // Errors carry `field` ('obtained' or 'total') and `row` (subject index) so the page can
  // mark the right input without reading the message
  function fail(message, field, row) {
    const err = new Error(message);
    if (field) err.field = field;
    if (row !== undefined) err.row = row;
    return err;
  }

  function toNumber(value, message, field, row) {
    const n = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw fail(message, field, row);
    }
    return n;
  }

  /**
   * Checks a visitor's own scale: grade names filled in, minimums from 0 to 100, no repeats.
   * Returns a copy with the bands sorted from the highest minimum down.
   */
  function customScale(bands) {
    const rows = (bands || []).filter(b => b && (String(b.grade || '').trim() || String(b.min === undefined ? '' : b.min).trim()));
    if (!rows.length) throw new Error(T('errors.customEmpty'));
    const out = rows.map((b, i) => {
      const grade = String(b.grade || '').trim();
      if (!grade) throw new Error(T('errors.customGradeName', { row: i + 1 }));
      const min = toNumber(b.min, T('errors.customMinMissing', { grade }));
      if (min < 0 || min > 100) throw new Error(T('errors.customMinRange', { grade }));
      return { grade, min };
    }).sort((a, b) => b.min - a.min);
    out.forEach((b, i) => {
      if (i && b.min === out[i - 1].min) throw new Error(T('errors.customDuplicate', { a: out[i - 1].grade, b: b.grade }));
    });
    return { type: 'bands', bands: out };
  }

  /** Grade for a percentage on a scale (uses the exact percentage, not the rounded one) */
  function gradeFor(percentage, scale) {
    const s = scale || GRADING;
    if (s.type === 'pass') {
      const passed = percentage >= s.passMark;
      return { grade: passed ? (s.passLabel || T('grade.pass')) : (s.failLabel || T('grade.belowPass')), index: passed ? 0 : 1, band: null, passed };
    }
    const band = s.bands.find(b => percentage >= b.min);
    if (!band) return { grade: T('grade.belowLowest'), index: null, band: null };
    return { grade: band.grade, index: s.bands.indexOf(band), band };
  }

  function checkMarks(obtained, total, label, row) {
    const msg = (key, vars) => (label ? T('errors.forSubject', { label, message: T(key, vars) }) : T(key, vars));
    if (total <= 0) throw fail(msg('errors.totalPositive'), 'total', row);
    if (obtained < 0) throw fail(msg('errors.obtainedNegative'), 'obtained', row);
    if (obtained > total) throw fail(msg('errors.obtainedOverTotal', { obtained, total }), 'obtained', row);
  }

  /** Mode 1: obtained / total -> percentage (exact and rounded to 2 decimals) and grade */
  function calculatePercentage(obtainedValue, totalValue, scale) {
    const obtained = toNumber(obtainedValue, T('errors.enterObtained'), 'obtained');
    const total = toNumber(totalValue, T('errors.enterTotal'), 'total');
    checkMarks(obtained, total);
    const exact = (obtained / total) * 100;
    return { obtained, total, exact, percentage: round2(exact), ...gradeFor(exact, scale) };
  }

  /**
   * Mode 2: subject rows [{ name, obtained, total }] -> per-subject percentages, grand total,
   * overall percentage (grand obtained ÷ grand total) and grade. Rows left completely empty are skipped.
   */
  function calculateSubjects(rows, scale) {
    if (!Array.isArray(rows)) throw new Error(T('errors.addSubject'));
    const subjects = [];
    rows.forEach((row, i) => {
      const empty = v => v === '' || v === null || v === undefined;
      if (empty(row.obtained) && empty(row.total)) return;
      const label = (row.name && String(row.name).trim()) || T('subjects.defaultName', { n: i + 1 });
      const obtained = toNumber(row.obtained, T('errors.enterSubjectObtained', { label }), 'obtained', i);
      const total = toNumber(row.total, T('errors.enterSubjectTotal', { label }), 'total', i);
      checkMarks(obtained, total, label, i);
      const exact = (obtained / total) * 100;
      subjects.push({ row: i, name: label, obtained, total, percentage: round2(exact), ...gradeFor(exact, scale) });
    });
    if (!subjects.length) throw new Error(T('errors.noSubjectMarks'));

    const obtained = subjects.reduce((sum, s) => sum + s.obtained, 0);
    const total = subjects.reduce((sum, s) => sum + s.total, 0);
    const exact = (obtained / total) * 100;
    return { subjects, obtained, total, exact, percentage: round2(exact), ...gradeFor(exact, scale) };
  }

  return {
    GRADING,
    gradeFor,
    customScale,
    calculatePercentage,
    calculateSubjects,
    round2
  };
});
