/**
 * Fraction Calculator Core Logic
 * Pure, DOM-free exact fraction arithmetic with BigInt, so large numerators and
 * denominators never lose precision. Every operation returns step-by-step working.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.FractionLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('fraction-calculator')
    : require('../../../scripts/i18n-client.js').scope('fraction-calculator');

  const OPS = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
  const OP_SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
  const MAX_DIGITS = 60;

  const abs = (a) => (a < 0n ? -a : a);

  function gcd(a, b) {
    a = abs(a); b = abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function lcm(a, b) {
    return abs(a / gcd(a, b) * b);
  }

  /** Euclid's algorithm with each division written out, e.g. "8 = 1 × 6 + 2". */
  function gcdSteps(a, b) {
    a = abs(a); b = abs(b);
    if (a < b) [a, b] = [b, a];
    const steps = [];
    while (b) {
      steps.push(`${a} = ${a / b} × ${b} + ${a % b}`);
      [a, b] = [b, a % b];
    }
    return { gcd: a, steps };
  }

  function normalise(n, d) {
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }

  function format(f) {
    return f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`;
  }

  /** 3/2 -> "1 1/2", -7/3 -> "−2 1/3", 4/1 -> "4" */
  function toMixed(f) {
    if (f.d === 1n) return `${f.n}`;
    const whole = abs(f.n) / f.d;
    const rest = abs(f.n) % f.d;
    if (whole === 0n) return format(f);
    return `${f.n < 0n ? '-' : ''}${whole} ${rest}/${f.d}`;
  }

  /**
   * Exact decimal by long division; a repeating part is shown in brackets: 5/6 -> "0.8(3)".
   * Long repeating parts are cut off after maxDigits and marked approximate.
   */
  function toDecimal(f, maxDigits = 20) {
    const negative = f.n < 0n;
    let num = abs(f.n);
    const whole = num / f.d;
    let rem = num % f.d;
    if (rem === 0n) return { text: `${negative ? '-' : ''}${whole}`, exact: true, repeating: false };
    const digits = [];
    const seen = new Map();
    let repeatAt = -1;
    while (rem !== 0n && digits.length < maxDigits) {
      if (seen.has(rem)) { repeatAt = seen.get(rem); break; }
      seen.set(rem, digits.length);
      rem *= 10n;
      digits.push(String(rem / f.d));
      rem %= f.d;
    }
    let frac = digits.join('');
    let exact = true;
    if (repeatAt >= 0) {
      frac = `${frac.slice(0, repeatAt)}(${frac.slice(repeatAt)})`;
    } else if (rem !== 0n) {
      exact = false;
      frac += '…';
    }
    return { text: `${negative ? '-' : ''}${whole}.${frac}`, exact, repeating: repeatAt >= 0 };
  }

  /** Plain rounded decimal for copying, e.g. 0.833333 */
  function toRoundedDecimal(f, places = 6) {
    const scale = 10n ** BigInt(places);
    const scaled = f.n * scale;
    let q = scaled / f.d;
    const r = abs(scaled % f.d);
    if (r * 2n >= f.d) q += f.n < 0n ? -1n : 1n;
    const negative = q < 0n;
    const s = abs(q).toString().padStart(places + 1, '0');
    const out = `${s.slice(0, -places)}.${s.slice(-places)}`.replace(/\.?0+$/, '');
    return `${negative && out !== '0' ? '-' : ''}${out}`;
  }

  /**
   * Parses "3/4", "-3/4", "2 1/3", "-2 1/3", "5", "0.375" or "1.25".
   * @returns {{n:bigint, d:bigint, kind:string, text:string}|{error:string}}
   */
  function parse(input) {
    const raw = String(input === undefined || input === null ? '' : input).trim()
      .replace(/[−–]/g, '-').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/');
    if (!raw) return { error: T('errors.empty') };
    if (raw.replace(/\D/g, '').length > MAX_DIGITS) return { error: T('errors.tooLong') };

    let m = raw.match(/^([+-])?(\d+) (\d+)\/(\d+)$/);
    if (m) {
      const sign = m[1] === '-' ? -1n : 1n;
      const whole = BigInt(m[2]), n = BigInt(m[3]), d = BigInt(m[4]);
      if (d === 0n) return { error: T('errors.zeroDenominator', { raw }) };
      return Object.assign(normaliseKeep(sign * (whole * d + n), d), { kind: 'mixed', text: raw, whole, partN: n });
    }
    m = raw.match(/^([+-])?(\d+)\/([+-]?\d+)$/);
    if (m) {
      const d = BigInt(m[3]);
      if (d === 0n) return { error: T('errors.zeroDenominator', { raw }) };
      return Object.assign(normaliseKeep((m[1] === '-' ? -1n : 1n) * BigInt(m[2]), d), { kind: 'fraction', text: raw });
    }
    m = raw.match(/^([+-])?(\d+)$/);
    if (m) return { n: (m[1] === '-' ? -1n : 1n) * BigInt(m[2]), d: 1n, kind: 'whole', text: raw };
    m = raw.match(/^([+-])?(\d*)\.(\d+)$/);
    if (m) {
      const d = 10n ** BigInt(m[3].length);
      const n = (m[1] === '-' ? -1n : 1n) * (BigInt(m[2] || '0') * d + BigInt(m[3]));
      return { n, d, kind: 'decimal', text: raw };
    }
    return { error: T('errors.notUnderstood', { raw }) };
  }

  // Keep the fraction as typed (6/8 stays 6/8) but with a positive denominator
  function normaliseKeep(n, d) {
    return d < 0n ? { n: -n, d: -d } : { n, d };
  }

  function result(f, steps) {
    const simplified = normalise(f.n, f.d);
    const dec = toDecimal(simplified);
    return {
      fraction: format(simplified),
      mixed: toMixed(simplified),
      decimal: dec.text,
      decimalExact: dec.exact,
      decimalRepeating: dec.repeating,
      decimalRounded: toRoundedDecimal(simplified),
      numerator: simplified.n.toString(),
      denominator: simplified.d.toString(),
      steps
    };
  }

  // which: 'first', 'second' or 'single' (the only number)
  function convertStep(p, which) {
    if (p.kind === 'mixed') {
      const sign = p.n < 0n ? '−' : '';
      return T(`steps.convert.mixed.${which}`, { text: p.text, sign, whole: p.whole, d: p.d, partN: p.partN, n: p.n });
    }
    if (p.kind === 'whole') return T(`steps.convert.whole.${which}`, { text: p.text, n: p.n });
    if (p.kind === 'decimal') return T(`steps.convert.decimal.${which}`, { text: p.text, n: p.n, d: p.d });
    return null;
  }

  function simplifyStep(n, d, steps) {
    const g = gcd(n, d);
    if (d < 0n) { n = -n; d = -d; }
    if (g > 1n) steps.push(T('steps.simplify', { absN: abs(n), d, g, n, simplified: format({ n: n / g, d: d / g }) }));
    else steps.push(T('steps.lowestTerms', { n, d }));
  }

  /**
   * Applies + − × ÷ to two inputs.
   * @param {string} a
   * @param {string} op - '+', '-', '*', '/', or add/subtract/multiply/divide
   * @param {string} b
   */
  function calculate(a, op, b) {
    const operation = OPS[op] || op;
    if (!OP_SYMBOLS[operation]) return { error: T('errors.chooseOperation') };
    const x = parse(a);
    if (x.error) return { error: T('errors.firstNumber', { error: x.error }), field: 'a' };
    const y = parse(b);
    if (y.error) return { error: T('errors.secondNumber', { error: y.error }), field: 'b' };

    const steps = [];
    [convertStep(x, 'first'), convertStep(y, 'second')].forEach(s => s && steps.push(s));
    const fx = `${x.n}/${x.d}`, fy = `${y.n}/${y.d}`;
    let n, d;

    if (operation === 'add' || operation === 'subtract') {
      const sym = operation === 'add' ? '+' : '−';
      const sign = operation === 'add' ? 1n : -1n;
      if (x.d === y.d) {
        steps.push(T(`steps.sameDenominator.${operation}`, { d: x.d, a: x.n, sym, b: y.n, result: x.n + sign * y.n }));
        n = x.n + sign * y.n; d = x.d;
      } else {
        const lcd = lcm(x.d, y.d);
        const ka = lcd / x.d, kb = lcd / y.d;
        steps.push(T('steps.commonDenominator', { da: x.d, db: y.d, lcd }));
        steps.push(T('steps.rewrite', { fx, na: x.n * ka, lcd, fy, nb: y.n * kb }));
        n = x.n * ka + sign * y.n * kb; d = lcd;
        steps.push(T(`steps.numerators.${operation}`, { a: x.n * ka, sym, b: y.n * kb, n, d }));
      }
    } else if (operation === 'multiply') {
      n = x.n * y.n; d = x.d * y.d;
      steps.push(T('steps.multiplyBoth', { xn: x.n, yn: y.n, xd: x.d, yd: y.d, n, d }));
    } else {
      if (y.n === 0n) return { error: T('errors.divideByZero'), field: 'b' };
      steps.push(T('steps.reciprocal', { fy, yd: y.d, yn: y.n }));
      n = x.n * y.d; d = x.d * y.n;
      steps.push(T('steps.multiply', { xn: x.n, yd: y.d, xd: x.d, yn: y.n, n, d }));
    }

    simplifyStep(n, d, steps);
    const out = result({ n, d }, steps);
    if (normalise(n, d).d !== 1n && abs(normalise(n, d).n) > normalise(n, d).d) {
      steps.push(T('steps.asMixed', { mixed: out.mixed }));
    }
    return Object.assign(out, {
      expression: `${x.text} ${OP_SYMBOLS[operation]} ${y.text}`,
      operation
    });
  }

  /** Reduces a fraction (or mixed number) to lowest terms, showing Euclid's algorithm. */
  function simplify(input) {
    const p = parse(input);
    if (p.error) return p;
    const steps = [];
    const c = convertStep(p, 'single');
    if (c) steps.push(c);
    if (p.n === 0n) {
      steps.push(T('steps.zero'));
      return Object.assign(result({ n: 0n, d: 1n }, steps), { gcd: p.d.toString(), alreadySimplest: false });
    }
    const euclid = gcdSteps(p.n, p.d);
    steps.push(T('steps.findGcd', { a: abs(p.n), b: p.d }));
    euclid.steps.forEach(s => steps.push(`  ${s}`));
    steps.push(T('steps.gcd', { gcd: euclid.gcd }));
    if (euclid.gcd > 1n) steps.push(T('steps.divideBoth', { g: euclid.gcd, n: p.n, nq: p.n / euclid.gcd, d: p.d, dq: p.d / euclid.gcd }));
    else steps.push(T('steps.gcdOne'));
    return Object.assign(result(p, steps), { gcd: euclid.gcd.toString(), alreadySimplest: euclid.gcd === 1n });
  }

  /** Terminating decimal -> fraction, e.g. 0.375 -> 3/8. */
  function decimalToFraction(input) {
    const raw = String(input === undefined || input === null ? '' : input).trim().replace(/[−–]/g, '-').replace(/,/g, '');
    if (!raw) return { error: T('errors.decimalEmpty') };
    const m = raw.match(/^([+-])?(\d*)(?:\.(\d+))?$/);
    if (!m || (!m[2] && !m[3])) {
      return { error: T('errors.notTerminating', { raw }) };
    }
    if ((m[2] + (m[3] || '')).length > MAX_DIGITS) return { error: T('errors.decimalTooLong') };
    const places = m[3] ? m[3].length : 0;
    const d = 10n ** BigInt(places);
    const n = (m[1] === '-' ? -1n : 1n) * (BigInt(m[2] || '0') * d + BigInt(m[3] || '0'));
    const steps = [];
    if (places) steps.push(T(places === 1 ? 'steps.decimalPlaces.one' : 'steps.decimalPlaces.other', { raw, places, d, n }));
    else steps.push(T('steps.wholeNumber', { raw, n }));
    if (n !== 0n && places) {
      const g = gcd(n, d);
      steps.push(T('steps.gcdOf', { a: abs(n), d, g }));
      if (g > 1n) steps.push(T('steps.divideBothShort', { g, n: n / g, d: d / g }));
    }
    return result({ n, d }, steps);
  }

  return { gcd, lcm, parse, calculate, simplify, decimalToFraction, toMixed, toDecimal };
});
