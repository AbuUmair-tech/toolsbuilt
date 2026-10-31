/**
 * Week Number Calculator Core Logic
 * Pure, DOM-free ISO 8601 week numbers (weeks start Monday, week 1 contains
 * the year's first Thursday) and US-style week numbers (weeks start Sunday,
 * week 1 contains January 1). All arithmetic runs on UTC midnights.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeekNumberLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const DAY_MS = 86400000;
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const pad = (n) => String(n).padStart(2, '0');

  function utcDate(year, month, day) {
    const d = new Date(0);
    d.setUTCFullYear(year, month - 1, day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month < 1 || month > 12) return null;
    const maxDay = utcDate(year, month + 1, 0).getUTCDate();
    if (day < 1 || day > maxDay) return null;
    return { year, month, day };
  }

  function toIsoDate(d) {
    return `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  function formatLong(d) {
    return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }

  /** "2026-W01" */
  function formatIsoWeek(year, week) {
    return `${year}-W${pad(week)}`;
  }

  /**
   * ISO 8601 week of a calendar date.
   * The week belongs to the year that contains its Thursday.
   */
  function isoWeekOfParts(year, month, day) {
    const d = utcDate(year, month, day);
    const isoDay = d.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
    const thursday = new Date(d.getTime() + (4 - isoDay) * DAY_MS);
    const weekYear = thursday.getUTCFullYear();
    const jan1 = utcDate(weekYear, 1, 1);
    const week = Math.floor((thursday.getTime() - jan1.getTime()) / DAY_MS / 7) + 1;
    return { week, weekYear, isoWeekday: isoDay, label: formatIsoWeek(weekYear, week) };
  }

  /** Number of ISO weeks in an ISO week-year (52 or 53): the week of December 28. */
  function isoWeeksInYear(year) {
    return isoWeekOfParts(year, 12, 28).week;
  }

  /** Monday and Sunday of ISO week `week` in ISO week-year `year`. */
  function isoWeekRange(year, week) {
    const y = Number(year);
    const w = Number(week);
    if (!Number.isInteger(y) || y < 1 || y > 9999) return { error: 'Enter a year between 1 and 9999.' };
    const max = isoWeeksInYear(y);
    if (!Number.isInteger(w) || w < 1 || w > max) {
      return { error: `${y} has ${max} ISO weeks. Enter a week number from 1 to ${max}.` };
    }
    // Week 1 is the week that contains January 4
    const jan4 = utcDate(y, 1, 4);
    const week1Monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * DAY_MS);
    const monday = new Date(week1Monday.getTime() + (w - 1) * 7 * DAY_MS);
    const sunday = new Date(monday.getTime() + 6 * DAY_MS);
    const days = [];
    for (let i = 0; i < 7; i++) days.push(toIsoDate(new Date(monday.getTime() + i * DAY_MS)));
    return {
      year: y,
      week: w,
      label: formatIsoWeek(y, w),
      weeksInYear: max,
      start: toIsoDate(monday),
      end: toIsoDate(sunday),
      startLong: formatLong(monday),
      endLong: formatLong(sunday),
      days
    };
  }

  /**
   * US-style week number: weeks run Sunday to Saturday and week 1 is the week
   * containing January 1, so it can start in late December and a year can have 53 or 54 weeks.
   */
  function usWeekOfParts(year, month, day) {
    const d = utcDate(year, month, day);
    const jan1 = utcDate(year, 1, 1);
    const dayOfYear = Math.round((d.getTime() - jan1.getTime()) / DAY_MS) + 1;
    const week = Math.floor((dayOfYear - 1 + jan1.getUTCDay()) / 7) + 1;
    return { week, year };
  }

  /**
   * Everything about a date's week.
   * @param {string} dateStr - "YYYY-MM-DD"
   */
  function weekInfo(dateStr) {
    const p = parseDate(dateStr);
    if (!p) return { error: 'Enter a valid date (YYYY-MM-DD).' };
    const d = utcDate(p.year, p.month, p.day);
    const iso = isoWeekOfParts(p.year, p.month, p.day);
    const range = isoWeekRange(iso.weekYear, iso.week);
    const us = usWeekOfParts(p.year, p.month, p.day);
    const jan1 = utcDate(p.year, 1, 1);
    const dayOfYear = Math.round((d.getTime() - jan1.getTime()) / DAY_MS) + 1;
    const daysInYear = Math.round((utcDate(p.year + 1, 1, 1).getTime() - jan1.getTime()) / DAY_MS);
    return {
      date: toIsoDate(d),
      dateLong: formatLong(d),
      weekday: WEEKDAYS[d.getUTCDay()],
      isoWeek: iso.week,
      isoWeekYear: iso.weekYear,
      isoWeekday: iso.isoWeekday,
      isoLabel: iso.label,
      isoFullLabel: `${iso.label}-${iso.isoWeekday}`,
      weekYearDiffers: iso.weekYear !== p.year,
      weeksInIsoYear: isoWeeksInYear(iso.weekYear),
      weekStart: range.start,
      weekEnd: range.end,
      weekStartLong: range.startLong,
      weekEndLong: range.endLong,
      usWeek: us.week,
      dayOfYear,
      daysInYear
    };
  }

  /**
   * Accepts "2026-W53", "2026W53", "2026-W53-4" or "W53 2026".
   * @returns {{year:number, week:number, day:(number|null)}|null}
   */
  function parseIsoWeekString(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toUpperCase();
    let m = s.match(/^(\d{4})-?W(\d{1,2})(?:-?([1-7]))?$/);
    if (m) return { year: +m[1], week: +m[2], day: m[3] ? +m[3] : null };
    m = s.match(/^W(?:EEK)?\s*(\d{1,2})[\s,/]+(\d{4})$/);
    if (m) return { year: +m[2], week: +m[1], day: null };
    return null;
  }

  return {
    WEEKDAYS,
    parseDate,
    toIsoDate,
    formatIsoWeek,
    isoWeekOfParts,
    isoWeeksInYear,
    isoWeekRange,
    usWeekOfParts,
    weekInfo,
    parseIsoWeekString
  };
});
