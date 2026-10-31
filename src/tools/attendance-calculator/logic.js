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
    if (isBlank(attended)) return { error: 'Enter the number of classes you attended.', field: 'attended' };
    if (isBlank(total)) return { error: 'Enter the total number of classes held.', field: 'total' };
    const a = Number(attended);
    const t = Number(total);
    if (!Number.isInteger(a) || a < 0) return { error: 'Classes attended must be a whole number of 0 or more.', field: 'attended' };
    if (!Number.isInteger(t) || t < 1) return { error: 'Total classes held must be a whole number of 1 or more.', field: 'total' };
    if (a > t) return { error: `You cannot attend more classes (${a}) than were held (${t}).`, field: 'attended' };
    if (t > 100000) return { error: 'Enter 100,000 classes or fewer.', field: 'total' };

    const targetValue = isBlank(target) ? 75 : Number(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0 || targetValue > 100) {
      return { error: 'The target must be more than 0% and at most 100%.', field: 'target' };
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
