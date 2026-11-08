# ToolsBuilt

> Free, fast, privacy-first online calculators & tools. **54 tools in 7 categories**, all running entirely in the browser — no uploads, no server processing, and no third-party scripts, fonts or APIs (only the consent-gated Google Analytics loader).

🌐 **Live Site:** [https://toolsbuilt.com](https://toolsbuilt.com)

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Static Site Generator** | [Eleventy (11ty) v3](https://www.11ty.dev/) | Modern, zero-config-runtime static compiler |
| **Templating** | [Nunjucks](https://mozilla.github.io/nunjucks/) | Extensible layouts, filters, and partial inheritance |
| **Styling** | Vanilla CSS | Custom responsive design system with CSS custom properties (no CSS framework) |
| **Client-Side Scripting** | Vanilla JavaScript (ES6+) | Native browser Web APIs, zero client runtime frameworks |
| **Formatter engines** | Ruff (WASM), Prettier + prettier-plugin-java | Self-hosted from `/assets/vendor/`, loaded only on their own pages (see below) |
| **Hosting & CDN** | [GitHub Pages](https://pages.github.com/) | Static edge distribution with custom domain `toolsbuilt.com` |
| **Build & Tooling** | Node.js + npm | Zero-dependency test and verification suites |

---

## Getting Started / Local Development

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Commands

```bash
npm install
npm run dev     # Start dev server with hot reload
npm run build   # Build for staging (includes noindex)
npm run build:prod  # Build for production
npm test        # Run full test suite
```

Optional outputs, off by default so a test run does not modify tracked files:

```bash
SAVE_SCREENSHOTS=1 node scripts/test-tool-ux.js   # docs/screenshots/tools/*.png
TOOLS_ONLY=gold-calculator node scripts/test-tool-ux.js   # run the UX/axe audit for some tools
SAVE_SEO_REPORT=1 node scripts/check-seo.js       # docs/SEO_PAGE_REPORT.md
```

---

## Categories and Tools

| Category | URL | Tools | |
| :--- | :--- | :---: | :--- |
| Date & Time Tools | `/category/date-time/` | 8 | Days Until Date, Age Calculator, Date Difference, Add or Subtract Days, Hours Calculator, Unix Timestamp Converter, Week Number Calculator, Time Zone Converter & Meeting Planner |
| Student & Exam Tools | `/category/education/` | 7 | Grade Calculator, GPA Calculator, CGPA to Percentage, Marks Percentage, Attendance Calculator, Weighted Average Calculator, Merit & Aggregate Calculator |
| Math & Finance Tools | `/category/math-finance/` | 19 | Percentage, Loan EMI, Discount, Percentage Change, Compound Interest, SIP, Unit Converter, Pakistan Salary Tax, Salary Tax by Country (hub), India / UK / US Salary Tax, Gold, Sales Tax, VAT & GST, Tip Calculator & Bill Splitter, Salary to Hourly, Profit Margin & Markup, Fraction Calculator, Mean, Median, Mode & Standard Deviation |
| Text & Writing Tools | `/category/text/` | 9 | Word Counter, Text Case Converter, JSON Formatter, Base64, URL Encoder, Lorem Ipsum, Text Diff Checker, Remove Duplicate Lines, URL Slug Generator |
| Security & Privacy Tools | `/category/security/` | 5 | Password Generator, UUID Generator, Hash Generator, JWT Decoder, Password Strength Checker |
| Fun & Random Tools | `/category/fun/` | 3 | Random Name Picker, Random Number Generator, Coin Flip & Dice Roller |
| Code Formatters | `/category/code/` | 3 | Python Formatter, Java Formatter, HTML Formatter |

Every tool lives at `/tools/<slug>/`. Tool and category counts shown on the site are computed from `src/_data/tools.json`; never hard-code them.

---

## Project Structure

```
src/
├── _data/           # Global data files
│   ├── site.json    # Site configuration
│   ├── tools.json   # Tool registry (single source of truth)
│   ├── categories.json  # Category definitions (order = display order)
│   ├── vendor.js    # Self-hosted formatter engines (versions, files, import maps)
│   ├── countries.json       # ISO code, name, slug, currency, locale, lakh grouping, time zones
│   ├── tax/<cc>-<year>.json # Salary tax datasets (rates, sources, verifiedOn, page content)
│   ├── salaryTaxPages.js    # One page per current non-Pakistan tax dataset
│   ├── salaryTaxCountries.js # Every country for the salary tax calculator (currency, built-in / no tax / custom)
│   ├── noSalaryTax.json     # Countries with no salary tax, with official statements
│   ├── vat-rates.json       # Sales tax / VAT / GST presets with sources
│   ├── grading-scales.json  # Marks grading presets with sources
│   └── *.js         # Page data read from tool logic (slab tables, grade bands, gold units)
├── _includes/
│   ├── layouts/     # Nunjucks layouts
│   │   ├── base.njk    # Base HTML shell
│   │   ├── tool.njk    # Tool page layout
│   │   └── page.njk    # Generic page layout
│   └── partials/    # Reusable components
│       ├── header.njk
│       ├── footer.njk
│       ├── breadcrumbs.njk
│       ├── code-formatter.njk  # Shared UI for code formatter pages
│       ├── cards.njk           # Category and tool cards (homepage, categories, /tools/, related)
│       ├── currency-select.njk # Shared currency selector + embedded country data
│       └── related-tools.njk
├── assets/
│   ├── css/             # tokens, base, layout, components, utilities (bundled by scripts/bundle-css.js)
│   ├── js/              # Shared JavaScript (common.js: result links, guessCountry, formatMoney, dates)
│   ├── og/              # Generated Open Graph cards
│   └── img/             # Images & icons
├── tools/           # One folder per tool
│   └── [slug]/
│       ├── index.njk    # Tool template (front matter holds the SEO content)
│       ├── logic.js     # Pure, DOM-free logic (UMD), unit-tested in scripts/test-tool-logic.js
│       ├── script.js    # UI wiring (client-side)
│       └── style.css    # Tool-specific styles (optional)
├── index.njk        # Homepage
├── 404.njk          # 404 page
├── sitemap.xml.njk  # Auto-generated sitemap
└── robots.txt.njk   # Environment-conditional robots.txt
scripts/             # Build & test scripts
├── check-links.js   # Link & quality checker (also: every tool linked from home, category and /tools/)
├── check-schema.js  # JSON-LD validation (Person/publisher, ProfilePage, ISO dates, clean canonicals)
├── check-seo.js     # Titles, descriptions, canonicals, OG images, crawl depth
├── check-external.js  # Fails if _site/ loads any third-party resource
├── check-contrast.js  # WCAG AA contrast for every token pair, light and dark
└── test-all.js      # Full test suite
docs/                # Documentation
├── AUDIT.md
├── ARCHITECTURE_PLAN.md
├── TOOLS_BACKLOG.md
├── TOOLS_CHANGELOG.md
├── MIGRATION_REPORT.md
└── screenshots/redesign/  # Before/after screenshots of the redesign
_site/               # Build output (git-ignored)
```

---

## Environment-Aware Builds

ToolsBuilt provides strict environment isolation to protect SEO equity and ensure pre-release builds are never indexed by search engines.

- **Production** (`SITE_ENV=production` or `npm run build:prod`): No `noindex` meta tag, `robots.txt` allows all crawlers, sitemap URL included.
- **Staging / Development** (default `npm run build` or `npm run dev`): Every page gets `<meta name="robots" content="noindex, nofollow">`, `robots.txt` disallows all crawlers. This ensures staging previews are never indexed by search engines.

### Environment Matrix

| Setting | Staging / Development (`npm run build` / `npm run dev`) | Production (`npm run build:prod` / `SITE_ENV=production`) |
| :--- | :--- | :--- |
| **Meta Robots** | `<meta name="robots" content="noindex, nofollow">` | *Omitted* (allows crawling and indexing) |
| **`robots.txt` Policy** | `User-agent: *`<br>`Disallow: /` | `User-agent: *`<br>`Allow: /`<br>`Sitemap: https://toolsbuilt.com/sitemap.xml` |
| **Sitemap Link** | Omitted from `robots.txt` | Included in `robots.txt` |

---

## Self-Hosted Formatter Engines

The code formatters run open-source engines in the browser, served from our own domain:

| Engine | npm package (exact version in `package.json`) | Used by | Published to |
| :--- | :--- | :--- | :--- |
| Ruff formatter (WASM) | `@wasm-fmt/ruff_fmt` | Python Formatter | `/assets/vendor/ruff_fmt-<version>/` |
| Prettier (standalone, plus the html, postcss, babel and estree plugins) | `prettier` | Java Formatter, HTML Formatter | `/assets/vendor/prettier-<version>/` |
| Prettier Java plugin | `prettier-plugin-java` | Java Formatter | `/assets/vendor/prettier-plugin-java-<version>/` |
| tree-sitter runtime (dependency of the plugin) | `web-tree-sitter` | Java Formatter | `/assets/vendor/web-tree-sitter-<version>/` |
| zxcvbn-ts (browser builds of core, language-common and language-en) | `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` | Password Strength Checker | `/assets/vendor/zxcvbn-ts-<package>-<version>/` |

How it works:
- `src/_data/vendor.js` lists the files to publish from each package. `eleventy.config.js` copies them from `node_modules` into `/assets/vendor/<package>-<version>/`, and the version comes from the installed package, so the URL changes when the version does.
- The password strength checker is different: zxcvbn-ts ships self-contained browser builds, so the page loads them with `importScripts()` into a Web Worker the first time the password field is used (the page passes the URLs from `vendor.js`). A check takes up to about a second because Levenshtein matching is on, which is why it runs off the main thread.
- Each formatter page includes an inline import map (built by `vendor.js`) that points the package names at those files. The tool's `logic.js` loads the engine with `import()` the first time it is used, so the engines never load on any other page and nothing is fetched from another domain.
- The same `logic.js` runs in Node for the unit tests, where the package names resolve to `node_modules`.

To upgrade an engine:

```bash
npm install --save-dev --save-exact @wasm-fmt/ruff_fmt@<version>          # or prettier / prettier-plugin-java
npm run build && node scripts/check-external.js
node scripts/test-tool-logic.js        # expected-output tests may need updating if the style changed
TOOLS_ONLY=python-formatter,java-formatter node scripts/test-tool-ux.js
```

If an upgrade adds or renames files (for example a new `.wasm`), update the file list in `src/_data/vendor.js`. Check the new version's licence and keep its `LICENSE` file in the published folder.

---

## Design System

- **Tokens** (`src/assets/css/tokens.css`): colours, spacing (4px scale), radii (12px controls, 16px cards, pills), shadows and one category colour per category (`--cat-<colour>-*`). Dark mode is defined twice, under `prefers-color-scheme` and `[data-theme="dark"]`; keep them identical. `scripts/check-contrast.js` checks every token pair in both themes.
- **Components** (`components.css`): section label pill + H2 (`.section-label`), icon tiles (`.icon-tile[data-color]`), category and tool cards (`partials/cards.njk`), the tool workspace card, tinted result card, FAQ accordion, and quiet sticky table of contents.
- **Layout:** the tool comes first on every tool page; long text stays in a 760px column. Standalone links and controls are at least 44px tall.
- **No external assets:** Inter and every icon are self-hosted (`/assets/icons.svg` sprite).

---

## Country Data (update every tax year)

Every country-specific number lives in a data file with its official source and the date it was checked. Never add a number that you have not read on an official source; if you cannot open the source, leave the country out.

| File | What | Update when |
| :--- | :--- | :--- |
| `src/_data/tax/<cc>-<year>.json` | Salary tax: slabs (or filing statuses), deductions, allowance taper, rebate, surcharge, cess, `sources`, `verifiedOn`, `officialExamples`, and the page text under `page` | Each budget: Pakistan (July), India (February, effective April), UK (April), US (IRS Rev. Proc. in October/November) |
| `src/_data/vat-rates.json` | VAT/GST/sales tax presets per country with `source` and `verifiedOn` (EU rows come from the EU "Your Europe" VAT table) | When a country changes its rates; recheck all at least yearly |
| `src/_data/grading-scales.json` | Marks grading presets (`bands` or pass-mark only) | When a board publishes a new scheme |
| `src/_data/noSalaryTax.json` | Countries with no salary tax, with a quote from the official page | Yearly |
| `src/_data/countries.json` | Currency, locale and time zones used by `guessCountry()` and `formatMoney()` | When adding a country |

**New tax year:** copy the current file to `<cc>-<newyear>.json`, change the rates from the new finance law, update `sources`, `verifiedOn` and `officialExamples`, set `"current": true` on the new file and `false` on the old one, and update the page text (title, examples, FAQs). Pakistan keeps two years (current and previous) for its comparison; its `logic.js` reads both files. Then run `npm test`: `scripts/test-tool-logic.js` checks that every dataset has official sources, continuous slabs, published fixed amounts that match the slabs, the official examples, and a `tools.json` entry for its page. Update the tool's `updated` date in `tools.json`.

**Country guess:** `ToolsBuilt.guessCountry()` uses only the browser time zone and `navigator.languages`; a visitor's choice is saved in `localStorage` (`toolsbuilt:country`). There is no IP lookup or network request.

---

## Global Salary Tax Calculator

One calculator serves every salary tax page: the hub `/tools/salary-tax-calculator/` (country picker) and the landing pages `/tools/pakistan-salary-tax-calculator/`, `/tools/india-salary-tax-calculator/`, `/tools/uk-salary-tax-calculator/` and `/tools/us-salary-tax-calculator/`, which preselect their country and year and keep their own title, H1, rate tables, sections and FAQs.

| Piece | File |
| :--- | :--- |
| Form and result markup | `src/_includes/partials/salary-tax-calculator.njk` (`{{ salaryTaxCalculator({ country: "GB", year: "2026-27" }) }}`) |
| Tax engine (pure, no country logic) | `src/tools/salary-tax-calculator/logic.js` |
| Browser controller | `src/tools/salary-tax-calculator/calculator.js` |
| Rules, one file per country and tax year | `src/_data/tax/<cc>-<year>.json` |
| Every country, its currency and what the calculator can do there | `src/_data/salaryTaxCountries.js` |
| Text | `src/_data/i18n/tools/<lang>/salary-tax-calculator.json` (`body.calc` server, `client.calc` browser) |
| Tests | `scripts/test-tool-logic.js` (sections `TaxData`, `Tax<CC>`, `Pay<CC>`, `PayCustom`, `StcCountries`) |

Countries with a dataset use **built-in rules**; countries in `noSalaryTax.json` show zero income tax with the official statement; every other country opens **Custom Tax Mode** (own brackets, allowance, deductions, social security, pension and levies, saved per country in `localStorage` and shared in the URL as `?custom=`). Result links carry `country`, `year`, `salary`, `period`, `hours`, `status` and `o-<option id>`.

### How to add a new country / tax year

1. Create `src/_data/tax/<cc>-<year>.json` (lower-case ISO code). The engine reads these blocks (all optional except `slabs`; see the comment at the top of `logic.js`):
   ```json
   {
     "country": "CA", "taxYear": "2026", "label": "Tax year 2026", "currency": "CAD", "current": true,
     "slabs": [{ "over": 0, "upTo": 58523, "rate": 0.14 }, { "over": 58523, "upTo": null, "rate": 0.205 }],
     "personalAllowance": { "amount": 16452 },
     "statuses": { "<id>": { "label": "…", "slabs": [], "standardDeduction": 0 } },
     "options": [{ "id": "pension", "label": "Pension (% of salary)", "type": "percent", "default": 0, "deduction": { "fromPay": true } }],
     "contributions": [{ "id": "cpp", "label": "CPP", "base": "gross", "bands": [{ "over": 3500, "upTo": 74600, "rate": 0.0595 }] }],
     "defaults": { "salary": 6000, "period": "monthly" },
     "sources": [{ "url": "https://www.canada.ca/…" }], "verifiedOn": "2026-11-08",
     "officialExamples": []
   }
   ```
   (Numbers above only show the shape; take real ones from the official source.) A `status` replaces any block of the same name, so a regime or filing status can bring its own slabs, deductions, rebate, surcharge, options and contributions. `contributions[].when: { "option": "<id>", "is": <value> }` turns a line on from an option; `bandsByStatus` changes its bands per status.
2. Every `sources[].url` must be an official government URL and `verifiedOn` the date you checked it. Add at least two `officialExamples` and matching `Pay<CC>` tests in `scripts/test-tool-logic.js`.
3. Nothing else is required: the country moves from Custom Tax Mode to built-in rules in the picker, its years appear in the tax year selector, and its statuses and options render from the file. Labels come from the file in English; translations can override them under `client.calc.statuses.<CC>.<id>`, `client.calc.options.<id>`, `client.calc.lines.<id>` and `client.calc.years.<CC>.<year>`.
4. Optional landing page: add a `page` block (`slug`, `placeholder`, `defaultSalary`, `defaultPeriod`), a `tools.json` entry and `countryPages.<CC>` text (title, description, H1, FAQs, sections, worked examples) in the English translation file; `country.njk` builds the page.
5. **New tax year** for an existing country: as above under *Country Data*: add the new file with `"current": true` and set the old one to `false`. The year selector lists both, and the result compares the two years.

### How to add a new language

1. Export what the language needs: `node scripts/i18n-strings.js export <code> all --out i18n-export` (add `--missing` after English changes). The calculator's strings are in `tools/salary-tax-calculator.json`.
2. Translate, import (`node scripts/i18n-strings.js import …`), then `node scripts/check-translations.js --lang <code>`. Full workflow and quality rules: `docs/i18n/TRANSLATION_GUIDE.md`.
3. Enable it in `src/_data/languages.json`. Right-to-left languages (`"dir": "rtl"`: Arabic, Urdu, Persian, Hebrew) get `dir="rtl"` on the page; the calculator's CSS uses logical properties, so it mirrors without extra styles.
4. **English fallback:** a translation file only needs the keys it translates; anything missing is shown in English. New English strings that may ship before they are translated are listed in `src/_data/i18n/fallback.json`; `check-translations.js` reports those as warnings instead of failing the build. Remove a prefix there once every enabled language has it.

---

## External Resource Guard

`scripts/check-external.js` scans every HTML, CSS and JS file in `_site/` and fails if anything would load from another domain: scripts, stylesheets, fonts, images, iframes, CSS `@import`/`url()`, and JavaScript `fetch`/`import()`/`.src` assignments. The only allowed external request is the consent-gated Google Analytics loader in `base.njk`. It runs in `npm test` and before every production deploy.

---

## How to Add a New Tool

Follow these 6 steps to add a new client-side tool to ToolsBuilt:

### 1. Register the Tool in `src/_data/tools.json`
Add an entry with all required metadata fields:
- `slug`: URL identifier (e.g., `"tip-calculator"`)
- `name`: Full display name (e.g., `"Tip & Bill Split Calculator"`)
- `shortName`: Short display name for cards and breadcrumbs (e.g., `"Tip Calculator"`)
- `category`: Category slug matching `src/_data/categories.json` (e.g., `"math"`)
- `description`: Meta description under 155 characters
- `keywords`: Array of search keywords
- `icon`: Inline SVG string (24×24, `aria-hidden="true"`)
- `iconName`: Icon identifier
- `popular`: Boolean flag (`true` to feature on the homepage / footer)
- `updated`: Date in `YYYY-MM-DD` format
- `related`: Array of slugs for related tools

```json
{
  "slug": "tip-calculator",
  "name": "Tip & Bill Split Calculator",
  "shortName": "Tip Calculator",
  "category": "math",
  "description": "Calculate tips and split bills evenly with custom percentages and rounding.",
  "shortDescription": "Calculate tips and split bills evenly with custom percentages and rounding.",
  "keywords": ["tip calculator", "split bill", "restaurant tip"],
  "icon": "<svg ...></svg>",
  "iconName": "receipt",
  "popular": false,
  "updated": "2026-10-15",
  "related": ["discount-calculator", "percentage-change-calculator"]
}
```

### 2. Create the Tool Template (`src/tools/[slug]/index.njk`)
Create `src/tools/[slug]/index.njk` with Nunjucks front matter:
- `layout`: `layouts/tool.njk`
- `toolSlug`: Must match the slug in `tools.json`
- `title`: Page `<title>`
- `description`: Page meta description
- `ogTitle` & `ogDescription`: Social card metadata
- `howto`: Structured step-by-step instructions (generates `HowTo` schema)
- `faqs`: Question and answer pairs (generates `FAQPage` schema)

```njk
---
layout: layouts/tool.njk
toolSlug: tip-calculator
title: "Tip Calculator: Split Bills and Calculate Tips"   # <= 60 characters
description: "Calculate tips and split a bill between any number of people, with custom percentages and rounding."   # <= 155
permalink: /tools/tip-calculator/
h1: "Tip Calculator"
quickAnswer: "2-3 sentences that answer the main search directly, with a number."
formula: { title: "...", expression: "...", explanation: "..." }
workedExamples: [ { title, inputs: [...], steps: [...], result, link } ]   # 3+
commonMistakes: [ { title, description } ]                               # 4+
faqs: [ { q, a } ]                                                        # 6-8, worded like real searches
sources: [ { name, url } ]                                                # official sources only
lastReviewed: "YYYY-MM-DD"
howto: { name, description, steps: [ { name, text } ] }
---

<section class="tool-container" aria-label="Tip Calculator">
  <!-- form, result box and any reference table; use design-system classes, no inline styles -->
</section>

<!-- tool-end -->

<section class="content-section"> ... page-specific long-form content ... </section>
```

The layout renders the page in this order: H1, description, byline, the tool (everything before `<!-- tool-end -->`), Quick Answer, How to Use, the content after the marker, Formula, Worked Examples, Common Mistakes, FAQ, Sources and Related tools. Inputs marked `data-param="name"` get shareable result links through `ToolsBuilt.resultLink` in `assets/js/common.js`.

### 3. Create the Logic and Script (`logic.js`, `script.js`)
Put the calculation in `src/tools/[slug]/logic.js` as a pure UMD module (no DOM access) and add unit tests for it in `scripts/test-tool-logic.js`. `script.js` wires the form to it, validates input with clear error messages, and updates the result region (`aria-live="polite"`).

### 4. Create Tool-Specific Styles (Optional: `src/tools/[slug]/style.css`)
If the tool needs styling beyond the shared components in `assets/css/`, add `style.css` in the tool directory (design tokens only) and reference it with `extraCss` in the front matter.

### 5. Update Related Tools in `src/_data/tools.json`
Ensure relevant existing tools reference the new tool in their `related` arrays to establish bidirectional internal linking.

### 6. Verify and Test
Run a test build and verify integrity:
```bash
npm run build && npm test
```

---

## Branching Strategy

ToolsBuilt follows a strict branch hierarchy to safeguard production stability and SEO reputation:

- **`main`**: **LIVE production branch** served by GitHub Pages. Never push directly to `main`.
- **`staging`**: Integration/staging branch. All feature branches merge here first for automated testing and preview verification.
- **`feat/*`**: Feature branches created from `staging` for adding new tools, enhancing templates, or fixing bugs.
- **`pre-eleventy-live`**: Git tag marking the last commit on `main` before the Eleventy migration, preserved for rapid rollback.

```
feature branch (feat/*)
         │
         ▼  (PR / merge)
      staging  ─── CI: build & test (staging mode, noindex)
         │
         ▼  (Release PR / merge)
       main    ─── CD: build:prod & deploy to GitHub Pages (live site)
```

---

## CI/CD

Continuous integration and automated deployment are powered by GitHub Actions:

- **On PRs to `staging` or `main`, and pushes to `staging`:**
  1. Runs `npm ci`
  2. Runs `npm run build` (staging configuration with `noindex, nofollow` and crawler disallow)
  3. Runs `npm test` (full link checker, schema validator, and boundary tests)
  4. *No deployment occurs.*

- **On push to `main`:**
  1. Runs `npm ci`
  2. Runs `npm run build:prod` (production configuration with indexing enabled and production sitemap)
  3. Runs production test suite
  4. Deploys `_site/` to GitHub Pages via `actions/deploy-pages`

---

## Launch Checklist

Before deploying updates or migrating production traffic:

1. [ ] **Merge `staging` into `main`** via pull request after passing all staging CI checks.
2. [ ] In GitHub repository **Settings → Pages**, change **Source** from *"Deploy from a branch"* to *"GitHub Actions"*.
3. [ ] Confirm custom domain `toolsbuilt.com` is configured and **"Enforce HTTPS"** is enabled.
4. [ ] Verify the live site at [https://toolsbuilt.com](https://toolsbuilt.com).
5. [ ] Check Google Search Console for any crawling or indexing anomalies.
6. [ ] **Rollback Plan:** To recover the old pre-migration state at any point:
   ```bash
   git checkout pre-eleventy-live
   ```
   *(The `pre-eleventy-live` tag was created on the last pre-migration commit on `main`. Push the tag if not already pushed: `git push origin pre-eleventy-live`)*

---

## License

All rights reserved.
