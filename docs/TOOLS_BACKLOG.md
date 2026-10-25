# ToolsBuilt Catalog Expansion Backlog (80+ Tools)

**Document Version:** 1.0.0  
**Date:** October 2026  
**Author:** Senior Staff Engineer  
**Privacy Mandate:** Every tool in this backlog must execute **100% client-side inside the user's browser**. No data, user input, text, images, or documents may ever be transmitted to or processed by a remote server.

---

## 1. Prioritization Framework & Rollout Phasing

Tools are scored and prioritized based on:
1. **Search Volume & Intent (SEO):** High recurring organic search demand with commercial or utilitarian intent.
2. **Client-Side Feasibility:** Feasible using native Web APIs (Web Crypto, Canvas, Web Workers, File API, Intl API) or zero-backend browser libraries (e.g. `pdf-lib`).
3. **Execution Complexity:** Low-friction implementation with maximum algorithmic reliability.

* **Phase 1 (Tier 1 - Essential Utilities, Weeks 1–4):** High-traffic finance, math, text, and date utilities with massive evergreen search volume.
* **Phase 2 (Tier 2 - Developer & Converter Utilities, Weeks 5–8):** High-intent developer, encoding, unit conversion, and security tools.
* **Phase 3 (Tier 3 - File & Media Tools, Weeks 9–12):** Client-side canvas image manipulation, client-side PDF utilities, and health calculators.

---

## 2. Category 1: Finance & Money Tools (10 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Loan & Amortization Calculator** | `/tools/loan-calculator/` | `loan calculator with amortization schedule` | Pure client-side math using annuity formulas. SVG/Canvas schedule rendering. | Monthly payment, total interest, breakdown by principal/interest, printable amortization table. |
| **P1** | **Compound Interest Calculator** | `/tools/compound-interest-calculator/` | `compound interest calculator daily monthly` | Exponential math formulas with compounding frequency (daily, monthly, quarterly, annual). | Initial deposit, regular monthly contributions, growth projection charts via Canvas. |
| **P1** | **Salary to Hourly Calculator** | `/tools/salary-to-hourly-calculator/` | `salary to hourly converter` | Standardized 2,080 annual work hours calculation with customizable vacation/hours. | Annual, monthly, bi-weekly, weekly, daily, and hourly wage breakdown. |
| **P1** | **Tip & Bill Split Calculator** | `/tools/tip-calculator/` | `tip calculator split bill` | Instant JS arithmetic with round-up options. | Tip percentage presets (15%, 18%, 20%), custom tip, split total across N people, exact cents. |
| **P1** | **Mortgage Payment Calculator** | `/tools/mortgage-calculator/` | `mortgage payment calculator with pmi tax` | Client-side mortgage loan amortization with property tax, home insurance, and PMI inputs. | Monthly PITI calculation, total cost of loan, extra payment payoff accelerator. |
| **P2** | **Sales Tax Calculator** | `/tools/sales-tax-calculator/` | `sales tax calculator reverse tax` | Decimal arithmetic rounding to 2 decimal places. | Forward calculation (price + tax) and reverse calculation (extract pre-tax price from receipt total). |
| **P2** | **Break-Even Analysis Calculator** | `/tools/break-even-calculator/` | `break even calculator units revenue` | Linear cost-volume-profit algebra. | Fixed costs, variable costs per unit, unit price. Calculates break-even units and revenue. |
| **P2** | **Return on Investment (ROI) Calculator** | `/tools/roi-calculator/` | `roi calculator annualized return` | Net profit divided by cost, annualized via CAGR exponent. | Total ROI %, annualized ROI %, capital gains analysis. |
| **P3** | **Freelance Hourly Rate Calculator** | `/tools/freelance-rate-calculator/` | `how to calculate freelance hourly rate` | Annual expenses + target income + billable hours formula. | Accounts for unbillable admin time, self-employment tax, healthcare, and vacation weeks. |
| **P3** | **Rule of 72 Investment Calculator** | `/tools/rule-of-72-calculator/` | `rule of 72 calculator double money` | Logarithmic and Rule of 72 / 70 approximation formulas. | Calculates exact years required to double investment at given annual interest rate. |

---

## 3. Category 2: Health & Fitness Calculators (8 Tools)

