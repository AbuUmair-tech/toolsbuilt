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
    if (!raw) return { error: 'Enter a number or fraction, for example 3/4 or 2 1/3.' };
    if (raw.replace(/\D/g, '').length > MAX_DIGITS) return { error: 'That number is too long to work with here.' };

    let m = raw.match(/^([+-])?(\d+) (\d+)\/(\d+)$/);
    if (m) {
      const sign = m[1] === '-' ? -1n : 1n;
      const whole = BigInt(m[2]), n = BigInt(m[3]), d = BigInt(m[4]);
      if (d === 0n) return { error: `"${raw}" has a denominator of 0, which is undefined.` };
      return Object.assign(normaliseKeep(sign * (whole * d + n), d), { kind: 'mixed', text: raw, whole, partN: n });
    }
    m = raw.match(/^([+-])?(\d+)\/([+-]?\d+)$/);
    if (m) {
      const d = BigInt(m[3]);
      if (d === 0n) return { error: `"${raw}" has a denominator of 0, which is undefined.` };
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
    return { error: `"${raw}" is not a number this calculator understands. Use forms like 3/4, 2 1/3, 5 or 0.75.` };
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

  function convertStep(p, label) {
    if (p.kind === 'mixed') {
      const sign = p.n < 0n ? '−' : '';
      return `Write ${label} ${p.text} as an improper fraction: ${sign}(${p.whole} × ${p.d} + ${p.partN}) / ${p.d} = ${p.n}/${p.d}`;
    }
    if (p.kind === 'whole') return `Write ${label} ${p.text} as a fraction: ${p.n}/1`;
    if (p.kind === 'decimal') return `Write ${label} ${p.text} as a fraction: ${p.n}/${p.d}`;
    return null;
  }

  function simplifyStep(n, d, steps) {
    const g = gcd(n, d);
    if (d < 0n) { n = -n; d = -d; }
    if (g > 1n) steps.push(`Simplify: GCD(${abs(n)}, ${d}) = ${g}, so ${n}/${d} = ${format({ n: n / g, d: d / g })}`);
    else steps.push(`${n}/${d} is already in lowest terms (GCD = 1)`);
  }

  /**
   * Applies + − × ÷ to two inputs.
   * @param {string} a
   * @param {string} op - '+', '-', '*', '/', or add/subtract/multiply/divide
   * @param {string} b
   */
  function calculate(a, op, b) {
    const operation = OPS[op] || op;
    if (!OP_SYMBOLS[operation]) return { error: 'Choose an operation: +, −, × or ÷.' };
    const x = parse(a);
    if (x.error) return { error: `First number: ${x.error}`, field: 'a' };
    const y = parse(b);
    if (y.error) return { error: `Second number: ${y.error}`, field: 'b' };

    const steps = [];
    [convertStep(x, 'the first number'), convertStep(y, 'the second number')].forEach(s => s && steps.push(s));
    const fx = `${x.n}/${x.d}`, fy = `${y.n}/${y.d}`;
    let n, d;

    if (operation === 'add' || operation === 'subtract') {
      const sym = operation === 'add' ? '+' : '−';
      const sign = operation === 'add' ? 1n : -1n;
      if (x.d === y.d) {
        steps.push(`The denominators are already the same (${x.d}), so ${sym === '+' ? 'add' : 'subtract'} the numerators: ${x.n} ${sym} ${y.n} = ${x.n + sign * y.n}`);
        n = x.n + sign * y.n; d = x.d;
      } else {
        const lcd = lcm(x.d, y.d);
        const ka = lcd / x.d, kb = lcd / y.d;
        steps.push(`Find a common denominator: LCM(${x.d}, ${y.d}) = ${lcd}`);
        steps.push(`Rewrite both fractions: ${fx} = ${x.n * ka}/${lcd} and ${fy} = ${y.n * kb}/${lcd}`);
        n = x.n * ka + sign * y.n * kb; d = lcd;
        steps.push(`${sym === '+' ? 'Add' : 'Subtract'} the numerators: ${x.n * ka} ${sym} ${y.n * kb} = ${n}, giving ${n}/${d}`);
      }
    } else if (operation === 'multiply') {
      n = x.n * y.n; d = x.d * y.d;
      steps.push(`Multiply the numerators and the denominators: (${x.n} × ${y.n}) / (${x.d} × ${y.d}) = ${n}/${d}`);
    } else {
      if (y.n === 0n) return { error: 'You cannot divide by zero: the second number is 0, and division by 0 is undefined.', field: 'b' };
      steps.push(`Dividing by ${fy} is the same as multiplying by its reciprocal ${y.d}/${y.n}`);
      n = x.n * y.d; d = x.d * y.n;
      steps.push(`Multiply: (${x.n} × ${y.d}) / (${x.d} × ${y.n}) = ${n}/${d}`);
    }

    simplifyStep(n, d, steps);
    const out = result({ n, d }, steps);
    if (normalise(n, d).d !== 1n && abs(normalise(n, d).n) > normalise(n, d).d) {
      steps.push(`As a mixed number: ${out.mixed}`);
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
    const c = convertStep(p, 'the number');
    if (c) steps.push(c);
    if (p.n === 0n) {
      steps.push('0 divided by any non-zero number is 0');
      return Object.assign(result({ n: 0n, d: 1n }, steps), { gcd: p.d.toString(), alreadySimplest: false });
    }
    const euclid = gcdSteps(p.n, p.d);
    steps.push(`Find the greatest common divisor of ${abs(p.n)} and ${p.d} with Euclid's algorithm:`);
    euclid.steps.forEach(s => steps.push(`  ${s}`));
    steps.push(`GCD = ${euclid.gcd}`);
    if (euclid.gcd > 1n) steps.push(`Divide both by ${euclid.gcd}: ${p.n} ÷ ${euclid.gcd} = ${p.n / euclid.gcd}, ${p.d} ÷ ${euclid.gcd} = ${p.d / euclid.gcd}`);
    else steps.push('The GCD is 1, so the fraction is already in lowest terms');
    return Object.assign(result(p, steps), { gcd: euclid.gcd.toString(), alreadySimplest: euclid.gcd === 1n });
  }

  /** Terminating decimal -> fraction, e.g. 0.375 -> 3/8. */
  function decimalToFraction(input) {
    const raw = String(input === undefined || input === null ? '' : input).trim().replace(/[−–]/g, '-').replace(/,/g, '');
    if (!raw) return { error: 'Enter a decimal such as 0.375.' };
    const m = raw.match(/^([+-])?(\d*)(?:\.(\d+))?$/);
    if (!m || (!m[2] && !m[3])) {
      return { error: `"${raw}" is not a terminating decimal. Enter digits with an optional decimal point, such as 0.375 or 2.5. Repeating decimals like 0.333… cannot be entered exactly.` };
    }
    if ((m[2] + (m[3] || '')).length > MAX_DIGITS) return { error: 'That decimal is too long to work with here.' };
    const places = m[3] ? m[3].length : 0;
    const d = 10n ** BigInt(places);
    const n = (m[1] === '-' ? -1n : 1n) * (BigInt(m[2] || '0') * d + BigInt(m[3] || '0'));
    const steps = [];
    if (places) steps.push(`${raw} has ${places} decimal place${places === 1 ? '' : 's'}, so write it over 10^${places} = ${d}: ${n}/${d}`);
    else steps.push(`${raw} is a whole number: ${n}/1`);
    if (n !== 0n && places) {
      const g = gcd(n, d);
      steps.push(`GCD(${abs(n)}, ${d}) = ${g}`);
      if (g > 1n) steps.push(`Divide both by ${g}: ${n / g}/${d / g}`);
    }
    return result({ n, d }, steps);
  }

  return { gcd, lcm, parse, calculate, simplify, decimalToFraction, toMixed, toDecimal };
});
