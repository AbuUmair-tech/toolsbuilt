/**
 * Date Difference Calculator Core Logic
 * Pure, DOM-free functions for measuring spans between two dates.
 * Uses UTC calculations to avoid DST anomalies.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DateDifferenceLogic = factory();
    root.DateDifferenceCalculatorLogic = root.DateDifferenceLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function parseDateParts(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (month < 1 || month > 12) return null;
    const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > maxDays) return null;

    return { year, month, day };
  }

  function addMonthsClampedUtc(year, month, day, monthsToAdd) {
    const totalMonths = year * 12 + (month - 1) + monthsToAdd;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
    const maxDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const targetDay = Math.min(day, maxDay);
    return { year: targetYear, month: targetMonth, day: targetDay };
  }

  function calculateYMD(d1, d2, includeEnd) {
    let targetD2 = d2;
    if (includeEnd) {
      targetD2 = new Date(d2.getTime() + 86400000);
    }

    const y1 = d1.getUTCFullYear(), m1 = d1.getUTCMonth() + 1, day1 = d1.getUTCDate();
    const y2 = targetD2.getUTCFullYear(), m2 = targetD2.getUTCMonth() + 1, day2 = targetD2.getUTCDate();

    let years = y2 - y1;
    let months = m2 - m1;
    let days = day2 - day1;

    // When the remaining days are negative, borrow one month.
    // The "borrow" month is the month immediately before targetD2 in the result's anchor position.
    // After advancing d1 by (years, months) clamped, we measure remaining days.
    // Use addMonthsClampedUtc: advance d1 by (years * 12 + months) to get an anchor date,
    // then remaining days = targetD2 - anchor.
    if (days < 0) {
      months--;
      // The anchor is d1 advanced by (years * 12 + months) months.
      const totalM = years * 12 + months;
      const anchor = addMonthsClampedUtc(y1, m1, day1, totalM);
      const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
      const endUtc = Date.UTC(y2, m2 - 1, day2);
      days = Math.round((endUtc - anchorUtc) / 86400000);
    }

    if (months < 0) {
      years--;
      months += 12;
      // Recompute days with the corrected year/month anchor
      const totalM = years * 12 + months;
      const anchor = addMonthsClampedUtc(y1, m1, day1, totalM);
      const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
      const endUtc = Date.UTC(y2, m2 - 1, day2);
      days = Math.round((endUtc - anchorUtc) / 86400000);
    }

    return { years, months, days };
  }

  function calculateMonthsAndDays(d1, d2, includeEnd) {
    let targetD2 = d2;
    if (includeEnd) {
      targetD2 = new Date(d2.getTime() + 86400000);
    }

    const y1 = d1.getUTCFullYear();
    const m1 = d1.getUTCMonth() + 1;
    const day1 = d1.getUTCDate();

    const y2 = targetD2.getUTCFullYear();
    const m2 = targetD2.getUTCMonth() + 1;
    const day2 = targetD2.getUTCDate();

    let months = (y2 - y1) * 12 + (m2 - m1);
    let temp = addMonthsClampedUtc(y1, m1, day1, months);
    let tempUtc = Date.UTC(temp.year, temp.month - 1, temp.day);
    const endUtc = Date.UTC(y2, m2 - 1, day2);

    if (tempUtc > endUtc) {
      months--;
      temp = addMonthsClampedUtc(y1, m1, day1, months);
      tempUtc = Date.UTC(temp.year, temp.month - 1, temp.day);
    }

    const remainingDays = Math.round((endUtc - tempUtc) / 86400000);
    return { months, days: remainingDays };
  }

  /**
   * Calculates business working days (Mon-Fri) and weekend days (Sat-Sun)
   */
  function calculateBusinessDays(d1, d2, includeEnd) {
    let count = 0;
    let weekendCount = 0;
    const cur = new Date(d1.getTime());
    const limit = includeEnd ? d2.getTime() : d2.getTime() - 86400000;

    while (cur.getTime() <= limit) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) {
        count++;
      } else {
        weekendCount++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return { businessDays: count, weekendDays: weekendCount };
  }

  /**
   * Calculates complete date difference between two dates.
   * @param {string} startDateStr - 'YYYY-MM-DD'
   * @param {string} endDateStr - 'YYYY-MM-DD'
   * @param {Object} options - { includeEndDate: boolean }
   */
  function calculateDateDifference(startDateStr, endDateStr, options = {}) {
    const includeEnd = Boolean(options.includeEndDate);

    const sParts = parseDateParts(startDateStr);
    if (!sParts) {
      return { error: 'Please select a valid start date (YYYY-MM-DD).' };
    }

    const eParts = parseDateParts(endDateStr);
    if (!eParts) {
      return { error: 'Please select a valid end date (YYYY-MM-DD).' };
    }

    let d1 = new Date(Date.UTC(sParts.year, sParts.month - 1, sParts.day));
    let d2 = new Date(Date.UTC(eParts.year, eParts.month - 1, eParts.day));

    let isReversed = false;
    if (d1.getTime() > d2.getTime()) {
      isReversed = true;
      const temp = d1;
      d1 = d2;
      d2 = temp;
    }

    const diffMs = d2.getTime() - d1.getTime();
    let totalDays = Math.round(diffMs / 86400000);

    if (includeEnd) {
      totalDays += 1;
    }

    const { businessDays, weekendDays } = calculateBusinessDays(d1, d2, includeEnd);
    const ymd = calculateYMD(d1, d2, includeEnd);
    const md = calculateMonthsAndDays(d1, d2, includeEnd);

    const totalWeeks = Math.floor(totalDays / 7);
    const remainingDaysAfterWeeks = totalDays % 7;
    const totalHours = totalDays * 24;

    const formattedStart = `${MONTH_NAMES[d1.getUTCMonth()]} ${d1.getUTCDate()}, ${d1.getUTCFullYear()}`;
    const formattedEnd = `${MONTH_NAMES[d2.getUTCMonth()]} ${d2.getUTCDate()}, ${d2.getUTCFullYear()}`;
    const startWeekday = WEEKDAYS[d1.getUTCDay()];
    const endWeekday = WEEKDAYS[d2.getUTCDay()];

    return {
      totalDays,
      businessDays,
      weekendDays,
      years: ymd.years,
      months: ymd.months,
      days: ymd.days,
      monthsOnly: md.months,
      remainingDaysAfterMonths: md.days,
      totalWeeks,
      remainingDaysAfterWeeks,
      totalHours,
      formattedStart,
      formattedEnd,
      startWeekday,
      endWeekday,
      isReversed,
      includeEndDate: includeEnd
    };
  }

  return {
    parseDateParts,
    calculateDateDifference,
    calculateBusinessDays
  };
});