*Disclaimer: All health tools must include clear medical disclaimers and cite peer-reviewed formulas (WHO, CDC, Mifflin-St Jeor).*

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **BMI Calculator (Body Mass Index)** | `/tools/bmi-calculator/` | `bmi calculator metric imperial` | WHO BMI formula: $kg / m^2$ and $(lbs \times 703) / in^2$. | Dual unit toggles (kg/cm vs lbs/ft/in), WHO category visual gauge, healthy weight range target. |
| **P1** | **Calorie / TDEE Calculator** | `/tools/tdee-calculator/` | `tdee calculator total daily energy expenditure` | Mifflin-St Jeor equation + Katch-McArdle formula. | Basal Metabolic Rate (BMR), TDEE by activity level, calorie targets for maintenance, loss, and gain. |
| **P2** | **Body Fat Percentage Calculator** | `/tools/body-fat-calculator/` | `body fat percentage calculator us navy` | U.S. Navy circumference method (neck, waist, hip, height). | Estimates body fat %, lean mass, fat mass, category benchmarks. |
| **P2** | **Daily Water Intake Calculator** | `/tools/water-intake-calculator/` | `daily water intake calculator by weight` | Weight, climate, and exercise duration formula. | Recommended ounces and liters per day with reminder breakdown. |
| **P2** | **Macro Nutrient Calculator** | `/tools/macro-calculator/` | `macro calculator protein carbs fat` | Grams per pound/kg calculation mapped to calorie distribution. | Custom protein, carbohydrate, and fat splits for keto, balanced, athletic, and bodybuilding goals. |
| **P3** | **Target Heart Rate Zone Calculator** | `/tools/target-heart-rate-calculator/` | `target heart rate zones calculator karvonen` | Karvonen formula using resting heart rate and maximum heart rate ($220 - age$). | Aerobic, anaerobic, fat-burn, and VO2 max training zones (BPM). |
| **P3** | **Pregnancy Due Date Calculator** | `/tools/pregnancy-due-date-calculator/` | `pregnancy due date calculator by lmp` | Naegele's rule (LMP + 280 days), conception date, or IVF transfer date. | Estimated due date, current trimester, weeks/days pregnant, developmental timeline milestones. |
| **P3** | **Sleep Cycle & Bedtime Calculator** | `/tools/sleep-cycle-calculator/` | `sleep calculator when to go to bed` | 90-minute REM sleep cycle calculation with average 14-minute sleep latency. | Calculates optimal wake-up times if going to bed now, or bedtimes for a set wake-up time. |

---

## 4. Category 3: Date & Time Tools (8 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Work Hours & Timesheet Calculator** | `/tools/work-hours-calculator/` | `work hours timesheet calculator with breaks` | Native JS `Date` time parsing with unpaid lunch deduction. | Daily clock-in/out, multi-day timesheet, total gross pay, overtime rate calculation. |
| **P1** | **Unix Epoch Timestamp Converter** | `/tools/unix-timestamp-converter/` | `unix timestamp converter to human date` | Client `Date.now()`, UTC and local timezone conversion. | Converts epoch seconds/milliseconds to human-readable ISO 8601, RFC 2822, and vice versa. |
| **P2** | **World Clock & Timezone Meeting Planner** | `/tools/timezone-converter/` | `timezone converter meeting planner` | `Intl.DateTimeFormat` with IANA timezone database. | Compare overlapping business hours across 4+ cities simultaneously without server calls. |
| **P2** | **Stopwatch & Lap Timer** | `/tools/online-stopwatch/` | `online stopwatch with laps full screen` | `performance.now()` high-resolution timer in Web Worker to prevent background tab throttling. | Millisecond precision, lap times list, split times, export laps to CSV, keyboard shortcuts (Space). |
| **P2** | **Countdown Timer** | `/tools/online-countdown-timer/` | `online countdown timer with sound` | Web Audio API synthesized audio chime (zero external MP3 assets). | Fullscreen display, preset intervals, pause/resume, sound alarm when timer reaches zero. |
| **P3** | **Leap Year Checker** | `/tools/leap-year-checker/` | `is it a leap year checker` | Astronomical rule: `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`. | Explains Gregorian calendar rules, lists upcoming leap years, tests historical dates. |
| **P3** | **Week Number Calculator** | `/tools/week-number-calculator/` | `what week of the year is it iso 8601` | ISO 8601 week date algorithm (week 1 contains first Thursday). | Current ISO week number, dates for any given week number, total weeks in year (52 vs 53). |
| **P3** | **Julian Date Converter** | `/tools/julian-date-converter/` | `julian date converter calendar date` | Standard astronomical Julian Day Number (JDN) formula. | Converts calendar dates to continuous Julian Day and NASA/manufacturing truncated Julian dates. |

