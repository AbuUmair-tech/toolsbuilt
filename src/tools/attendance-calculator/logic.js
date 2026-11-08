/**
 * Attendance Calculator Core Logic
 * Pure, DOM-free attendance maths. The target is held in hundredths of a percent
 * and every comparison is done in whole numbers, so 75% never becomes 74.999…%.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.AttendanceLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages come from the tool's translation data (named `msg`: T is the target below)
  const msg = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('attendance-calculator')
    : require('../../../scripts/i18n-client.js').scope('attendance-calculator');

  const PRESETS = [75, 80, 85];
  const PROJECTION_STEPS = 10;

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /** attended/total as a percentage, rounded to 2 decimals */
  function percentage(attended, total) {
    return total > 0 ? round2(attended / total * 100) : 0;
  }

  /**
   * @param {number|string} attended - classes attended so far
   * @param {number|string} total    - classes held so far
   * @param {number|string} target   - required attendance % (default 75)
   */
  function calculateAttendance(attended, total, target = 75) {
    if (isBlank(attended)) return { error: msg('errors.enterAttended'), field: 'attended' };
    if (isBlank(total)) return { error: msg('errors.enterTotal'), field: 'total' };
    const a = Number(attended);
    const t = Number(total);
    if (!Number.isInteger(a) || a < 0) return { error: msg('errors.attendedWhole'), field: 'attended' };
    if (!Number.isInteger(t) || t < 1) return { error: msg('errors.totalWhole'), field: 'total' };
    if (a > t) return { error: msg('errors.attendedOverTotal', { attended: a, total: t }), field: 'attended' };
    if (t > 100000) return { error: msg('errors.tooMany'), field: 'total' };

    const targetValue = isBlank(target) ? 75 : Number(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0 || targetValue > 100) {
      return { error: msg('errors.targetRange'), field: 'target' };
    }
    // Target in hundredths of a percent: 75 -> 7500, 82.5 -> 8250
    const T = Math.round(targetValue * 100);

    const current = percentage(a, t);
    const meetsTarget = a * 10000 >= T * t;
    const result = {
      attended: a,
      total: t,
      missed: t - a,
      target: T / 100,
      percentage: current,
      meetsTarget,
      classesNeeded: 0,
      canMiss: 0,
      reachable: true
    };

    if (!meetsTarget) {
      if (T === 10000) {
        // 100% can never be reached again once a class has been missed
        result.reachable = false;
        result.classesNeeded = null;
      } else {
        // Smallest n with (a + n) / (t + n) >= T: n >= (T·t − 10000·a) / (10000 − T)
        const needed = Math.ceil((T * t - 10000 * a) / (10000 - T));
        result.classesNeeded = needed;
        result.afterNeeded = { attended: a + needed, total: t + needed, percentage: percentage(a + needed, t + needed) };
      }
    } else {
      // Largest m with a / (t + m) >= T: m <= (10000·a − T·t) / T
      const canMiss = Math.floor((10000 * a - T * t) / T);
      result.canMiss = canMiss;
      result.afterMissing = { attended: a, total: t + canMiss, percentage: percentage(a, t + canMiss) };
    }

    result.projection = [];
    for (let k = 1; k <= PROJECTION_STEPS; k++) {
      const attend = percentage(a + k, t + k);
      const miss = percentage(a, t + k);
      result.projection.push({
        classes: k,
        ifAttend: attend,
        ifMiss: miss,
        attendMeets: (a + k) * 10000 >= T * (t + k),
        missMeets: a * 10000 >= T * (t + k)
      });
    }
    return result;
  }

  return { PRESETS, percentage, calculateAttendance };
});
