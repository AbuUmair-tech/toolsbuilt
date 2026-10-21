#!/usr/bin/env node
/**
 * Edge-Case Regression Tests for ToolsBuilt Audit (Oct 2026)
 * Tests the six specific behaviours called out in Phase 1 Step 5 of the audit.
 * All tests are pure-logic (Node only, no browser/DOM required).
 */

'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const DateDiff   = require(path.join(ROOT, 'src/tools/date-difference-calculator/logic.js'));
const AgeCalc    = require(path.join(ROOT, 'src/tools/age-calculator/logic.js'));
const PctChange  = require(path.join(ROOT, 'src/tools/percentage-change-calculator/logic.js'));
const WordCounter = require(path.join(ROOT, 'src/tools/word-counter/logic.js'));
const CaseConv   = require(path.join(ROOT, 'src/tools/text-case-converter/logic.js'));
const AddDays    = require(path.join(ROOT, 'src/tools/add-days-to-date-calculator/logic.js'));

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function assertThrows(fn, label) {
  try {
    fn();
    console.error(`❌ FAIL: ${label} — expected an error but none was thrown`);
    failures++;
  } catch (e) {
    console.log(`✅ PASS: ${label} — threw: ${e.message}`);
  }
}

console.log('\n=== Edge-Case Regression Tests (Oct 2026 Audit) ===\n');

// -----------------------------------------------------------------
// 1. Date Difference: month-end boundary (Jan 31 → Mar 1 = 0y 1m 1d)
// -----------------------------------------------------------------
console.log('--- 1. Date Difference month-end boundary ---');
const dd = DateDiff.calculateDateDifference('2026-01-31', '2026-03-01');
assert(dd.years  === 0, 'DateDiff 2026-01-31→2026-03-01: years=0');
assert(dd.months === 1, 'DateDiff 2026-01-31→2026-03-01: months=1');
assert(dd.days   === 1, 'DateDiff 2026-01-31→2026-03-01: days=1 (never negative)');

// Sanity: standard cases still work
const dd2 = DateDiff.calculateDateDifference('2026-01-01', '2026-02-01');
assert(dd2.years === 0 && dd2.months === 1 && dd2.days === 0,
  'DateDiff 2026-01-01→2026-02-01: 0y 1m 0d');
const dd3 = DateDiff.calculateDateDifference('2026-01-15', '2026-03-10');
assert(dd3.years === 0 && dd3.months === 1 && dd3.days === 23,
  'DateDiff 2026-01-15→2026-03-10: 0y 1m 23d');

// -----------------------------------------------------------------
// 2. Age Calculator: month-end boundary (DOB 2000-01-31 on 2026-03-01 = 26y 1m 1d)
// -----------------------------------------------------------------
console.log('\n--- 2. Age Calculator month-end boundary ---');
const age = AgeCalc.calculateAge('2000-01-31', '2026-03-01');
assert(age.years  === 26, 'Age DOB 2000-01-31 on 2026-03-01: years=26');
assert(age.months === 1,  'Age DOB 2000-01-31 on 2026-03-01: months=1');
assert(age.days   === 1,  'Age DOB 2000-01-31 on 2026-03-01: days=1 (never negative)');

// Sanity: standard case
const age2 = AgeCalc.calculateAge('1995-05-15', '2026-10-17');
assert(age2.years === 31 && age2.months === 5 && age2.days === 2,
  'Age DOB 1995-05-15 on 2026-10-17: 31y 5m 2d');

// -----------------------------------------------------------------
// 3. Percentage Difference of negatives: -10 and -20 = 66.6667 (positive)
// -----------------------------------------------------------------
console.log('\n--- 3. Percentage Difference with negative values ---');
const pct = PctChange.calculatePercentDifference(-10, -20);
assert(pct.percentDifference > 0,         'Pct diff -10 and -20: result is positive');
assert(Math.abs(pct.percentDifference - 66.6667) < 0.001,
  `Pct diff -10 and -20: ≈66.6667 (got ${pct.percentDifference})`);

// Positive pair should also stay positive
const pct2 = PctChange.calculatePercentDifference(10, 20);
assert(pct2.percentDifference > 0, 'Pct diff 10 and 20: result is positive');
assert(Math.abs(pct2.percentDifference - 66.6667) < 0.001,
  `Pct diff 10 and 20: ≈66.6667 (got ${pct2.percentDifference})`);

// -----------------------------------------------------------------
// 4. Word counter: contractions and hyphenated compounds
// -----------------------------------------------------------------
console.log('\n--- 4. Word Counter: contractions and hyphens ---');
const wc1 = WordCounter.analyzeText("don't stop");
assert(wc1.words === 2, `Word count "don't stop": 2 words (got ${wc1.words})`);

const wc2 = WordCounter.analyzeText('state-of-the-art design');
assert(wc2.words === 2, `Word count "state-of-the-art design": 2 words (got ${wc2.words})`);

const wc3 = WordCounter.analyzeText('hello world');
assert(wc3.words === 2, 'Word count "hello world": 2 words');

// -----------------------------------------------------------------
// 5. Text Case: camelCase contraction + Unicode capitalize
// -----------------------------------------------------------------
console.log('\n--- 5. Text Case Converter ---');
const cc1 = CaseConv.convertCase("don't stop", 'camel');
assert(cc1 === 'dontStop', `camelCase "don't stop": "dontStop" (got "${cc1}")`);

const cc2 = CaseConv.convertCase('école élan', 'capitalize');
assert(cc2 === 'École Élan', `capitalize "école élan": "École Élan" (got "${cc2}")`);

// Sanity: normal camel case
const cc3 = CaseConv.convertCase('hello world', 'camel');
assert(cc3 === 'helloWorld', `camelCase "hello world": "helloWorld" (got "${cc3}")`);

// -----------------------------------------------------------------
// 6. Add Days: invalid amount inputs throw clear errors
// -----------------------------------------------------------------
console.log('\n--- 6. Add Days validation ---');
assertThrows(
  () => AddDays.addSubtractDays('2026-01-01', '5abc', 'days', 'add'),
  'addSubtractDays with amount "5abc" throws'
);
assertThrows(
  () => AddDays.addSubtractDays('2026-01-01', '1.9', 'days', 'add'),
  'addSubtractDays with amount "1.9" (float) throws'
);
assertThrows(
  () => AddDays.addSubtractDays('2026-01-01', 1000000000, 'days', 'add'),
  'addSubtractDays with amount 1,000,000,000 days throws (too large)'
);

// Valid amounts should NOT throw
try {
  const r = AddDays.addSubtractDays('2026-01-01', '5', 'days', 'add');
  assert(r.resultDate === '2026-01-06', `addSubtractDays 5 days add: result is 2026-01-06 (got ${r.resultDate})`);
} catch (e) {
  assert(false, `addSubtractDays with valid amount "5" threw unexpectedly: ${e.message}`);
}

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n===================================================');
if (failures === 0) {
  console.log('✅ ALL EDGE-CASE REGRESSION TESTS PASSED (0 failures)');
} else {
  console.error(`❌ ${failures} EDGE-CASE TEST(S) FAILED`);
  process.exit(1);
}
console.log('===================================================\n');