---

## 5. Category 4: Math & Statistics Tools (10 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Online Scientific Calculator** | `/tools/scientific-calculator/` | `free online scientific calculator` | Math.js or lightweight recursive descent parser with BigNumber support. | Trigonometric (sin/cos/tan), logarithmic (log/ln), exponents, parentheses, degree/radian mode. |
| **P1** | **Fraction Simplifier & Calculator** | `/tools/fraction-calculator/` | `fraction calculator simplify add subtract` | Greatest Common Divisor (GCD) via Euclidean algorithm. | Add, subtract, multiply, divide fractions; converts improper fractions to mixed numbers and decimals. |
| **P1** | **Ratio & Proportion Calculator** | `/tools/ratio-calculator/` | `ratio calculator simplify proportion` | Cross-multiplication and GCD reduction. | Solves for $X$ in $A:B = C:X$; scales aspect ratios (16:9, 4:3, 21:9) with visual canvas preview. |
| **P2** | **Average, Median, Mode & Std Dev** | `/tools/mean-median-mode-calculator/` | `mean median mode standard deviation calculator` | Fast array sorting, statistical variance and Bessel's correction algorithm. | Input comma-separated or newline numbers. Outputs Mean, Median, Mode, Range, Sample & Population Std Dev. |
| **P2** | **Random Number Generator (CSPRNG)** | `/tools/random-number-generator/` | `random number generator true random` | `crypto.getRandomValues()` with rejection sampling for zero bias. | Generate single or bulk numbers in custom range $[min, max]$, optional unique/no-repeat mode, roll dice. |
| **P2** | **Prime Number Checker & Factorizer** | `/tools/prime-number-checker/` | `prime number checker prime factorization` | Trial division up to $\sqrt{N}$ with 6k ± 1 optimization. | Determines primality instantly, outputs prime factorization tree, finds next/previous prime. |
| **P2** | **Quadratic Equation Solver** | `/tools/quadratic-formula-solver/` | `quadratic formula solver step by step` | Discriminant $\Delta = b^2 - 4ac$ analysis. | Computes real and complex roots, displays step-by-step algebraic steps, graphs parabola on Canvas. |
| **P3** | **Permutation and Combination Calculator** | `/tools/permutation-combination-calculator/` | `permutation and combination calculator npr ncr` | BigInt factorial calculation to avoid 64-bit integer overflow. | Calculates $nPr$ and $nCr$ with step-by-step formulas and repetition options. |
| **P3** | **Matrix Determinant & Inversion** | `/tools/matrix-calculator/` | `matrix determinant calculator 2x2 3x3` | Gaussian elimination algorithm. | Determinant, matrix addition, multiplication, transpose, and inversion up to 4x4. |
| **P3** | **Hex, Binary, Octal, Decimal Converter** | `/tools/binary-hex-converter/` | `binary to hex decimal octal converter` | Native JS `BigInt.prototype.toString(radix)`. | Real-time 4-way base conversion with two's complement 8/16/32/64-bit representation. |

---

