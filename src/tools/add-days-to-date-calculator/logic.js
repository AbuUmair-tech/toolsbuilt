/**
 * Add or Subtract Days from Date Pure Logic Engine
 * Dual UMD / Node / Browser module. No DOM dependencies.
 * Uses strict UTC calendar and business day arithmetic to prevent DST shifts.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AddDaysLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function parseDateParts(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  function addMonthsClampedUtc(year, month, day, monthsToAdd) {
    const totalMonths = year * 12 + (month - 1) + monthsToAdd;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-indexed
    const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, maxDay);
    return { year: targetYear, month: targetMonth + 1, day: clampedDay };
  }

  function shiftBusinessDays(startUtcMs, daysCount, isAdd) {
    let cur = new Date(startUtcMs);
    let shifted = 0;
    while (shifted < daysCount) {
      const step = isAdd ? 1 : -1;
      cur = new Date(cur.getTime() + step * 86400000);
      const dayOfWeek = cur.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        shifted++;
      }
    }
    return cur;
  }

  /**
   * Adds or subtracts days, weeks, months, or years from a starting date.
   */
  function addSubtractDays(startDateStr, amount, unit = 'days', operation = 'add', options = {}) {
    const parts = parseDateParts(startDateStr);
    if (!parts) {
      throw new Error('Please enter a valid start date (YYYY-MM-DD).');
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error('Please enter a valid non-negative number.');
    }

    const isAdd = operation !== 'subtract';
    const businessOnly = Boolean(options.businessDaysOnly) && (unit === 'days' || unit === 'weeks');

    let resultUtc;

    if (businessOnly) {
      const daysCount = (unit === 'weeks') ? numAmount * 5 : numAmount;
      const startUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
      resultUtc = shiftBusinessDays(startUtc, daysCount, isAdd).getTime();
    } else {
      if (unit === 'days') {
        const delta = isAdd ? numAmount : -numAmount;
        resultUtc = Date.UTC(parts.year, parts.month - 1, parts.day + delta);
      } else if (unit === 'weeks') {
        const delta = isAdd ? numAmount * 7 : -numAmount * 7;
        resultUtc = Date.UTC(parts.year, parts.month - 1, parts.day + delta);
      } else if (unit === 'months') {
        const delta = isAdd ? numAmount : -numAmount;
        const clamped = addMonthsClampedUtc(parts.year, parts.month, parts.day, delta);
        resultUtc = Date.UTC(clamped.year, clamped.month - 1, clamped.day);
      } else if (unit === 'years') {
        const delta = isAdd ? numAmount : -numAmount;
        const clamped = addMonthsClampedUtc(parts.year, parts.month, parts.day, delta * 12);
        resultUtc = Date.UTC(clamped.year, clamped.month - 1, clamped.day);
      } else {
        throw new Error(`Unsupported calendar unit: "${unit}".`);
      }
    }

    const resDate = new Date(resultUtc);
    const rY = resDate.getUTCFullYear();
    const rM = resDate.getUTCMonth() + 1;
    const rD = resDate.getUTCDate();

    const targetDateStr = `${rY}-${String(rM).padStart(2, '0')}-${String(rD).padStart(2, '0')}`;
    const weekday = WEEKDAYS[resDate.getUTCDay()];
    const formattedDate = `${MONTH_NAMES[rM - 1]} ${rD}, ${rY}`;
    const quarter = Math.floor((rM - 1) / 3) + 1;

    // Day of year calculation
    const startOfYearUtc = Date.UTC(rY, 0, 1);
    const dayOfYear = Math.floor((resultUtc - startOfYearUtc) / 86400000) + 1;

    const startUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
    const elapsedCalendarDays = Math.round(Math.abs(resultUtc - startUtcMs) / 86400000);

    // Business days between start and result
    let bDays = 0;
    let wDays = 0;
    const minMs = Math.min(startUtcMs, resultUtc);
    const maxMs = Math.max(startUtcMs, resultUtc);
    for (let t = minMs + 86400000; t <= maxMs; t += 86400000) {
      const dow = new Date(t).getUTCDay();
      if (dow === 0 || dow === 6) wDays++; else bDays++;
    }

    return {
      resultDate: targetDateStr,
      targetDateStr,
      formattedDate,
      weekday,
      quarter,
      year: rY,
      isLeapYear: isLeapYear(rY),
      dayOfYear,
      amount: numAmount,
      unit,
      operation: isAdd ? 'add' : 'subtract',
      businessDaysOnly: businessOnly,
      elapsedCalendarDays,
      businessDays: bDays,
      weekendDays: wDays
    };
  }

  return {
    isLeapYear,
    parseDateParts,
    addSubtractDays,
    calculateAddDays: addSubtractDays,
    shiftBusinessDays
  };
});
