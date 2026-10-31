/**
 * Marks Percentage Calculator Core Logic
 * Pure, DOM-free functions for exam marks percentages, totals and grades.
 *
 * GRADING holds the typical Pakistani board (BISE) grade bands used as a reference.
 * Boards can differ; a student's own result card is the final authority. To change the
 * bands, edit GRADING only (highest band first, each with its minimum percentage).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MarksPercentageLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GRADING = {
    label: 'Typical BISE grading',
    note: "Typical BISE grading; your board's result card is the final authority.",
    bands: [
      { grade: 'A+', min: 80, max: null },
      { grade: 'A', min: 70, max: 79 },
      { grade: 'B', min: 60, max: 69 },
      { grade: 'C', min: 50, max: 59 },
      { grade: 'D', min: 40, max: 49 },
      { grade: 'E', min: 33, max: 39 },
      { grade: 'F', min: 0, max: 32, label: 'Below 33%' }
    ]
  };

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function toNumber(value, name) {
    const n = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw new Error(`Please enter ${name}.`);
    }
    return n;
  }

  /** Grade band for a percentage (uses the exact percentage, not the rounded one) */
  function gradeFor(percentage) {
    const band = GRADING.bands.find(b => percentage >= b.min) || GRADING.bands[GRADING.bands.length - 1];
    return { grade: band.grade, index: GRADING.bands.indexOf(band), band };
  }

  function checkMarks(obtained, total, label) {
    const prefix = label ? `${label}: ` : '';
    if (total <= 0) throw new Error(`${prefix}Total marks must be more than 0.`);
    if (obtained < 0) throw new Error(`${prefix}Obtained marks cannot be negative.`);
    if (obtained > total) throw new Error(`${prefix}Obtained marks (${obtained}) cannot be more than total marks (${total}).`);
  }

  /** Mode 1: obtained / total -> percentage (exact and rounded to 2 decimals) and grade */
  function calculatePercentage(obtainedValue, totalValue) {
    const obtained = toNumber(obtainedValue, 'your obtained marks');
    const total = toNumber(totalValue, 'the total marks');
    checkMarks(obtained, total);
    const exact = (obtained / total) * 100;
    return { obtained, total, exact, percentage: round2(exact), ...gradeFor(exact) };
  }

  /**
   * Mode 2: subject rows [{ name, obtained, total }] -> per-subject percentages, grand total,
   * overall percentage (grand obtained ÷ grand total) and grade. Rows left completely empty are skipped.
   */
  function calculateSubjects(rows) {
    if (!Array.isArray(rows)) throw new Error('Please add at least one subject.');
    const subjects = [];
    rows.forEach((row, i) => {
      const empty = v => v === '' || v === null || v === undefined;
      if (empty(row.obtained) && empty(row.total)) return;
      const label = (row.name && String(row.name).trim()) || `Subject ${i + 1}`;
      const obtained = toNumber(row.obtained, `the obtained marks for ${label}`);
      const total = toNumber(row.total, `the total marks for ${label}`);
      checkMarks(obtained, total, label);
      const exact = (obtained / total) * 100;
      subjects.push({ row: i, name: label, obtained, total, percentage: round2(exact), ...gradeFor(exact) });
    });
    if (!subjects.length) throw new Error('Please enter marks for at least one subject.');

    const obtained = subjects.reduce((sum, s) => sum + s.obtained, 0);
    const total = subjects.reduce((sum, s) => sum + s.total, 0);
    const exact = (obtained / total) * 100;
    return { subjects, obtained, total, exact, percentage: round2(exact), ...gradeFor(exact) };
  }

  return {
    GRADING,
    gradeFor,
    calculatePercentage,
    calculateSubjects,
    round2
  };
});
