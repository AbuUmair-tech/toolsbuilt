/**
 * Age Calculator Pure Logic Engine
 * Dual UMD / Node / Browser module. No DOM dependencies.
 * Uses strict UTC midnight calculations to prevent daylight saving time artifacts.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AgeCalculatorLogic = factory();
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

  /**
   * Advance (year, month [1-12], day) by monthsToAdd months, clamping day to month end.
   */
  function addMonthsClamped(year, month, day, monthsToAdd) {
    const totalMonths = year * 12 + (month - 1) + monthsToAdd;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
    const maxDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    return { year: targetYear, month: targetMonth, day: Math.min(day, maxDay) };
  }

  /**
   * Calculates exact age in years, months, days, total hours, and next birthday countdown.
   * @param {string} dobStr - 'YYYY-MM-DD'
   * @param {string} targetDateStr - 'YYYY-MM-DD'
   * @param {Object} options - { leapConvention: 'mar1' | 'feb28' }
   */
  function calculateAge(dobStr, targetDateStr, options) {
    const opts = Object.assign({ leapConvention: 'mar1' }, options);
    const leapConvention = opts.leapConvention === 'feb28' ? 'feb28' : 'mar1';

    const dobParts = parseDateParts(dobStr);
    if (!dobParts) {
      throw new Error('Please enter a valid date of birth (YYYY-MM-DD).');
    }

    const targetParts = parseDateParts(targetDateStr);
    if (!targetParts) {
      throw new Error('Please enter a valid calculation date (YYYY-MM-DD).');
    }

    const dobUtc = Date.UTC(dobParts.year, dobParts.month - 1, dobParts.day);
    const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);

    if (dobUtc > targetUtc) {
      throw new Error('Date of birth cannot be in the future relative to the calculation date.');
    }

    // Determine effective birth month and day in target year if born Feb 29
    let effectiveBdayMonth = dobParts.month;
    let effectiveBdayDay = dobParts.day;
    if (dobParts.month === 2 && dobParts.day === 29 && !isLeapYear(targetParts.year)) {
      if (leapConvention === 'mar1') {
        effectiveBdayMonth = 3;
        effectiveBdayDay = 1;
      } else {
        effectiveBdayMonth = 2;
        effectiveBdayDay = 28;
      }
    }

    let years = targetParts.year - dobParts.year;
    let months = targetParts.month - effectiveBdayMonth;
    let days = targetParts.day - effectiveBdayDay;

    if (days < 0) {
      months--;
      // Advance DOB by the (now decremented) month total and measure remaining days.
      const totalM = years * 12 + months;
      const anchor = addMonthsClamped(dobParts.year, effectiveBdayMonth, effectiveBdayDay, totalM);
      const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
      days = Math.round((targetUtc - anchorUtc) / 86400000);
    }

    if (months < 0) {
      years--;
      months += 12;
      // Recompute days with the corrected anchor
      const totalM = years * 12 + months;
      const anchor = addMonthsClamped(dobParts.year, effectiveBdayMonth, effectiveBdayDay, totalM);
      const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
      days = Math.round((targetUtc - anchorUtc) / 86400000);
    }

    // Total metrics using UTC millisecond difference
    const diffMs = targetUtc - dobUtc;
    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = (years * 12) + months;
    const totalHours = totalDays * 24;

    // Next Birthday calculation
    let nextBdayYear = targetParts.year;

    function getNextBirthdaySpec(year) {
      if (dobParts.month === 2 && dobParts.day === 29 && !isLeapYear(year)) {
        return leapConvention === 'mar1' ? { m: 3, d: 1 } : { m: 2, d: 28 };
      }
      return { m: dobParts.month, d: dobParts.day };
    }

    let effective = getNextBirthdaySpec(nextBdayYear);
    let nextBdayUtc = Date.UTC(nextBdayYear, effective.m - 1, effective.d);

    if (nextBdayUtc < targetUtc) {
      nextBdayYear++;
      effective = getNextBirthdaySpec(nextBdayYear);
      nextBdayUtc = Date.UTC(nextBdayYear, effective.m - 1, effective.d);
    }

    const daysUntilNextBday = Math.round((nextBdayUtc - targetUtc) / (1000 * 60 * 60 * 24));
    const nextBdayDateObj = new Date(nextBdayUtc);
    const weekday = WEEKDAYS[nextBdayDateObj.getUTCDay()];
    const formattedDate = `${MONTH_NAMES[effective.m - 1]} ${effective.d}, ${nextBdayYear}`;

    return {
      years,
      months,
      days,
      totalMonths,
      totalWeeks,
      totalDays,
      totalHours,
      leapConvention,
      nextBirthday: {
        isToday: daysUntilNextBday === 0,
        daysUntil: daysUntilNextBday,
        weekday,
        formattedDate,
        year: nextBdayYear
      }
    };
  }

  return {
    isLeapYear,
    parseDateParts,
    calculateAge
  };
});
