/**
 * Days Until Date Calculator Pure Logic Engine
 * Dual UMD / Node / Browser module. No DOM dependencies.
 * Uses UTC midnight timestamps to eliminate timezone shifts and off-by-one errors.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DaysUntilLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  function calculateMonthsAndDays(startY, startM, startD, endY, endM, endD) {
    let months = (endY - startY) * 12 + (endM - startM);
    let temp = addMonthsClampedUtc(startY, startM, startD, months);
    let tempUtc = Date.UTC(temp.year, temp.month - 1, temp.day);
    const endUtc = Date.UTC(endY, endM - 1, endD);

    if (tempUtc > endUtc) {
      months--;
      temp = addMonthsClampedUtc(startY, startM, startD, months);
      tempUtc = Date.UTC(temp.year, temp.month - 1, temp.day);
    }

    const remainingDays = Math.round((endUtc - tempUtc) / (1000 * 60 * 60 * 24));
    return { months, days: remainingDays };
  }

  /**
   * Calculates days until target date relative to base date (defaults to today).
   * @param {string} targetDateStr - 'YYYY-MM-DD'
   * @param {string|null} baseDateStr - 'YYYY-MM-DD' (optional)
   */
  function calculateDaysUntil(targetDateStr, baseDateStr = null) {
    const targetParts = parseDateParts(targetDateStr);
    if (!targetParts) {
      throw new Error('Please enter a valid target date (YYYY-MM-DD).');
    }

    let baseParts;
    if (baseDateStr) {
      baseParts = parseDateParts(baseDateStr);
      if (!baseParts) {
        throw new Error('Please enter a valid base calculation date (YYYY-MM-DD).');
      }
    } else {
      const now = new Date();
      baseParts = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
      };
    }

    const baseUtc = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
    const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);

    const diffMs = targetUtc - baseUtc;
    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const absDays = Math.abs(totalDays);

    const targetDateObj = new Date(targetUtc);
    const weekday = WEEKDAYS[targetDateObj.getUTCDay()];
    const formattedDate = `${MONTH_NAMES[targetParts.month - 1]} ${targetParts.day}, ${targetParts.year}`;

    const weeks = Math.floor(absDays / 7);
    const remainingDaysAfterWeeks = absDays % 7;

    let monthsResult;
    if (totalDays >= 0) {
      monthsResult = calculateMonthsAndDays(
        baseParts.year, baseParts.month, baseParts.day,
        targetParts.year, targetParts.month, targetParts.day
      );
    } else {
      monthsResult = calculateMonthsAndDays(
        targetParts.year, targetParts.month, targetParts.day,
        baseParts.year, baseParts.month, baseParts.day
      );
    }

    return {
      totalDays,
      absDays,
      isToday: totalDays === 0,
      isFuture: totalDays > 0,
      isPast: totalDays < 0,
      weeks,
      daysAfterWeeks: remainingDaysAfterWeeks,
      remainingDaysAfterWeeks,
      months: monthsResult.months,
      daysAfterMonths: monthsResult.days,
      remainingDaysAfterMonths: monthsResult.days,
      weekday,
      weekdayName: weekday,
      formattedDate,
      targetParts,
      baseParts
    };
  }

  return {
    parseDateParts,
    calculateDaysUntil
  };
});