## 6. Category 5: Text & Content Tools (10 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **URL Slug Generator** | `/tools/slug-generator/` | `url slug generator clean seo url` | Regex text normalization, unicode transliteration, accent removal. | Converts titles into SEO-friendly URLs, kebab-case, removes stop words, custom separators. |
| **P1** | **Lorem Ipsum Generator** | `/tools/lorem-ipsum-generator/` | `lorem ipsum generator paragraphs words` | In-memory classical Latin dictionary vocabulary shuffle. | Generate by paragraphs, sentences, or word counts. Optional HTML `<p>` wrapping and clipboard copy. |
| **P1** | **Text Diff / Difference Checker** | `/tools/text-diff-checker/` | `text diff tool online compare text` | Meyers diff algorithm (lightweight client-side implementation). | Side-by-side and unified diff view showing character-level additions and deletions. |
| **P2** | **Duplicate Line Remover** | `/tools/duplicate-line-remover/` | `remove duplicate lines online` | Set-based text line hashing with preservation of original order. | Removes duplicate lines, case-insensitive toggle, strips empty lines, sorts alphabetically. |
| **P2** | **Markdown to HTML Previewer** | `/tools/markdown-previewer/` | `markdown to html converter live preview` | Lightweight client-side Markdown parser (e.g. `marked` micro-bundle). | Split-pane live markdown editor and HTML preview, syntax highlighting, copy raw HTML or rendered text. |
| **P2** | **Whitespace & Line Break Cleaner** | `/tools/whitespace-remover/` | `remove extra spaces whitespace online` | Regex `\s+` replacement and trim options. | Collapses multiple spaces into single space, removes leading/trailing spaces, deletes empty blank lines. |
| **P2** | **Word Frequency Counter** | `/tools/word-frequency-counter/` | `word frequency counter text analysis` | Hashmap counter tokenizing words with common stop-word filter. | Top 100 most frequent words table, keyword density %, total word distribution chart. |
| **P3** | **Readability Score Calculator** | `/tools/readability-score-calculator/` | `readability score calculator flesch kincaid` | Syllable-counting heuristic algorithm + sentence length ratio. | Computes Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog index. |
| **P3** | **Reverse Text & String Inverter** | `/tools/reverse-text-generator/` | `reverse text string backwards generator` | Unicode-aware grapheme splitter to avoid breaking emojis. | Reverses entire text, reverses word order, flips characters upside-down (Unicode mapping). |
| **P3** | **NATO Phonetic Alphabet Translator** | `/tools/nato-phonetic-alphabet-translator/` | `nato phonetic alphabet translator` | Character-to-phonetic string dictionary lookup. | Converts text into NATO code words (Alpha, Bravo, Charlie) with audio pronunciation synthesizer. |

---

## 7. Category 6: Developer & DevOps Tools (10 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **JSON Formatter & Validator** | `/tools/json-formatter/` | `json formatter validator beautifier online` | Native `JSON.parse` with precise syntax error line/column locator. | Formats JSON (2 spaces, 4 spaces, tabs), minifies, validates, tree-view folding, download as `.json`. |
| **P1** | **Base64 Encoder & Decoder** | `/tools/base64-encode-decode/` | `base64 encoder decoder online UTF-8` | `TextEncoder`/`TextDecoder` + `btoa`/`atob` for full UTF-8 Unicode support. | Encodes/decodes plain text and files, URL-safe Base64 mode, zero upload. |
| **P1** | **URL Encoder & Decoder** | `/tools/url-encoder-decoder/` | `url encoder decoder percent encoding` | `encodeURIComponent` and `decodeURIComponent` with robust error catch. | Full URL vs parameter component mode, space encoding (+ vs %20), batch line-by-line support. |
| **P2** | **UUID / GUID Generator (v4 & v7)** | `/tools/uuid-generator/` | `uuid generator v4 v7 bulk` | Native `crypto.randomUUID()` for v4; timestamp-ordered bit-shifting for v7. | Generates v4 (random) and modern v7 (time-sortable) UUIDs in bulk (up to 1,000), uppercase/lowercase. |
| **P2** | **Regex Tester & Explainer** | `/tools/regex-tester/` | `regex tester online javascript` | Native JavaScript `RegExp` with error boundary handling. | Live pattern match highlighting, capture group display, flags toggle (g, i, m, s), cheat sheet. |
| **P2** | **HTML Entity Encoder & Decoder** | `/tools/html-entity-encoder/` | `html entity encoder decoder` | In-memory DOM element text/HTML mapping. | Converts reserved HTML characters (`<`, `>`, `&`, `"`, `'`) to named and numeric entities and vice versa. |
| **P2** | **Cron Expression Parser & Schedule** | `/tools/cron-expression-parser/` | `cron expression parser human readable next dates` | Client-side cron syntax tokenizer. | Translates 5/6-field cron expressions into plain English ("Every 15 minutes"); computes next 10 run dates. |
| **P3** | **JWT (JSON Web Token) Decoder** | `/tools/jwt-decoder/` | `jwt decoder online inspect token` | Client-side Base64URL parsing of token header and payload. | Decodes and formats Header and Claims; shows expiration status, timestamps; **100% private (never sent to server)**. |
| **P3** | **CSS Box Shadow & Gradient Generator** | `/tools/css-box-shadow-generator/` | `css box shadow generator gradient maker` | Interactive UI with live CSS code generation. | Visual sliders for X, Y, blur, spread, color, inset; preview box; one-click copy of CSS rule. |
| **P3** | **HTTP Status Code Lookup** | `/tools/http-status-codes/` | `http status codes list 404 500 301` | Pre-indexed static dictionary of RFC 9110 HTTP status codes. | Instant fuzzy search across 1xx, 2xx, 3xx, 4xx, 5xx codes with specifications and developer guides. |

