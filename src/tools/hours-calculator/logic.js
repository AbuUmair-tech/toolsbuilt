/**
 * Hours Calculator Core Logic
 * Pure, DOM-free functions for time durations, unpaid breaks, weekly timesheets,
 * pay and overtime. All arithmetic is done in whole minutes to avoid rounding drift.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HoursCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const MINUTES_PER_DAY = 1440;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /**
   * Parses a clock time into minutes after midnight.
   * Accepts "17:30", "9:05", "09:00:00" and 12-hour forms such as "5:30 pm" or "12am".
   * @returns {number|null}
   */
  function parseTime(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim().toLowerCase();
    if (!str) return null;
    const match = str.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const suffix = match[4] ? match[4].charAt(0) : '';
    if (minutes > 59) return null;
    if (suffix) {
      if (hours < 1 || hours > 12) return null;
      if (hours === 12) hours = 0;
      if (suffix === 'p') hours += 12;
    } else {
      if (!match[2]) return null; // a bare "9" is ambiguous without am/pm
      if (hours > 23) return null;
    }
    return hours * 60 + minutes;
  }

  /** 525 -> "8:45"; negative values keep their sign. */
  function formatHoursMinutes(totalMinutes) {
    const sign = totalMinutes < 0 ? '-' : '';
    const abs = Math.abs(Math.round(totalMinutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}:${String(m).padStart(2, '0')}`;
  }

  /** 525 -> 8.75 (rounded to 2 decimal places) */
  function minutesToDecimal(totalMinutes) {
    return Math.round((totalMinutes / 60) * 100) / 100;
  }

  /** 8.75 -> 525 */
  function decimalToMinutes(hours) {
    return Math.round(Number(hours) * 60);
  }

  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Duration between two clock times on the same shift, less an unpaid break.
   * An end time earlier than the start time is treated as the next day (overnight shift).
   * @param {string} start - "HH:MM"
   * @param {string} end - "HH:MM"
   * @param {number|string} breakMinutes - unpaid break in minutes (default 0)
   */
  function calculateDuration(start, end, breakMinutes) {
    const startMin = parseTime(start);
    if (startMin === null) return { error: 'Enter a valid start time, for example 09:00.' };
    const endMin = parseTime(end);
    if (endMin === null) return { error: 'Enter a valid end time, for example 17:30.' };

    const rawBreak = breakMinutes === '' || breakMinutes === undefined || breakMinutes === null ? 0 : Number(breakMinutes);
    if (!Number.isFinite(rawBreak) || rawBreak < 0) {
      return { error: 'The break must be zero or a positive number of minutes.' };
    }
    const breakMin = Math.round(rawBreak);

    const crossesMidnight = endMin < startMin;
    const spanMinutes = crossesMidnight ? endMin + MINUTES_PER_DAY - startMin : endMin - startMin;

    if (breakMin > spanMinutes) {
      return { error: `The break (${breakMin} min) is longer than the time between start and end (${formatHoursMinutes(spanMinutes)}).` };
    }

    const workedMinutes = spanMinutes - breakMin;
    return {
      startMinutes: startMin,
      endMinutes: endMin,
      crossesMidnight,
      sameTime: spanMinutes === 0,
      spanMinutes,
      breakMinutes: breakMin,
      workedMinutes,
      hhmm: formatHoursMinutes(workedMinutes),
      decimalHours: minutesToDecimal(workedMinutes)
    };
  }

  /**
   * Splits total worked minutes into regular and overtime pay.
   * @param {number} totalMinutes
   * @param {Object} options - { rate, overtimeAfterHours = 40, overtimeMultiplier = 1.5, overtime = true }
   */
  function calculatePay(totalMinutes, options = {}) {
    const rate = Number(options.rate);
    const hasRate = options.rate !== '' && options.rate !== undefined && options.rate !== null && Number.isFinite(rate) && rate >= 0;
    const useOvertime = options.overtime !== false;
    const thresholdHours = options.overtimeAfterHours === undefined || options.overtimeAfterHours === '' ? 40 : Number(options.overtimeAfterHours);
    const multiplier = options.overtimeMultiplier === undefined || options.overtimeMultiplier === '' ? 1.5 : Number(options.overtimeMultiplier);

    if (useOvertime && (!Number.isFinite(thresholdHours) || thresholdHours < 0)) {
      return { error: 'Overtime must start after zero or more hours.' };
    }
    if (useOvertime && (!Number.isFinite(multiplier) || multiplier < 1)) {
      return { error: 'The overtime multiplier must be 1 or more (for example 1.5).' };
    }

    const thresholdMinutes = useOvertime ? Math.round(thresholdHours * 60) : Infinity;
    const regularMinutes = Math.min(totalMinutes, thresholdMinutes);
    const overtimeMinutes = Math.max(0, totalMinutes - regularMinutes);

    const result = {
      totalMinutes,
      regularMinutes,
      overtimeMinutes,
      regularHours: minutesToDecimal(regularMinutes),
      overtimeHours: minutesToDecimal(overtimeMinutes),
      hasRate,
      overtimeMultiplier: useOvertime ? multiplier : 1,
      overtimeAfterHours: useOvertime ? thresholdHours : null
    };

    if (hasRate) {
      result.rate = rate;
      result.overtimeRate = roundMoney(rate * result.overtimeMultiplier);
      result.regularPay = roundMoney((regularMinutes / 60) * rate);
      result.overtimePay = roundMoney((overtimeMinutes / 60) * rate * result.overtimeMultiplier);
      result.totalPay = roundMoney(result.regularPay + result.overtimePay);
    }
    return result;
  }

  /**
   * Weekly timesheet: rows of { start, end, break }. Rows with no start and no end are skipped.
   * @param {Array<{start:string,end:string,break:(number|string)}>} rows
   * @param {Object} options - passed to calculatePay
   */
  function calculateTimesheet(rows, options = {}) {
    if (!Array.isArray(rows)) return { error: 'No timesheet rows were given.' };

    const days = [];
    let totalMinutes = 0;
    let daysWorked = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const label = DAYS[i] || `Day ${i + 1}`;
      const hasStart = row.start !== undefined && row.start !== null && String(row.start).trim() !== '';
      const hasEnd = row.end !== undefined && row.end !== null && String(row.end).trim() !== '';

      if (!hasStart && !hasEnd) {
        days.push({ day: label, empty: true, workedMinutes: 0 });
        continue;
      }
      if (!hasStart || !hasEnd) {
        return { error: `${label}: enter both a start and an end time, or leave both empty.`, rowIndex: i };
      }

      const duration = calculateDuration(row.start, row.end, row.break);
      if (duration.error) return { error: `${label}: ${duration.error}`, rowIndex: i };

      totalMinutes += duration.workedMinutes;
      if (duration.workedMinutes > 0) daysWorked++;
      days.push(Object.assign({ day: label, empty: false }, duration));
    }

    const pay = calculatePay(totalMinutes, options);
    if (pay.error) return pay;

    return Object.assign({}, pay, {
      days,
      daysWorked,
      hhmm: formatHoursMinutes(totalMinutes),
      decimalHours: minutesToDecimal(totalMinutes)
    });
  }

  return {
    DAYS,
    parseTime,
    formatHoursMinutes,
    minutesToDecimal,
    decimalToMinutes,
    calculateDuration,
    calculatePay,
    calculateTimesheet
  };
});
