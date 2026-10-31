# ToolsBuilt Tools Changelog

## 3.2.0: 20 new tools

**Branch:** `tools-batch-20` (built on `redesign-and-tools`) · **Date:** October 31, 2026

All 20 tools follow the tool checklist: full front matter (Quick Answer, method, worked examples, common mistakes, FAQs, primary sources), a pure UMD `logic.js` with unit tests in `scripts/test-tool-logic.js`, `script.js` with validation, and at least 1,000 words of content. Screenshots at 375px are in `docs/screenshots/tools-batch-20/`.

| Tool | URL | Category | Notes |
| :--- | :--- | :--- | :--- |
| Hours Calculator | `/tools/hours-calculator/` | Date & Time | Overnight shifts, unpaid breaks, decimal hours; Mon-Sun timesheet with pay and weekly overtime |
| Unix Timestamp Converter | `/tools/unix-timestamp-converter/` | Date & Time | Live timestamp, s/ms/µs/ns detection, ISO 8601, RFC 2822, relative time, Year 2038 explainer |
| Week Number Calculator | `/tools/week-number-calculator/` | Date & Time | ISO 8601 weeks and week-years, week date ranges, 52/53 weeks, labelled US-style numbering |
| Time Zone Converter & Meeting Planner | `/tools/time-zone-converter/` | Date & Time | Intl.DateTimeFormat with the browser's IANA data, DST gaps and overlaps, working-hours strip |
| Tip Calculator & Bill Splitter | `/tools/tip-calculator/` | Math & Finance | Presets and custom tip, pre-tax tipping, round up per person, exact cents |
| Salary to Hourly Calculator | `/tools/salary-to-hourly-calculator/` | Math & Finance | Annual, monthly, bi-weekly, weekly, daily and hourly, with unpaid weeks off |
| Profit Margin & Markup Calculator | `/tools/profit-margin-calculator/` | Math & Finance | Cost + price, cost + margin, cost + markup; margin vs markup table |
| Fraction Calculator | `/tools/fraction-calculator/` | Math & Finance | Exact BigInt arithmetic, mixed numbers, steps (LCM, reciprocal, GCD), repeating decimals |
| Mean, Median, Mode & Standard Deviation | `/tools/mean-median-mode-calculator/` | Math & Finance | Population and sample variance/SD, quartiles (median of halves), worked steps |
| Attendance Calculator | `/tools/attendance-calculator/` | Student & Exam | Classes needed or classes you can miss, 1-10 class projection |
| Weighted Average Calculator | `/tools/weighted-average-calculator/` | Student & Exam | % or plain weights, normalisation notice, contributions and steps |
| Merit & Aggregate Calculator | `/tools/merit-calculator/` | Student & Exam | Custom weights plus verified presets in `src/_data/meritPresets.json` (NUST NET, PM&DC MDCAT) |
| Random Number Generator | `/tools/random-number-generator/` | Fun & Random | crypto.getRandomValues with rejection sampling, unique/sort/decimals, download |
| Coin Flip & Dice Roller | `/tools/coin-flip-dice-roller/` | Fun & Random | 1-100 coins, 1-10 dice d4-d20, history, reduced-motion aware animation |
| Text Diff Checker | `/tools/text-diff-checker/` | Text & Writing | Myers line diff with word highlights in a Web Worker, side-by-side and inline |
| Remove Duplicate Lines | `/tools/remove-duplicate-lines/` | Text & Writing | Ignore case/spaces, keep first or last, sort, copy and download |
| URL Slug Generator | `/tools/slug-generator/` | Text & Writing | NFD accent removal, stop words, max length at a word boundary, bulk mode |
| JWT Decoder | `/tools/jwt-decoder/` | Security & Privacy | Header/payload, iat/nbf/exp dates and expiry, HS256/384/512 verification with Web Crypto |
| Password Strength Checker | `/tools/password-strength-checker/` | Security & Privacy | zxcvbn-ts (self-hosted, pinned) in a Web Worker, loaded on first use; NIST SP 800-63B-4 guidance |
| HTML Formatter | `/tools/html-formatter/` | Code Formatters | Prettier HTML with inline CSS/JS, parse errors and unclosed-tag warnings by line, conservative minify |

