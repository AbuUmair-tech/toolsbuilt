# ToolsBuilt Calculation Engine & UX Upgrade Changelog

**Version:** 2.0.0
**Branch:** `feat/tools-upgrade`
**Target:** `staging`
**Date:** October 17, 2026

---

## Architecture Overview

All 10 core tools were refactored to separate pure computational logic from DOM/UI side-effects:
1. **Pure Logic Modules (`src/tools/<slug>/logic.js`):** Exported via standard Universal Module Definition (UMD), executable in Node.js test suites via `require()` and in browser runtime via `window.<Tool>Logic`.
2. **Deterministic & Seedable PRNG:** Randomization algorithms accept an optional custom PRNG parameter for deterministic property-based fuzz testing.
3. **UTC Midnight Date Math:** All calendar arithmetic runs on UTC midnight timestamps (`Date.UTC(y, m - 1, d)`), eliminating daylight saving time (DST) ±1 hour shifts that produce off-by-one errors on other platforms.
4. **Debounced Live UI (~150ms):** Automatic computation on keystroke / selection changes with cancellation of in-flight timers, while preserving explicit Calculate buttons and Enter key submission.
5. **Privacy-Preserving State:** `localStorage` and URL query params strictly persist non-sensitive user settings. Passwords, passphrases, and custom names from user inputs are NEVER persisted or serialized.

---

## Detailed Tool Changes & Before / After Examples

### 1. Age Calculator (`age-calculator`)
* **Logic Module:** `src/tools/age-calculator/logic.js`
* **Bug Fixes & Refinements:**
  * **DST Time Skew:** Previously used `new Date(y, m - 1, d)` local time, causing 23-hour and 25-hour day intervals during spring/fall clock changes. Now uses strict UTC midnight timestamps.
  * **Leap Day Convention:** Added support for both `mar1` (UK/Hong Kong standard) and `feb28` (US common law standard) conventions for February 29th birthdays during common years.
* **Before / After Example:**
  * *Input:* DOB = `2004-02-29`, Target Date = `2025-03-01`
  * *Before:* Inflexible hardcoded logic; potential 1-hour DST drift when crossing local time boundaries.
  * *After:* Exactly `21 Years, 0 Months, 0 Days` (under `mar1` rule) or `21 Years, 0 Months, 1 Day` (under `feb28` rule); total days lived: `7,671`.

---

### 2. Days Until Date Calculator (`days-until-date-calculator`)
* **Logic Module:** `src/tools/days-until-date-calculator/logic.js`
* **Bug Fixes & Refinements:**
  * **Month Clamping:** Month difference math now clamps to the exact days in the preceding calendar month (e.g., February 28/29 vs March 31).
  * **Past Date Handling:** Explicitly calculates elapsed time in days, weeks, and months with negative delta guards.
* **Before / After Example:**
  * *Input:* Today = `2026-10-17`, Target = `2026-11-16`
  * *Before:* Simple millisecond division without month clamping.
  * *After:* `30 Days` (4 weeks and 2 days; 0 months and 30 days; Target weekday: Monday).

---

### 3. Date Difference Calculator (`date-difference-calculator`)
* **Logic Module:** `src/tools/date-difference-calculator/logic.js`
* **Bug Fixes & Refinements:**
  * **Inclusive Toggle:** Accurately increments total days and business days when "Include end date" is enabled.
  * **Reversed Date Inversion:** Automatically swaps dates if start > end and flags `isReversed: true` for clear UI notification.
  * **Business Day Tally:** Loops date-by-date through UTC days, strictly counting Monday through Friday.
* **Before / After Example:**
  * *Input:* Start = `2026-06-01` (Mon), End = `2026-06-05` (Fri), Inclusive = `true`
  * *Before:* Defaulted to 4 days exclusive without clear options.
  * *After:* Exactly `5 Calendar Days`, `5 Business Days`, `0 Weekend Days`.

---

### 4. Add Days to Date Calculator (`add-days-to-date-calculator`)
* **Logic Module:** `src/tools/add-days-to-date-calculator/logic.js`
* **Bug Fixes & Refinements:**
  * **Month-End Overflow Clamping:** Adding 1 month to `2027-01-31` correctly clamps to `2027-02-28` rather than overflowing to `2027-03-03`.
  * **Business Days Advance:** Iterates day-by-day skipping Saturday (`day === 6`) and Sunday (`day === 0`).
* **Before / After Example:**
  * *Input:* Start = `2026-10-16` (Fri), Amount = `10`, Unit = `days`, Business Only = `true`
  * *Before:* Mixed date math in script.js.
  * *After:* Returns Friday, October 30, 2026 (`2026-10-30`), 14 calendar days elapsed.

---

