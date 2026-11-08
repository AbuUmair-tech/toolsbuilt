/**
 * Unix Timestamp Converter Core Logic
 * Pure, DOM-free functions: epoch seconds/milliseconds to dates and back,
 * unit auto-detection, ISO 8601, RFC 2822 and relative time strings.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UnixTimestampLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Largest instant a JavaScript Date can hold: ±100,000,000 days from the epoch
  const MAX_DATE_MS = 8.64e15;
  // The signed 32-bit limit behind the Year 2038 problem
  const INT32_MAX = 2147483647;

  // Messages, unit names and relative times come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('unix-timestamp-converter')
    : require('../../../scripts/i18n-client.js').scope('unix-timestamp-converter');
  // Locale for numbers shown to visitors: en-US on English pages and in Node
  const displayLocale = () => ((typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale('en-US') : 'en-US');

  // RFC 2822 day and month names are part of the format (always English), not display text
  const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const UNITS = {
    s: { label: T('units.s'), toMs: 1000 },
    ms: { label: T('units.ms'), toMs: 1 },
    us: { label: T('units.us'), toMs: 0.001 },
    ns: { label: T('units.ns'), toMs: 0.000001 }
  };

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  /**
   * Guesses the unit from the size of the number.
   * Below 1e11 is seconds (up to the year 5138), below 1e14 milliseconds,
   * below 1e17 microseconds, anything larger nanoseconds.
   */
  function detectUnit(value) {
    const abs = Math.abs(Number(value));
    if (abs < 1e11) return 's';
    if (abs < 1e14) return 'ms';
    if (abs < 1e17) return 'us';
    return 'ns';
  }

  /**
   * Parses a timestamp string. unit: 'auto' (default), 's', 'ms', 'us' or 'ns'.
   * @returns {{ms:number, unit:string, unitLabel:string, detected:boolean, seconds:number}|{error:string}}
   */
  function parseTimestamp(input, unit = 'auto') {
    const str = String(input === undefined || input === null ? '' : input).trim().replace(/[,_\s]/g, '');
    if (!str) return { error: T('errors.empty') };
    if (!/^[-+]?\d+(\.\d+)?$/.test(str)) {
      return { error: T('errors.notNumber') };
    }
    const value = Number(str);
    const chosen = unit && unit !== 'auto' ? unit : detectUnit(value);
    if (!UNITS[chosen]) return { error: T('errors.unknownUnit') };
    const ms = value * UNITS[chosen].toMs;
    if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) {
      return { error: T('errors.outOfRange') };
    }
    return {
      ms: Math.round(ms * 1000) / 1000,
      unit: chosen,
      unitLabel: UNITS[chosen].label,
      detected: !unit || unit === 'auto',
      seconds: Math.floor(ms / 1000)
    };
  }

  /** ISO 8601 in UTC; milliseconds are shown only when they are not zero. */
  function toIsoUtc(ms) {
    const d = new Date(Math.floor(ms));
    const iso = d.toISOString();
    return d.getUTCMilliseconds() === 0 ? iso.replace('.000Z', 'Z') : iso;
  }

  /**
   * RFC 2822 (email Date header) for a given offset in minutes east of UTC.
   * offsetMinutes 0 -> "Tue, 14 Nov 2023 22:13:20 +0000"
   */
  function toRfc2822(ms, offsetMinutes = 0) {
    const d = new Date(Math.floor(ms) + offsetMinutes * 60000);
    const sign = offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(offsetMinutes);
    const year = d.getUTCFullYear();
    return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MONTHS_SHORT[d.getUTCMonth()]} ${year < 0 ? year : pad(year, 4)} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
  }

  /** ISO 8601 with a numeric offset, e.g. "2023-11-15T03:13:20+05:00" */
  function toIsoWithOffset(ms, offsetMinutes) {
    if (!offsetMinutes) return toIsoUtc(ms);
    const d = new Date(Math.floor(ms) + offsetMinutes * 60000);
    const sign = offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(offsetMinutes);
    const frac = d.getUTCMilliseconds() ? `.${pad(d.getUTCMilliseconds(), 3)}` : '';
    return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${frac}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  }

  /**
   * Human relative time: "3 days ago", "in 2 hours", "just now".
   * Months are 30 days and years 365 days, so long spans are approximate.
   */
  function relativeTime(ms, nowMs) {
    const diffSec = Math.round((ms - nowMs) / 1000);
    const abs = Math.abs(diffSec);
    if (abs < 5) return T('relative.justNow');
    const steps = [
      ['year', 365 * 86400],
      ['month', 30 * 86400],
      ['week', 7 * 86400],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1]
    ];
    for (const [name, size] of steps) {
      if (abs >= size) {
        const n = Math.floor(abs / size);
        const text = T(`relative.${name}.${n === 1 ? 'one' : 'other'}`, { n: n.toLocaleString(displayLocale()) });
        return diffSec < 0 ? T('relative.past', { text }) : T('relative.future', { text });
      }
    }
    return T('relative.justNow');
  }

  /**
   * Full conversion of a timestamp string.
   * @param {string|number} input
   * @param {Object} options - { unit: 'auto'|'s'|'ms'|'us'|'ns', now: ms }
   */
  function convertTimestamp(input, options = {}) {
    const parsed = parseTimestamp(input, options.unit || 'auto');
    if (parsed.error) return parsed;
    const now = options.now === undefined ? Date.now() : options.now;
    const ms = parsed.ms;
    return {
      ms,
      unit: parsed.unit,
      unitLabel: parsed.unitLabel,
      detected: parsed.detected,
      seconds: Math.floor(ms / 1000),
      milliseconds: Math.floor(ms),
      iso: toIsoUtc(ms),
      rfc2822: toRfc2822(ms, 0),
      relative: relativeTime(ms, now),
      beyond2038: Math.floor(ms / 1000) > INT32_MAX,
      before1970: ms < 0
    };
  }

  /**
   * Parses "YYYY-MM-DD", "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM:SS" (optionally ".sss").
   * @returns {{year,month,day,hour,minute,second,millisecond}|null}
   */
  function parseDateTime(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(-?\d{1,6})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
    if (!m) return null;
    const parts = {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
      hour: m[4] ? parseInt(m[4], 10) : 0,
      minute: m[5] ? parseInt(m[5], 10) : 0,
      second: m[6] ? parseInt(m[6], 10) : 0,
      millisecond: m[7] ? parseInt(m[7].padEnd(3, '0'), 10) : 0
    };
    if (parts.month < 1 || parts.month > 12) return null;
    const probe = new Date(0);
    probe.setUTCFullYear(parts.year, parts.month, 0);
    if (parts.day < 1 || parts.day > probe.getUTCDate()) return null;
    if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return null;
    return parts;
  }

  /**
   * Date and time -> Unix timestamp.
   * @param {string} dateTimeStr - "2023-11-14T22:13:20"
   * @param {Object} options - { zone: 'utc' | 'local' }  ('local' uses the runtime's own time zone)
   */
  function dateToTimestamp(dateTimeStr, options = {}) {
    const p = parseDateTime(dateTimeStr);
    if (!p) return { error: T('errors.invalidDateTime') };
    let d;
    if (options.zone === 'local') {
      d = new Date(2000, 0, 1, 0, 0, 0, 0);
      d.setFullYear(p.year, p.month - 1, p.day);
      d.setHours(p.hour, p.minute, p.second, p.millisecond);
    } else {
      d = new Date(0);
      d.setUTCFullYear(p.year, p.month - 1, p.day);
      d.setUTCHours(p.hour, p.minute, p.second, p.millisecond);
    }
    const ms = d.getTime();
    if (!Number.isFinite(ms)) return { error: T('errors.dateOutOfRange') };
    return {
      ms,
      seconds: Math.floor(ms / 1000),
      milliseconds: ms,
      iso: toIsoUtc(ms),
      beyond2038: Math.floor(ms / 1000) > INT32_MAX
    };
  }

  return {
    INT32_MAX,
    UNITS,
    detectUnit,
    parseTimestamp,
    toIsoUtc,
    toIsoWithOffset,
    toRfc2822,
    relativeTime,
    convertTimestamp,
    parseDateTime,
    dateToTimestamp
  };
});