---

## 8. Category 7: Image & Media Tools (8 Tools)

*Privacy Note: Canvas API processing keeps all photos in device RAM. No image bytes are sent over the network.*

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Image Resizer & Scaler** | `/tools/image-resizer/` | `resize image online free without losing quality` | HTML5 `Canvas.drawImage()` with bicubic smoothing. | Resize by exact pixels or percentage, maintain aspect ratio, presets for social media (Twitter, IG, FB). |
| **P1** | **Image Compressor (WebP/JPEG)** | `/tools/image-compressor/` | `compress image online reduce kb` | `HTMLCanvasElement.toBlob(quality)` compression engine. | Adjust visual quality slider (1-100%), real-time file size savings calculation, export as WebP or JPEG. |
| **P1** | **SVG to PNG Converter** | `/tools/svg-to-png-converter/` | `svg to png converter high resolution` | Vector SVG rendered to high-DPI Canvas at custom scale. | Converts vector SVG to transparent PNG at custom dimensions (1x, 2x, 4x, up to 4096px). |
| **P2** | **Color Picker & Palette Generator** | `/tools/color-picker/` | `online color picker hex rgb hsl` | Native HTML5 `<input type="color">` + color math converter. | Eyedropper API (where supported), HEX/RGB/HSL/CMYK conversion, complementary & monochromatic palette builder. |
| **P2** | **Exif Metadata Viewer & Stripper** | `/tools/exif-data-viewer-remover/` | `remove exif data online privacy` | Client-side ArrayBuffer binary parsing of JPEG/TIFF Exif headers. | View camera settings, GPS location map; download clean image stripped of all private GPS/device metadata. |
| **P2** | **Favicon Generator & Downloader** | `/tools/favicon-generator/` | `favicon generator from png image` | Multi-size Canvas export generating 16x16, 32x32, 48x48, 180x180. | Generates complete HTML `<link>` code snippet and downloadable ZIP package of PNG and ICO files. |
| **P3** | **Image Crop & Rotate** | `/tools/image-cropper/` | `crop image online free` | Canvas 2D matrix transformation (`translate`, `rotate`, `drawImage`). | Freeform and fixed aspect ratio crop (1:1, 16:9, 4:5), 90-degree rotations, horizontal/vertical flip. |
| **P3** | **Color Contrast Checker (WCAG)** | `/tools/color-contrast-checker/` | `wcag color contrast checker accessible` | Relative luminance formula per W3C WCAG 2.1 specifications. | Computes exact contrast ratio ($X:1$), pass/fail badges for AA / AAA for normal text, large text, and UI components. |

---

## 9. Category 8: PDF & Document Tools (6 Tools)

*Implementation Note: Uses lightweight client-side WebAssembly / pure JS libraries (e.g. `pdf-lib` via static bundle) executing locally in browser memory.*

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **PDF Page Counter & Metadata Viewer** | `/tools/pdf-metadata-viewer/` | `pdf page counter inspect metadata` | Binary header parsing using `pdf-lib` / lightweight PDF reader in memory. | View exact page count, author, creator, PDF version, title, creation date without uploading file. |
| **P1** | **PDF Merge Tool** | `/tools/merge-pdf/` | `merge pdf files online free private` | `pdf-lib` client-side document joining into single ArrayBuffer. | Drag-and-drop multiple PDFs, reorder pages/files with drag handles, merge into single PDF locally. |
| **P2** | **PDF Split & Page Extractor** | `/tools/split-pdf/` | `split pdf pages separate online` | `pdf-lib` page extraction into individual or grouped documents. | Extract specific page ranges (e.g., 1-5, 8, 11-14) or split every page into a separate PDF file. |
| **P2** | **CSV to JSON / JSON to CSV Converter**| `/tools/csv-json-converter/` | `convert csv to json online` | RFC 4180 compliant CSV state machine parser. | Bi-directional conversion; handles quotes, commas inside text, custom delimiters (comma, semicolon, tab). |
| **P2** | **TSV / Delimited File Formatter** | `/tools/tsv-formatter/` | `tsv to csv tab delimited formatter` | Plain JS text splitting and stream formatting. | Formats and converts Tab-Separated Values (TSV) to CSV, JSON, or aligned markdown tables. |
| **P3** | **QR Code Generator & Scanner** | `/tools/qr-code-generator/` | `qr code generator with logo custom color` | Client-side QR matrix generator (`qrcode.js`) and BarcodeDetector API. | Generate QR codes for URLs, WiFi networks, vCards, text; customize foreground/background color; save as PNG/SVG. |