### Shared changes
- `src/_data/vendor.js`: Prettier's html, postcss, babel and estree plugins, and zxcvbn-ts (`@zxcvbn-ts/core` 4.2.0, `language-common` 4.1.3, `language-en` 4.1.1), served from `/assets/vendor/` and loaded only on their own pages.
- `assets/js/code-formatter.js` and `partials/code-formatter.njk`: HTML syntax errors and a warnings list for non-fatal problems.
- `assets/js/common.js`: tables that scroll sideways become keyboard-focusable regions named after their caption.
- `components.css`: segmented controls with exactly three tabs stay on one row on phones.
- `categories.json`: intros, "how to choose" guides and FAQs for all 7 categories now cover the new tools; the security FAQ on password length follows NIST SP 800-63B-4.
- Hours Calculator and Fraction Calculator join the homepage Popular tools (8 in total).

### Merit presets not added
- **UET Lahore (ECAT):** uet.edu.pk and admission.uet.edu.pk returned HTTP 522 (server unreachable) on 2026-10-31, so the current weights could not be checked against an official page.

## 3.1.0: Homepage redesign and country support

**Branch:** `redesign-and-tools` · **Target:** `main` · **Date:** October 31, 2026

### Design
- New header (All Tools and Categories dropdowns, theme pill, Ctrl+K search), hero homepage with an original inline SVG illustration, category and tool card grids, trust strip and a footer with a "Suggest a tool" card.
- Tool, category and directory pages use the same design: category tile beside the H1, section label pills, tinted Quick Answer and result cards, worked examples as cards, quiet table of contents.

### New pages
| Page | URL | Notes |
| :--- | :--- | :--- |
| Salary Tax Calculator by Country | `/tools/salary-tax-calculator/` | Hub with a country picker; UAE, Saudi Arabia and Qatar no-tax statements with sources |
| UK Salary Tax Calculator 2026/27 | `/tools/uk-salary-tax-calculator/` | Personal Allowance taper and Scottish bands (GOV.UK, HMRC) |
| US Salary Tax Calculator 2026 (Federal) | `/tools/us-salary-tax-calculator/` | Single and married filing jointly (IRS Rev. Proc. 2025-32); state tax excluded |
| India Salary Tax Calculator 2025-26 | `/tools/india-salary-tax-calculator/` | New regime, ₹75,000 standard deduction, 87A rebate with marginal relief, surcharge, cess (Finance Bill 2025/2026 memoranda, Budget Speech 2025-26) |

### Changes to existing tools
- **Pakistan Salary Tax:** runs on the shared salary tax engine; slabs now live in `src/_data/tax/pk-*.json` with FBR sources. Results unchanged; URL unchanged.
- **Sales Tax, VAT & GST Calculator** (renamed from GST & Sales Tax): country presets for the EU 27, UK, India, Pakistan, Saudi Arabia, UAE, Canadian provinces, New Zealand, Singapore and South Africa, each with its source; US uses a custom rate.
- **Gold Calculator:** troy ounce (NIST), Hong Kong tael troy (Cap. 68) and kilogram, for both weight and rate.
- **Marks Percentage Calculator:** grading presets (older BISE bands, IBCC 2026 revised grading, CBSE pass mark, typical US letter grades) and a custom scale editor.
- **CGPA to Percentage:** cites CBSE Circular 24/2010 for the 9.5 rule.
- **Discount, Loan EMI, Compound Interest, SIP, Gold, Sales Tax:** shared currency selector preselected from the visitor's time zone and language; amounts in the currency's own format (lakh grouping for INR and BDT). Old discount links with `cur=$` still work.
- **Date tools:** dates shown in the visitor's regional English format.

### Not added (not verified from an official source)
Bangladesh salary tax and VAT, Australia GST, India tax year 2026-27 (standard deduction and rebate under the Income-tax Act, 2025), the South Indian pavan, the Thai baht gold weight.

## 3.0.0: Redesign, 7 new tools and 2 new categories

**Branch:** `redesign-and-tools` · **Target:** `main` · **Date:** October 31, 2026

### New categories
- **Student & Exam Tools** (`/category/education/`): Grade Calculator and GPA Calculator moved here (their URLs are unchanged), plus two new tools.
- **Code Formatters** (`/category/code/`).

### New tools
| Tool | URL | Notes |
| :--- | :--- | :--- |
| Pakistan Salary Tax Calculator 2026-27 | `/tools/pakistan-salary-tax-calculator/` | Finance Act 2026 slabs, 2025-26 comparison (incl. 9% surcharge), slab table rendered from `logic.js` data |
| CGPA to Percentage Calculator | `/tools/cgpa-to-percentage-calculator/` | 4.0/5.0/10.0 scales; simple proportion, CBSE ×9.5, or the formula on the transcript; no HEC/university presets |
| Marks Percentage Calculator | `/tools/marks-percentage-calculator/` | Total or subject-wise; data-driven typical BISE grade table |
| Gold Calculator | `/tools/gold-calculator/` | Tola, gram, masha, ratti; 24/22/21/18K; making charges; no live prices |
| GST & Sales Tax Calculator | `/tools/sales-tax-calculator/` | Add or remove tax; net + tax always add up to the total |
| Python Formatter | `/tools/python-formatter/` | Ruff formatter as self-hosted WebAssembly |
| Java Formatter | `/tools/java-formatter/` | Prettier + prettier-plugin-java, self-hosted |