### 5. Percentage Change Calculator (`percentage-change-calculator`)
* **Logic Module:** `src/tools/percentage-change-calculator/logic.js`
* **Features & Modes Added:**
  * Added **Mode 4: Percent Difference** (`(|V1 - V2| / ((V1 + V2)/2)) × 100`).
  * Division by zero protection on `oldVal === 0`.
  * Step-by-step formula substitutions with full precision.
* **Before / After Example:**
  * *Input (Mode 1):* Old = `50`, New = `75`
  * *Result:* `+50.00% Increase` (Difference: +25, Steps: `(75 - 50) / 50 = 0.50 × 100 = 50%`).
  * *Input (Mode 4):* V1 = `100`, V2 = `120`
  * *Result:* `18.18% Difference` (Difference: 20, Average: 110, `(20 / 110) × 100 = 18.1818%`).

---

### 6. Discount Calculator (`discount-calculator`)
* **Logic Module:** `src/tools/discount-calculator/logic.js`
* **Features & Precision:**
  * Banker-safe half-up cent rounding: `Math.round(val * 100) / 100`.
  * Support for stacked double discounts (applied sequentially to reduced subtotal).
  * Currency selector support (`$`, `£`, `€`, `¥`, `₹`).
* **Before / After Example:**
  * *Input:* Original Price = `$100.00`, Primary Discount = `20%`, Stacked 2nd Discount = `10%`, Sales Tax = `8%`
  * *Before:* Tax was sometimes computed on original MSRP on other sites.
  * *After:* Primary savings = `$20.00` (Subtotal: `$80.00`); 2nd discount savings = `$8.00` (Net price: `$72.00`); Sales tax (8% of $72) = `$5.76`; Final price = `$77.76`; Total saved = `$28.00` (28.0% effective discount).

---

### 7. Word Counter (`word-counter`)
* **Logic Module:** `src/tools/word-counter/logic.js`
* **Linguistic & Unicode Upgrades:**
  * Unicode regex `[\p{L}\p{N}]+` for multi-language word matching.
  * `Array.from(text).length` for character count to prevent emoji surrogate pair split errors.
  * Stopword-filtered top 5 keyword density.
  * Reading speed benchmark set to 225 wpm; speaking speed set to 140 wpm.
* **Before / After Example:**
  * *Input:* `"Hello world 🚀 café crème"`
  * *Before:* `text.length` returned 26 characters (due to emoji surrogate pair) and punctuation clung to words.
  * *After:* Exactly 4 words, 25 characters (emoji treated as 1 glyph), reading time `< 1 sec`.

---

### 8. Text Case Converter (`text-case-converter`)
* **Logic Module:** `src/tools/text-case-converter/logic.js`
* **Upgrades & Expansion:**
  * Expanded to **12 case styles**: UPPERCASE, lowercase, Title Case, Sentence case, Capitalize Words, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, dot.case, aLtErNaTiNg.
  * Implemented Chicago Manual of Style Title Case preserving lowercase for minor prepositions/conjunctions.
  * Added Undo stack in UI.
* **Before / After Example:**
  * *Input:* `"the return of the king"`
  * *Before:* Simple regex capitalized all words including "of" and "the".
  * *After:* Title Case outputs `"The Return of the King"`.

---

### 9. Password Generator (`password-generator`)
* **Logic Modules:** `src/tools/password-generator/logic.js` and `eff-words.js`
* **Cryptographic & Usability Upgrades:**
  * Native Web Crypto (`crypto.getRandomValues`) with rejection sampling to eliminate modulo bias.
  * Guaranteed character set inclusion: at least one character from each selected set, followed by a cryptographic Fisher-Yates shuffle.
  * Added **Passphrase Mode** using the Electronic Frontier Foundation (EFF) Short Wordlist #1 (1,296 words under CC-BY 3.0 US).
  * Shannon entropy calculation: $E = L \times \log_2(P)$.
  * Multi-password batch generation (1 to 10 passwords).
* **Before / After Example:**
  * *Random Mode (16 chars):* Guaranteed upper, lower, number, symbol -> ~95.7 bits entropy.
  * *Passphrase Mode (4 words):* `"Acid-Acorn-Acre-Acts"` -> ~41.4 bits entropy.

---

### 10. Random Name Picker (`random-name-picker`)
* **Logic Module:** `src/tools/random-name-picker/logic.js`
* **Fairness & Accessibility Upgrades:**
  * Unbiased crypto rejection sampling.
  * Added Deduplicate list button.
  * Added Copy Winner action.
  * Zero-motion instant selection for users with `prefers-reduced-motion: reduce`.
* **Before / After Example:**
  * *Input:* List of 8 entrants.
  * *Before:* Standard `Math.random` spin.
  * *After:* Cryptographically secure draw with rejection sampling eliminating bias, with copyable winner card and optional deduplication.