---

## 10. Category 9: Units & Conversions (8 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Length & Distance Converter** | `/tools/length-converter/` | `length converter meters feet inches miles` | Standardized base SI unit (meters) conversion matrix. | Converts between mm, cm, m, km, inches, feet, yards, miles, nautical miles with instant multi-output table. |
| **P1** | **Weight & Mass Converter** | `/tools/weight-converter/` | `weight converter kg to lbs ounces` | Base SI unit (grams) conversion matrix. | Converts between grams, kilograms, metric tonnes, ounces, pounds, stone, and carats. |
| **P1** | **Temperature Converter** | `/tools/temperature-converter/` | `temperature converter celsius fahrenheit kelvin` | Exact conversion formulas ($C = (F - 32) \times 5/9$, $K = C + 273.15$). | Simultaneous 3-way conversion (°C, °F, Kelvin) with visual water freezing/boiling reference points. |
| **P2** | **Digital Storage Data Converter** | `/tools/data-storage-converter/` | `data storage converter mb to gb bytes` | Binary ($1024$) and Decimal ($1000$) mode multiplier matrices. | Converts Bits, Bytes, KB, MB, GB, TB, PB; toggles between standard metric (KB) and binary (KiB). |
| **P2** | **Speed Converter** | `/tools/speed-converter/` | `speed converter mph to kph knots` | Base unit (meters per second) conversion formulas. | Converts between km/h, mph, m/s, knots, ft/s, and Mach speed. |
| **P2** | **Area & Land Measure Converter** | `/tools/area-converter/` | `area converter square feet meters acres` | Base unit (square meters) conversion matrix. | Converts between sq ft, sq meters, acres, hectares, sq km, sq miles, and ares. |
| **P3** | **Volume & Liquid Capacity Converter** | `/tools/volume-converter/` | `volume converter gallons liters cups` | Base unit (milliliters) conversion matrix with US/UK liquid units. | Converts between milliliters, liters, cubic meters, US gallons, UK imperial gallons, fluid ounces, cups, pints. |
| **P3** | **Energy & Power Converter** | `/tools/energy-converter/` | `energy converter joules calories kwh` | Base conversion matrix. | Converts between Joules, Kilojoules, Calories, Kilocalories, Watt-hours, Kilowatt-hours (kWh), and BTUs. |

---

## 11. Category 10: Security & Cryptography Tools (6 Tools)

*Implementation Note: Uses the W3C Web Cryptography API (`window.crypto.subtle`) available natively in all modern browsers.*

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Hash Generator (SHA-256, SHA-512, MD5)**| `/tools/hash-generator/` | `sha256 hash generator online` | `crypto.subtle.digest('SHA-256', buffer)` and JS MD5 fallback. | Instant hashing for text and dropped files (never uploaded); outputs hex digest in uppercase and lowercase. |
| **P1** | **HMAC Generator** | `/tools/hmac-generator/` | `hmac sha256 generator online` | `crypto.subtle.sign('HMAC', key, data)`. | Generates Hash-based Message Authentication Codes with custom secret key using SHA-256, SHA-384, or SHA-512. |
| **P2** | **Password Entropy & Strength Analyzer** | `/tools/password-entropy-calculator/` | `password entropy calculator bits NIST` | Information theory formula $E = L \log_2(R)$ + NIST SP 800-63B guidelines. | Calculates exact entropy bits, estimated crack times across offline brute-force attack rigs (100 GH/s to 1 TH/s). |
| **P2** | **Random Hex & Cryptographic Key Maker** | `/tools/hex-key-generator/` | `generate random hex key 256 bit` | `crypto.getRandomValues(new Uint8Array(N))` formatted as hex. | Generates cryptographically secure API keys, 128-bit, 256-bit, and 512-bit hexadecimal keys for JWT secrets and salts. |
| **P3** | **Hash Identifier & Analyzer** | `/tools/hash-identifier/` | `hash identifier detect hash type` | Regex pattern and character length heuristic matching. | Inspects unknown hash strings and identifies likely algorithm (MD5, SHA-1, SHA-256, NTLM, Bcrypt). |
| **P3** | **AES Text Encryption & Decryption** | `/tools/aes-encryption-tool/` | `aes 256 text encryption online private` | `crypto.subtle.encrypt({ name: 'AES-GCM' }, ...)` with PBKDF2 key derivation. | Encrypts text with passphrase using industry-standard AES-256-GCM; decrypts locally; 100% private in browser. |