Every new tool has a pure `logic.js` with unit tests (including every figure from its brief), shareable result links where relevant, and an axe-core audit in light and dark mode.

### Changes to existing tools
- **Tool page template:** new section order, the tool above the fold on phones, plain content sections, one privacy line, quiet desktop table of contents, Person/publisher schema, `isAccessibleForFree`, ISO `lastReviewed` dates.
- **Duplicates removed:** 11 pages showed the Quick Answer twice and 7 repeated their worked examples; each now appears once. Body "pitfalls" lists became front-matter Common Mistakes, and 7 calculators gained a Formula section from their existing text.
- **Shareable result links** on percentage change, percentage, discount, days until date, date difference, add days, compound interest, loan EMI and SIP (old parameter names still work).
- **Percentage Change Calculator:** a 3-step method, "Percent change word problems" with pre-filled links, and three search-shaped FAQs.
- **Fixes:**
  - Six tools loaded their scripts twice.
  - Phones scrolled to the default result on load.
  - Reduced-motion users got thousands of transitions on theme change.
  - Fields that should be hidden were shown, because `.form-group` overrode the `hidden` attribute.
  - Several scrollable tables could not be reached by keyboard.
  - The GPA "Remove Term" button's accessible name did not match its text.
  - Undersized tap targets.

### Tooling
- `check-external.js` blocks any third-party resource.
- `check-links.js` requires every tool to be linked from the homepage, its category and `/tools/`.
- `check-schema.js` validates the new schema fields.
- `test-tool-ux.js` audits every tool listed in `tools.json`. It used to cover only 16.
- Screenshots and the SEO report are now opt-in, so `npm test` no longer modifies tracked files.

---

## 2.0.0: Calculation engine & UX upgrade


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

---

## 13 New Tools Shipped (Version 2.1.0 - October 25, 2026)

All 13 new tools are engineered to be 100% client-side with pure UMD logic modules, zero network requests, responsive layouts, progressive enhancement, and automated schema/SEO validation:

### Math & Finance (7 Tools)
11. **Percentage Calculator (`percentage-calculator`):** 4 direct modes (X% of Y, X is what % of Y, increase/decrease by X%, find original base value).
12. **Grade Calculator (`grade-calculator`):** Dynamic weighted assignments table, target grade final exam score solver.
13. **GPA Calculator (`gpa-calculator`):** 4.0 scale with plus/minus toggles, credit hours weighting, cumulative multi-semester tracker.
14. **Unit Converter (`unit-converter`):** Length, weight, temperature, area, volume, and speed with exact NIST/SI factors and reference tables.
15. **Loan EMI Calculator (`loan-emi-calculator`):** Principal, rate, tenure, amortization schedule, payoff accelerator with extra monthly payments, and CSV export.
16. **SIP Calculator (`sip-calculator`):** Monthly investment, annual return, investment duration, optional annual step-up %, wealth gain estimation.
17. **Compound Interest Calculator (`compound-interest-calculator`):** Daily, monthly, quarterly, annual compounding, regular contributions, custom SVG growth chart.

### Text & Writing (4 Tools)
18. **JSON Formatter & Validator (`json-formatter`):** Prettify with 2/4 spaces or tabs, minify, sort keys, line/column error detection, 1 MB safety cap.
19. **Base64 Encoder & Decoder (`base64-encoder-decoder`):** UTF-8 safe with emoji/accent support, standard or URL-safe toggles, 1 MB safety cap.
20. **URL Encoder & Decoder (`url-encoder-decoder`):** Dual modes (`encodeURIComponent` vs `encodeURI`), live query string parser table.
21. **Lorem Ipsum Generator (`lorem-ipsum-generator`):** Paragraphs, sentences, and words generation with optional classic opening and HTML paragraph wrapping.

### Security (2 Tools)
22. **UUID Generator (`uuid-generator`):** RFC 4122 v4 UUIDs via `crypto.randomUUID`, bulk generation up to 100, formatting options (upper/lower, hyphens, braces), `.txt` download.
23. **Hash Generator (`hash-generator`):** SHA-1, SHA-256, SHA-384, SHA-512 via native Web Crypto API, hex uppercase toggle, two-hash comparison utility.
