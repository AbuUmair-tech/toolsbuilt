# SEO recovery: what changed (November 2026)

Branch: `seo-recovery`, based on `3e59acb` (same tree as `origin/main`). **Not deployed and not pushed.**
The issue list this answers is in [AUDIT.md](AUDIT.md).

## Verification (Phase 3)

| Check | Result |
| :--- | :--- |
| `npm run build:prod` | Passes. Translation check passes (0 errors). |
| `npm test` | **63 checks passed, 0 failed.** This covers staging and production builds, link checker, schema, SEO, i18n, translations, contrast, external-resource guard, tool logic, and the Playwright UX, layout and interaction tests. |
| JSON-LD | All blocks on all 625 pages parse. FAQ schema matches the visible FAQ everywhere except the lorem ipsum FAQ, whose answer text contains a literal `<p>` (see below). |
| Internal links | 625 unique internal targets. All exist in the build, none is a directory without a trailing slash (which GitHub Pages would 301), so there are no redirect chains. |
| sitemap.xml | 623 URLs. All exist, none is noindex in the production build, and all have hreflang alternates. |
| Titles / descriptions | No duplicate titles or descriptions. Every title is 60 characters or fewer. Every indexable description is 120–155 characters (`/design-system/` is noindex). |
| Headings | One H1 per page. No heading-level skips, apart from a false positive: weighted-average row labels inside a `<template>` are linked by script. |
| Static results vs the worked examples | Checked against each tool's `logic.js` in Node: loan EMI Rs 55,611.12, compound interest Rs 1,296,871.23, SIP Rs 2,323,390.76, discount Rs 4,000, profit Rs 200 / 20% / 25%, hourly Rs 865.38. |

**Lighthouse** (v12, local `python -m http.server`, which has **no gzip**, so mobile numbers are pessimistic; GitHub Pages compresses, and the CSS bundle is 150 KB raw vs 21 KB gzipped):

| Page | Mobile perf | Desktop perf | Accessibility | Best practices | SEO | CLS |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | 93 | 100 | 100 | 100 | 100 | 0 |
| `/tools/loan-emi-calculator/` | 88 | 100 | 100 | 100 | 100 | 0.003 |
| `/ur/tools/loan-emi-calculator/` | 79 (was 74 before the font preload) | 98 | 100 | 100 | 100 | 0 |
| `/tools/random-name-picker/` | 91 | 100 | 100 | 100 | 100 | 0 |

On a first visit, the largest element is the cookie banner text. The Urdu page also waits on the 239 KB Noto Nastaliq font.

## Before → after

| Item | Before | After |
| :--- | :--- | :--- |
| Loan EMI default currency | USD (static HTML and script fallback) | PKR. The visitor's guessed currency still wins. Compound interest, SIP and discount also default to PKR. |
| Result boxes in static HTML | `$0.00` on 54 pages | Real sample results in PKR (loan, compound, SIP, discount, sales tax). Gold shows "–" until a rate is entered, because a sample gold price could be mistaken for today's rate. |
| PKR worked examples | Only gold, sales tax and Pakistan salary tax | Also loan EMI, compound interest, SIP, discount, profit margin and salary to hourly. Each is listed first, in 9 languages, with a link that opens the example. |
| Loan EMI disclaimer | Investment text ("market returns fluctuate") | Loan text: fixed-rate assumption, fees, KIBOR-linked floating rates, confirm with the lender. SIP and compound interest get a savings/investment text. |
| Sources | 30 rows across 18 tools linked to homepages | Specific pages, each fetched and confirmed (SBP KIBOR, policy rate and consumer-financing PRs; FBR Income Tax Ordinance, rate cards and Sales Tax Act; HEC; IBCC; CFPB; SEC; FINRA; SECP; GovInfo 16 CFR 233; College Board; Indiana University; Chicago Manual; Google SHA-1 post). The NIST FIPS 180-4 link (404) was fixed. |
| Byline | Plain text "By Abu Umair" | Links to `/about/#author` (`rel="author"`). The About page has the anchor, the short bio and an optional long bio. |
| Homepage H1 | "Free Online Tools. Simple Solutions." | "Free Online Calculators for Finance, Exams & Everyday Math", plus an intro naming loan EMI, salary tax, percentage, marks and CGPA. In 9 languages. |
| Blog | Footer only | Main and mobile navigation |
| Category / directory JSON-LD | HTML-escaped strings (`d&#39;intérêts`) | Serialized with `jsonStr`, with localized breadcrumb names |
| Heading order | H1 → H3 skips on 173 pages | None |
| Search palette input | No accessible name | `aria-labelledby` |
| Name picker winner dialog | No focus management or Escape | Focus moves in and is kept inside; Escape closes and returns focus to Spin; `aria-modal`; the canvas has `role="img"` |
| Page scripts | Synchronous at the end of `<body>` | All `defer`, in the same order |
| Language fonts | Latin font preloaded on every page | Urdu, Arabic and Devanagari pages also preload their own font |
| sitemap `lastmod` on translated pages | English date (could predate the translation) | The later of the English date and the last commit to that language's text |
| Unready translations | No way to keep them out of the index | `src/_data/i18n/notReady.json`: listed pages get `noindex, follow` and leave hreflang and the sitemap. **Empty for now** (see below). |
| Overlapping tools | Percentage vs Percentage Change both targeted "what percent X is of Y"; Grade vs Weighted Average shared "weighted grade calculator"; the two date tools both said "Count Days" | Percentage Change now covers only increase, decrease and difference (9 languages). Weighted Average dropped the grade keyword. Date titles separated. Discount title no longer says "dollars". No canonicals were added, because none of these pages are duplicates. |
| Short meta descriptions | 29 translated pages under 120 characters | All between 120 and 155 |
| llms.txt | Categories and tools | Plus a "Key Pages" section (author, Pakistan tools, disclaimer) |

