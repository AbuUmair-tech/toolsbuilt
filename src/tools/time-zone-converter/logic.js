/**
 * Time Zone Converter Core Logic
 * Pure, DOM-free conversions between IANA time zones using the runtime's own
 * Intl.DateTimeFormat data (no network, no bundled tz database). Daylight saving
 * time comes from that data, so the offset is always looked up for the exact instant.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TimeZoneLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const HOUR_MS = 3600000;
  const WORK_START = 9 * 60;
  const WORK_END = 17 * 60;

  // Used only if the runtime cannot list its zones (Intl.supportedValuesOf is missing)
  const FALLBACK_ZONES = [
    'UTC', 'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Phoenix',
    'America/Chicago', 'America/Mexico_City', 'America/New_York', 'America/Toronto', 'America/Bogota',
    'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Atlantic/Reykjavik', 'Europe/London', 'Europe/Dublin',
    'Europe/Lisbon', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam',
    'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow', 'Africa/Lagos',
    'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Dubai',
    'Asia/Tehran', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok',
    'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Shanghai', 'Asia/Hong_Kong',
    'Asia/Taipei', 'Asia/Seoul', 'Asia/Tokyo', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Brisbane',
    'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
  ];

  // Extra search words for zones whose IANA name is not the city people look for
  const ALIASES = {
    'UTC': 'Coordinated Universal Time GMT Zulu',
    'Asia/Karachi': 'Pakistan Lahore Islamabad Rawalpindi Faisalabad Peshawar Quetta PKT',
    'Asia/Kolkata': 'India Delhi New Delhi Mumbai Bangalore Bengaluru Chennai Hyderabad Pune IST',
    'Asia/Dubai': 'United Arab Emirates UAE Abu Dhabi Sharjah Gulf GST',
    'Asia/Riyadh': 'Saudi Arabia KSA Jeddah Mecca Makkah Medina Dammam Kuwait AST',
    'Asia/Qatar': 'Qatar Doha',
    'Asia/Dhaka': 'Bangladesh Chittagong',
    'Asia/Shanghai': 'China Beijing Shenzhen Guangzhou CST',
    'Asia/Tokyo': 'Japan Osaka JST',
    'Asia/Seoul': 'South Korea Korea KST',
    'Asia/Singapore': 'Singapore SGT',
    'Asia/Manila': 'Philippines',
    'Asia/Jakarta': 'Indonesia WIB',
    'Asia/Kathmandu': 'Nepal',
    'Asia/Tehran': 'Iran',
    'Asia/Ho_Chi_Minh': 'Vietnam Saigon Hanoi',
    'Europe/London': 'United Kingdom UK Britain England Scotland Wales Manchester Birmingham Edinburgh GMT BST',
    'Europe/Dublin': 'Ireland',
    'Europe/Paris': 'France CET CEST',
    'Europe/Berlin': 'Germany Frankfurt Munich Hamburg CET CEST',
    'Europe/Madrid': 'Spain Barcelona',
    'Europe/Rome': 'Italy Milan',
    'Europe/Amsterdam': 'Netherlands Holland',
    'Europe/Istanbul': 'Turkey Turkiye Ankara',
    'Europe/Moscow': 'Russia MSK',
    'America/New_York': 'United States USA US East Coast Eastern Time Washington DC Boston Miami Atlanta Philadelphia ET EST EDT',
    'America/Chicago': 'Central Time Dallas Houston Austin Minneapolis CT CST CDT',
    'America/Denver': 'Mountain Time Salt Lake City MT MST MDT',
    'America/Phoenix': 'Arizona MST',
    'America/Los_Angeles': 'Pacific Time San Francisco Seattle San Diego Las Vegas Silicon Valley PT PST PDT',
    'America/Anchorage': 'Alaska AKST',
    'Pacific/Honolulu': 'Hawaii HST',
    'America/Toronto': 'Canada Ontario Ottawa Montreal Eastern',
    'America/Vancouver': 'Canada British Columbia Pacific',
    'America/Sao_Paulo': 'Brazil Rio de Janeiro BRT',
    'America/Mexico_City': 'Mexico',
    'America/Argentina/Buenos_Aires': 'Argentina',
    'Africa/Lagos': 'Nigeria Abuja WAT',
    'Africa/Cairo': 'Egypt EET',
    'Africa/Johannesburg': 'South Africa Cape Town SAST',
    'Africa/Nairobi': 'Kenya EAT',
    'Australia/Sydney': 'Australia NSW Canberra AEST AEDT',
    'Australia/Melbourne': 'Australia Victoria',
    'Australia/Perth': 'Western Australia AWST',
    'Pacific/Auckland': 'New Zealand Wellington NZST NZDT'
  };

  // ICU (and so Chrome and Node) still lists some zones under their old names
  const LEGACY_NAMES = {
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Katmandu': 'Asia/Kathmandu',
    'Asia/Saigon': 'Asia/Ho_Chi_Minh',
    'Asia/Rangoon': 'Asia/Yangon',
    'Europe/Kiev': 'Europe/Kyiv',
    'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
    'Atlantic/Faeroe': 'Atlantic/Faroe',
    'Pacific/Truk': 'Pacific/Chuuk',
    'Pacific/Ponape': 'Pacific/Pohnpei',
    'America/Godthab': 'America/Nuuk',
    'Etc/UTC': 'UTC',
    'Etc/GMT': 'UTC'
  };

  const pad = (n) => String(n).padStart(2, '0');
  const formatterCache = new Map();

  function partsFormatter(zone) {
    if (!formatterCache.has(zone)) {
      formatterCache.set(zone, new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'short'
      }));
    }
    return formatterCache.get(zone);
  }

  /** True if the runtime knows this IANA zone name. */
  function isValidZone(zone) {
    if (!zone || typeof zone !== 'string') return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone });
      return true;
    } catch (e) {
      return false;
    }
  }

  /** The current IANA name for a zone ("Asia/Calcutta" -> "Asia/Kolkata"). */
  function canonicalZone(zone) {
    const modern = LEGACY_NAMES[zone];
    return modern && isValidZone(modern) ? modern : zone;
  }

  /** All zones the runtime supports, under their current names, with UTC first. */
  function listZones() {
    let zones = [];
    try {
      if (typeof Intl.supportedValuesOf === 'function') zones = Intl.supportedValuesOf('timeZone');
    } catch (e) {}
    if (!zones.length) zones = FALLBACK_ZONES.filter(isValidZone);
    const seen = new Set(['UTC']);
    const list = ['UTC'];
    zones.map(canonicalZone).sort().forEach(z => {
      if (!seen.has(z)) { seen.add(z); list.push(z); }
    });
    return list;
  }

  /** Wall-clock fields of an instant in a zone. */
  function wallTime(utcMs, zone) {
    const parts = {};
    partsFormatter(zone).formatToParts(new Date(utcMs)).forEach(p => { parts[p.type] = p.value; });
    return {
      year: parseInt(parts.year, 10),
      month: parseInt(parts.month, 10),
      day: parseInt(parts.day, 10),
      hour: parseInt(parts.hour, 10) % 24,
      minute: parseInt(parts.minute, 10),
      second: parseInt(parts.second, 10),
      weekday: parts.weekday
    };
  }

  /** Offset from UTC in minutes (east positive) for a zone at an instant. */
  function offsetMinutes(zone, utcMs) {
    const w = wallTime(utcMs, zone);
    const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
    const floored = Math.floor(utcMs / 1000) * 1000;
    return Math.round((asUtc - floored) / 60000);
  }

  /** 300 -> "UTC+05:00", -240 -> "UTC−04:00", 0 -> "UTC" */
  function formatOffset(minutes) {
    if (!minutes) return 'UTC';
    const sign = minutes < 0 ? '−' : '+';
    const abs = Math.abs(minutes);
    return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  }

  function parseDate(str) {
    const m = String(str || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    const year = +m[1], month = +m[2], day = +m[3];
    if (month < 1 || month > 12) return null;
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > maxDay) return null;
    return { year, month, day };
  }

  function parseClock(str) {
    const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return null;
    const hour = +m[1], minute = +m[2];
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }

  /**
   * Converts a wall-clock date and time in a zone to a UTC instant.
   * In the hour skipped by a spring-forward change the time is moved forward
   * (nonexistent: true); in the repeated autumn hour the first occurrence is used (ambiguous: true).
   */
  function zonedToUtc(dateStr, timeStr, zone) {
    const d = parseDate(dateStr);
    if (!d) return { error: 'Enter a valid date (YYYY-MM-DD).' };
    const t = parseClock(timeStr);
    if (!t) return { error: 'Enter a valid time (HH:MM, 24-hour).' };
    if (!isValidZone(zone)) return { error: `"${zone}" is not a time zone this browser recognises. Pick one from the list.` };

    const wallAsUtc = Date.UTC(d.year, d.month - 1, d.day, t.hour, t.minute);
    // Two candidate offsets: the ones in force a day either side of the wall time
    const offA = offsetMinutes(zone, wallAsUtc - 24 * HOUR_MS);
    const offB = offsetMinutes(zone, wallAsUtc + 24 * HOUR_MS);
    const candidates = [];
    [offA, offB].forEach(off => {
      const utc = wallAsUtc - off * 60000;
      if (offsetMinutes(zone, utc) === off && !candidates.includes(utc)) candidates.push(utc);
    });
    candidates.sort((a, b) => a - b);

    if (candidates.length) {
      return { utcMs: candidates[0], ambiguous: candidates.length > 1, nonexistent: false };
    }
    // The wall time falls in a DST gap: use the offset from before the change, which lands after it
    const utc = wallAsUtc - Math.min(offA, offB) * 60000;
    return { utcMs: utc, ambiguous: false, nonexistent: true };
  }

  /** Days between two calendar dates given as {year, month, day}. */
  function dayDiff(a, b) {
    return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000);
  }

  /**
   * Describes an instant in a zone, relative to a reference calendar date.
   */
  function describeInZone(utcMs, zone, reference) {
    const w = wallTime(utcMs, zone);
    const offset = offsetMinutes(zone, utcMs);
    const date = `${w.year}-${pad(w.month)}-${pad(w.day)}`;
    const diff = reference ? dayDiff(reference, w) : 0;
    let abbreviation = '';
    try {
      const tzPart = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
        .formatToParts(new Date(utcMs)).find(p => p.type === 'timeZoneName');
      abbreviation = tzPart ? tzPart.value : '';
    } catch (e) {}
    const minutesOfDay = w.hour * 60 + w.minute;
    return {
      zone,
      date,
      time: `${pad(w.hour)}:${pad(w.minute)}`,
      weekday: w.weekday,
      hour: w.hour,
      minute: w.minute,
      offsetMinutes: offset,
      offsetLabel: formatOffset(offset),
      abbreviation,
      dayDiff: diff,
      dayLabel: diff === 0 ? 'Same day' : diff === 1 ? 'Next day' : diff === -1 ? 'Previous day' : (diff > 0 ? `+${diff} days` : `${diff} days`),
      isWorkingHours: minutesOfDay >= WORK_START && minutesOfDay < WORK_END
    };
  }

  /**
   * Converts a date and time in one zone to several others.
   * @returns {{utcMs, iso, source, targets[]}|{error}}
   */
  function convert(dateStr, timeStr, fromZone, toZones) {
    const z = zonedToUtc(dateStr, timeStr, fromZone);
    if (z.error) return z;
    const source = describeInZone(z.utcMs, fromZone, null);
    const reference = parseDate(source.date);
    const targets = [];
    for (const zone of toZones || []) {
      if (!zone) continue;
      if (!isValidZone(zone)) return { error: `"${zone}" is not a time zone this browser recognises. Pick one from the list.` };
      targets.push(describeInZone(z.utcMs, zone, reference));
    }
    return {
      utcMs: z.utcMs,
      iso: new Date(z.utcMs).toISOString().replace('.000Z', 'Z'),
      ambiguous: z.ambiguous,
      nonexistent: z.nonexistent,
      source,
      targets
    };
  }

  /**
   * 24 one-hour slots starting at local midnight of `dateStr` in `fromZone`.
   * Each zone gets its local hour per slot and whether 09:00-17:00 covers the slot's start.
   * `overlap` lists the slot indexes where every zone is inside working hours.
   */
  function overlapStrip(dateStr, fromZone, zones) {
    const start = zonedToUtc(dateStr, '00:00', fromZone);
    if (start.error) return start;
    const allZones = [fromZone].concat((zones || []).filter(Boolean));
    const rows = allZones.map(zone => {
      const slots = [];
      for (let i = 0; i < 24; i++) {
        const w = wallTime(start.utcMs + i * HOUR_MS, zone);
        const minutesOfDay = w.hour * 60 + w.minute;
        slots.push({
          hour: w.hour,
          minute: w.minute,
          label: w.minute ? `${w.hour}:${pad(w.minute)}` : String(w.hour),
          working: minutesOfDay >= WORK_START && minutesOfDay < WORK_END
        });
      }
      return { zone, slots };
    });
    const overlap = [];
    for (let i = 0; i < 24; i++) {
      if (rows.every(r => r.slots[i].working)) overlap.push(i);
    }
    return { startUtcMs: start.utcMs, rows, overlap };
  }

  /** "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
  function cityName(zone) {
    if (zone === 'UTC') return 'UTC';
    const last = zone.split('/').pop();
    return last.replace(/_/g, ' ');
  }

  /** Text used to match a zone against a search query. */
  function searchText(zone) {
    return `${zone.replace(/[/_]/g, ' ')} ${ALIASES[zone] || ''}`.toLowerCase();
  }

  /**
   * Finds zones for a query such as "karachi", "pakistan", "new york" or "PST".
   * Exact city matches rank first.
   */
  function searchZones(query, zones) {
    const list = zones || listZones();
    const q = String(query || '').trim().toLowerCase();
    if (!q) return list.slice();
    const words = q.split(/\s+/);
    const scored = [];
    list.forEach(zone => {
      const text = searchText(zone);
      if (!words.every(w => text.includes(w))) return;
      const city = cityName(zone).toLowerCase();
      let score = 3;
      // A country or abbreviation typed in full ("india", "pst") beats a city that merely starts with it
      if (city === q || zone.toLowerCase() === q) score = 0;
      else if (` ${(ALIASES[zone] || '').toLowerCase()} `.includes(` ${q} `)) score = 1;
      else if (city.startsWith(q)) score = 2;
      scored.push({ zone, score });
    });
    scored.sort((a, b) => a.score - b.score || a.zone.localeCompare(b.zone));
    return scored.map(s => s.zone);
  }

  /**
   * Resolves what a visitor typed into a zone id: an exact IANA name (any case)
   * or the best search match.
   */
  function resolveZone(input, zones) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const list = zones || listZones();
    const exact = list.find(z => z.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    const legacy = Object.keys(LEGACY_NAMES).find(z => z.toLowerCase() === raw.toLowerCase());
    if (legacy && list.includes(canonicalZone(legacy))) return canonicalZone(legacy);
    // Values such as "Karachi (Asia/Karachi)" from the datalist label
    const inParens = raw.match(/\(([^)]+)\)\s*$/);
    if (inParens) {
      const id = list.find(z => z.toLowerCase() === inParens[1].trim().toLowerCase());
      if (id) return id;
    }
    const found = searchZones(raw, list);
    if (found.length) return found[0];
    // Region/City names the list leaves out (old aliases such as Asia/Calcutta) still work
    return raw.includes('/') && isValidZone(raw) ? raw : null;
  }

  return {
    ALIASES,
    FALLBACK_ZONES,
    isValidZone,
    canonicalZone,
    listZones,
    wallTime,
    offsetMinutes,
    formatOffset,
    zonedToUtc,
    describeInZone,
    convert,
    overlapStrip,
    cityName,
    searchZones,
    resolveZone
  };
});