---

## 12. Category 11: Fun, Games & Decision Tools (6 Tools)

| Priority | Tool Name | Slug / Path | Target Search Keyword | Client-Side Implementation Note | Key Features & Value Proposition |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Coin Flipper & 3D Dice Roller** | `/tools/coin-flip-dice-roller/` | `flip a coin roll a die online 3d` | Canvas 2D/CSS 3D transform animation powered by CSPRNG randomness. | Flip 1 to 10 coins, roll d4, d6, d8, d10, d12, d20 dice; tracks heads/tails flip statistics. |
| **P1** | **Decision Maker / Choice Picker** | `/tools/decision-maker/` | `random decision maker picker online` | Unbiased CSPRNG array index selection with celebration animation. | Enter list of choices; visually steps through elimination and picks a winner with canvas confetti. |
| **P2** | **Morse Code Audio Synthesizer** | `/tools/morse-code-translator/` | `morse code translator with sound audio` | Web Audio API `OscillatorNode` generating 750 Hz beeps for dots and dashes. | Two-way text-to-Morse translation; plays authentic audio beeps; displays visual flashing light. |
| **P2** | **Roman Numeral Converter** | `/tools/roman-numeral-converter/` | `roman numeral converter to numbers` | Greedy subtractive mapping algorithm. | Converts standard numbers (1 to 3,999,999) to Roman Numerals (with vinculum overline) and vice versa. |
| **P3** | **Bionic Reading Formatter** | `/tools/bionic-reading-converter/` | `bionic reading converter free online` | Regex word tokenizer wrapping first half of each word in `<strong>` tags. | Enhances reading speed by bolding initial fixation points; customizable fixation ratio; export as clean text. |
| **P3** | **Text Upside-Down & Flip Generator** | `/tools/upside-down-text/` | `upside down text generator flip text` | Unicode upside-down character dictionary mapping. | Inverts text upside-down and backwards for social media bios and messaging. |

---

## 13. Backlog Summary & Milestone Targets

* **Existing Live Catalog:** 23 tools (10 initial + 13 shipped in October 2026: Percentage Calculator, Grade Calculator, GPA Calculator, Unit Converter, Loan EMI Calculator, SIP Calculator, Compound Interest Calculator, JSON Formatter, Base64 Encoder/Decoder, URL Encoder/Decoder, Lorem Ipsum Generator, UUID Generator, Hash Generator)
* **Remaining Tools in Backlog:** 75 tools
* **Total Target Catalog:** **98 tools across 11 categories**

### Phased Roadmap

| Milestone | Deliverables | Target Tools Count | Key Focus |
| :--- | :--- | :---: | :--- |
| **Phase 1: Foundation** | Audit, 11ty Architecture, Tool Registry, Fix Asset & Content Bugs | 10 Tools | Zero technical debt, 100 Lighthouse score baseline |
| **Phase 2: Core Utility Launch** | Top 25 P1 Tools (Loan, Compound Interest, BMI, TDEE, Timesheet, JSON Formatter, Image Resizer, Hash Gen) | 35 Tools | High-traffic evergreen search capture |
| **Phase 3: Category Expansion** | All remaining P1 & P2 Tools across all 11 categories | 70 Tools | Comprehensive category authority & internal cross-linking |
| **Phase 4: Full Catalog Maturity**| All P3 specialized niche tools & media utilities | 98 Tools | Best-in-class comprehensive online tools portal |