All commits are listed by `git log 3e59acb..seo-recovery`.

## Needs your action

1. **Fill in the author bio:** set `authorBioLong` in `src/_data/site.json` (it shows on `/about/#author` once it no longer starts with `TODO_`).
2. **Review the new translated text** (written by me, not a native speaker) before or soon after deploying:
   - the homepage H1 and intro (`pages/<lang>/home.json`)
   - the loan and investment disclaimers (`ui/<lang>.json` → `financialDisclaimer`)
   - the PKR worked examples (first item of `workedExamples` in the six finance tools)
   - the rewritten descriptions (percentage, percentage change, discount, and the 29 short ones)
   - the percentage-change keywords
   Source titles added in this branch stay in English in every language, because they are the documents' own titles.
3. **Translation quality, `ar` / `hi` / `ur`:** no page has English body text, so nothing was noindexed. These languages were machine-produced on one day (2026-11-10), though. Have a native speaker spot-check at least the homepage, loan EMI, Pakistan salary tax, marks percentage and merit pages. If any language is not good enough, add `"<lang>": ["*"]` (or specific paths) to `src/_data/i18n/notReady.json` and rebuild.
4. **Merge and deploy** through your normal flow (`seo-recovery` → `staging` → `main`). Production builds run `npm run build:prod`.
5. **Search Console**, after the deploy:
   - Resubmit `https://toolsbuilt.com/sitemap.xml` (Sitemaps).
   - Request indexing (URL Inspection) for `/`, `/tools/loan-emi-calculator/`, `/tools/percentage-calculator/`, `/tools/percentage-change-calculator/`, `/tools/discount-calculator/`, `/tools/compound-interest-calculator/`, `/tools/sip-calculator/`, `/about/`, and `/ur/tools/loan-emi-calculator/`.
   - Check *Pages → Why pages aren't indexed* per language folder. Many `/ar/`, `/hi/` or `/ur/` URLs under "Crawled – currently not indexed" would point to the translation-quality question in item 3.
6. **Sources I could not confirm** (left out or left as they were):
   - **US Naval Observatory:** the leap-year/calendar rows were removed from Add Days, Age and Date Difference, because aa.usno.navy.mil would not load from here. If it loads for you, `https://aa.usno.navy.mil/faq/leap_years` can be added back.
   - **AACRAO:** removed from GPA and Grade, behind a bot wall. "Academic Record and Transcript Evaluation Standards" is not a real title; the real publication is the *Academic Record and Transcript Guide*.
   - **Removed because no such document exists:** "US Dept of Education: Postsecondary Grading Metric Guidelines" and "NIST Consumer Pricing Mathematics Standards".
   - **Existing links that block automated checks** (403, or a timeout) and that I did not change: iso.org, dol.gov, bls.gov, sec.gov, cbse.gov.in, bis.gov.in, gnu.org diffutils manual, loebclassics.com, thecorestandards.org. Open them once in a browser. The SBP, FBR, HEC, IBCC and SECP pages were confirmed in a real browser, but they block curl, so an automated link checker may report them falsely.
7. **Blog:** it is now in the main nav but has a single "Welcome" post. Real guides (for example, how EMI is calculated in Pakistan, or matric/inter percentage and grades) would give that link value.

## Not changed (deliberately)

- **Cookie Settings:** it was already a real `<button>`.
- **`og:locale:alternate`:** it already listed all 8 other locales on every page.
- **hreflang:** it was already complete and reciprocal.
- **HowTo schema:** left in place. It is harmless, but Google no longer shows HowTo rich results.
- **Lorem ipsum FAQ:** the answer mentions `<p>` tags literally, so the schema text contains `<p>`. This is low impact; it could be reworded to "paragraph tags".
- **Tip and salary-to-hourly calculators:** they keep a USD fallback (they follow the visitor's currency). Tipping and hourly pay are not PKR-focused. Salary to hourly now has a PKR worked example; the tip calculator has none.
