# ToolsBuilt SEO and structure audit (November 2026)

Branch: `seo-recovery` (from `3e59acb`, same tree as `origin/main` after PR #12).
Date: 2026-11-18. Phase 1 only: nothing in `src/` was changed.

## How this was checked

- **Built output:** all 625 HTML pages in `_site/` (staging build from 2026-11-10, same commit as `main`) were parsed by a script that checks title, description, canonical, H1 count, heading order, `html lang`/`dir`, hreflang (complete and reciprocal), `og:locale:alternate`, JSON-LD (parses, types, FAQ matches the visible FAQ), internal links (broken, orphans, click depth), images, scripts, form labels, `$0.00` placeholders and English text on non-English pages.
- **Live site:** `https://toolsbuilt.com/robots.txt`, `/sitemap.xml` and `/tools/loan-emi-calculator/` were fetched to confirm the production build matches.
- **Source:** templates in `src/_includes`, `src/*.njk`, `eleventy.config.js`, `scripts/i18n.js` and the text in `src/_data/i18n/`.
- **Not run yet:** `npm run build`, `npm test` and Lighthouse. Node.js is not installed on this machine. These are listed under [Not verified](#not-verified).

## Summary

The technical base is mostly sound. Several items you listed are already fine:

| Check | Result |
| :--- | :--- |
| Canonical | Present and self-referencing on every page. |
| H1 | Exactly one on every page. |
| hreflang | 619 pages list all 9 languages plus `x-default`, and every link is reciprocal. The pages without hreflang (`/404.html`, `/blog/`, the blog post, `/design-system/`) are English-only, which is correct. |
| `html lang` / `dir="rtl"` | Correct on all pages. `ar` and `ur` pages have `dir="rtl"`. |
| `og:locale:alternate` | Every page lists the other 8 locales, not just `ur_PK`. The live loan EMI page also has all 8. If a sharing debugger showed only `ur_PK`, it was probably showing the last tag or a cached copy. **No fix needed.** |
| JSON-LD | Parses on every page. Tool pages have `WebApplication`, `FAQPage`, `BreadcrumbList` and `HowTo`. The homepage has `WebSite` (with `SearchAction`), `Organization` and `FAQPage`. On translated pages `inLanguage` and URLs point to the localized page. |
| Duplicate titles / descriptions | None among the 625 pages. Every title is 60 characters or fewer. |
| robots.txt | The production version allows everything except `/design-system/` and names the sitemap. |
| sitemap.xml | Lists 623 URLs, all of which exist, with `xhtml:link` hreflang alternates. It leaves out noindex pages (`/404.html`, `/design-system/`). |
| llms.txt | Already exists for English and each language (`/llms.txt`, `/ur/llms.txt`, …). |
| Internal links | No broken links and no orphans. Every page is 2 clicks or fewer from a homepage. Every tool page has related-tool links. The country tax pages each have 12 inbound links. |
| Images | Every `<img>` has `width`, `height` and `alt`. |
| Cookie Settings | Already a real `<button type="button" id="open-cookie-settings">` that reopens the consent banner. **No fix needed.** |
| Render-blocking JS | No `<script src>` in `<head>`. |

The problems that matter most for rankings are **trust and content signals** on the finance pages (USD defaults for a Pakistani audience, `$0.00` results, homepage-only sources with labels that promise specific documents, and a copied investment disclaimer). After those come **keyword overlap** between similar tools, and **translation quality** that cannot be confirmed automatically for 8 languages × 63 pages.

---

## Issues

Severity: **high** = likely hurting rankings or trust now, **med** = should fix, **low** = cleanup.

### 1. Page templates

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | med | The homepage H1 is "Free Online Tools. Simple Solutions." It has no keyword and no intro paragraph that says what the site is. | `src/index.njk:50`, `src/_data/i18n/pages/*/home.json` (`text.hero-title`, `content.tool.p1`) | Use an H1 such as "Free Online Calculators for Finance, Students and Everyday Math", plus a 2-sentence intro that names the main tool groups. Translate both into all 8 languages. |
| 1.2 | low | 30 meta descriptions are under 120 characters, all on non-English pages: `ar` (13), `hi` (6), `ur` (7), `id` (1), `de` (1), plus `/design-system/` (noindex). The full list is in the appendix. | `src/_data/i18n/tools/<lang>/<slug>.json` → `description`; `pages/<lang>/*.json` | Lengthen each one to 120–155 characters. The build's limit is 155. |
| 1.3 | low | Heading order skips H2 on 173 pages: the tool widget uses `<h3>` before the first `<h2>` (for example the loan EMI "Extra payment payoff accelerator" and "Amortization schedule"). The `/404.html` "Quick Links" heading is an `<h3>` directly under the H1. | `src/_includes/layouts/tool.njk` (`.tool-workspace-name` is a `<span>`), tool templates, `src/404.njk` | Make the workspace title (`.tool-workspace-name`) an `<h2>`. That one change fixes every tool page. |
| 1.4 | low | `eleventy.config.js` defines the `latestToolDate` filter twice. The second definition wins and also counts unlisted tools. | `eleventy.config.js` (both definitions) | Remove the duplicate. |

### 2. hreflang / language attributes

No issues: all alternates plus `x-default`, reciprocal, and correct `lang`/`dir`. The only gap is that there is **no way to keep one language version of a page out of the index**: `scripts/i18n.js` builds every page in every enabled language, and every built page goes into hreflang and the sitemap. See 7.2.

### 3. og:locale:alternate

No issue (see the summary).

### 4. Structured data

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | med | Category and tools-directory JSON-LD is built by placing HTML-escaped values inside quotes (`"name": "{{ faq.question }}"`). On French category pages the FAQ schema reads `d&#39;intérêts` while the visible FAQ reads `d'intérêts`, so the FAQ schema does not match the page. A double quote in any of these strings would make the JSON invalid. | `src/category.njk:34,46,51,58,59,78,81`, `src/tools/index.njk:37,48,49` | Use the existing `jsonStr` filter, as `tool.njk` does. |
| 4.2 | low | The lorem ipsum FAQ answer contains raw `<p>` in the JSON-LD text, while the page shows it as escaped text. | `src/_data/i18n/tools/*/lorem-ipsum-generator.json` | Write "paragraph tags" in words, or accept it as is. |
| 4.3 | low | `HowTo` schema is on every tool page. Google stopped showing HowTo rich results in 2023. It is harmless. | `tool.njk` | No change. |

### 5. robots.txt / sitemap.xml

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 5.1 | med | `lastmod` on translated pages is the English tool's date, so it can be earlier than the translation itself. For example, `/ur/tools/loan-emi-calculator/` says `2026-10-31`, but the Urdu page was first published on 2026-11-10. Of 623 URLs, 576 carry an October date. | `scripts/i18n.js` (`i18n-sitemap` transform), `src/sitemap.xml.njk` | For each language version, use the later of the tool's `updated` date and the git date of that language's translation file. |
| 5.2 | — | The sitemap has no way to drop a page that is not indexable in one language (see 7.2). | `scripts/i18n.js` | Covered by 7.2. |

### 6. llms.txt

Already exists and lists categories, tools and blog posts. One low improvement: add a short "Key pages" block for the Pakistan-focused tools (salary tax, gold, marks, merit) and the About/author page.

### 7. Translation quality

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 7.1 | — | **No non-English page has English body text.** In `<main>`, the share of common English words (*the, and, of, to, is…*) is 24% on English pages and at most 5% on any translated page. The highest translated pages are the text case converter and hash generator, whose sample strings are deliberately English, such as "The quick brown fox". In `ar`/`hi`/`ur`, Latin text appears only in code samples (the formatter pages), product names and the titles of English-language sources. `scripts/check-translations.js` also requires every key to be translated. | all `src/_data/i18n/*/<lang>/` | No pages need to be noindexed for being untranslated. |
| 7.2 | med | **Quality cannot be verified automatically.** The `ar`, `hi` and `ur` translations (63 pages each) were added in commits made on one day (`284d2e9` → `1e2a973`, 2026-11-10). A machine translation of a whole site, published all at once, is the pattern Google calls scaled content. Fluency and whether the wording matches how people search in those languages need a native speaker. | — | Add an opt-out: a data file listing `lang → pages` to treat as not ready. Those pages get `noindex,follow` and are dropped from hreflang and `sitemap.xml`. You can then switch a language off for indexing without deleting it. It starts empty, because nothing failed the checks. Recommended spot check before relying on `ar`/`hi`/`ur` for rankings: the loan EMI, salary tax, marks percentage and homepage pages. |

### 8. Cannibalization

| Tools | Overlap now | Recommended focus |
| :--- | :--- | :--- |
| **Percentage Calculator** vs **Percentage Change Calculator** | Both target "what percent X is of Y" and "percent of a number". Percentage Change keywords include `percent of number`, and its description says "what percent X is of Y". | Percentage Calculator: "X% of Y", "what percent is X of Y", reverse percentage. Percentage Change: increase/decrease and percentage difference only. Drop "what percent X is of Y" from its title and description. |
| **Percentage Calculator** vs **Marks Percentage** vs **CGPA to Percentage** | Title/H1 overlap on "percentage", but the intents differ (generic math vs exam marks vs CGPA conversion). | Keep the separate pages. Marks: lead with "obtained/total marks, matric/inter, BISE". CGPA: lead with "HEC/CBSE scale". |
| **Discount** vs **Percentage** vs **Sales Tax** | Discount says "dollars saved" (US wording) and "sales tax". | Discount: "sale price / % off / double discount". Leave tax wording to the Sales Tax tool. Replace "dollars" with "money". |
| **Grade Calculator** vs **Weighted Average Calculator** | Both list the keyword `weighted grade calculator`. | Grade: "final exam score needed / class grade". Weighted Average: "weighted mean of any values". Remove `weighted grade calculator` from Weighted Average. |
| **Date Difference** vs **Days Until Date** | Both titles say "Count Days". | Date Difference: "days between two dates / business days". Days Until: "countdown to a date / how many days until". |
| **Compound Interest** vs **SIP** | Different intents (lump sum vs monthly investment). | No change needed. |
| **Salary Tax hub** vs country pages | Already handled: `listed: false`, own canonicals, linked to each other. | No change. |

None of these pages are true duplicates, so **no cross-page canonicals** are needed. The fix is sharper titles, H1s, descriptions and keywords.

### 9. Internal linking

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 9.1 | low | The blog is linked only from the footer and the HTML `/sitemap/` page, and it has **one post** ("Welcome to ToolsBuilt"). A main-nav link sends visitors and crawlers to thin content until there are real guides. | `src/_includes/partials/header.njk`, `footer.njk` | Add "Blog" to the desktop and mobile main nav, as requested, and write real guides (for example "How EMI is calculated in Pakistan"). |

No orphan pages, nothing deeper than 2 clicks, and every tool page has related-tool links.

### 10. Performance

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 10.1 | low | `icons.js` (24 KB), `ui.js`, `common.js` and each tool's `logic.js`/`script.js` load at the end of `<body>` without `defer`. They do not block first paint, but they delay `DOMContentLoaded` and interactivity. | `src/_includes/layouts/base.njk` (end of body) | Add `defer`. Execution order is kept, and the tool scripts already wait for `DOMContentLoaded`. Run the interaction tests afterwards. |
| 10.2 | low | One CSS bundle (148 KB unminified in the staging build) covers every page, including styles for every tool. The minified production size still has to be measured. | `scripts/bundle-css.js` | Measure the production build first. Splitting tool CSS is optional. |
| 10.3 | — | `og-image.png` is 51 KB. There are no content images on pages, so there is no layout shift from images. Every `<img>` has width/height. | — | None. |
| 10.4 | — | Lighthouse: **not run** (no Node.js or Chrome available). | — | Run it after Node is installed. |

### 11. Accessibility

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 11.1 | med | The search palette input (`#palette-input`, on every page) has no accessible name: placeholder only, no label or `aria-labelledby`. | `src/_includes/partials/header.njk:142` | Add `aria-labelledby="palette-title"`. |
| 11.2 | med | **Name picker wheel:** the winner dialog does not move focus into itself, has no `aria-modal`, does not close on Escape and does not return focus to the Spin button. The canvas has `aria-label` but no `role="img"`. The winner is announced only visually. | `src/tools/random-name-picker/index.njk:38,44`, `script.js` | Move focus to the dialog title or Close button, add `aria-modal="true"`, close on Escape, return focus to Spin, add `role="img"` to the canvas, and announce the winner through a polite live region. Spin, Shuffle and the other controls are real buttons and already work with the keyboard. |

### 12. Known content issues (your list)

| # | Sev | Issue | Where | Proposed fix |
| :--- | :--- | :--- | :--- | :--- |
| 12.1 | high | **Loan EMI defaults to USD.** The static HTML has `selected: "USD"`. The script picks the visitor's currency from their time zone or language but falls back to `USD`, and all 3 worked examples are in USD ("$200,000 Mortgage"). The same USD fallback is in compound interest, SIP, discount, tip, profit margin and salary-to-hourly. Gold and sales tax already default to PKR. | `src/tools/loan-emi-calculator/index.njk:15`, `script.js:69`, `src/_data/i18n/tools/*/loan-emi-calculator.json` | Make PKR the static default and the fallback on loan EMI, compound interest, SIP and discount, and keep the visitor's currency when it can be guessed. Add one PKR worked example per finance tool. Leave tip and salary-to-hourly on the locale guess with a USD fallback: tipping and hourly pay are not PKR-focused. |
| 12.2 | high | **Sources link to homepages** while their labels name specific documents. There are 30 such rows across 18 tools: the loan EMI CFPB/Fed/BIS rows, plus compound interest, SIP, discount, both FBR rows, HEC, IBCC, USNO, College Board, AACRAO, ed.gov, Smashing Magazine and Chicago Manual of Style. Some labels may not describe a real document at all, for example "NIST Consumer Pricing Mathematics Standards" and "US Dept of Education: Postsecondary Grading Metric Guidelines". | `sources` in `src/_data/i18n/tools/<lang>/<slug>.json` | Replace each with a specific page that has been checked and returns 200. Add State Bank of Pakistan pages to loan EMI and specific FBR pages to tax. Drop any row that cannot be verified, and list it in CHANGES.md. |
| 12.3 | med | **The EMI disclaimer talks about "market returns".** One shared `financialDisclaimer` text is used on loan EMI, compound interest and SIP. | `src/_includes/partials/financial-disclaimer.njk`, `ui/*.json` → `financialDisclaimer` | Write a separate text for loans (rates, fees and lender terms vary; KIBOR-linked loans change) and for savings/investments (returns are not guaranteed). Pass the kind to the partial. |
| 12.4 | med | **"By Abu Umair" is not linked.** The byline is plain text, and the About page's "Creator & Maintainer" section has no anchor and no bio. | `tool.njk` byline, `ui/*.json` → `toolPage.byline`, `src/about/index.njk` | Link the byline to `/about/#author`, add `id="author"` and a short bio placeholder (marked TODO for you) to the About page. |
| 12.5 | med | **The homepage H1 is generic.** | Same as 1.1. | Same as 1.1. |
| 12.6 | — | **Cookie Settings is a real button.** | `footer.njk:42` | None. |
| 12.7 | low | **The blog is linked only in the footer.** | Same as 9.1. | Same as 9.1. |
| 12.8 | high | **Result placeholders show `$0.00` in the static HTML** on 54 pages (loan EMI, compound interest, SIP, discount, sales tax and gold, × 9 languages). Inputs are empty in the HTML: the script fills sample values only after it loads. Crawlers that do not run scripts, and visitors on slow connections, see "Monthly EMI: $0.00". | Those tools' `index.njk` and the result strings in `i18n/tools/*/<slug>.json` | Server-render the sample inputs (`value="…"`) and the result calculated at build time in PKR, using each tool's own `logic.js`, so the static HTML matches what the script shows. |

---

## Not verified

- **Build and tests:** `npm run build` / `npm test` were not run (no Node.js on this machine).
- **Lighthouse / Core Web Vitals:** not run. Field data is in Search Console under *Core Web Vitals*.
- **Native-language quality** of `ar`/`hi`/`ur` (and `de`/`fr`/`es`/`pt`/`id`): needs a human reviewer (see 7.2).
- **Why impressions dropped:** Search Console data is not available to me. Two plausible causes are the site going from about 20 to about 63 tool URLs × 9 languages (623 URLs) in a few weeks, and the 3 new languages being published on one day. Confirming this needs the Search Console *Pages* report (look for "Crawled – currently not indexed" and "Duplicate, Google chose different canonical" by language folder) and the *Performance* report filtered by `/ar/`, `/hi/` and `/ur/`.

## Appendix: descriptions under 120 characters

`/ar/about/` 104 · `/ar/contact/` 115 · `/ar/disclaimer/` 118 · `/ar/terms/` 96 · `/ar/tools/attendance-calculator/` 117 · `/ar/tools/date-difference-calculator/` 116 · `/ar/tools/days-until-date-calculator/` 116 · `/ar/tools/fraction-calculator/` 116 · `/ar/tools/grade-calculator/` 111 · `/ar/tools/merit-calculator/` 112 · `/ar/tools/us-salary-tax-calculator/` 115 · `/ar/tools/week-number-calculator/` 117 · `/ar/tools/weighted-average-calculator/` 106 · `/de/tools/discount-calculator/` 115 · `/hi/terms/` 101 · `/hi/tools/age-calculator/` 114 · `/hi/tools/date-difference-calculator/` 114 · `/hi/tools/days-until-date-calculator/` 116 · `/hi/tools/gpa-calculator/` 117 · `/hi/tools/percentage-change-calculator/` 118 · `/id/terms/` 109 · `/ur/category/education/` 115 · `/ur/terms/` 105 · `/ur/tools/days-until-date-calculator/` 115 · `/ur/tools/discount-calculator/` 98 · `/ur/tools/gpa-calculator/` 116 · `/ur/tools/loan-emi-calculator/` 119 · `/ur/tools/percentage-change-calculator/` 108 · `/ur/tools/weighted-average-calculator/` 101
