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

console.log(`\nLogic Tests Summary: ${passed} passed, ${failures} failed.`);
if (failures > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL PURE LOGIC & PROPERTY FUZZ TESTS PASSED!');
}
