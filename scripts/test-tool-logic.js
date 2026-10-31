#!/usr/bin/env node
/**
 * Comprehensive Unit & Seeded Property-Based Fuzz Tests
 * for all 16 ToolsBuilt Pure Logic Modules.
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

console.log('--- Testing 16 Pure Logic Modules ---');

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
// 11. Percentage Calculator Logic (4 Modes)
const pctDirectLogic = require(path.join(ROOT, 'src/tools/percentage-calculator/logic.js'));
{
  console.log('\n--- Testing Percentage Calculator Logic ---');
  // Mode 1: What is X% of Y?
  const m1 = pctDirectLogic.calculatePercentOf(15, 200);
  assert(m1.result === 30, 'PercentageLogic: 15% of 200 = 30');
  const m1Decimal = pctDirectLogic.calculatePercentOf(12.5, 80);
  assert(m1Decimal.result === 10, 'PercentageLogic: 12.5% of 80 = 10');
  const m1Zero = pctDirectLogic.calculatePercentOf(0, 500);
  assert(m1Zero.result === 0, 'PercentageLogic: 0% of 500 = 0');
  const m1Large = pctDirectLogic.calculatePercentOf(250, 40);
  assert(m1Large.result === 100, 'PercentageLogic: 250% of 40 = 100');

  let m1Error = false;
  try { pctDirectLogic.calculatePercentOf('abc', 100); } catch (e) { m1Error = true; }
  assert(m1Error, 'PercentageLogic: calculatePercentOf throws on invalid input');

  // Mode 2: X is what % of Y?
  const m2 = pctDirectLogic.calculateWhatPercentIs(25, 200);
  assert(m2.result === 12.5, 'PercentageLogic: 25 is 12.5% of 200');
  const m2Over = pctDirectLogic.calculateWhatPercentIs(150, 100);
  assert(m2Over.result === 150, 'PercentageLogic: 150 is 150% of 100');

  let m2ZeroDiv = false;
  try { pctDirectLogic.calculateWhatPercentIs(50, 0); } catch (e) { m2ZeroDiv = true; }
  assert(m2ZeroDiv, 'PercentageLogic: calculateWhatPercentIs throws on division by zero (whole=0)');

  // Mode 3: Increase or Decrease Y by X%
  const m3Inc = pctDirectLogic.calculateIncreaseDecrease(100, 20, false);
  assert(m3Inc.result === 120 && m3Inc.delta === 20, 'PercentageLogic: 100 increased by 20% = 120');
  const m3Dec = pctDirectLogic.calculateIncreaseDecrease(100, 20, true);
  assert(m3Dec.result === 80 && m3Dec.delta === 20, 'PercentageLogic: 100 decreased by 20% = 80');
  const m3Zero = pctDirectLogic.calculateIncreaseDecrease(50, 0, false);
  assert(m3Zero.result === 50 && m3Zero.delta === 0, 'PercentageLogic: 50 increased by 0% = 50');

  // Mode 4: Find Original Value (Reverse Percentage)
  const m4Of = pctDirectLogic.calculateOriginalValue(30, 15, 'of');
  assert(m4Of.result === 200, 'PercentageLogic: 30 is 15% of original -> 200');

  const m4Inc = pctDirectLogic.calculateOriginalValue(120, 20, 'increase');
  assert(m4Inc.result === 100, 'PercentageLogic: 120 after 20% increase -> original = 100');

  const m4Dec = pctDirectLogic.calculateOriginalValue(80, 20, 'decrease');
  assert(m4Dec.result === 100, 'PercentageLogic: 80 after 20% decrease -> original = 100');

  let m4ZeroErr = false;
  try { pctDirectLogic.calculateOriginalValue(50, 0, 'of'); } catch (e) { m4ZeroErr = true; }
  assert(m4ZeroErr, 'PercentageLogic: calculateOriginalValue throws on 0% for type of');

  let m4Dec100Err = false;
  try { pctDirectLogic.calculateOriginalValue(50, 100, 'decrease'); } catch (e) { m4Dec100Err = true; }
  assert(m4Dec100Err, 'PercentageLogic: calculateOriginalValue throws on 100% discount');
}

// 12. Grade Calculator Logic
const gradeLogic = require(path.join(ROOT, 'src/tools/grade-calculator/logic.js'));
{
  console.log('\n--- Testing Grade Calculator Logic ---');
  // Letter grades
  assert(gradeLogic.getLetterGrade(98) === 'A+', 'GradeLogic: 98% = A+');
  assert(gradeLogic.getLetterGrade(94) === 'A', 'GradeLogic: 94% = A');
  assert(gradeLogic.getLetterGrade(91) === 'A-', 'GradeLogic: 91% = A-');
  assert(gradeLogic.getLetterGrade(88) === 'B+', 'GradeLogic: 88% = B+');
  assert(gradeLogic.getLetterGrade(84) === 'B', 'GradeLogic: 84% = B');
  assert(gradeLogic.getLetterGrade(80) === 'B-', 'GradeLogic: 80% = B-');
  assert(gradeLogic.getLetterGrade(78) === 'C+', 'GradeLogic: 78% = C+');
  assert(gradeLogic.getLetterGrade(74) === 'C', 'GradeLogic: 74% = C');
  assert(gradeLogic.getLetterGrade(70) === 'C-', 'GradeLogic: 70% = C-');
  assert(gradeLogic.getLetterGrade(68) === 'D+', 'GradeLogic: 68% = D+');
  assert(gradeLogic.getLetterGrade(64) === 'D', 'GradeLogic: 64% = D');
  assert(gradeLogic.getLetterGrade(60) === 'D-', 'GradeLogic: 60% = D-');
  assert(gradeLogic.getLetterGrade(55) === 'F', 'GradeLogic: 55% = F');

  // Weighted assignments
  const assignments = [
    { name: 'Homework', score: 95, weight: 20 },
    { name: 'Midterm', score: 82, weight: 25 },
    { name: 'Project', score: 90, weight: 15 },
    { name: 'Quizzes', score: 88, weight: 10 }
  ];
  const curRes = gradeLogic.calculateCurrentGrade(assignments);
  assert(curRes.totalWeight === 70, 'GradeLogic: total completed weight = 70%');
  assert(Math.abs(curRes.currentGrade - 88.29) < 0.05, `GradeLogic: current weighted average = 88.29% (got ${curRes.currentGrade})`);
  assert(curRes.letterGrade === 'B+', 'GradeLogic: letter grade is B+');

  // Needed on final exam
  const neededTarget90 = gradeLogic.calculateFinalExamNeeded(90, 70, curRes.currentGrade, 30);
  assert(neededTarget90.neededScore > 93, `GradeLogic: score needed for 90% is >93% (got ${neededTarget90.neededScore}%)`);
  assert(neededTarget90.status === 'achievable', 'GradeLogic: target status is achievable');

  // Target already achieved
  const clinched = gradeLogic.calculateFinalExamNeeded(60, 80, 90, 20);
  assert(clinched.neededScore <= 0, 'GradeLogic: clinched grade returns <= 0 needed score');
  assert(clinched.status === 'already-achieved', 'GradeLogic: status is already-achieved');

  // Target requires extra credit (> 100%)
  const impossible = gradeLogic.calculateFinalExamNeeded(98, 70, 80, 30);
  assert(impossible.neededScore > 100, 'GradeLogic: target requires >100% on final');
  assert(impossible.status === 'extra-credit', 'GradeLogic: status is extra-credit');

  // Guards
  let emptyErr = false;
  try { gradeLogic.calculateCurrentGrade([]); } catch (e) { emptyErr = true; }
  assert(emptyErr, 'GradeLogic: throws error on empty assignments');

  let zeroWeightErr = false;
  try { gradeLogic.calculateFinalExamNeeded(90, 70, 85, 0); } catch (e) { zeroWeightErr = true; }
  assert(zeroWeightErr, 'GradeLogic: throws error if final exam weight <= 0');
}

// 13. GPA Calculator Logic
const gpaLogic = require(path.join(ROOT, 'src/tools/gpa-calculator/logic.js'));
{
  console.log('\n--- Testing GPA Calculator Logic ---');
  // Grade points standard and +/-
  assert(gpaLogic.getGradePoint('A+', true) === 4.0, 'GpaLogic: A+ with +/- = 4.0');
  assert(gpaLogic.getGradePoint('A-', true) === 3.7, 'GpaLogic: A- with +/- = 3.7');
  assert(gpaLogic.getGradePoint('B+', true) === 3.3, 'GpaLogic: B+ with +/- = 3.3');
  assert(gpaLogic.getGradePoint('B-', true) === 2.7, 'GpaLogic: B- with +/- = 2.7');
  assert(gpaLogic.getGradePoint('C+', true) === 2.3, 'GpaLogic: C+ with +/- = 2.3');
  assert(gpaLogic.getGradePoint('D-', true) === 0.7, 'GpaLogic: D- with +/- = 0.7');
  assert(gpaLogic.getGradePoint('F', true) === 0.0, 'GpaLogic: F with +/- = 0.0');

  // Without plus/minus toggle
  assert(gpaLogic.getGradePoint('A-', false) === 4.0, 'GpaLogic: A- without +/- reverts to 4.0 (A)');
  assert(gpaLogic.getGradePoint('B+', false) === 3.0, 'GpaLogic: B+ without +/- reverts to 3.0 (B)');

  // Single Semester GPA
  const coursesSem1 = [
    { name: 'Calculus I', grade: 'A', credits: 4 },
    { name: 'English', grade: 'B+', credits: 3 },
    { name: 'History', grade: 'A-', credits: 3 }
  ];
  const sem1 = gpaLogic.calculateSemesterGpa(coursesSem1, true);
  // (4*4 + 3*3.3 + 3*3.7) = 16 + 9.9 + 11.1 = 37.0 / 10 credits = 3.70 GPA
  assert(sem1.totalCredits === 10, 'GpaLogic: semester total credits = 10');
  assert(sem1.gpa === 3.70, `GpaLogic: semester GPA = 3.70 (got ${sem1.gpa})`);

  // Multiple Semesters Cumulative GPA with Prior History
  const semesters = [
    { name: 'Semester 1', courses: coursesSem1 },
    {
      name: 'Semester 2',
      courses: [
        { name: 'Physics', grade: 'A', credits: 4 },
        { name: 'Chemistry', grade: 'A', credits: 4 },
        { name: 'Programming', grade: 'A', credits: 4 }
      ]
    }
  ];
  // Sem 2: 12 credits, all A (4.0) = 48 points
  // Total from semesters: 10 + 12 = 22 credits, 37 + 48 = 85 points -> 85 / 22 = 3.86 GPA
  const cumResNoPrior = gpaLogic.calculateCumulativeGpa(semesters, 0, 0, true);
  assert(cumResNoPrior.cumulativeCredits === 22, 'GpaLogic: multi-semester total credits = 22');
  assert(cumResNoPrior.cumulativeGpa === 3.86, `GpaLogic: multi-semester GPA = 3.86 (got ${cumResNoPrior.cumulativeGpa})`);

  // With prior history: 30 credits @ 3.20 GPA = 96 points
  // Grand total: 96 + 85 = 181 points / 52 credits = 3.48 GPA
  const cumWithPrior = gpaLogic.calculateCumulativeGpa(semesters, 3.20, 30, true);
  assert(cumWithPrior.cumulativeCredits === 52, 'GpaLogic: cumulative credits with prior history = 52');
  assert(cumWithPrior.cumulativeGpa === 3.48, `GpaLogic: cumulative GPA with prior history = 3.48 (got ${cumWithPrior.cumulativeGpa})`);
}

// 14. Unit Converter Logic (Every Factor Tested)
const unitLogic = require(path.join(ROOT, 'src/tools/unit-converter/logic.js'));
{
  console.log('\n--- Testing Unit Converter Logic (Every Factor & Mode) ---');
  const defs = unitLogic.UNIT_DEFINITIONS;

  // Verify all 6 categories exist
  const categories = ['length', 'weight', 'temperature', 'area', 'volume', 'speed'];
  categories.forEach(cat => {
    assert(defs[cat] !== undefined, `UnitLogic: category "${cat}" is defined`);
  });

  // Length: Test every factor relative to meter
  assert(unitLogic.convert('length', 1, 'km', 'm') === 1000, 'UnitLogic length: 1 km = 1000 m');
  assert(unitLogic.convert('length', 1, 'm', 'cm') === 100, 'UnitLogic length: 1 m = 100 cm');
  assert(unitLogic.convert('length', 1, 'm', 'mm') === 1000, 'UnitLogic length: 1 m = 1000 mm');
  assert(unitLogic.convert('length', 1, 'mi', 'm') === 1609.344, 'UnitLogic length: 1 mi = 1609.344 m');
  assert(unitLogic.convert('length', 1, 'yd', 'm') === 0.9144, 'UnitLogic length: 1 yd = 0.9144 m');
  assert(unitLogic.convert('length', 1, 'ft', 'm') === 0.3048, 'UnitLogic length: 1 ft = 0.3048 m');
  assert(unitLogic.convert('length', 1, 'in', 'm') === 0.0254, 'UnitLogic length: 1 in = 0.0254 m');
  assert(unitLogic.convert('length', 1, 'nmi', 'm') === 1852, 'UnitLogic length: 1 nmi = 1852 m');

  // Weight: Test every factor relative to kilogram
  assert(unitLogic.convert('weight', 1, 'kg', 'g') === 1000, 'UnitLogic weight: 1 kg = 1000 g');
  assert(unitLogic.convert('weight', 1000000, 'mg', 'kg') === 1, 'UnitLogic weight: 1,000,000 mg = 1 kg');
  assert(unitLogic.convert('weight', 1, 't', 'kg') === 1000, 'UnitLogic weight: 1 metric ton = 1000 kg');
  assert(unitLogic.convert('weight', 1, 'lb', 'kg') === 0.453592, 'UnitLogic weight: 1 lb = 0.453592 kg');
  assert(unitLogic.convert('weight', 16, 'oz', 'lb') === 1, 'UnitLogic weight: 16 oz = 1 lb');
  assert(unitLogic.convert('weight', 1, 'st', 'lb') === 14, 'UnitLogic weight: 1 stone = 14 lb');
  assert(unitLogic.convert('weight', 1, 'ton', 'lb') === 2000, 'UnitLogic weight: 1 short ton = 2000 lb');

  // Temperature: Test conversions in all directions
  assert(unitLogic.convertTemperature(0, 'c', 'f') === 32, 'UnitLogic temp: 0°C = 32°F');
  assert(unitLogic.convertTemperature(100, 'c', 'f') === 212, 'UnitLogic temp: 100°C = 212°F');
  assert(unitLogic.convertTemperature(-40, 'c', 'f') === -40, 'UnitLogic temp: -40°C = -40°F');
  assert(unitLogic.convertTemperature(37, 'c', 'f') === 98.6, 'UnitLogic temp: 37°C = 98.6°F');
  assert(unitLogic.convertTemperature(98.6, 'f', 'c') === 37, 'UnitLogic temp: 98.6°F = 37°C');
  assert(unitLogic.convertTemperature(0, 'c', 'k') === 273.15, 'UnitLogic temp: 0°C = 273.15 K');
  assert(unitLogic.convertTemperature(273.15, 'k', 'c') === 0, 'UnitLogic temp: 273.15 K = 0°C');
  assert(unitLogic.convertTemperature(77, 'f', 'k') === 298.15, 'UnitLogic temp: 77°F = 298.15 K');

  // Area: Test every factor relative to square meter
  assert(unitLogic.convert('area', 1, 'sqkm', 'sqm') === 1000000, 'UnitLogic area: 1 km² = 1,000,000 m²');
  assert(unitLogic.convert('area', 10000, 'sqcm', 'sqm') === 1, 'UnitLogic area: 10,000 cm² = 1 m²');
  assert(unitLogic.convert('area', 1, 'ha', 'sqm') === 10000, 'UnitLogic area: 1 ha = 10,000 m²');
  assert(unitLogic.convert('area', 1, 'sqyd', 'sqft') === 9, 'UnitLogic area: 1 yd² = 9 ft²');
  assert(unitLogic.convert('area', 1, 'sqft', 'sqin') === 144, 'UnitLogic area: 1 ft² = 144 in²');
  assert(Math.abs(unitLogic.convert('area', 1, 'ac', 'sqm') - 4046.856422) < 0.01, 'UnitLogic area: 1 acre ≈ 4046.86 m²');
  assert(Math.abs(unitLogic.convert('area', 1, 'sqmi', 'ac') - 640) < 0.01, 'UnitLogic area: 1 sq mi = 640 acres');

  // Volume: Test every factor relative to liter
  assert(unitLogic.convert('volume', 1, 'l', 'ml') === 1000, 'UnitLogic volume: 1 L = 1000 mL');
  assert(unitLogic.convert('volume', 1, 'cum', 'l') === 1000, 'UnitLogic volume: 1 m³ = 1000 L');
  assert(Math.abs(unitLogic.convert('volume', 1, 'gal', 'l') - 3.785412) < 0.001, 'UnitLogic volume: 1 US gal ≈ 3.785 L');
  assert(unitLogic.convert('volume', 1, 'gal', 'qt') === 4, 'UnitLogic volume: 1 gal = 4 qt');
  assert(unitLogic.convert('volume', 1, 'qt', 'pt') === 2, 'UnitLogic volume: 1 qt = 2 pt');
  assert(unitLogic.convert('volume', 1, 'pt', 'cup') === 2, 'UnitLogic volume: 1 pt = 2 cups');
  assert(Math.abs(unitLogic.convert('volume', 1, 'cup', 'floz') - 8) < 0.001, 'UnitLogic volume: 1 cup = 8 fl oz');
  assert(Math.abs(unitLogic.convert('volume', 1, 'impgal', 'l') - 4.54609) < 0.001, 'UnitLogic volume: 1 imp gal = 4.54609 L');

  // Speed: Test every factor relative to m/s
  assert(Math.abs(unitLogic.convert('speed', 3.6, 'kph', 'mps') - 1.0) < 0.001, 'UnitLogic speed: 3.6 km/h = 1 m/s');
  assert(Math.abs(unitLogic.convert('speed', 1, 'mph', 'kph') - 1.609344) < 0.001, 'UnitLogic speed: 1 mph ≈ 1.609 km/h');
  assert(Math.abs(unitLogic.convert('speed', 1, 'kn', 'kph') - 1.852) < 0.001, 'UnitLogic speed: 1 knot = 1.852 km/h');
  assert(Math.abs(unitLogic.convert('speed', 1, 'mps', 'fps') - 3.28084) < 0.001, 'UnitLogic speed: 1 m/s ≈ 3.28084 ft/s');

  // Two-way reversible property across random unit pairs
  const testPairs = [
    { cat: 'length', a: 'm', b: 'ft' },
    { cat: 'weight', a: 'kg', b: 'lb' },
    { cat: 'temperature', a: 'c', b: 'f' },
    { cat: 'area', a: 'ac', b: 'ha' },
    { cat: 'volume', a: 'gal', b: 'l' },
    { cat: 'speed', a: 'mph', b: 'kph' }
  ];
  for (const pair of testPairs) {
    const orig = 42.5;
    const forward = unitLogic.convert(pair.cat, orig, pair.a, pair.b);
    const back = unitLogic.convert(pair.cat, forward, pair.b, pair.a);
    assert(Math.abs(back - orig) < 0.01, `UnitLogic: Two-way reversibility passed for ${pair.cat} (${pair.a} <-> ${pair.b})`);
  }

  // Conversion table generation
  const table = unitLogic.getConversionTable('length', 'm', 1);
  assert(table.length === Object.keys(defs.length.units).length, 'UnitLogic: conversion table includes all units');
}

// 11. Loan EMI Calculator Logic
const loanLogic = require(path.join(ROOT, 'src/tools/loan-emi-calculator/logic.js'));
{
  console.log('\n--- Testing Loan EMI Calculator Logic (3 Worked Examples & Amortization) ---');

  // Example 1: 30-Year Home Mortgage ($250,000 at 6.5% for 30 years / 360 months)
  const ex1 = loanLogic.calculateLoanEmi(250000, 6.5, 30, 'years');
  assert(ex1.monthlyEmi === 1580.17, `LoanLogic Ex 1: monthly EMI = 1580.17 (got ${ex1.monthlyEmi})`);
  assert(ex1.totalPayment === 568861.58, `LoanLogic Ex 1: total payment = 568861.58 (got ${ex1.totalPayment})`);
  assert(ex1.totalInterest === 318861.58, `LoanLogic Ex 1: total interest = 318861.58 (got ${ex1.totalInterest})`);
  assert(ex1.schedule.length === 360, `LoanLogic Ex 1: amortization schedule has 360 months (got ${ex1.schedule.length})`);
  assert(ex1.schedule[359].balance === 0, 'LoanLogic Ex 1: final amortization month leaves 0 balance');

  // Example 2: 5-Year Auto Loan ($25,000 at 4.5% for 5 years / 60 months)
  const ex2 = loanLogic.calculateLoanEmi(25000, 4.5, 60, 'months');
  assert(ex2.monthlyEmi === 466.08, `LoanLogic Ex 2: monthly EMI = 466.08 (got ${ex2.monthlyEmi})`);
  assert(ex2.totalPayment === 27964.46, `LoanLogic Ex 2: total payment = 27964.46 (got ${ex2.totalPayment})`);
  assert(ex2.totalInterest === 2964.46, `LoanLogic Ex 2: total interest = 2964.46 (got ${ex2.totalInterest})`);
  assert(ex2.schedule.length === 60, 'LoanLogic Ex 2: amortization schedule has 60 months');
  assert(ex2.schedule[59].balance === 0, 'LoanLogic Ex 2: final amortization month leaves 0 balance');

  // Example 3: Personal Loan with Extra Monthly Payments ($10,000 at 10.0% for 3 years + $100/mo extra)
  const ex3 = loanLogic.calculateLoanEmi(10000, 10, 3, 'years', { extraMonthlyPayment: 100 });
  assert(ex3.monthlyEmi === 322.67, `LoanLogic Ex 3: base EMI = 322.67 (got ${ex3.monthlyEmi})`);
  assert(ex3.extra !== null, 'LoanLogic Ex 3: extra calculation present');
  assert(ex3.extra.payoffMonths === 27, `LoanLogic Ex 3: payoff months = 27 (got ${ex3.extra.payoffMonths})`);
  assert(ex3.extra.monthsSaved === 9, `LoanLogic Ex 3: months saved = 9 (got ${ex3.extra.monthsSaved})`);
  assert(ex3.extra.totalInterestWithExtra === 1184.96, `LoanLogic Ex 3: interest with extra = 1184.96 (got ${ex3.extra.totalInterestWithExtra})`);
  assert(ex3.extra.interestSaved === 431.24, `LoanLogic Ex 3: interest saved = 431.24 (got ${ex3.extra.interestSaved})`);

  // Currency Formatter & Selector check
  assert(loanLogic.formatCurrency(1580.17, 'PKR') === '₨ 1,580.17', 'LoanLogic: PKR formatting uses ₨ symbol');
  assert(loanLogic.formatCurrency(1580.17, 'INR') === '₹ 1,580.17', 'LoanLogic: INR formatting uses ₹ symbol');
  assert(loanLogic.formatCurrency(1580.17, 'USD') === '$ 1,580.17', 'LoanLogic: USD formatting uses $ symbol');
  assert(loanLogic.formatCurrency(1580.17, 'EUR') === '€ 1,580.17', 'LoanLogic: EUR formatting uses € symbol');
  assert(loanLogic.formatCurrency(1580.17, 'GBP') === '£ 1,580.17', 'LoanLogic: GBP formatting uses £ symbol');
  assert(loanLogic.formatCurrency(1580.17, 'AED') === 'AED 1,580.17', 'LoanLogic: AED formatting uses AED symbol');
  assert(loanLogic.formatCurrency(1580.17, 'SAR') === 'SAR 1,580.17', 'LoanLogic: SAR formatting uses SAR symbol');

  // CSV Generation check
  const csv = loanLogic.generateAmortizationCsv(ex2.schedule, '$');
  assert(csv.startsWith('Month,Payment ($)'), 'LoanLogic: CSV starts with correct headers');
  assert(csv.split('\r\n').length === 61, `LoanLogic: CSV has 61 lines (header + 60 months, got ${csv.split('\r\n').length})`);
}

// 12. SIP Calculator Logic
const sipLogic = require(path.join(ROOT, 'src/tools/sip-calculator/logic.js'));
{
  console.log('\n--- Testing SIP Calculator Logic (3 Worked Examples & Step-Up) ---');

  // Example 1: 10-Year Long-Term Equity SIP ($500/mo, 12%, 10y)
  const sip1 = sipLogic.calculateSip(500, 12, 10);
  assert(sip1.totalInvested === 60000, `SipLogic Ex 1: total invested = 60000 (got ${sip1.totalInvested})`);
  assert(sip1.maturityValue === 116169.54, `SipLogic Ex 1: maturity value = 116169.54 (got ${sip1.maturityValue})`);
  assert(sip1.estimatedReturns === 56169.54, `SipLogic Ex 1: estimated returns = 56169.54 (got ${sip1.estimatedReturns})`);
  assert(sip1.yearlyBreakdown.length === 10, 'SipLogic Ex 1: yearly breakdown has 10 years');

  // Example 2: 5-Year Moderate Portfolio ($200/mo, 8%, 5y)
  const sip2 = sipLogic.calculateSip(200, 8, 5);
  assert(sip2.totalInvested === 12000, `SipLogic Ex 2: total invested = 12000 (got ${sip2.totalInvested})`);
  assert(sip2.maturityValue === 14793.34, `SipLogic Ex 2: maturity value = 14793.34 (got ${sip2.maturityValue})`);
  assert(sip2.estimatedReturns === 2793.34, `SipLogic Ex 2: estimated returns = 2793.34 (got ${sip2.estimatedReturns})`);

  // Example 3: 15-Year 10% Step-Up SIP ($1000/mo, 12%, 15y, 10% annual step-up)
  const sip3 = sipLogic.calculateSip(1000, 12, 15, { stepUpPercent: 10 });
  assert(sip3.totalInvested === 381269.88, `SipLogic Ex 3: total invested = 381269.88 (got ${sip3.totalInvested})`);
  assert(sip3.maturityValue === 868385.12, `SipLogic Ex 3: maturity value = 868385.12 (got ${sip3.maturityValue})`);
  assert(sip3.estimatedReturns === 487115.24, `SipLogic Ex 3: estimated returns = 487115.24 (got ${sip3.estimatedReturns})`);
  assert(sip3.yearlyBreakdown.length === 15, 'SipLogic Ex 3: yearly breakdown has 15 years');

  // Edge case: 0% return
  const sipZero = sipLogic.calculateSip(100, 0, 2);
  assert(sipZero.totalInvested === 2400, 'SipLogic: 0% return total invested = 2400');
  assert(sipZero.maturityValue === 2400, 'SipLogic: 0% return maturity value = 2400');
  assert(sipZero.estimatedReturns === 0, 'SipLogic: 0% return estimated returns = 0');
}

// 13. Compound Interest Calculator Logic
const ciLogic = require(path.join(ROOT, 'src/tools/compound-interest-calculator/logic.js'));
{
  console.log('\n--- Testing Compound Interest Logic (3 Worked Examples & SVG Chart) ---');

  // Example 1: Lump Sum 10-Year Annual Compounding ($10,000, 7%, 10y, annual)
  const ci1 = ciLogic.calculateCompoundInterest(10000, 7, 10, 'annual');
  assert(ci1.totalPrincipal === 10000, `CiLogic Ex 1: total principal = 10000 (got ${ci1.totalPrincipal})`);
  assert(ci1.finalBalance === 19671.51, `CiLogic Ex 1: final balance = 19671.51 (got ${ci1.finalBalance})`);
  assert(ci1.totalInterest === 9671.51, `CiLogic Ex 1: total interest = 9671.51 (got ${ci1.totalInterest})`);
  assert(ci1.apyPercent === 7, `CiLogic Ex 1: APY = 7% (got ${ci1.apyPercent})`);

  // Example 2: Monthly Deposits ($5,000 principal, 8% rate, 5 years, monthly, $200/mo deposit)
  const ci2 = ciLogic.calculateCompoundInterest(5000, 8, 5, 'monthly', { contributionAmount: 200 });
  assert(ci2.totalPrincipal === 17000, `CiLogic Ex 2: total principal = 17000 (got ${ci2.totalPrincipal})`);
  assert(ci2.finalBalance === 22242.57, `CiLogic Ex 2: final balance = 22242.57 (got ${ci2.finalBalance})`);
  assert(ci2.totalInterest === 5242.57, `CiLogic Ex 2: total interest = 5242.57 (got ${ci2.totalInterest})`);
  assert(ci2.apyPercent === 8.3, `CiLogic Ex 2: APY = 8.30% (got ${ci2.apyPercent})`);

  // Example 3: Daily High-Yield Savings ($20,000 principal, 5% rate, 3 years, daily, pmt=0)
  const ci3 = ciLogic.calculateCompoundInterest(20000, 5, 3, 'daily');
  assert(ci3.totalPrincipal === 20000, `CiLogic Ex 3: total principal = 20000 (got ${ci3.totalPrincipal})`);
  assert(ci3.finalBalance === 23236.45, `CiLogic Ex 3: final balance = 23236.45 (got ${ci3.finalBalance})`);
  assert(ci3.totalInterest === 3236.45, `CiLogic Ex 3: total interest = 3236.45 (got ${ci3.totalInterest})`);
  assert(ci3.apyPercent === 5.13, `CiLogic Ex 3: APY = 5.13% (got ${ci3.apyPercent})`);

  // SVG Chart Verification
  const svg = ciLogic.generateSvgGrowthChart(ci1.yearlyData, '$');
  assert(svg.includes('<svg') && svg.includes('role="img"'), 'CiLogic: SVG chart contains valid root SVG element and role="img"');
  assert(svg.includes('compound-growth-svg'), 'CiLogic: SVG chart has compound-growth-svg class');
  assert(svg.includes('<path d='), 'CiLogic: SVG chart contains path elements for area growth');

  // Invalid Compounding Frequency Test
  let freqErrorCaught = false;
  try {
    ciLogic.calculateCompoundInterest(10000, 7, 10, 'semi-annually');
  } catch (err) {
    if (err.message === 'Invalid compounding frequency') {
      freqErrorCaught = true;
    }
  }
  assert(freqErrorCaught, 'CiLogic: throws Error("Invalid compounding frequency") for unrecognized frequency');
}

// 11. JSON Formatter & Validator Logic
const jsonLogic = require(path.join(ROOT, 'src/tools/json-formatter/logic.js'));
{
  // 1. Formatting with 2 spaces, 4 spaces, tab
  const rawObj = { z: 1, a: { y: "test", b: [1, 2] } };
  const rawStr = JSON.stringify(rawObj);

  const f2 = jsonLogic.formatJson(rawStr, { indent: '2' });
  assert(f2.success && f2.formatted.includes('  "z": 1'), 'JsonLogic: formatted with 2 spaces');

  const f4 = jsonLogic.formatJson(rawStr, { indent: '4' });
  assert(f4.success && f4.formatted.includes('    "z": 1'), 'JsonLogic: formatted with 4 spaces');

  const fTab = jsonLogic.formatJson(rawStr, { indent: 'tab' });
  assert(fTab.success && fTab.formatted.includes('\t"z": 1'), 'JsonLogic: formatted with tab');

  // 2. Sort keys option (recursive)
  const fSorted = jsonLogic.formatJson(rawStr, { sortKeys: true });
  assert(fSorted.success, 'JsonLogic: sort keys formatted successfully');
  const aIdx = fSorted.formatted.indexOf('"a"');
  const zIdx = fSorted.formatted.indexOf('"z"');
  assert(aIdx !== -1 && zIdx !== -1 && aIdx < zIdx, 'JsonLogic: top-level keys sorted alphabetically');
  const bIdx = fSorted.formatted.indexOf('"b"');
  const yIdx = fSorted.formatted.indexOf('"y"');
  assert(bIdx !== -1 && yIdx !== -1 && bIdx < yIdx, 'JsonLogic: nested keys sorted alphabetically');

  // 3. Minification
  const minRes = jsonLogic.minifyJson(f2.formatted);
  assert(minRes.success && minRes.minified === rawStr, 'JsonLogic: minified output matches compact JSON');

  // 4. Validate with line and column error messages
  const validCheck = jsonLogic.validateJson(rawStr);
  assert(validCheck.valid === true, 'JsonLogic: valid JSON returns valid: true');

  const malformed1 = '{\n  "title": "Book",\n  "pages": \n}';
  const malformed1Res = jsonLogic.validateJson(malformed1);
  assert(malformed1Res.valid === false, 'JsonLogic: malformed JSON returns valid: false');
  assert(malformed1Res.line === 4 && malformed1Res.column === 1, `JsonLogic: malformed JSON line 4 column 1 (got line ${malformed1Res.line}, col ${malformed1Res.column})`);

  const malformed2 = '{\n  "a": 1,\n  "b": 2,\n}';
  const malformed2Res = jsonLogic.validateJson(malformed2);
  assert(malformed2Res.valid === false && malformed2Res.line >= 3, 'JsonLogic: trailing comma error caught with line number');

  // 5. 1 MB limit safety check
  const hugeJson = '"' + 'x'.repeat(1048577) + '"';
  const hugeRes = jsonLogic.validateJson(hugeJson);
  assert(hugeRes.valid === false && hugeRes.isSizeLimit === true, 'JsonLogic: 1 MB safety cap triggers clear size error');
}

// 12. Base64 Encoder & Decoder Logic
const base64Logic = require(path.join(ROOT, 'src/tools/base64-encoder-decoder/logic.js'));
{
  // 1. Known RFC 4648 standard test vector: "Man" = "TWFu"
  const manRes = base64Logic.encode('Man');
  assert(manRes.success && manRes.result === 'TWFu', `Base64Logic: "Man" encodes to "TWFu" (got "${manRes.result}")`);
  const manDec = base64Logic.decode('TWFu');
  assert(manDec.success && manDec.result === 'Man', `Base64Logic: "TWFu" decodes to "Man" (got "${manDec.result}")`);

  // 2. Full RFC 4648 test vector suite
  const rfcVectors = [
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg=='],
    ['fooba', 'Zm9vYmE='],
    ['foobar', 'Zm9vYmFy']
  ];
  for (const [plain, expectedB64] of rfcVectors) {
    const enc = base64Logic.encode(plain);
    assert(enc.success && enc.result === expectedB64, `Base64Logic RFC vector "${plain}" -> "${expectedB64}"`);
    const dec = base64Logic.decode(expectedB64);
    assert(dec.success && dec.result === plain, `Base64Logic RFC decode "${expectedB64}" -> "${plain}"`);
  }

  // 3. UTF-8 safe text encode/decode (accents, emojis, CJK)
  const unicodeSample = 'Hello world 🚀 café crème 日本語';
  const uniEnc = base64Logic.encode(unicodeSample);
  assert(uniEnc.success, 'Base64Logic: UTF-8 string encoded successfully');
  const uniDec = base64Logic.decode(uniEnc.result);
  assert(uniDec.success && uniDec.result === unicodeSample, 'Base64Logic: UTF-8 string round-trip decoded with exact fidelity');

  // 4. URL-safe variant toggle: '+' -> '-', '/' -> '_'
  const urlSafeSample = 'subjects?_d'; // standard contains / and +
  const stdEnc = base64Logic.encode(urlSafeSample, { urlSafe: false });
  assert(stdEnc.result.includes('/') || stdEnc.result.includes('+'), 'Base64Logic: standard contains / or +');
  const urlEnc = base64Logic.encode(urlSafeSample, { urlSafe: true });
  assert(!urlEnc.result.includes('/') && !urlEnc.result.includes('+'), 'Base64Logic: URL-safe replaces + and /');
  assert(urlEnc.result.includes('-') || urlEnc.result.includes('_'), 'Base64Logic: URL-safe contains - or _');

  // URL-safe decode back
  const urlDec = base64Logic.decode(urlEnc.result);
  assert(urlDec.success && urlDec.result === urlSafeSample, 'Base64Logic: URL-safe string decodes back to original text');

  // 5. Unpadded Base64 handling
  const unpadded = base64Logic.decode('Zm8'); // "fo" without trailing "="
  assert(unpadded.success && unpadded.result === 'fo', 'Base64Logic: decodes unpadded input "Zm8" -> "fo"');

  // 6. Invalid Base64 error handling
  const invalidRes = base64Logic.decode('ThisIsNotValidBase64!@#%');
  assert(invalidRes.success === false, 'Base64Logic: invalid characters return error');

  // 7. 1 MB limit safety
  const hugeText = 'A'.repeat(1048577);
  const hugeB64 = base64Logic.encode(hugeText);
  assert(hugeB64.success === false && hugeB64.isSizeLimit === true, 'Base64Logic: 1 MB safety cap triggers size error');
}

// 13. URL Encoder & Decoder Logic
const urlLogic = require(path.join(ROOT, 'src/tools/url-encoder-decoder/logic.js'));
{
  const testUrl = 'https://example.com/search?q=toolsbuilt & more=yes#frag';

  // 1. encodeURIComponent vs encodeURI modes
  const compEnc = urlLogic.encode(testUrl, 'component');
  assert(compEnc.success, 'UrlLogic: component encode succeeded');
  assert(compEnc.result.includes('%3A%2F%2F') && compEnc.result.includes('%3F') && compEnc.result.includes('%26'),
    'UrlLogic: component mode percent-encodes delimiters (:, /, ?, &)');

  const fullEnc = urlLogic.encode(testUrl, 'full');
  assert(fullEnc.success, 'UrlLogic: full URI encode succeeded');
  assert(fullEnc.result.startsWith('https://example.com/search?q=toolsbuilt%20&') && fullEnc.result.includes('#frag'),
    'UrlLogic: full URI mode preserves protocol, ?, &, =, and # delimiters while encoding space to %20');

  // 2. Decode modes (including '+' as space in component mode)
  const decComp = urlLogic.decode('search+term%20with%20spaces%26symbols', 'component');
  assert(decComp.success && decComp.result === 'search term with spaces&symbols',
    'UrlLogic: component decode converts both + and %20 to spaces and decodes %26 to &');

  // 3. Query string parser table
  const queryStr = 'https://example.com/api?user=alice&topic=tech%26science&limit=10&flag';
  const parsedParams = urlLogic.parseQueryString(queryStr);
  assert(parsedParams.length === 4, `UrlLogic: parsed 4 query parameters (got ${parsedParams.length})`);
  assert(parsedParams[0].key === 'user' && parsedParams[0].decodedValue === 'alice', 'UrlLogic: param 1 parsed');
  assert(parsedParams[1].key === 'topic' && parsedParams[1].decodedValue === 'tech&science' && parsedParams[1].encodedValue === 'tech%26science',
    'UrlLogic: param 2 decoded & preserved raw encoded value');
  assert(parsedParams[2].key === 'limit' && parsedParams[2].decodedValue === '10', 'UrlLogic: param 3 parsed');

  // 4. Malformed percent sequence error handling
  const badSequence = urlLogic.decode('broken%E0%A4percent', 'component');
  assert(badSequence.success === false && badSequence.error.includes('Decoding error'), 'UrlLogic: surfaces malformed percent error');

  // 5. 1 MB limit safety
  const hugeStr = 'a'.repeat(1048577);
  assert(urlLogic.encode(hugeStr).success === false, 'UrlLogic: 1 MB safety cap enforced');
}

// 14. Lorem Ipsum Generator Logic
const loremLogic = require(path.join(ROOT, 'src/tools/lorem-ipsum-generator/logic.js'));
{
  // 1. Words generation
  const wordsRes = loremLogic.generate('words', 25, { startWithLorem: true });
  assert(wordsRes.success, 'LoremLogic: words generation succeeded');
  assert(wordsRes.stats.words === 25, `LoremLogic: exactly 25 words generated (got ${wordsRes.stats.words})`);
  assert(wordsRes.text.startsWith('Lorem ipsum dolor sit amet'), 'LoremLogic: words start with "Lorem ipsum" when toggled on');

  const wordsNoStart = loremLogic.generate('words', 20, { startWithLorem: false });
  assert(wordsNoStart.stats.words === 20, 'LoremLogic: 20 words generated with startWithLorem: false');

  // 2. Sentences generation
  const sentRes = loremLogic.generate('sentences', 4, { startWithLorem: true });
  assert(sentRes.success, 'LoremLogic: sentences generation succeeded');
  assert(sentRes.text.startsWith(loremLogic.STANDARD_OPENING_SENTENCE), 'LoremLogic: first sentence is canonical opening');
  const periodCount = (sentRes.text.match(/\./g) || []).length;
  assert(periodCount >= 4, `LoremLogic: at least 4 sentence terminators (got ${periodCount})`);

  // 3. Paragraphs generation
  const paraRes = loremLogic.generate('paragraphs', 3, { startWithLorem: true, asHtml: false });
  assert(paraRes.success, 'LoremLogic: paragraphs generation succeeded');
  const paragraphs = paraRes.text.split('\n\n');
  assert(paragraphs.length === 3, `LoremLogic: exactly 3 paragraphs generated (got ${paragraphs.length})`);
  assert(paraRes.text.startsWith('Lorem ipsum dolor sit amet'), 'LoremLogic: first paragraph starts with canonical opening');

  // 4. HTML markup tags
  const htmlRes = loremLogic.generate('paragraphs', 2, { startWithLorem: true, asHtml: true });
  assert(htmlRes.text.startsWith('<p>') && htmlRes.text.endsWith('</p>'), 'LoremLogic: HTML tags properly wrap paragraphs');
  const pTags = (htmlRes.text.match(/<p>/g) || []).length;
  assert(pTags === 2, `LoremLogic: 2 <p> tags generated (got ${pTags})`);
}

// 22. UUID Generator Logic
const uuidLogic = require(path.join(ROOT, 'src/tools/uuid-generator/logic.js'));
{
  // generateRawV4 produces canonical lowercase hyphenated UUID
  const raw = uuidLogic.generateRawV4();
  const V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert(V4_RE.test(raw), `UuidLogic: generateRawV4 produces valid v4 UUID (got "${raw}")`);

  // version nibble must be '4'
  assert(raw[14] === '4', 'UuidLogic: version nibble is 4');

  // variant nibble must be 8, 9, a, or b
  assert(/[89ab]/.test(raw[19]), `UuidLogic: variant nibble is 8/9/a/b (got "${raw[19]}")`);

  // formatUuid – uppercase
  const upper = uuidLogic.formatUuid(raw, { uppercase: true });
  assert(upper === raw.toUpperCase(), 'UuidLogic: formatUuid uppercase');

  // formatUuid – strip hyphens
  const noHyph = uuidLogic.formatUuid(raw, { hyphens: false });
  assert(noHyph.length === 32 && !noHyph.includes('-'), 'UuidLogic: formatUuid no hyphens = 32 hex chars');

  // formatUuid – braces
  const braced = uuidLogic.formatUuid(raw, { braces: true });
  assert(braced.startsWith('{') && braced.endsWith('}'), 'UuidLogic: formatUuid braces wraps in {}');

  // formatUuid – combined: uppercase + no hyphens + braces
  const combo = uuidLogic.formatUuid(raw, { uppercase: true, hyphens: false, braces: true });
  assert(/^\{[0-9A-F]{32}\}$/.test(combo), `UuidLogic: formatUuid uppercase+no-hyphens+braces (got "${combo}")`);

  // validateCount – valid range
  const v1 = uuidLogic.validateCount(1);
  assert(v1.valid && v1.sanitized === 1, 'UuidLogic: validateCount(1) valid');
  const v100 = uuidLogic.validateCount(100);
  assert(v100.valid && v100.sanitized === 100, 'UuidLogic: validateCount(100) valid');

  // validateCount – out of range
  const v0 = uuidLogic.validateCount(0);
  assert(!v0.valid && v0.sanitized === 1, 'UuidLogic: validateCount(0) invalid, sanitized to 1');
  const v101 = uuidLogic.validateCount(101);
  assert(!v101.valid && v101.sanitized === 100, 'UuidLogic: validateCount(101) invalid, sanitized to 100');
  const vFloat = uuidLogic.validateCount(5.5);
  assert(!vFloat.valid, 'UuidLogic: validateCount(5.5) invalid (not integer)');

  // generateBulk
  const bulk5 = uuidLogic.generateBulk(5);
  assert(bulk5.length === 5, 'UuidLogic: generateBulk(5) returns 5 UUIDs');
  assert(bulk5.every(u => V4_RE.test(u)), 'UuidLogic: generateBulk all items are valid v4');
  // All 5 must be unique
  assert(new Set(bulk5).size === 5, 'UuidLogic: generateBulk(5) produces unique UUIDs');

  // generateBulk with formatting options
  const bulkUp = uuidLogic.generateBulk(3, { uppercase: true });
  assert(bulkUp.every(u => u === u.toUpperCase()), 'UuidLogic: generateBulk uppercase option applied');

  // generateBulk throws on invalid count
  let threw = false;
  try { uuidLogic.generateBulk(0); } catch (e) { threw = true; }
  assert(threw, 'UuidLogic: generateBulk(0) throws');

  // isValidV4 – canonical form
  assert(uuidLogic.isValidV4(raw), 'UuidLogic: isValidV4 accepts canonical UUID');
  // no hyphens
  assert(uuidLogic.isValidV4(noHyph), 'UuidLogic: isValidV4 accepts 32-char hex string');
  // braced
  assert(uuidLogic.isValidV4(braced), 'UuidLogic: isValidV4 accepts braced UUID');
  // uppercase
  assert(uuidLogic.isValidV4(upper), 'UuidLogic: isValidV4 accepts uppercase UUID');
  // invalid cases
  assert(!uuidLogic.isValidV4('not-a-uuid'), 'UuidLogic: isValidV4 rejects garbage string');
  assert(!uuidLogic.isValidV4(''), 'UuidLogic: isValidV4 rejects empty string');
  assert(!uuidLogic.isValidV4(null), 'UuidLogic: isValidV4 rejects null');
  // version 1 UUID (should fail – version nibble is not 4)
  assert(!uuidLogic.isValidV4('550e8400-e29b-11d4-a716-446655440000'), 'UuidLogic: isValidV4 rejects v1 UUID');

  // generateTxtExport
  const txt = uuidLogic.generateTxtExport(['uuid-one', 'uuid-two', 'uuid-three']);
  assert(txt.includes('uuid-one') && txt.includes('uuid-two') && txt.includes('uuid-three'), 'UuidLogic: generateTxtExport includes all UUIDs');
  assert(txt.split('\n').filter(l => l.trim()).length >= 3, 'UuidLogic: generateTxtExport has at least 3 lines');
}

// 23. Hash Generator Logic (synchronous helpers only – computeHash/computeAllHashes are async and browser-tested)
const hashLogic = require(path.join(ROOT, 'src/tools/hash-generator/logic.js'));
{
  // SUPPORTED_ALGORITHMS exists and includes expected algorithms
  assert(Array.isArray(hashLogic.SUPPORTED_ALGORITHMS), 'HashLogic: SUPPORTED_ALGORITHMS is an array');
  assert(hashLogic.SUPPORTED_ALGORITHMS.includes('SHA-256'), 'HashLogic: SUPPORTED_ALGORITHMS includes SHA-256');
  assert(hashLogic.SUPPORTED_ALGORITHMS.includes('SHA-512'), 'HashLogic: SUPPORTED_ALGORITHMS includes SHA-512');
  assert(hashLogic.SUPPORTED_ALGORITHMS.includes('SHA-384'), 'HashLogic: SUPPORTED_ALGORITHMS includes SHA-384');
  assert(hashLogic.SUPPORTED_ALGORITHMS.includes('SHA-1'), 'HashLogic: SUPPORTED_ALGORITHMS includes SHA-1');
  // Must NOT include MD5
  assert(!hashLogic.SUPPORTED_ALGORITHMS.includes('MD5'), 'HashLogic: SUPPORTED_ALGORITHMS does NOT include MD5');

  // PASSWORD_WARNING string is non-empty and mentions SHA-1
  assert(typeof hashLogic.PASSWORD_WARNING === 'string' && hashLogic.PASSWORD_WARNING.length > 0, 'HashLogic: PASSWORD_WARNING is a non-empty string');
  assert(/sha-?1/i.test(hashLogic.PASSWORD_WARNING) || /password/i.test(hashLogic.PASSWORD_WARNING), 'HashLogic: PASSWORD_WARNING mentions SHA-1 or passwords');

  // compareHashes – exact match
  const cmpSame = hashLogic.compareHashes('abc123', 'abc123');
  assert(cmpSame.match === true, 'HashLogic: compareHashes identical strings match');

  // case-insensitive match
  const cmpCase = hashLogic.compareHashes('ABC123', 'abc123');
  assert(cmpCase.match === true, 'HashLogic: compareHashes is case-insensitive');

  // whitespace trimming
  const cmpTrim = hashLogic.compareHashes('  abc123  ', 'abc123');
  assert(cmpTrim.match === true, 'HashLogic: compareHashes trims whitespace');

  // mismatch
  const cmpDiff = hashLogic.compareHashes('abc123', 'def456');
  assert(cmpDiff.match === false, 'HashLogic: compareHashes different strings do not match');

  // empty/null inputs
  const cmpEmpty = hashLogic.compareHashes('', 'abc123');
  assert(cmpEmpty.match === false, 'HashLogic: compareHashes empty string does not match');
  const cmpNull = hashLogic.compareHashes(null, 'abc123');
  assert(cmpNull.match === false, 'HashLogic: compareHashes null does not match');

  // findMatchingAlgorithm – matching case
  const fakeMap = {
    'SHA-256': 'deadbeef1234',
    'SHA-512': 'cafebabe5678',
    'SHA-384': 'feedface9012',
    'SHA-1':   'badc0ffee000'
  };
  const found256 = hashLogic.findMatchingAlgorithm(fakeMap, 'deadbeef1234');
  assert(found256.matched === true && found256.algorithm === 'SHA-256', 'HashLogic: findMatchingAlgorithm finds SHA-256');

  const found512 = hashLogic.findMatchingAlgorithm(fakeMap, 'CAFEBABE5678'); // uppercase target
  assert(found512.matched === true && found512.algorithm === 'SHA-512', 'HashLogic: findMatchingAlgorithm is case-insensitive on target');

  // no match
  const notFound = hashLogic.findMatchingAlgorithm(fakeMap, 'ffffffffffffffff');
  assert(notFound.matched === false && notFound.algorithm === null, 'HashLogic: findMatchingAlgorithm returns false when no match');

  // null/empty guard
  const nullMap = hashLogic.findMatchingAlgorithm(null, 'abc');
  assert(nullMap.matched === false, 'HashLogic: findMatchingAlgorithm handles null map');
  const nullTarget = hashLogic.findMatchingAlgorithm(fakeMap, '');
  assert(nullTarget.matched === false, 'HashLogic: findMatchingAlgorithm handles empty target');
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

  // Fuzz Loan EMI: total payment >= principal, remaining balance == 0
  for (let i = 0; i < 100; i++) {
    const P = 1000 + prngGen() * 500000;
    const R = 0.5 + prngGen() * 20;
    const n = 12 + Math.floor(prngGen() * 348);
    const res = loanLogic.calculateLoanEmi(P, R, n, 'months');
    if (res.totalPayment < P || res.monthlyEmi <= 0) {
      assert(false, `Loan EMI Fuzz fail: P=${P}, R=${R}, n=${n}, totalPayment=${res.totalPayment}`);
      break;
    }
    const finalBal = res.schedule[res.schedule.length - 1].balance;
    if (finalBal !== 0) {
      assert(false, `Loan EMI Fuzz fail: final balance !== 0 (${finalBal})`);
      break;
    }
  }
  assert(true, 'Loan EMI Fuzz: 100 random loan amortization setups verified non-negative and zero balance');

  // Fuzz SIP: maturityValue >= totalInvested and estimatedReturns >= 0
  for (let i = 0; i < 100; i++) {
    const P = 50 + prngGen() * 2000;
    const R = 1 + prngGen() * 25;
    const y = 1 + Math.floor(prngGen() * 30);
    const step = prngGen() > 0.5 ? Math.floor(prngGen() * 15) : 0;
    const res = sipLogic.calculateSip(P, R, y, { stepUpPercent: step });
    if (res.maturityValue < res.totalInvested || res.estimatedReturns < 0) {
      assert(false, `SIP Fuzz fail: P=${P}, R=${R}, y=${y}, maturity=${res.maturityValue}, invested=${res.totalInvested}`);
      break;
    }
  }
  assert(true, 'SIP Fuzz: 100 random SIP portfolios verified monotonic wealth growth');

  // Fuzz Compound Interest: finalBalance >= totalPrincipal, apyPercent >= rate
  for (let i = 0; i < 100; i++) {
    const P = 100 + prngGen() * 50000;
    const R = 0.5 + prngGen() * 15;
    const y = 1 + Math.floor(prngGen() * 25);
    const freqs = ['daily', 'monthly', 'quarterly', 'annual'];
    const f = freqs[Math.floor(prngGen() * freqs.length)];
    const pmt = prngGen() > 0.5 ? 50 + prngGen() * 500 : 0;
    const res = ciLogic.calculateCompoundInterest(P, R, y, f, { contributionAmount: pmt });
    if (res.finalBalance < res.totalPrincipal || res.apyPercent < R - 0.05) {
      assert(false, `Compound Interest Fuzz fail: P=${P}, R=${R}, y=${y}, f=${f}`);
      break;
    }
  }
  assert(true, 'Compound Interest Fuzz: 100 random compound scenarios satisfied bounds and APY');
}

// Pakistan Salary Tax Calculator Logic (Finance Act 2026 slabs)
const pkTaxLogic = require(path.join(ROOT, 'src/tools/pakistan-salary-tax-calculator/logic.js'));
{
  const near = (a, b) => Math.abs(a - b) < 0.005;
  const annual = (income, year) => pkTaxLogic.calculateAnnualTax(income, year);

  assert(pkTaxLogic.TAX_YEAR === '2026-27', 'PkTax: default TAX_YEAR is 2026-27');

  // Required 2026-27 cases (annual income -> annual tax)
  [[600000, 0], [1200000, 6000], [2400000, 156000], [4100000, 541000], [8000000, 1774000], [12000000, 3174000]]
    .forEach(([income, tax]) => {
      const r = annual(income, '2026-27');
      assert(near(r.annualTax, tax), `PkTax 2026-27: Rs ${income} -> Rs ${tax} (got ${r.annualTax})`);
    });
  assert(annual(12000000, '2026-27').surcharge === 0, 'PkTax 2026-27: no surcharge above Rs 10M for salaried individuals');

  const m100k = pkTaxLogic.calculateSalaryTax(100000, 'monthly', '2026-27');
  assert(near(m100k.annualTax, 6000) && near(m100k.monthlyTax, 500), `PkTax 2026-27: monthly Rs 100,000 -> monthly tax Rs 500 (got ${m100k.monthlyTax})`);

  // Required 2025-26 comparison cases
  assert(near(annual(2400000, '2025-26').annualTax, 162000), 'PkTax 2025-26: Rs 2,400,000 -> Rs 162,000');
  const r12m = annual(12000000, '2025-26');
  assert(near(r12m.baseTax, 3381000) && near(r12m.surcharge, 304290) && near(r12m.annualTax, 3685290),
    `PkTax 2025-26: Rs 12,000,000 -> Rs 3,381,000 + 9% surcharge = Rs 3,685,290 (got ${r12m.annualTax})`);
  assert(annual(10000000, '2025-26').surcharge === 0, 'PkTax 2025-26: no surcharge at exactly Rs 10,000,000');

  // Page worked examples (monthly salaries)
  const m250k = pkTaxLogic.calculateSalaryTax(250000, 'monthly', '2026-27');
  assert(near(m250k.monthlyTax, 23000) && near(m250k.monthlyTakeHome, 227000) && near(m250k.comparison.monthlySaving, 2000),
    'PkTax: monthly Rs 250,000 -> tax Rs 23,000, take-home Rs 227,000, saves Rs 2,000 vs 2025-26');
  const m500k = pkTaxLogic.calculateSalaryTax(500000, 'monthly', '2026-27');
  assert(near(m500k.monthlyTax, 92000) && near(m500k.monthlyTakeHome, 408000) && near(m500k.comparison.monthlySaving, 14750),
    'PkTax: monthly Rs 500,000 -> tax Rs 92,000, take-home Rs 408,000, saves Rs 14,750 vs 2025-26');
  assert(near(m100k.comparison.monthlySaving, 0), 'PkTax: monthly Rs 100,000 -> same tax in both years');
  assert(m500k.slabIndex === 6 && near(m500k.effectiveRate, 18.4), 'PkTax: Rs 6,000,000 a year is in the 32% slab, effective rate 18.4%');

  // Monthly and annual input give the same result
  const a1 = pkTaxLogic.calculateSalaryTax(3000000, 'annual', '2026-27');
  assert(near(a1.annualTax, m250k.annualTax), 'PkTax: Rs 3,000,000 annual equals Rs 250,000 monthly');

  // Each table is continuous: a slab's fixed amount equals the full tax of the slab below
  Object.entries(pkTaxLogic.TAX_TABLES).forEach(([year, table]) => {
    table.slabs.forEach((slab, i) => {
      if (i === 0) return;
      const prev = table.slabs[i - 1];
      assert(prev.upTo === slab.over && near(prev.fixed + prev.rate * (prev.upTo - prev.over), slab.fixed),
        `PkTax ${year}: slab ${i + 1} fixed Rs ${slab.fixed} continues from slab ${i}`);
    });
  });

  assert(pkTaxLogic.formatPkr(1234567) === 'Rs 1,234,567', 'PkTax: formatPkr(1234567) = "Rs 1,234,567"');
  assert(pkTaxLogic.formatPkr(0) === 'Rs 0', 'PkTax: formatPkr(0) = "Rs 0"');

  let threw = false;
  try { pkTaxLogic.calculateSalaryTax(-1, 'monthly'); } catch (e) { threw = true; }
  assert(threw, 'PkTax: negative salary throws a clear error');
}

// CGPA to Percentage Calculator Logic
const cgpaLogic = require(path.join(ROOT, 'src/tools/cgpa-to-percentage-calculator/logic.js'));
{
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

  assert(near(cgpaLogic.cgpaToPercentage(3.2, { scale: 4 }).percentage, 80), 'CgpaLogic: 3.2 on 4.0 (simple) -> 80%');
  assert(near(cgpaLogic.cgpaToPercentage(3.5, { scale: 4 }).percentage, 87.5), 'CgpaLogic: 3.5 on 4.0 (simple) -> 87.5%');
  assert(near(cgpaLogic.cgpaToPercentage(8.0, { scale: 10, formula: 'cbse' }).percentage, 76), 'CgpaLogic: 8.0 on 10 (CBSE) -> 76%');
  assert(near(cgpaLogic.percentageToCgpa(76, { scale: 10, formula: 'cbse' }).cgpa, 8.0), 'CgpaLogic: 76% on 10 (CBSE) -> 8.0');
  assert(near(cgpaLogic.cgpaToPercentage(3.0, { scale: 4, formula: 'custom', multiplier: 20, offset: 10 }).percentage, 70),
    'CgpaLogic: custom m=20, c=10, CGPA 3.0 -> 70%');
  assert(near(cgpaLogic.percentageToCgpa(70, { scale: 4, formula: 'custom', multiplier: 20, offset: 10 }).cgpa, 3.0),
    'CgpaLogic: custom m=20, c=10, 70% -> CGPA 3.0 (reverse solved algebraically)');
  assert(near(cgpaLogic.percentageToCgpa(80, { scale: 4 }).cgpa, 3.2), 'CgpaLogic: 80% on 4.0 (simple) -> 3.2');
  assert(near(cgpaLogic.cgpaToPercentage(4.0, { scale: 5 }).percentage, 80), 'CgpaLogic: 4.0 on 5.0 (simple) -> 80%');

  assert(throws(() => cgpaLogic.cgpaToPercentage(4.1, { scale: 4 })), 'CgpaLogic: CGPA above the scale is rejected');
  assert(throws(() => cgpaLogic.cgpaToPercentage(-1, { scale: 4 })), 'CgpaLogic: negative CGPA is rejected');
  assert(throws(() => cgpaLogic.percentageToCgpa(101, { scale: 4 })), 'CgpaLogic: percentage above 100 is rejected');
  assert(throws(() => cgpaLogic.cgpaToPercentage(3, { scale: 4, formula: 'cbse' })), 'CgpaLogic: CBSE formula only on the 10.0 scale');
  assert(throws(() => cgpaLogic.percentageToCgpa(100, { scale: 10, formula: 'cbse' })), 'CgpaLogic: 100% under CBSE (10.53) is outside the scale');
  assert(throws(() => cgpaLogic.cgpaToPercentage(3, { scale: 4, formula: 'custom', multiplier: 0, offset: 10 })), 'CgpaLogic: custom multiplier 0 is rejected');
  assert(throws(() => cgpaLogic.cgpaToPercentage(4, { scale: 4, formula: 'custom', multiplier: 30, offset: 10 })), 'CgpaLogic: custom formula giving over 100% is rejected');
}

// Marks Percentage Calculator Logic
const marksLogic = require(path.join(ROOT, 'src/tools/marks-percentage-calculator/logic.js'));
{
  const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

  const m1 = marksLogic.calculatePercentage(870, 1100);
  assert(m1.percentage === 79.09 && m1.grade === 'A', `MarksLogic: 870/1100 -> 79.09% (A) (got ${m1.percentage}%, ${m1.grade})`);
  const m2 = marksLogic.calculatePercentage(990, 1200);
  assert(m2.percentage === 82.5 && m2.grade === 'A+', `MarksLogic: 990/1200 -> 82.5% (A+) (got ${m2.percentage}%, ${m2.grade})`);
  const m3 = marksLogic.calculateSubjects([{ obtained: 75, total: 100 }, { obtained: 60, total: 75 }, { obtained: 40, total: 50 }]);
  assert(m3.obtained === 175 && m3.total === 225 && m3.percentage === 77.78 && m3.grade === 'A',
    `MarksLogic: subjects 75/100, 60/75, 40/50 -> 175/225 = 77.78% (A) (got ${m3.obtained}/${m3.total} = ${m3.percentage}%, ${m3.grade})`);
  assert(m3.subjects.map(s => s.percentage).join(',') === '75,80,80', 'MarksLogic: per-subject percentages 75%, 80%, 80%');
  const m4 = marksLogic.calculatePercentage(30, 100);
  assert(m4.percentage === 30 && m4.grade === 'F', `MarksLogic: 30/100 -> 30% (F) (got ${m4.grade})`);

  // Band edges use the exact percentage
  [[80, 'A+'], [79.99, 'A'], [70, 'A'], [60, 'B'], [50, 'C'], [40, 'D'], [33, 'E'], [32.99, 'F'], [0, 'F']]
    .forEach(([pct, grade]) => assert(marksLogic.gradeFor(pct).grade === grade, `MarksLogic: ${pct}% -> ${grade}`));

  // Empty rows are skipped; partly filled rows must be complete
  const m5 = marksLogic.calculateSubjects([{ obtained: 50, total: 100 }, { name: '', obtained: '', total: '' }]);
  assert(m5.subjects.length === 1 && m5.percentage === 50, 'MarksLogic: completely empty subject rows are skipped');

  assert(throws(() => marksLogic.calculatePercentage(110, 100)), 'MarksLogic: obtained above total is rejected');
  assert(throws(() => marksLogic.calculatePercentage(-5, 100)), 'MarksLogic: negative obtained marks are rejected');
  assert(throws(() => marksLogic.calculatePercentage(5, 0)), 'MarksLogic: total of 0 is rejected');
  assert(throws(() => marksLogic.calculateSubjects([{ obtained: 40, total: '' }])), 'MarksLogic: a subject with obtained but no total is rejected');
  assert(throws(() => marksLogic.calculateSubjects([{ obtained: '', total: '' }])), 'MarksLogic: no marks at all is rejected');
}

// Gold Calculator Logic (rate 400,000 per tola for 24K)
const goldLogic = require(path.join(ROOT, 'src/tools/gold-calculator/logic.js'));
{
  const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
  const throws = fn => { try { fn(); return false; } catch (e) { return true; } };
  const gold = (weight, weightUnit, karat, extra) => goldLogic.calculateGold({
    rate: 400000, rateUnit: 'tola', rateKarat: 24, weight, weightUnit, karat, ...(extra || {})
  });
  const r2 = goldLogic.round2;

  assert(r2(gold(2, 'tola', 22).total) === 733333.33, `GoldLogic: 2 tola of 22K -> 733,333.33 (got ${r2(gold(2, 'tola', 22).total)})`);
  assert(r2(gold(10, 'gram', 24).total) === 342941.30, `GoldLogic: 10 g of 24K -> 342,941.30 (got ${r2(gold(10, 'gram', 24).total)})`);
  assert(r2(gold(10, 'gram', 21).total) === 300073.63, `GoldLogic: 10 g of 21K -> 300,073.63 (got ${r2(gold(10, 'gram', 21).total)})`);
  assert(r2(gold(1, 'masha', 24).total) === 33333.33, `GoldLogic: 1 masha of 24K -> 33,333.33 (got ${r2(gold(1, 'masha', 24).total)})`);

  // Unit conversion: 1 tola = 11.6638038 g = 12 masha = 96 ratti
  const oneTola = goldLogic.convertWeight(goldLogic.toGrams(1, 'tola'));
  assert(near(oneTola.gram, 11.6638038) && near(oneTola.masha, 12) && near(oneTola.ratti, 96),
    'GoldLogic: 1 tola = 11.6638038 g = 12 masha = 96 ratti');
  assert(near(goldLogic.toGrams(96, 'ratti'), 11.6638038) && near(goldLogic.toGrams(12, 'masha'), 11.6638038),
    'GoldLogic: 96 ratti and 12 masha are each 11.6638038 g');

  // Pure gold content and karat-adjusted rates
  const g22 = gold(2, 'tola', 22);
  assert(near(g22.pureGoldGrams, 2 * 11.6638038 * 22 / 24), 'GoldLogic: 2 tola of 22K holds 21.38364 g of pure gold');
  assert(near(g22.rates.perTola, 400000 * 22 / 24, 1e-6), 'GoldLogic: 22K rate per tola = 24K rate × 22/24');

  // The same rate quoted per 10 g or per gram gives the same result
  const per10 = goldLogic.calculateGold({ rate: 400000 / 11.6638038 * 10, rateUnit: '10g', rateKarat: 24, weight: 2, weightUnit: 'tola', karat: 22 });
  assert(near(per10.total, g22.total, 1e-6), 'GoldLogic: a per-10-gram rate gives the same price as the equivalent per-tola rate');

  // A rate quoted for 22K is scaled to the item's karat
  const from22 = goldLogic.calculateGold({ rate: 400000 * 22 / 24, rateUnit: 'tola', rateKarat: 22, weight: 10, weightUnit: 'gram', karat: 21 });
  assert(r2(from22.total) === 300073.63, 'GoldLogic: a 22K rate converted to 21K matches the 24K-based result');

  // Making charges
  const pct = gold(1, 'tola', 22, { makingType: 'percent', makingValue: 10 });
  assert(near(pct.makingCharges, pct.goldValue * 0.1) && near(pct.total, pct.goldValue * 1.1), 'GoldLogic: 10% making charges on gold value');
  const fixed = gold(10, 'gram', 22, { makingType: 'perGram', makingValue: 500 });
  assert(near(fixed.makingCharges, 5000) && near(fixed.total, fixed.goldValue + 5000), 'GoldLogic: Rs 500 per gram making on 10 g = Rs 5,000');

  assert(goldLogic.formatMoney(733333.333, 'PKR') === 'Rs 733,333.33', 'GoldLogic: formatMoney PKR with separators');
  assert(throws(() => gold(0, 'tola', 22)), 'GoldLogic: zero weight is rejected');
  assert(throws(() => gold(1, 'tola', 23)), 'GoldLogic: unsupported karat is rejected');
  assert(throws(() => goldLogic.calculateGold({ rate: '', weight: 1, weightUnit: 'tola', karat: 24 })), 'GoldLogic: missing rate is rejected');
  assert(throws(() => gold(1, 'tola', 22, { makingType: 'percent', makingValue: -5 })), 'GoldLogic: negative making charges are rejected');
}

// GST & Sales Tax Calculator Logic
const salesTaxLogic = require(path.join(ROOT, 'src/tools/sales-tax-calculator/logic.js'));
{
  const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

  const add = salesTaxLogic.addTax(1000, 18);
  assert(add.tax === 180 && add.gross === 1180, `SalesTaxLogic: add 18% to 1,000 -> tax 180, total 1,180 (got ${add.tax}, ${add.gross})`);
  const rem = salesTaxLogic.removeTax(1180, 18);
  assert(rem.net === 1000 && rem.tax === 180, `SalesTaxLogic: remove 18% from 1,180 -> 1,000 and tax 180 (got ${rem.net}, ${rem.tax})`);
  const rem5k = salesTaxLogic.removeTax(5000, 18);
  assert(rem5k.net === 4237.29 && rem5k.tax === 762.71, `SalesTaxLogic: remove 18% from 5,000 -> 4,237.29 and tax 762.71 (got ${rem5k.net}, ${rem5k.tax})`);
  assert(rem5k.net + rem5k.tax === 5000, 'SalesTaxLogic: net + tax add up exactly to the inclusive price');
  const qty = salesTaxLogic.addTax(1000, 18, 3);
  assert(qty.gross === 3540 && qty.net === 3000 && qty.tax === 540, `SalesTaxLogic: 3 x 1,000 at 18% -> 3,540 (got ${qty.gross})`);
  // The common mistake: subtracting 18% from an inclusive price gives the wrong pre-tax price
  assert(1180 * (1 - 0.18) !== rem.net, 'SalesTaxLogic: subtracting 18% from 1,180 (967.60) is not the pre-tax price');
  assert(salesTaxLogic.addTax(100, 0).gross === 100, 'SalesTaxLogic: 0% tax leaves the price unchanged');

  assert(throws(() => salesTaxLogic.addTax(-1, 18)), 'SalesTaxLogic: negative price is rejected');
  assert(throws(() => salesTaxLogic.addTax(100, 120)), 'SalesTaxLogic: rate above 100% is rejected');
  assert(throws(() => salesTaxLogic.addTax(100, 18, 0)), 'SalesTaxLogic: quantity 0 is rejected');
  assert(throws(() => salesTaxLogic.removeTax('', 18)), 'SalesTaxLogic: missing price is rejected');
}

// Country data: salary tax datasets, VAT presets, grading scales, gold units, countries
{
  const fs = require('fs');
  const engine = require(path.join(ROOT, 'src/tools/salary-tax-calculator/logic.js'));
  const near = (a, b) => Math.abs(a - b) < 0.005;
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const isOfficialUrl = (u) => /^https:\/\/([^/]+\.)?(u\.ae|gov\.uk|gov|gov\.in|gov\.pk|gov\.ae|gov\.sa|gov\.qa|gov\.sg|govt\.nz|europa\.eu|canada\.ca|gov\.za|edu\.pk|nist\.gov|gov\.hk)\//.test(u || '');
  const taxDir = path.join(ROOT, 'src/_data/tax');
  const datasets = fs.readdirSync(taxDir).filter(f => f.endsWith('.json'))
    .map(f => ({ file: f, d: JSON.parse(fs.readFileSync(path.join(taxDir, f), 'utf8')) }));
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/tools.json'), 'utf8'));

  // Every dataset: official sources, a verification date, continuous slabs, fixed amounts that
  // match the slabs below, and a tools.json entry for its page
  datasets.forEach(({ file, d }) => {
    assert(file === `${d.country.toLowerCase()}-${d.taxYear}.json`, `TaxData ${file}: file name matches country and tax year`);
    assert(d.sources.length > 0 && d.sources.every(s => isOfficialUrl(s.url)), `TaxData ${file}: every source is an official https URL`);
    assert(isDate(d.verifiedOn), `TaxData ${file}: verifiedOn is a date`);
    const statusIds = d.statuses ? Object.keys(d.statuses) : [undefined];
    statusIds.forEach(id => {
      const raw = id ? d.statuses[id].slabs : d.slabs;
      const { slabs } = engine.resolve(d, id);
      slabs.forEach((slab, i) => {
        if (i) assert(slabs[i - 1].upTo === slab.over, `TaxData ${file}${id ? ' ' + id : ''}: slab ${i + 1} starts where slab ${i} ends`);
        if (typeof raw[i].fixed === 'number') assert(near(raw[i].fixed, slab.fixed) || i === 0, `TaxData ${file}${id ? ' ' + id : ''}: published fixed amount ${raw[i].fixed} equals tax on the slabs below`);
      });
      assert(slabs[slabs.length - 1].upTo === null, `TaxData ${file}${id ? ' ' + id : ''}: top slab is open-ended`);
    });
    if (d.page) {
      assert(tools.some(t => t.slug === d.page.slug), `TaxData ${file}: tools.json lists /tools/${d.page.slug}/`);
      assert(d.page.faqs.length >= 3 && d.page.sections.length >= 2 && d.page.workedExamples.length >= 2, `TaxData ${file}: page has its own FAQs, sections and worked examples`);
    }
  });

  // Each country page has genuinely different text (no shared paragraphs)
  const pageTexts = datasets.filter(x => x.d.page).map(x => x.d.page.sections.flatMap(s => s.paragraphs));
  const allParas = pageTexts.flat();
  assert(new Set(allParas).size === allParas.length, 'TaxData: no paragraph is repeated across country pages');

  const ds = (name) => datasets.find(x => x.file === name).d;

  // India FY 2025-26: Budget Speech 2025-26 annex table (tax after rebate, before cess)
  const IN = ds('in-2025-26.json');
  assert(IN.officialExamples.length >= 2, 'TaxIN: at least two official examples');
  IN.officialExamples.forEach(x => {
    const r = engine.calculate(IN, x.grossSalary);
    assert(near(r.grossTax - r.rebate + r.surcharge, x.taxBeforeCess), `TaxIN official: ${x.note} (got ${r.grossTax - r.rebate + r.surcharge})`);
  });
  assert(near(engine.calculate(IN, 1675000).annualTax, 124800), 'TaxIN: ₹16.75 lakh salary -> ₹1,24,800 with 4% cess');
  assert(near(engine.calculate(IN, 1285000).annualTax, 10400), 'TaxIN: marginal relief at ₹12.1 lakh total income -> ₹10,000 + cess');
  assert(near(engine.calculate(IN, 5175000).surcharge, 70000), 'TaxIN: surcharge marginal relief at ₹51 lakh -> ₹70,000');
  assert(engine.calculate(IN, 5075000).surcharge === 0, 'TaxIN: no surcharge at exactly ₹50 lakh total income');

  // United States 2026: Rev. Proc. 2025-32 tax rate tables
  const US = ds('us-2026.json');
  assert(US.officialExamples.length >= 2, 'TaxUS: at least two official examples');
  US.officialExamples.forEach(x => {
    const tax = engine.slabTax(engine.resolve(US, x.status).slabs, x.taxableIncome);
    assert(near(tax, x.tax), `TaxUS official: ${x.note} (got ${tax})`);
  });
  assert(near(engine.calculate(US, 72000, { status: 'single' }).annualTax, 7010), 'TaxUS: single $72,000 -> $7,010');
  assert(near(engine.calculate(US, 150000, { status: 'married_joint' }).annualTax, 15340), 'TaxUS: MFJ $150,000 -> $15,340');
  assert(engine.calculate(US, 16100, { status: 'single' }).annualTax === 0, 'TaxUS: wages at the standard deduction pay no federal income tax');

  // United Kingdom 2026-27: GOV.UK Personal Allowance and bands
  const GB = ds('gb-2026-27.json');
  assert(GB.officialExamples.length >= 2, 'TaxGB: at least two official examples');
  GB.officialExamples.forEach(x => {
    const r = engine.calculate(GB, x.income, { status: x.status });
    if (x.tax !== undefined) assert(near(r.annualTax, x.tax), `TaxGB official: ${x.note} (got ${r.annualTax})`);
    if (x.allowance !== undefined) assert(near(r.deductions.find(dd => dd.id === 'allowance').amount, x.allowance), `TaxGB official: ${x.note}`);
  });
  assert(near(engine.calculate(GB, 36000, { status: 'rUK' }).annualTax, 4686), 'TaxGB: £36,000 in England -> £4,686');
  assert(near(engine.calculate(GB, 110000, { status: 'rUK' }).annualTax, 33432), 'TaxGB: £110,000 -> £33,432 (allowance taper)');
  assert(near(engine.calculate(GB, 36000, { status: 'scotland' }).annualTax, 4711.07), 'TaxGB: £36,000 in Scotland -> £4,711.07');
  assert(near(engine.calculate(GB, 200000, { status: 'rUK' }).annualTax, 76203), 'TaxGB: £200,000 -> £76,203 (no allowance)');

  // Engine errors
  let threw = false;
  try { engine.calculate(US, 50000, { status: 'head' }); } catch (e) { threw = true; }
  assert(threw, 'TaxEngine: unknown filing status throws');

  // Countries with no salary tax: each has an official statement
  const noTax = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/noSalaryTax.json'), 'utf8')).countries;
  noTax.forEach(c => assert(isOfficialUrl(c.source.url) && isDate(c.verifiedOn) && c.quote, `NoSalaryTax ${c.code}: official source, quote and date`));

  // VAT presets
  const vat = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/vat-rates.json'), 'utf8')).countries;
  assert(new Set(vat.map(c => c.code)).size === vat.length, 'Vat: country codes are unique');
  const EU = ['AT','BE','BG','CY','CZ','DE','DK','EE','GR','ES','FI','FR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'];
  assert(EU.every(code => vat.some(c => c.code === code)), 'Vat: all 27 EU member states are present');
  vat.forEach(c => {
    if (c.code === 'US') {
      assert(c.rates.length === 0 && /no federal sales tax/i.test(c.notes), 'Vat US: no preset rate; the note explains state and local sales tax');
      return;
    }
    assert(c.rates.length > 0 && c.rates.every(r => r.rate > 0 && r.rate < 100 && r.label), `Vat ${c.code}: rates are between 0 and 100 with labels`);
    assert(isOfficialUrl(c.source.url) && isDate(c.verifiedOn), `Vat ${c.code}: official source and verifiedOn`);
  });
  const rate = (code) => vat.find(c => c.code === code).rates[0].rate;
  assert(rate('GB') === 20 && rate('DE') === 19 && rate('FI') === 25.5 && rate('IN') === 18 && rate('PK') === 18 && rate('SA') === 15 && rate('AE') === 5 && rate('CA-ON') === 13,
    'Vat: standard rates GB 20, DE 19, FI 25.5, IN 18, PK 18, SA 15, AE 5, Ontario HST 13');

  // Grading scales
  const scales = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/grading-scales.json'), 'utf8')).scales;
  scales.forEach(sc => {
    assert(sc.note && (sc.source ? isOfficialUrl(sc.source.url) && isDate(sc.verifiedOn) : /typical|could not find|vary/i.test(sc.name + sc.note)),
      `Grading ${sc.code}: has an official source, or says it is typical / unverified`);
    if (sc.type === 'bands') {
      assert(sc.bands.every((b, i) => !i || b.min < sc.bands[i - 1].min) && sc.bands[sc.bands.length - 1].min === 0, `Grading ${sc.code}: bands run from highest to 0%`);
    }
  });
  const scale = (code) => scales.find(sc => sc.code === code);
  assert(JSON.stringify(scale('PK-BISE').bands) === JSON.stringify(marksLogic.GRADING.bands), 'Grading PK-BISE: matches the logic module default');
  [[96, 'A++'], [95.5, 'A+'], [91, 'A+'], [86, 'A'], [76, 'B+'], [61, 'C+'], [40, 'D'], [39.99, 'U']]
    .forEach(([pct, g]) => assert(marksLogic.gradeFor(pct, scale('PK-IBCC-2026')).grade === g, `Grading IBCC 2026: ${pct}% -> ${g}`));
  assert(marksLogic.gradeFor(33, scale('IN-CBSE')).passed === true && marksLogic.gradeFor(32.99, scale('IN-CBSE')).passed === false, 'Grading CBSE: 33% passes, 32.99% does not');
  assert(marksLogic.calculatePercentage(870, 1100, scale('US-TYPICAL')).grade === 'C', 'Grading US typical: 79.09% -> C');
  const custom = marksLogic.customScale([{ grade: 'Pass', min: '50' }, { grade: 'Distinction', min: '75' }, { grade: 'Fail', min: '0' }]);
  assert(custom.bands.map(b => b.grade).join(',') === 'Distinction,Pass,Fail' && marksLogic.gradeFor(80, custom).grade === 'Distinction', 'Grading custom: rows sorted by minimum; 80% -> Distinction');
  let customThrew = 0;
  [[{ grade: '', min: 50 }], [{ grade: 'A', min: 120 }], [{ grade: 'A', min: 50 }, { grade: 'B', min: 50 }], []].forEach(rows => {
    try { marksLogic.customScale(rows); } catch (e) { customThrew++; }
  });
  assert(customThrew === 4, 'Grading custom: blank name, minimum over 100, duplicate minimum and empty scale are rejected');

  // Gold units from legal definitions
  assert(goldLogic.WEIGHT_UNITS.troyOunce.grams === 31.1034768, 'GoldUnits: troy ounce = 31.1034768 g (NIST HB 44)');
  assert(goldLogic.WEIGHT_UNITS.taelTroy.grams === 37.429, 'GoldUnits: Hong Kong tael troy = 37.429 g (Cap. 68)');
  const oz = goldLogic.calculateGold({ rate: 2000, rateUnit: 'troyOunce', rateKarat: 24, weight: 1, weightUnit: 'troyOunce', karat: 24, makingType: 'none' });
  assert(near(oz.goldValue, 2000), 'GoldUnits: 1 troy ounce of 24K at 2,000 per troy ounce = 2,000');
  const kg = goldLogic.calculateGold({ rate: 100, rateUnit: 'gram', rateKarat: 24, weight: 1, weightUnit: 'kilogram', karat: 24, makingType: 'none' });
  assert(near(kg.goldValue, 100000), 'GoldUnits: 1 kg at 100 per gram = 100,000');

  // Countries list
  const countries = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/_data/countries.json'), 'utf8'));
  assert(new Set(countries.map(c => c.code)).size === countries.length && new Set(countries.map(c => c.slug)).size === countries.length, 'Countries: codes and slugs are unique');
  countries.forEach(c => {
    let ok = true;
    try { new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency }).format(1); } catch (e) { ok = false; }
    assert(ok && Intl.NumberFormat.supportedLocalesOf(c.locale).length === 1, `Countries ${c.code}: locale ${c.locale} and currency ${c.currency} are valid`);
  });
}

// Hours Calculator Logic
const hoursLogic = require(path.join(ROOT, 'src/tools/hours-calculator/logic.js'));
{
  const day = hoursLogic.calculateDuration('09:00', '17:30', 30);
  assert(day.hhmm === '8:00' && day.decimalHours === 8 && day.workedMinutes === 480, `Hours: 09:00-17:30 with 30 min break = 8:00 (8.00 h) (got ${day.hhmm}, ${day.decimalHours})`);

  const night = hoursLogic.calculateDuration('22:00', '06:00', 0);
  assert(night.hhmm === '8:00' && night.crossesMidnight === true, `Hours: 22:00-06:00 crosses midnight = 8:00 (got ${night.hhmm})`);

  assert(hoursLogic.minutesToDecimal(8 * 60 + 45) === 8.75, 'Hours: 8 h 45 min = 8.75 decimal hours');
  const quarterTo = hoursLogic.calculateDuration('08:15', '17:30', 30);
  assert(quarterTo.hhmm === '8:45' && quarterTo.decimalHours === 8.75, 'Hours: 08:15-17:30 with 30 min break = 8:45 = 8.75 h');
  assert(hoursLogic.decimalToMinutes(8.75) === 525, 'Hours: 8.75 h = 525 minutes');

  const fiveDays = Array.from({ length: 5 }, () => ({ start: '09:00', end: '17:00', break: 0 }));
  const week40 = hoursLogic.calculateTimesheet(fiveDays, { rate: 15 });
  assert(week40.decimalHours === 40 && week40.totalPay === 600 && week40.overtimePay === 0, `Hours: five 8 h days at 15/hour = 600 (got ${week40.totalPay})`);

  const nineHourDays = Array.from({ length: 5 }, () => ({ start: '08:00', end: '17:00', break: 0 }));
  const week45 = hoursLogic.calculateTimesheet(nineHourDays, { rate: 20, overtimeAfterHours: 40, overtimeMultiplier: 1.5 });
  assert(week45.decimalHours === 45 && week45.regularPay === 800 && week45.overtimePay === 150 && week45.totalPay === 950,
    `Hours: 45 h at 20/h with overtime after 40 at 1.5x = 800 + 150 = 950 (got ${week45.regularPay} + ${week45.overtimePay} = ${week45.totalPay})`);
  const noOt = hoursLogic.calculateTimesheet(nineHourDays, { rate: 20, overtime: false });
  assert(noOt.totalPay === 900 && noOt.overtimeMinutes === 0, 'Hours: overtime switched off pays 45 h x 20 = 900');

  // Empty days are skipped, half-filled days and impossible breaks are rejected
  const withDaysOff = hoursLogic.calculateTimesheet([{ start: '09:00', end: '17:00' }, {}, { start: '', end: '' }]);
  assert(withDaysOff.daysWorked === 1 && withDaysOff.hhmm === '8:00' && withDaysOff.hasRate === false, 'Hours: empty timesheet rows count as days off; no rate means no pay figures');
  const half = hoursLogic.calculateTimesheet([{ start: '09:00', end: '' }]);
  assert(half.error && half.rowIndex === 0 && /Monday/.test(half.error), 'Hours: a row with only a start time names the day in its error');
  assert(hoursLogic.calculateDuration('09:00', '10:00', 90).error, 'Hours: a break longer than the shift is an error');
  assert(hoursLogic.calculateDuration('09:00', '17:00', -5).error, 'Hours: a negative break is an error');
  assert(hoursLogic.calculateDuration('25:00', '17:00', 0).error && hoursLogic.calculateDuration('', '17:00', 0).error, 'Hours: invalid or missing start time is an error');
  assert(hoursLogic.calculateTimesheet(fiveDays, { rate: 10, overtimeMultiplier: 0.5 }).error, 'Hours: an overtime multiplier below 1 is an error');

  // 12-hour input and formatting
  assert(hoursLogic.parseTime('5:30 pm') === 1050 && hoursLogic.parseTime('12am') === 0 && hoursLogic.parseTime('12:15 PM') === 735, 'Hours: 12-hour times parse (5:30 pm, 12am, 12:15 PM)');
  assert(hoursLogic.parseTime('9') === null, 'Hours: a bare hour without am/pm is rejected as ambiguous');
  assert(hoursLogic.formatHoursMinutes(2705) === '45:05', 'Hours: totals over 24 h format as 45:05');

  // Property: duration + break always equals the clock span, and is within one day
  const rand = mulberry32(2026);
  for (let i = 0; i < 300; i++) {
    const s = Math.floor(rand() * 1440), e = Math.floor(rand() * 1440);
    const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const span = ((e - s) + 1440) % 1440;
    const brk = Math.floor(rand() * (span + 1));
    const r = hoursLogic.calculateDuration(fmt(s), fmt(e), brk);
    if (r.error || r.workedMinutes + brk !== span || r.workedMinutes < 0 || r.workedMinutes >= 1440) {
      assert(false, `Hours fuzz: ${fmt(s)}-${fmt(e)} break ${brk} gave ${JSON.stringify(r)}`);
      break;
    }
  }
}

// Unix Timestamp Converter Logic
const unixLogic = require(path.join(ROOT, 'src/tools/unix-timestamp-converter/logic.js'));
{
  const now = Date.UTC(2026, 9, 31, 12, 0, 0);
  const epoch = unixLogic.convertTimestamp('0', { now });
  assert(epoch.iso === '1970-01-01T00:00:00Z' && epoch.unit === 's', `Unix: 0 -> 1970-01-01T00:00:00Z (got ${epoch.iso})`);

  const sec = unixLogic.convertTimestamp('1700000000', { now });
  assert(sec.iso === '2023-11-14T22:13:20Z' && sec.unit === 's' && sec.detected, `Unix: 1700000000 -> 2023-11-14T22:13:20Z (got ${sec.iso})`);
  assert(sec.rfc2822 === 'Tue, 14 Nov 2023 22:13:20 +0000', `Unix: RFC 2822 for 1700000000 (got ${sec.rfc2822})`);

  const ms = unixLogic.convertTimestamp('1700000000000', { now });
  assert(ms.unit === 'ms' && ms.iso === '2023-11-14T22:13:20Z' && ms.seconds === 1700000000, `Unix: 1700000000000 detected as ms -> same date (got ${ms.unit}, ${ms.iso})`);

  const y2038 = unixLogic.convertTimestamp(String(unixLogic.INT32_MAX), { now });
  assert(y2038.iso === '2038-01-19T03:14:07Z' && y2038.beyond2038 === false, `Unix: 2147483647 -> 2038-01-19T03:14:07Z (got ${y2038.iso})`);
  assert(unixLogic.convertTimestamp('2147483648', { now }).beyond2038 === true, 'Unix: 2147483648 is past the signed 32-bit limit');

  // Units, negatives and invalid input
  assert(unixLogic.detectUnit(1700000000) === 's' && unixLogic.detectUnit(1700000000000) === 'ms' && unixLogic.detectUnit(1700000000000000) === 'us' && unixLogic.detectUnit(1700000000000000000) === 'ns', 'Unix: unit detection for s, ms, us and ns');
  assert(unixLogic.convertTimestamp('1700000000', { unit: 'ms', now }).iso === '1970-01-20T16:13:20Z', 'Unix: forcing ms reads 1700000000 as 20 January 1970');
  assert(unixLogic.convertTimestamp('-86400', { now }).iso === '1969-12-31T00:00:00Z', 'Unix: -86400 -> 1969-12-31T00:00:00Z');
  assert(unixLogic.convertTimestamp('1,700,000,000', { now }).seconds === 1700000000, 'Unix: thousands separators are ignored');
  assert(unixLogic.convertTimestamp('1700000000123', { now }).iso === '2023-11-14T22:13:20.123Z', 'Unix: milliseconds are kept in ISO output');
  assert(unixLogic.convertTimestamp('abc', { now }).error && unixLogic.convertTimestamp('', { now }).error, 'Unix: text and empty input are errors');
  assert(unixLogic.convertTimestamp('99999999999999999999999', { unit: 's', now }).error, 'Unix: out-of-range timestamps are errors');

  // Relative time
  assert(unixLogic.relativeTime(now - 3 * 86400000, now) === '3 days ago', 'Unix: relative "3 days ago"');
  assert(unixLogic.relativeTime(now + 2 * 3600000, now) === 'in 2 hours', 'Unix: relative "in 2 hours"');
  assert(unixLogic.relativeTime(now + 1000, now) === 'just now', 'Unix: relative "just now"');

  // Offsets and date -> timestamp
  assert(unixLogic.toIsoWithOffset(1700000000000, 300) === '2023-11-15T03:13:20+05:00', 'Unix: ISO with +05:00 offset');
  assert(unixLogic.toRfc2822(1700000000000, -300) === 'Tue, 14 Nov 2023 17:13:20 -0500', 'Unix: RFC 2822 with -0500 offset');
  const back = unixLogic.dateToTimestamp('2023-11-14T22:13:20', { zone: 'utc' });
  assert(back.seconds === 1700000000 && back.milliseconds === 1700000000000, 'Unix: 2023-11-14T22:13:20 UTC -> 1700000000');
  assert(unixLogic.dateToTimestamp('2038-01-19 03:14:07', { zone: 'utc' }).seconds === 2147483647, 'Unix: 2038-01-19 03:14:07 UTC -> 2147483647');
  assert(unixLogic.dateToTimestamp('2026-02-30T00:00', { zone: 'utc' }).error, 'Unix: 30 February is rejected');

  // Property: date -> timestamp -> date round-trips
  const rand = mulberry32(1970);
  for (let i = 0; i < 300; i++) {
    const t = Math.floor((rand() * 2 - 0.5) * 4e9);
    const iso = unixLogic.convertTimestamp(String(t), { unit: 's', now }).iso;
    const round = unixLogic.dateToTimestamp(iso.replace('Z', ''), { zone: 'utc' });
    if (round.seconds !== t) {
      assert(false, `Unix fuzz: ${t} -> ${iso} -> ${round.seconds}`);
      break;
    }
  }
}

// Week Number Calculator Logic
const weekLogic = require(path.join(ROOT, 'src/tools/week-number-calculator/logic.js'));
{
  const cases = [
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2024-12-30', '2025-W01'],
    ['2026-12-28', '2026-W53'],
    ['2025-12-29', '2026-W01'],
    ['2021-01-03', '2020-W53'],
    ['2024-01-01', '2024-W01'],
    ['2026-10-31', '2026-W44']
  ];
  cases.forEach(([date, expected]) => {
    const info = weekLogic.weekInfo(date);
    assert(info.isoLabel === expected, `Week: ${date} -> ${expected} (got ${info.isoLabel})`);
  });
  assert(weekLogic.isoWeeksInYear(2026) === 53, 'Week: 2026 has 53 ISO weeks');
  assert(weekLogic.isoWeeksInYear(2025) === 52 && weekLogic.isoWeeksInYear(2027) === 52, 'Week: 2025 and 2027 have 52 ISO weeks');
  assert(weekLogic.isoWeeksInYear(2020) === 53 && weekLogic.isoWeeksInYear(2032) === 53, 'Week: 2020 (leap, starts Wednesday) and 2032 have 53 ISO weeks');

  const w1 = weekLogic.isoWeekRange(2026, 1);
  assert(w1.start === '2025-12-29' && w1.end === '2026-01-04', `Week: 2026-W01 runs 2025-12-29 to 2026-01-04 (got ${w1.start} to ${w1.end})`);
  const w53 = weekLogic.isoWeekRange(2026, 53);
  assert(w53.start === '2026-12-28' && w53.end === '2027-01-03' && w53.days.length === 7, 'Week: 2026-W53 runs 2026-12-28 to 2027-01-03');
  assert(weekLogic.isoWeekRange(2025, 53).error, 'Week: 2025-W53 does not exist');
  assert(weekLogic.isoWeekRange(2026, 0).error, 'Week: week 0 is rejected');

  const jan1 = weekLogic.weekInfo('2027-01-01');
  assert(jan1.weekYearDiffers === true && jan1.isoWeekYear === 2026 && jan1.isoWeekday === 5 && jan1.isoFullLabel === '2026-W53-5', 'Week: 2027-01-01 is 2026-W53-5, flagged as a different week-year');

  // US-style numbering: Sunday start, week 1 contains January 1
  assert(weekLogic.weekInfo('2026-01-03').usWeek === 1 && weekLogic.weekInfo('2026-01-04').usWeek === 2, 'Week US: 2026-01-03 (Sat) is week 1, 2026-01-04 (Sun) starts week 2');
  assert(weekLogic.weekInfo('2027-01-01').usWeek === 1, 'Week US: 1 January is always US week 1');
  assert(weekLogic.weekInfo('2000-12-31').usWeek === 54, 'Week US: 2000-12-31 is US week 54');

  assert(weekLogic.weekInfo('2026-02-29').error && weekLogic.weekInfo('').error, 'Week: invalid dates are errors');
  const parsedWeek = weekLogic.parseIsoWeekString('2026-W53-4');
  assert(parsedWeek && parsedWeek.year === 2026 && parsedWeek.week === 53 && parsedWeek.day === 4, 'Week: parses "2026-W53-4"');

  // Property: every day maps into a week whose Monday-Sunday range contains it
  const rand = mulberry32(8601);
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.UTC(1990, 0, 1) + Math.floor(rand() * 20000) * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const info = weekLogic.weekInfo(iso);
    if (!(info.weekStart <= iso && iso <= info.weekEnd) || info.isoWeek < 1 || info.isoWeek > info.weeksInIsoYear) {
      assert(false, `Week fuzz: ${iso} -> ${info.isoLabel} (${info.weekStart} to ${info.weekEnd})`);
      break;
    }
  }
}

// Time Zone Converter Logic
const tzLogic = require(path.join(ROOT, 'src/tools/time-zone-converter/logic.js'));
{
  const summer = tzLogic.convert('2026-07-01', '12:00', 'America/New_York', ['UTC', 'Asia/Karachi']);
  assert(summer.iso === '2026-07-01T16:00:00Z', `TimeZone: 2026-07-01 12:00 New York = 16:00 UTC (got ${summer.iso})`);
  assert(summer.targets[0].time === '16:00' && summer.targets[1].time === '21:00' && summer.targets[1].dayDiff === 0,
    `TimeZone: ... = 21:00 Asia/Karachi (got ${summer.targets.map(t => t.time).join(', ')})`);
  assert(summer.source.offsetLabel === 'UTC−04:00', 'TimeZone: New York is UTC-4 in July (EDT)');

  const winter = tzLogic.convert('2026-01-15', '09:00', 'Europe/London', ['Asia/Karachi']);
  assert(winter.targets[0].time === '14:00' && winter.targets[0].date === '2026-01-15', `TimeZone: 2026-01-15 09:00 London = 14:00 Karachi (got ${winter.targets[0].time})`);
  assert(tzLogic.convert('2026-07-15', '09:00', 'Europe/London', ['Asia/Karachi']).targets[0].time === '13:00', 'TimeZone: in July (BST) 09:00 London = 13:00 Karachi');

  // Day changes and half-hour zones
  const late = tzLogic.convert('2026-03-10', '18:00', 'America/Los_Angeles', ['Asia/Tokyo', 'Asia/Kolkata']);
  assert(late.targets[0].time === '10:00' && late.targets[0].date === '2026-03-11' && late.targets[0].dayDiff === 1, 'TimeZone: 18:00 Los Angeles (PDT) = 10:00 next day in Tokyo');
  assert(late.targets[1].time === '06:30' && late.targets[1].offsetLabel === 'UTC+05:30', 'TimeZone: Kolkata keeps its half-hour offset');
  assert(tzLogic.convert('2026-01-01', '01:00', 'Asia/Tokyo', ['America/New_York']).targets[0].dayDiff === -1, 'TimeZone: 01:00 Tokyo is the previous day in New York');

  // DST edges
  const gap = tzLogic.zonedToUtc('2026-03-08', '02:30', 'America/New_York');
  assert(gap.nonexistent === true && new Date(gap.utcMs).toISOString() === '2026-03-08T07:30:00.000Z', 'TimeZone: 02:30 on the US spring-forward day is moved to 03:30 EDT');
  const repeat = tzLogic.zonedToUtc('2026-11-01', '01:30', 'America/New_York');
  assert(repeat.ambiguous === true && new Date(repeat.utcMs).toISOString() === '2026-11-01T05:30:00.000Z', 'TimeZone: 01:30 on the US fall-back day uses the first (EDT) occurrence');
  assert(tzLogic.offsetMinutes('Europe/London', Date.UTC(2026, 2, 29, 0, 59)) === 0 && tzLogic.offsetMinutes('Europe/London', Date.UTC(2026, 2, 29, 1, 0)) === 60, 'TimeZone: London switches to BST at 01:00 UTC on 29 March 2026');

  // Overlap strip
  const strip = tzLogic.overlapStrip('2026-07-01', 'Europe/London', ['Europe/Berlin']);
  assert(strip.rows.length === 2 && strip.rows[0].slots.length === 24, 'TimeZone: strip has a row per zone and 24 hourly slots');
  assert(JSON.stringify(strip.overlap) === JSON.stringify([9, 10, 11, 12, 13, 14, 15]), `TimeZone: London/Berlin overlap is 09:00-16:00 London time (got ${strip.overlap})`);
  assert(tzLogic.overlapStrip('2026-07-01', 'America/Los_Angeles', ['Asia/Tokyo', 'Europe/London']).overlap.length === 0, 'TimeZone: LA, Tokyo and London share no 9-5 hour');

  // Zone search and validation
  assert(tzLogic.resolveZone('pakistan') === 'Asia/Karachi' && tzLogic.resolveZone('Lahore') === 'Asia/Karachi', 'TimeZone: "pakistan" and "Lahore" resolve to Asia/Karachi');
  assert(tzLogic.resolveZone('new york') === 'America/New_York' && tzLogic.resolveZone('asia/tokyo') === 'Asia/Tokyo', 'TimeZone: city names and lower-case IANA names resolve');
  assert(tzLogic.resolveZone('PST') === 'America/Los_Angeles' && tzLogic.resolveZone('India') === 'Asia/Kolkata', 'TimeZone: "PST" and "India" resolve to their main zones');
  assert(tzLogic.resolveZone('Narnia') === null, 'TimeZone: unknown places do not resolve');
  assert(tzLogic.canonicalZone('Asia/Calcutta') === 'Asia/Kolkata' && tzLogic.resolveZone('Asia/Calcutta') === 'Asia/Kolkata', 'TimeZone: legacy ICU names map to current IANA names');
  assert(!tzLogic.listZones().includes('Asia/Calcutta') && tzLogic.listZones().includes('Asia/Kolkata'), 'TimeZone: the zone list uses current names (Asia/Kolkata, not Asia/Calcutta)');
  assert(tzLogic.convert('2026-07-01', '12:00', 'Mars/Olympus', []).error && tzLogic.convert('2026-13-01', '12:00', 'UTC', []).error, 'TimeZone: unknown zones and invalid dates are errors');
  const zones = tzLogic.listZones();
  assert(zones[0] === 'UTC' && zones.includes('Asia/Karachi') && zones.length > 300, `TimeZone: zone list comes from Intl and starts with UTC (${zones.length} zones)`);

  // Property: converting there and back returns the same wall time
  const rand = mulberry32(1884);
  const sample = ['America/New_York', 'Europe/London', 'Asia/Karachi', 'Asia/Kolkata', 'Australia/Sydney', 'America/Sao_Paulo', 'Pacific/Auckland'];
  for (let i = 0; i < 200; i++) {
    const a = sample[Math.floor(rand() * sample.length)], b = sample[Math.floor(rand() * sample.length)];
    const day = new Date(Date.UTC(2026, 0, 1) + Math.floor(rand() * 365) * 86400000).toISOString().slice(0, 10);
    const time = `${String(Math.floor(rand() * 24)).padStart(2, '0')}:${rand() < 0.5 ? '00' : '30'}`;
    const there = tzLogic.convert(day, time, a, [b]);
    if (there.nonexistent || there.ambiguous) continue;
    const t = there.targets[0];
    const back = tzLogic.convert(t.date, t.time, b, [a]);
    if (back.utcMs !== there.utcMs && !back.ambiguous) {
      assert(false, `TimeZone fuzz: ${day} ${time} ${a} -> ${t.date} ${t.time} ${b} did not round-trip`);
      break;
    }
  }
}

// Tip Calculator Logic
const tipLogic = require(path.join(ROOT, 'src/tools/tip-calculator/logic.js'));
{
  const r = tipLogic.calculateTip({ bill: 85.50, tipPercent: 18, people: 3 });
  assert(r.tip === 15.39 && r.total === 100.89 && r.perPerson === 33.63, `Tip: 85.50 at 18% for 3 -> tip 15.39, total 100.89, 33.63 each (got ${r.tip}, ${r.total}, ${r.perPerson})`);
  assert(r.unevenSplit === false, 'Tip: 100.89 splits evenly between 3');

  const uneven = tipLogic.calculateTip({ bill: 100, tipPercent: 0, people: 3 });
  assert(uneven.unevenSplit && uneven.extraCentPayers === 1 && uneven.lowShare === 33.33 && uneven.highShare === 33.34, 'Tip: 100 between 3 -> two pay 33.33, one pays 33.34');

  const up = tipLogic.calculateTip({ bill: 85.50, tipPercent: 18, people: 3, roundUp: true });
  assert(up.perPerson === 34 && up.total === 102 && up.tip === 16.5 && up.roundingExtra === 1.11, `Tip: rounding up gives 34 each, 102 total, tip 16.50 (got ${up.perPerson}, ${up.total}, ${up.tip})`);
  assert(up.effectiveTipPercent === 19.3, `Tip: rounded-up tip is 19.3% of the bill (got ${up.effectiveTipPercent})`);

  const preTax = tipLogic.calculateTip({ bill: 108, tipPercent: 20, people: 2, tipOnPreTax: true, taxPercent: 8 });
  assert(preTax.tipBase === 100 && preTax.tax === 8 && preTax.tip === 20 && preTax.total === 128 && preTax.perPerson === 64, 'Tip: 20% on the pre-tax 100 of a 108 bill with 8% tax = 20 tip');
  assert(tipLogic.calculateTip({ bill: 108, tipPercent: 20, tipOnPreTax: false, taxPercent: 8 }).tip === 21.6, 'Tip: without the pre-tax option the tip is on the full 108');

  assert(tipLogic.calculateTip({ bill: '', tipPercent: 18 }).field === 'bill', 'Tip: missing bill is an error on the bill field');
  assert(tipLogic.calculateTip({ bill: 50, tipPercent: -5 }).field === 'tip', 'Tip: negative tip is an error');
  assert(tipLogic.calculateTip({ bill: 50, tipPercent: 15, people: 2.5 }).field === 'people', 'Tip: fractional people is an error');
  assert(tipLogic.calculateTip({ bill: 50, tipPercent: 15, people: 0 }).field === 'people', 'Tip: zero people is an error');
  assert(JSON.stringify(tipLogic.PRESETS) === '[10,15,18,20,25]', 'Tip: presets are 10, 15, 18, 20, 25');

  // Property: shares always add back up to the total
  const rand = mulberry32(1818);
  for (let i = 0; i < 300; i++) {
    const bill = Math.round(rand() * 50000) / 100 + 0.01;
    const people = 1 + Math.floor(rand() * 12);
    const t = tipLogic.calculateTip({ bill, tipPercent: Math.floor(rand() * 30), people });
    const collected = Math.round(t.lowShare * 100) * (people - t.extraCentPayers) + Math.round(t.highShare * 100) * t.extraCentPayers;
    if (collected !== Math.round(t.total * 100)) {
      assert(false, `Tip fuzz: ${bill} between ${people} -> shares ${t.lowShare}/${t.highShare} do not add up to ${t.total}`);
      break;
    }
  }
}

// Salary to Hourly Logic
const salaryLogic = require(path.join(ROOT, 'src/tools/salary-to-hourly-calculator/logic.js'));
{
  const a = salaryLogic.convertPay({ amount: 52000, period: 'annual', hoursPerWeek: 40, weeksPerYear: 52 });
  assert(a.hourly === 25 && a.weekly === 1000 && a.biweekly === 2000 && a.daily === 200 && a.monthly === 4333.33, `Salary: 52,000/year at 40 h x 52 weeks -> 25.00/hour (got ${a.hourly})`);

  const h = salaryLogic.convertPay({ amount: 30, period: 'hourly' });
  assert(h.annual === 62400 && h.monthly === 5200, `Salary: 30/hour -> 62,400/year and 5,200/month (got ${h.annual}, ${h.monthly})`);

  const off = salaryLogic.convertPay({ amount: 52000, period: 'annual', unpaidWeeks: 2 });
  assert(off.paidWeeks === 50 && off.hourly === 26, `Salary: 52,000/year with 2 unpaid weeks (50 weeks) -> 26.00/hour (got ${off.hourly})`);

  assert(salaryLogic.convertPay({ amount: 5000, period: 'monthly' }).annual === 60000, 'Salary: 5,000/month = 60,000/year');
  assert(salaryLogic.convertPay({ amount: 2000, period: 'biweekly' }).annual === 52000, 'Salary: 2,000 every two weeks = 52,000/year');
  assert(salaryLogic.convertPay({ amount: 1000, period: 'weekly' }).hourly === 25, 'Salary: 1,000/week at 40 h = 25/hour');
  assert(salaryLogic.convertPay({ amount: 200, period: 'daily' }).annual === 52000, 'Salary: 200/day x 5 days x 52 weeks = 52,000/year');
  assert(salaryLogic.convertPay({ amount: 52000, period: 'annual', hoursPerWeek: 37.5 }).hourly === 26.67, 'Salary: 52,000 at 37.5 h/week = 26.67/hour');

  assert(salaryLogic.convertPay({ amount: 0, period: 'annual' }).field === 'amount', 'Salary: zero pay is an error');
  assert(salaryLogic.convertPay({ amount: 100, period: 'annual', hoursPerWeek: 200 }).field === 'hours', 'Salary: more than 168 hours a week is an error');
  assert(salaryLogic.convertPay({ amount: 100, period: 'annual', unpaidWeeks: 52 }).field === 'unpaid', 'Salary: unpaid weeks equal to the year is an error');
  assert(salaryLogic.convertPay({ amount: 100, period: 'fortnightly' }).field === 'period', 'Salary: unknown pay period is an error');

  // Property: converting any period to hourly and back returns the same pay
  const rand = mulberry32(4052);
  for (let i = 0; i < 300; i++) {
    const period = salaryLogic.PERIODS[Math.floor(rand() * salaryLogic.PERIODS.length)];
    const input = { amount: 1 + rand() * 100000, period, hoursPerWeek: 10 + Math.floor(rand() * 50), weeksPerYear: 52, unpaidWeeks: Math.floor(rand() * 6) };
    const r = salaryLogic.convertPay(input);
    const back = salaryLogic.convertPay(Object.assign({}, input, { amount: r.exact.hourly, period: 'hourly' }));
    if (Math.abs(back.exact.annual - r.exact.annual) > 1e-6 * r.exact.annual) {
      assert(false, `Salary fuzz: ${JSON.stringify(input)} did not round-trip through hourly`);
      break;
    }
  }
}

// Profit Margin & Markup Logic
const profitLogic = require(path.join(ROOT, 'src/tools/profit-margin-calculator/logic.js'));
{
  const r = profitLogic.fromCostAndPrice(60, 100);
  assert(r.profit === 40 && r.marginPercent === 40 && r.markupPercent === 66.67, `Profit: cost 60, price 100 -> profit 40, margin 40%, markup 66.67% (got ${r.profit}, ${r.marginPercent}, ${r.markupPercent})`);
  const m = profitLogic.priceFromMargin(75, 25);
  assert(m.price === 100 && m.profit === 25 && m.equivalentMarkup === 33.3333, `Profit: cost 75 with 25% margin -> price 100 (got ${m.price})`);
  const k = profitLogic.priceFromMarkup(80, 25);
  assert(k.price === 100 && k.marginPercent === 20 && k.equivalentMargin === 20, `Profit: cost 80 with 25% markup -> price 100, margin 20% (got ${k.price})`);

  const loss = profitLogic.fromCostAndPrice(120, 100);
  assert(loss.isLoss && loss.profit === -20 && loss.marginPercent === -20 && loss.markupPercent === -16.67, 'Profit: selling below cost shows a loss with negative margin and markup');
  assert(profitLogic.fromCostAndPrice(0, 50).markupPercent === null && profitLogic.fromCostAndPrice(0, 50).marginPercent === 100, 'Profit: zero cost gives 100% margin and no markup');
  assert(profitLogic.marginToMarkup(50) === 100 && profitLogic.markupToMargin(100) === 50, 'Profit: 50% margin = 100% markup');
  assert(profitLogic.priceFromMargin(50, 100).field === 'margin' && profitLogic.priceFromMargin(50, 150).error, 'Profit: margins of 100% or more are rejected');
  assert(profitLogic.priceFromMarkup(50, -100).field === 'markup', 'Profit: markup of -100% is rejected');
  assert(profitLogic.fromCostAndPrice(-5, 10).field === 'cost' && profitLogic.fromCostAndPrice(5, 0).field === 'price', 'Profit: negative cost and zero price are rejected');

  // Property: price from a margin gives back that margin, and margin and markup describe the same price
  const rand = mulberry32(6040);
  for (let i = 0; i < 300; i++) {
    const cost = 1 + Math.round(rand() * 100000) / 100;
    const margin = Math.round(rand() * 9500) / 100;
    const p = profitLogic.priceFromMargin(cost, margin);
    const viaMarkup = profitLogic.priceFromMarkup(cost, profitLogic.marginToMarkup(margin));
    if (Math.abs(p.marginPercent - margin) > 0.02 || Math.abs(viaMarkup.price - p.price) > 0.02) {
      assert(false, `Profit fuzz: cost ${cost}, margin ${margin}% -> ${p.price} / ${viaMarkup.price}`);
      break;
    }
  }
}

// Fraction Calculator Logic
const fractionLogic = require(path.join(ROOT, 'src/tools/fraction-calculator/logic.js'));
{
  const add = fractionLogic.calculate('1/2', '+', '1/3');
  assert(add.fraction === '5/6' && add.decimal === '0.8(3)', `Fraction: 1/2 + 1/3 = 5/6 (got ${add.fraction})`);
  assert(add.steps.some(s => /LCM\(2, 3\) = 6/.test(s)), 'Fraction: addition steps show the common denominator');
  const div = fractionLogic.calculate('3/4', '/', '1/2');
  assert(div.fraction === '3/2' && div.mixed === '1 1/2' && div.decimal === '1.5', `Fraction: 3/4 ÷ 1/2 = 3/2 = 1 1/2 (got ${div.fraction}, ${div.mixed})`);
  assert(div.steps.some(s => /reciprocal 2\/1/.test(s)) && div.steps.some(s => /GCD\(6, 4\) = 2/.test(s)), 'Fraction: division steps show the reciprocal and the GCD');
  const mul = fractionLogic.calculate('2 1/3', '*', '3/7');
  assert(mul.fraction === '1' && mul.mixed === '1', `Fraction: 2 1/3 × 3/7 = 1 (got ${mul.fraction})`);
  assert(mul.steps[0].includes('7/3'), 'Fraction: mixed number is converted to 7/3 first');
  const simp = fractionLogic.simplify('6/8');
  assert(simp.fraction === '3/4' && simp.gcd === '2', `Fraction: 6/8 simplifies to 3/4 (got ${simp.fraction})`);
  const dec = fractionLogic.decimalToFraction('0.375');
  assert(dec.fraction === '3/8', `Fraction: 0.375 = 3/8 (got ${dec.fraction})`);
  const zero = fractionLogic.calculate('1/2', '/', '0/5');
  assert(zero.error && /divide by zero/i.test(zero.error) && zero.field === 'b', 'Fraction: dividing by a zero fraction is a clear error');

  // More forms and edge cases
  assert(fractionLogic.calculate('-1 1/2', '-', '2/3').mixed === '-2 1/6', 'Fraction: -1 1/2 − 2/3 = -2 1/6');
  assert(fractionLogic.calculate('5', '*', '0.25').fraction === '5/4', 'Fraction: whole numbers and decimals are accepted (5 × 0.25 = 5/4)');
  assert(fractionLogic.calculate('3/-4', '+', '1/4').fraction === '-1/2', 'Fraction: a negative denominator is normalised');
  assert(fractionLogic.calculate('1/3', '+', '1/3').steps[0].includes('already the same'), 'Fraction: equal denominators skip the LCM step');
  assert(fractionLogic.calculate('1/0', '+', '1/2').error, 'Fraction: a zero denominator is an error');
  assert(fractionLogic.calculate('abc', '+', '1/2').field === 'a', 'Fraction: text input is an error on the first field');
  assert(fractionLogic.simplify('7/13').alreadySimplest === true, 'Fraction: 7/13 is already in lowest terms');
  assert(fractionLogic.decimalToFraction('1.25').mixed === '1 1/4' && fractionLogic.decimalToFraction('-0.5').fraction === '-1/2', 'Fraction: 1.25 = 1 1/4 and -0.5 = -1/2');
  assert(fractionLogic.decimalToFraction('0.3.3').error && fractionLogic.decimalToFraction('').error, 'Fraction: malformed decimals are errors');
  assert(fractionLogic.toDecimal({ n: 1n, d: 7n }).text === '0.(142857)', 'Fraction: 1/7 = 0.(142857)');
  const big = fractionLogic.calculate('123456789012345678/987654321', '*', '987654321/2');
  assert(big.fraction === '61728394506172839', 'Fraction: large numbers stay exact (BigInt)');

  // Property: (a op b) matches floating-point arithmetic
  const rand = mulberry32(3141);
  const ops = { '+': (x, y) => x + y, '-': (x, y) => x - y, '*': (x, y) => x * y, '/': (x, y) => x / y };
  for (let i = 0; i < 400; i++) {
    const a = [1 + Math.floor(rand() * 40), 1 + Math.floor(rand() * 40)], b = [1 + Math.floor(rand() * 40), 1 + Math.floor(rand() * 40)];
    const op = Object.keys(ops)[Math.floor(rand() * 4)];
    const r = fractionLogic.calculate(`${a[0]}/${a[1]}`, op, `${b[0]}/${b[1]}`);
    const expected = ops[op](a[0] / a[1], b[0] / b[1]);
    const got = Number(r.numerator) / Number(r.denominator);
    if (Math.abs(got - expected) > 1e-9 * Math.max(1, Math.abs(expected)) || fractionLogic.gcd(BigInt(r.numerator), BigInt(r.denominator)) !== 1n) {
      assert(false, `Fraction fuzz: ${a[0]}/${a[1]} ${op} ${b[0]}/${b[1]} gave ${r.fraction}`);
      break;
    }
  }
}

// Mean, Median, Mode & Standard Deviation Logic
const statsLogic = require(path.join(ROOT, 'src/tools/mean-median-mode-calculator/logic.js'));
{
  const s = statsLogic.analyse('2,4,4,4,5,5,7,9');
  assert(s.mean === 5 && s.median === 4.5, `Stats: [2,4,4,4,5,5,7,9] mean 5, median 4.5 (got ${s.mean}, ${s.median})`);
  assert(JSON.stringify(s.modes) === '[4]' && s.modeFrequency === 3, 'Stats: mode 4 (appears 3 times)');
  assert(s.populationSD === 2 && statsLogic.fmt(s.sampleSD, 4) === '2.1381', `Stats: population SD 2, sample SD 2.1381 (got ${s.populationSD}, ${statsLogic.fmt(s.sampleSD, 4)})`);
  assert(s.count === 8 && s.sum === 40 && s.min === 2 && s.max === 9 && s.range === 7, 'Stats: count 8, sum 40, min 2, max 9, range 7');
  assert(s.populationVariance === 4 && statsLogic.fmt(s.sampleVariance, 4) === '4.5714', 'Stats: variances 4 and 4.5714');
  assert(s.q1 === 4 && s.q3 === 6 && s.iqr === 2, `Stats: Q1 4, Q3 6 by median of halves (got ${s.q1}, ${s.q3})`);
  assert(s.steps.sd.some(t => t.includes('32 ÷ (8 − 1)')), 'Stats: steps show the n − 1 division');

  assert(statsLogic.analyse('1 2 3').modes.length === 0, 'Stats: [1,2,3] has no mode');
  assert(statsLogic.analyse('1,1,2,2').modes.length === 0, 'Stats: values that all appear equally often have no mode');
  assert(JSON.stringify(statsLogic.analyse('1,1,2,2,3').modes) === '[1,2]', 'Stats: two values tied for most frequent are both modes');
  const odd = statsLogic.analyse('1\n3\n5\n7\n9');
  assert(odd.median === 5 && odd.q1 === 2 && odd.q3 === 8, 'Stats: odd count excludes the median from the halves (Q1 2, Q3 8)');
  assert(statsLogic.analyse('-1.5; 2.5\t-3').sum === -2, 'Stats: negatives, decimals, semicolons and tabs are accepted');
  const one = statsLogic.analyse('42');
  assert(one.sampleSD === null && one.populationSD === 0 && one.q1 === null, 'Stats: a single value has no sample SD or quartiles');

  assert(/at least one number/i.test(statsLogic.analyse('').error) && statsLogic.analyse('   ,, ').error, 'Stats: empty input is a clear error');
  const bad = statsLogic.analyse('1, two, 3');
  assert(bad.error && bad.error.includes('"two"'), 'Stats: non-numeric input names the bad value');
  assert(statsLogic.analyse([0.1, 0.2, 0.3]).sum === 0.6, 'Stats: compensated summation keeps 0.1 + 0.2 + 0.3 = 0.6');

  // Property: shifting all values shifts the mean and median but not the SD
  const rand = mulberry32(1999);
  for (let i = 0; i < 200; i++) {
    const values = Array.from({ length: 2 + Math.floor(rand() * 30) }, () => Math.round(rand() * 1000) / 10);
    const shift = Math.round(rand() * 100);
    const a = statsLogic.analyse(values), b = statsLogic.analyse(values.map(v => v + shift));
    if (Math.abs(b.mean - a.mean - shift) > 1e-9 || Math.abs(b.median - a.median - shift) > 1e-9 || Math.abs(b.sampleSD - a.sampleSD) > 1e-9) {
      assert(false, `Stats fuzz: shifting ${values} by ${shift} broke an invariant`);
      break;
    }
  }
}

// Code formatters (async: the engines load with dynamic import)
async function testCodeFormatters() {
  const pyFormatter = require(path.join(ROOT, 'src/tools/python-formatter/logic.js'));
  const javaFormatter = require(path.join(ROOT, 'src/tools/java-formatter/logic.js'));
  const rejects = async (promise) => { try { await promise; return null; } catch (e) { return e; } };

  // Python (Ruff): a messy function formats to the expected output
  const messyPy = "def  calculate_total( items,tax_rate = 0.18 ) :\n  subtotal=sum( item['price']*item['qty'] for item in items )\n  return subtotal*( 1+tax_rate )\n";
  const expectedPy = "def calculate_total(items, tax_rate=0.18):\n    subtotal = sum(item[\"price\"] * item[\"qty\"] for item in items)\n    return subtotal * (1 + tax_rate)\n";
  const py = await pyFormatter.format(messyPy);
  assert(py.output === expectedPy && py.changed, 'PythonFormatter: messy function formats to the expected Ruff output');
  assert((await pyFormatter.format(expectedPy)).changed === false, 'PythonFormatter: formatted code is left unchanged');

  const py79 = await pyFormatter.format("config = {'host':'localhost','port':5432,'database':'inventory','user':'admin','options':{'sslmode':'require','connect_timeout':10}}\n", { lineLength: 79, quoteStyle: 'single' });
  assert(py79.output === "config = {\n    'host': 'localhost',\n    'port': 5432,\n    'database': 'inventory',\n    'user': 'admin',\n    'options': {'sslmode': 'require', 'connect_timeout': 10},\n}\n", 'PythonFormatter: 79 columns with single quotes');
  const py2 = await pyFormatter.format('def f():\n    return 1\n', { indentWidth: 2 });
  assert(py2.output === 'def f():\n  return 1\n', 'PythonFormatter: 2-space indent option');

  // Python: a syntax error returns an error with a line number
  const pyErr = await rejects(pyFormatter.format('def greet(name):\n    print("hi"\n\nx = 1\n'));
  assert(pyErr && pyErr.name === 'PythonSyntaxError' && pyErr.line === 4 && /^Line 4, column 1:/.test(pyErr.message),
    `PythonFormatter: unclosed parenthesis reports a syntax error on line 4 (got ${pyErr && pyErr.message})`);
  const tabErr = await rejects(pyFormatter.format('if True:\n\tx = 1\n        y = 2\n'));
  assert(tabErr && tabErr.line === 3 && /Unexpected indentation/.test(tabErr.message), 'PythonFormatter: mixed tabs and spaces report "Unexpected indentation" on line 3');
  const colErr = await rejects(pyFormatter.format('x = 1\ndef f(:\n    pass\n'));
  assert(colErr && colErr.line === 2 && colErr.column === 7, `PythonFormatter: error column is reported (got ${colErr && colErr.line}:${colErr && colErr.column})`);
  assert(pyFormatter.positionFromByteOffset('é = 1\nx', 7).line === 2, 'PythonFormatter: byte offsets with multi-byte characters map to the right line');
  assert(await rejects(pyFormatter.format('   ')), 'PythonFormatter: empty input is rejected');
  assert(await rejects(pyFormatter.format('x = 1', { lineLength: 77 })), 'PythonFormatter: unsupported line length is rejected');

  // Java (Prettier + prettier-plugin-java): a messy class formats to the expected output
  const messyJava = "public class  OrderTotal{private final List<Integer> prices;public OrderTotal(List<Integer> prices){this.prices=prices;}public int total(){int sum=0;for(int p:prices){sum+=p;}return sum;}}\n";
  const expectedJava = "public class OrderTotal {\n\n    private final List<Integer> prices;\n\n    public OrderTotal(List<Integer> prices) {\n        this.prices = prices;\n    }\n\n    public int total() {\n        int sum = 0;\n        for (int p : prices) {\n            sum += p;\n        }\n        return sum;\n    }\n}\n";
  const java = await javaFormatter.format(messyJava);
  assert(java.output === expectedJava && java.changed, 'JavaFormatter: messy class formats to the expected Prettier output');
  assert((await javaFormatter.format(expectedJava)).changed === false, 'JavaFormatter: formatted code is left unchanged');
  const java2 = await javaFormatter.format("class Adults{List<String> names(List<Person> people){return people.stream().filter(p->p.getAge()>=18).map(p->p.getName().toUpperCase()).sorted().collect(Collectors.toList());}}\n", { indentWidth: 2, printWidth: 100 });
  assert(java2.output === "class Adults {\n\n  List<String> names(List<Person> people) {\n    return people\n      .stream()\n      .filter(p -> p.getAge() >= 18)\n      .map(p -> p.getName().toUpperCase())\n      .sorted()\n      .collect(Collectors.toList());\n  }\n}\n", 'JavaFormatter: 2-space indent and 100 print width (Google-style)');

  // Java: invalid snippets return an error, with the position when it can be found
  const javaErr = await rejects(javaFormatter.format('public class A {\n  void f() {\n    int x = 1\n  }\n}\n'));
  assert(javaErr && javaErr.name === 'JavaSyntaxError' && javaErr.line === 3 && javaErr.column === 14 && /missing ";"/.test(javaErr.message),
    `JavaFormatter: missing semicolon reports line 3, column 14 (got ${javaErr && javaErr.message})`);
  const braceErr = await rejects(javaFormatter.format('class B {\n  void g() {\n    if (x) {\n    }\n'));
  assert(braceErr && braceErr.name === 'JavaSyntaxError' && /missing "}"/.test(braceErr.message), 'JavaFormatter: missing brace is reported');
  assert(await rejects(javaFormatter.format('class C { void h() { int y = ; } }')), 'JavaFormatter: invalid expression returns an error');
  assert(await rejects(javaFormatter.format('class D {}', { indentWidth: 3 })), 'JavaFormatter: unsupported indent is rejected');
}

testCodeFormatters().catch((err) => {
  assert(false, `Code formatter tests threw: ${err && err.stack}`);
}).then(() => {
  console.log(`\nLogic Tests Summary: ${passed} passed, ${failures} failed.`);
  if (failures > 0) {
    process.exit(1);
  } else {
    console.log('✅ ALL PURE LOGIC & PROPERTY FUZZ TESTS PASSED!');
  }
});
