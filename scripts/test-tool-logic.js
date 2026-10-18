#!/usr/bin/env node
/**
 * Comprehensive Unit & Seeded Property-Based Fuzz Tests
 * for all 10 ToolsBuilt Pure Logic Modules.
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let failures = 0;
let passed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    passed++;
  }
}

// Simple deterministic Mulberry32 PRNG for seeded fuzzing
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('--- Testing 10 Pure Logic Modules ---');

// 1. Age Calculator Logic
const ageLogic = require(path.join(ROOT, 'src/tools/age-calculator/logic.js'));
{
  // Leap year detection
  assert(ageLogic.isLeapYear(2000) === true, 'AgeLogic: 2000 is leap year');
  assert(ageLogic.isLeapYear(1900) === false, 'AgeLogic: 1900 is not leap year');
  assert(ageLogic.isLeapYear(2024) === true, 'AgeLogic: 2024 is leap year');
  assert(ageLogic.isLeapYear(2025) === false, 'AgeLogic: 2025 is not leap year');

  // Standard age
  const r1 = ageLogic.calculateAge('1995-05-15', '2026-10-17');
  assert(r1.years === 31 && r1.months === 5 && r1.days === 2, 'AgeLogic: 1995-05-15 to 2026-10-17 = 31y 5m 2d');
  assert(r1.totalDays === 11478, `AgeLogic: totalDays = 11478 (got ${r1.totalDays})`);

  // Leap day birthday (Feb 29, 2004) to March 1, 2025 (common year)
  const rMar1 = ageLogic.calculateAge('2004-02-29', '2025-03-01', { leapConvention: 'mar1' });
  assert(rMar1.years === 21 && rMar1.months === 0 && rMar1.days === 0, 'AgeLogic: Leap day birthday under mar1 rule = 21y 0m 0d');

  const rFeb28 = ageLogic.calculateAge('2004-02-29', '2025-03-01', { leapConvention: 'feb28' });
  assert(rFeb28.years === 21 && rFeb28.months === 0 && rFeb28.days === 1, 'AgeLogic: Leap day birthday under feb28 rule = 21y 0m 1d');

  // Birthday today
  const rToday = ageLogic.calculateAge('2000-10-17', '2026-10-17');
  assert(rToday.years === 26 && rToday.months === 0 && rToday.days === 0, 'AgeLogic: Birthday today = exact 26y');
  assert(rToday.nextBirthday.isToday === true, 'AgeLogic: nextBirthday.isToday is true');

  // Guard: DOB in future
  let threw = false;
  try {
    ageLogic.calculateAge('2030-01-01', '2026-01-01');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'AgeLogic: throws error when DOB is in future relative to target date');
}

// 2. Days Until Date Calculator Logic
const daysUntilLogic = require(path.join(ROOT, 'src/tools/days-until-date-calculator/logic.js'));
{
  const r = daysUntilLogic.calculateDaysUntil('2026-11-16', '2026-10-17');
  assert(r.totalDays === 30, 'DaysUntilLogic: 30 days until target');
  assert(r.weeks === 4 && r.daysAfterWeeks === 2, 'DaysUntilLogic: 4 weeks and 2 days');
  assert(r.isPast === false && r.isToday === false, 'DaysUntilLogic: future date flags');

  // Past date
  const past = daysUntilLogic.calculateDaysUntil('2026-10-10', '2026-10-17');
  assert(past.isPast === true && past.totalDays === -7, 'DaysUntilLogic: past date returns isPast = true and -7 days');

  // Today
  const today = daysUntilLogic.calculateDaysUntil('2026-10-17', '2026-10-17');
  assert(today.isToday === true && today.totalDays === 0, 'DaysUntilLogic: today returns isToday = true and 0 days');
}

// 3. Date Difference Calculator Logic
const dateDiffLogic = require(path.join(ROOT, 'src/tools/date-difference-calculator/logic.js'));
{
  // Mon to Fri exclusive
  const ex = dateDiffLogic.calculateDateDifference('2026-06-01', '2026-06-05', { includeEndDate: false });
  assert(ex.totalDays === 4, 'DateDiffLogic: Mon to Fri exclusive = 4 days');
  assert(ex.businessDays === 4, 'DateDiffLogic: Mon to Fri exclusive = 4 business days');

  // Mon to Fri inclusive
  const inc = dateDiffLogic.calculateDateDifference('2026-06-01', '2026-06-05', { includeEndDate: true });
  assert(inc.totalDays === 5, 'DateDiffLogic: Mon to Fri inclusive = 5 days');
  assert(inc.businessDays === 5, 'DateDiffLogic: Mon to Fri inclusive = 5 business days');

  // Weekend span (Fri to Mon inclusive)
  const wk = dateDiffLogic.calculateDateDifference('2026-10-16', '2026-10-19', { includeEndDate: true });
  assert(wk.totalDays === 4, 'DateDiffLogic: Fri to Mon inclusive = 4 calendar days');
  assert(wk.businessDays === 2, 'DateDiffLogic: Fri to Mon inclusive = 2 business days (Fri, Mon)');
  assert(wk.weekendDays === 2, 'DateDiffLogic: Fri to Mon inclusive = 2 weekend days (Sat, Sun)');

  // Reversed dates
  const rev = dateDiffLogic.calculateDateDifference('2026-10-20', '2026-10-10');
  assert(rev.isReversed === true && rev.totalDays === 10, 'DateDiffLogic: reversed dates auto-order and flag isReversed');
}

// 4. Add Days to Date Calculator Logic
const addDaysLogic = require(path.join(ROOT, 'src/tools/add-days-to-date-calculator/logic.js'));
{
  // Month clamping (Jan 31 + 1 month in common year 2027 -> Feb 28, 2027)
  const c1 = addDaysLogic.calculateAddDays('2027-01-31', 1, 'months', 'add');
  assert(c1.resultDate === '2027-02-28', `AddDaysLogic: Jan 31 2027 + 1 month = 2027-02-28 (got ${c1.resultDate})`);

  // Month clamping in leap year (Jan 31 + 1 month in 2028 -> Feb 29, 2028)
  const c2 = addDaysLogic.calculateAddDays('2028-01-31', 1, 'months', 'add');
  assert(c2.resultDate === '2028-02-29', `AddDaysLogic: Jan 31 2028 + 1 month = 2028-02-29 (got ${c2.resultDate})`);

  // Business days addition (Fri Oct 16 2026 + 5 business days = Fri Oct 23 2026)
  const b1 = addDaysLogic.calculateAddDays('2026-10-16', 5, 'days', 'add', { businessDaysOnly: true });
  assert(b1.resultDate === '2026-10-23', `AddDaysLogic: Fri Oct 16 + 5 business days = 2026-10-23 (got ${b1.resultDate})`);
  assert(b1.businessDays === 5 && b1.weekendDays === 2, 'AddDaysLogic: skips 2 weekend days');

  // Subtraction
  const sub = addDaysLogic.calculateAddDays('2026-10-17', 7, 'days', 'subtract');
  assert(sub.resultDate === '2026-10-10', 'AddDaysLogic: Oct 17 - 7 days = Oct 10');
}

// 5. Percentage Change Calculator Logic
const pctLogic = require(path.join(ROOT, 'src/tools/percentage-change-calculator/logic.js'));
{
  // Mode 1: increase & decrease
  const inc = pctLogic.calculatePercentChange(50, 75);
  assert(inc.percentChange === 50 && inc.direction === 'increase', 'PctLogic: 50 to 75 = +50% increase');

  const dec = pctLogic.calculatePercentChange(80, 60);
  assert(dec.percentChange === -25 && dec.direction === 'decrease', 'PctLogic: 80 to 60 = -25% decrease');

  // Guard: baseline zero
  let threw = false;
  try {
    pctLogic.calculatePercentChange(0, 50);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'PctLogic: throws error on oldVal === 0 (division by zero)');

  // Mode 2: percent of
  const pOf = pctLogic.calculatePercentOf(20, 150);
  assert(pOf.result === 30, 'PctLogic: 20% of 150 = 30');

  // Mode 3: what percent is X of Y
  const wPct = pctLogic.calculateWhatPercentIs(25, 200);
  assert(wPct.percent === 12.5, 'PctLogic: 25 of 200 = 12.5%');

  // Mode 4: percent difference
  const diff = pctLogic.calculatePercentDifference(100, 120);
  assert(Math.abs(diff.percentDifference - 18.1818) < 0.001, 'PctLogic: percent difference between 100 and 120 = 18.18%');
}

// 6. Discount Calculator Logic
const discLogic = require(path.join(ROOT, 'src/tools/discount-calculator/logic.js'));
{
  // Single discount
  const d1 = discLogic.calculateDiscount(100, 20);
  assert(d1.finalPrice === 80 && d1.totalSavings === 20, 'DiscLogic: $100 with 20% off = $80');

  // Stacked double discount: 20% then 10%
  const d2 = discLogic.calculateDiscount(100, 20, { stackedDiscountPercent: 10 });
  assert(d2.finalPrice === 72 && d2.totalSavings === 28, 'DiscLogic: $100 with 20% + 10% stacked = $72 ($28 saved)');
  assert(d2.effectiveDiscountPercent === 28, 'DiscLogic: effective discount = 28%');

  // Sales tax on discounted subtotal
  const d3 = discLogic.calculateDiscount(100, 20, { stackedDiscountPercent: 10, taxPercent: 8 });
  assert(d3.priceAfterDiscounts === 72, 'DiscLogic: price before tax = $72');
  assert(d3.taxAmount === 5.76, 'DiscLogic: tax (8% of $72) = $5.76');
  assert(d3.finalPrice === 77.76, 'DiscLogic: final price = $77.76');

  // Half-up cent rounding check
  const d4 = discLogic.calculateDiscount(19.99, 15);
  // 19.99 * 0.15 = 2.9985 -> rounded savings = 3.00, final = 16.99
  assert(d4.primarySavings === 3.00 && d4.finalPrice === 16.99, 'DiscLogic: half-up cent rounding verified');
}

// 7. Word Counter Logic
const wordLogic = require(path.join(ROOT, 'src/tools/word-counter/logic.js'));
{
  const text = 'Hello world 🚀 café crème. Hello world again!';
  const a = wordLogic.analyzeText(text);

  assert(a.words === 7, `WordLogic: 7 words counted (got ${a.words})`);
  assert(a.characters === 44, `WordLogic: 44 unicode characters (got ${a.characters})`);
  assert(a.charactersNoSpaces === 37, `WordLogic: 37 characters without spaces (got ${a.charactersNoSpaces})`);
  assert(a.sentences === 2, `WordLogic: 2 sentences (got ${a.sentences})`);

  // Keyword density excludes stop words ('again')
  assert(a.topWords[0].word === 'hello' && a.topWords[0].count === 2, 'WordLogic: "hello" is top word with 2 occurrences');
  assert(a.topWords[1].word === 'world' && a.topWords[1].count === 2, 'WordLogic: "world" is 2nd top word with 2 occurrences');
}

// 8. Text Case Converter Logic
const caseLogic = require(path.join(ROOT, 'src/tools/text-case-converter/logic.js'));
{
  const raw = 'the lord of the rings: a return of the king';
  const title = caseLogic.toTitleCase(raw);
  assert(title === 'The Lord of the Rings: A Return of the King', `CaseLogic: Title Case matches Chicago style: "${title}"`);

  const s = 'hello-world_test';
  assert(caseLogic.toCamelCase(s) === 'helloWorldTest', 'CaseLogic: camelCase');
  assert(caseLogic.toPascalCase(s) === 'HelloWorldTest', 'CaseLogic: PascalCase');
  assert(caseLogic.toSnakeCase(s) === 'hello_world_test', 'CaseLogic: snake_case');
  assert(caseLogic.toKebabCase(s) === 'hello-world-test', 'CaseLogic: kebab-case');
  assert(caseLogic.toConstantCase(s) === 'HELLO_WORLD_TEST', 'CaseLogic: CONSTANT_CASE');
  assert(caseLogic.toDotCase(s) === 'hello.world.test', 'CaseLogic: dot.case');

  const sentence = 'hello world. how are you? i am fine!';
  assert(caseLogic.toSentenceCase(sentence) === 'Hello world. How are you? I am fine!', 'CaseLogic: Sentence case');

  const alt = caseLogic.toAlternatingCase('abcde');
  assert(alt === 'aBcDe', `CaseLogic: alternating case "${alt}"`);
}

// 9. Password Generator Logic & EFF Wordlist
const pwLogic = require(path.join(ROOT, 'src/tools/password-generator/logic.js'));
const effWords = require(path.join(ROOT, 'src/tools/password-generator/eff-words.js'));
{
  assert(effWords.length === 1296, `PasswordLogic: EFF short wordlist has 1296 words (got ${effWords.length})`);

  // Seeded PRNG test for password generator
  const prngGen = mulberry32(12345);
  const customPrng = (max) => Math.floor(prngGen() * max);

  const pw = pwLogic.generatePassword({
    length: 16,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true
  }, customPrng);

  assert(pw.length === 16, 'PasswordLogic: length = 16');
  assert(/[A-Z]/.test(pw.password), 'PasswordLogic: contains uppercase');
  assert(/[a-z]/.test(pw.password), 'PasswordLogic: contains lowercase');
  assert(/[0-9]/.test(pw.password), 'PasswordLogic: contains numbers');
  assert(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pw.password), 'PasswordLogic: contains symbols');
  assert(pw.entropyBits > 90, `PasswordLogic: entropy > 90 bits (got ${pw.entropyBits})`);

  // Ambiguous character exclusion
  const pwNoAmb = pwLogic.generatePassword({
    length: 32,
    excludeSimilar: true
  }, customPrng);
  assert(!/[O0l1I|]/.test(pwNoAmb.password), 'PasswordLogic: excludes ambiguous characters O, 0, l, 1, I, |');

  // Passphrase test
  const pass = pwLogic.generatePassphrase({
    wordCount: 4,
    separator: '-',
    capitalize: 'title'
  }, customPrng, effWords);

  assert(pass.wordCount === 4, 'PasswordLogic: passphrase wordCount = 4');
  assert(pass.password.split('-').length === 4, 'PasswordLogic: separated by hyphen');
  assert(pass.entropyBits > 40, `PasswordLogic: passphrase entropy > 40 bits (got ${pass.entropyBits})`);
}

// 10. Random Name Picker Logic
const pickerLogic = require(path.join(ROOT, 'src/tools/random-name-picker/logic.js'));
{
  const rawList = 'Alice\nBob, Charlie; David\nAlice\n';
  const parsed = pickerLogic.parseNames(rawList, { dedupe: false });
  assert(parsed.length === 5, `PickerLogic: parsed 5 names (got ${parsed.length})`);

  const deduped = pickerLogic.parseNames(rawList, { dedupe: true });
  assert(deduped.length === 4, `PickerLogic: deduplicated 4 names (got ${deduped.length})`);

  // Seeded pickWinner test
  const prngGen = mulberry32(54321);
  const customPrng = (max) => Math.floor(prngGen() * max);

  const picked = pickerLogic.pickWinner(deduped, customPrng);
  assert(picked && deduped.includes(picked.winner), 'PickerLogic: pickWinner returned valid candidate');

  // Multiple winners without replacement
  const multi = pickerLogic.pickMultipleWinners(deduped, 2, { allowDuplicates: false }, customPrng);
  assert(multi.winners.length === 2, 'PickerLogic: 2 winners picked');
  assert(multi.winners[0] !== multi.winners[1], 'PickerLogic: winners are unique without replacement');
  assert(multi.remaining.length === 2, 'PickerLogic: 2 remaining candidates');
}

// Seeded Property-Based Fuzz Testing
console.log('\n--- Seeded Property-Based Fuzz Testing (500 iterations) ---');
{
  const prngGen = mulberry32(99999);
  const customPrng = (max) => Math.floor(prngGen() * max);

  // Fuzz Password Generator: test 200 random configs
  for (let i = 0; i < 200; i++) {
    const len = 8 + Math.floor(prngGen() * 60);
    const u = prngGen() > 0.3;
    const l = prngGen() > 0.3;
    const n = prngGen() > 0.3;
    const s = prngGen() > 0.3;
    if (!u && !l && !n && !s) continue;

    const res = pwLogic.generatePassword({ length: len, upper: u, lower: l, numbers: n, symbols: s }, customPrng);
    if (res.password.length !== len) {
      assert(false, `PW Fuzz fail: requested ${len}, got ${res.password.length}`);
    }
    if (u && !/[A-Z]/.test(res.password)) assert(false, `PW Fuzz fail: missing upper at i=${i}`);
    if (l && !/[a-z]/.test(res.password)) assert(false, `PW Fuzz fail: missing lower at i=${i}`);
    if (n && !/[0-9]/.test(res.password)) assert(false, `PW Fuzz fail: missing number at i=${i}`);
  }
  assert(true, 'PW Fuzz: 200 random password generation configs passed set inclusion');

  // Fuzz Date Math: verify round-trip symmetry
  for (let i = 0; i < 200; i++) {
    const year = 2020 + Math.floor(prngGen() * 10);
    const month = String(1 + Math.floor(prngGen() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(prngGen() * 28)).padStart(2, '0');
    const startStr = `${year}-${month}-${day}`;
    const delta = 1 + Math.floor(prngGen() * 100);

    const added = addDaysLogic.calculateAddDays(startStr, delta, 'days', 'add');
    const diff = dateDiffLogic.calculateDateDifference(startStr, added.resultDate, { includeEndDate: false });
    if (diff.totalDays !== delta) {
      assert(false, `Date Math Fuzz fail: added ${delta} days to ${startStr}, diff returned ${diff.totalDays}`);
      break;
    }
  }
  assert(true, 'Date Math Fuzz: 200 round-trip date addition & difference tests matched exactly');

  // Fuzz Discount: verify 0 <= finalPrice <= originalPrice (when tax=0)
  for (let i = 0; i < 100; i++) {
    const orig = 10 + prngGen() * 500;
    const disc = prngGen() * 100;
    const stacked = prngGen() * 50;
    const res = discLogic.calculateDiscount(orig, disc, { stackedDiscountPercent: stacked, taxPercent: 0 });
    if (res.finalPrice < 0 || res.finalPrice > orig + 0.01) {
      assert(false, `Discount Fuzz fail: orig=${orig}, final=${res.finalPrice}`);
      break;
    }
  }
  assert(true, 'Discount Fuzz: 100 random pricing configurations satisfied boundary bounds');
}

console.log(`\nLogic Tests Summary: ${passed} passed, ${failures} failed.`);
if (failures > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL PURE LOGIC & PROPERTY FUZZ TESTS PASSED!');
}
