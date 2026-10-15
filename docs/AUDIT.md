# ToolsBuilt Technical & Architectural Audit

**Document Version:** 1.0.0  
**Date:** October 2026  
**Auditor:** Senior Staff Engineer  
**Repository:** [github.com/toolsbuilt/toolsbuilt.github.io](https://github.com/toolsbuilt/toolsbuilt.github.io) (Hosted at [toolsbuilt.com](https://toolsbuilt.com))  
**Target Branch:** `chore/audit-and-architecture`

---

## 1. Executive Summary

ToolsBuilt is an early-stage static website offering 10 client-side calculators and utilities spanning date/time, math, text, security, and random selection. The platform's core premise—100% free, client-side, zero signup, privacy-first web tools—is well-aligned with high-intent search traffic and modern web performance best practices.

However, the repository currently operates as a collection of **completely uncompiled, hand-written HTML, CSS, and JavaScript files**. There is no build pipeline, package manager, or template abstraction. Critical navigation elements, headers, footers, schema markup, and scripts are duplicated across all 17 HTML files. In addition, critical image assets are broken (e.g., an SVG masquerading as a `.png` for the Apple Touch Icon, and SVGs used for Open Graph tags which social crawlers reject), SEO metadata is incomplete across half the tools, dynamic tool outputs lack accessibility announcements, and several mathematical and legal content assertions are inaccurate.

This audit provides a comprehensive breakdown of the current state, verifies known codebase issues, groups all technical debt by severity, and establishes the foundation for a scalable, maintainable architecture.

---

## 2. Repository & Tech Stack Discovery

### 2.1 Technology Stack
* **Language & Markup:** Vanilla HTML5, CSS3, ES6+ JavaScript.
* **Framework / SSG:** None. There is no static site generator (no Astro, Eleventy, Jekyll, or Hugo).
* **Package Management:** None. There is no `package.json`, `package-lock.json`, or node module dependency tree.
* **Build System:** None. Raw files in the git tree are served directly to end users.
* **Testing & Quality Assurance:** Two ad-hoc Node.js scripts (`scripts/check-links.js` and `scripts/test-all.js`) using Node standard libraries (`fs`, `path`, `child_process`, `crypto`). Note: `scripts/test-all.js` currently fails when executed due to `scripts/check-links.js` flagging the Google Search Console verification HTML file (`google5758f81e977de6a2.html`).
* **Analytics & Third-Party:** Google Analytics (GA4 tag `G-QR15X9WS1J`) embedded in `<head>`. AdSense placeholder comments and an unrendered cookie consent container exist in the markup.

### 2.2 Directory Structure & Page Authoring Model
```
.
├── .nojekyll                          # Tells GitHub Pages not to run Jekyll
├── 404.html                           # Custom 404 page
├── CNAME                              # Custom domain: toolsbuilt.com
├── README.md
├── about/index.html                   # Hand-written about page
├── assets/
│   ├── css/style.css                  # Monolithic global stylesheet (1,598 lines)
│   ├── img/
│   │   ├── apple-touch-icon.png       # DEFECT: SVG file saved with .png extension
│   │   ├── favicon.svg                # Vector site favicon
│   │   └── og-image.svg               # DEFECT: Vector Open Graph image (unsupported by platforms)
│   └── js/
│       ├── common.js                  # Theme toggle, mobile drawer, accordions, search
│       ├── icons.js                   # SVG icon string map (window.ICONS)
│       └── tools-data.js              # Client-side metadata registry & dynamic related tools renderer
├── contact/index.html                 # Hand-written contact page
├── google5758f81e977de6a2.html        # Google Search Console domain verification token
├── index.html                         # Hand-written homepage and tool directory
├── privacy-policy/index.html          # Hand-written privacy policy
├── robots.txt                         # Static crawler instructions
├── scripts/
│   ├── check-links.js                 # Zero-dependency internal link, meta, and JSON-LD checker
│   └── test-all.js                    # Regression test suite for math/crypto/dates
├── sitemap.xml                        # Hand-crafted static XML sitemap (15 URLs)
├── terms/index.html                   # Hand-written terms of service
└── tools/                             # 10 dedicated tool directories
    ├── add-days-to-date-calculator/   # index.html + script.js
    ├── age-calculator/                # index.html + script.js
    ├── date-difference-calculator/    # index.html + script.js
    ├── days-until-date-calculator/    # index.html + script.js
    ├── discount-calculator/           # index.html + script.js
    ├── password-generator/            # index.html + script.js
    ├── percentage-change-calculator/  # index.html + script.js
    ├── random-name-picker/            # index.html + script.js
    ├── text-case-converter/           # index.html + script.js
    └── word-counter/                  # index.html + script.js
```

**Page Authoring Mechanism:**  
Every single page is an independent, hand-authored HTML file. Updating the primary navigation, adding a new tool link to the footer, updating the copyright year, or modifying global metadata requires manual edits across all 17 HTML files.

### 2.3 CSS & JavaScript Organization
* **CSS Architecture:**
  * Global tokens and component styles reside in `assets/css/style.css` (1,598 lines, 32 KB unminified).
  * 4 tool pages (`text-case-converter`, `password-generator`, `discount-calculator`, and `percentage-change-calculator`) contain large, bespoke `<style>` blocks in their `<head>` containing redundant layout rules.
  * Inline styles (`style="..."`) are heavily used throughout HTML files for layout spacing, flex alignments, and font sizes.
* **JavaScript Architecture:**
  * Shared UI scripts are split across `common.js`, `icons.js`, and `tools-data.js`.
  * Tool-specific logic is segregated into `tools/<slug>/script.js`.
  * Scripts are loaded at the bottom of `<body>` without modules (`type="module"` is not used), polluting the global `window` object (`window.TOOLS_DATA`, `window.ICONS`, `window.getIconSvg`, `window.dataLayer`).
  * Dark theme preference is evaluated on `DOMContentLoaded` in `common.js`, causing a visible Flash of Unstyled Content (FOUC / flash of white background) for users who prefer dark mode.

### 2.4 Hosting, DNS & Deployment
* **Host:** GitHub Pages.
* **Domain Configuration:** Custom domain configured via `CNAME` pointing to `toolsbuilt.com`.
* **Static Bypass:** `.nojekyll` is present in root, preventing GitHub's default Jekyll processing.
* **Routing & Fallbacks:** Standard directory-based clean URLs (e.g., `/tools/age-calculator/` resolved via `/tools/age-calculator/index.html`). GitHub Pages automatically handles HTTP 404s via `/404.html`.
* **CI/CD Pipeline:** None. Zero GitHub Actions workflows exist under `.github/workflows/`. Deployment occurs directly upon pushing to the repository's publishing branch.

### 2.5 SEO Setup & Structured Data Audit
* **Titles & Meta Descriptions:** Every page has a unique `<title>` and `<meta name="description">` (validated via `scripts/check-links.js`).
* **Canonical URLs:** Properly self-referential on all content and tool pages.
* **Social Graph Tags (Open Graph & Twitter):**
  * **Critical Gap:** 5 of the 10 tool pages completely lack `og:image` and `twitter:image` tags (`days-until-date-calculator`, `date-difference-calculator`, `percentage-change-calculator`, `word-counter`, `text-case-converter`).
  * **Invalid Format:** Where present, `og:image` and `twitter:image` point to `/assets/img/og-image.svg`. Major platforms (Facebook, Twitter/X, LinkedIn, Slack, Discord, WhatsApp) reject SVG social images.
  * **Inconsistent Cards:** Some pages use `twitter:card` `summary_large_image`, while others use `summary`.
* **Structured Data (JSON-LD):**
  * The homepage features `Organization` and `WebSite` schemas with a `SearchAction`.
  * Tool pages feature `BreadcrumbList`, `WebApplication`, `HowTo`, and `FAQPage` schemas.
  * **E-E-A-T Deficiency:** None of the schemas specify `author`, `creator`, or `reviewedBy` entities.
* **Sitemap & Robots:**
  * `robots.txt` correctly allows all user agents and points to `https://toolsbuilt.com/sitemap.xml`.
  * `sitemap.xml` is maintained manually. It currently contains 15 entries but lacks category pages and image/video extensions. Manual maintenance poses a high risk of desynchronization as the catalog expands.

---

## 3. Current Tools Inventory & Operational Status

| Tool Name | Slug | Category | Key Features | Operational Status & Defects |
| :--- | :--- | :--- | :--- | :--- |
| **Days Until Date Calculator** | `days-until-date-calculator` | Date & Time | Counts days, weeks, months, business days to target date. | **Working.** Missing `og:image` / `twitter:image`. Related tools section is empty in static HTML. |
| **Date Difference Calculator** | `date-difference-calculator` | Date & Time | Calculates calendar days, business days, and weekends between two dates. | **Working.** Missing `og:image` / `twitter:image`. Dynamic output lacks `aria-live`. |
| **Add or Subtract Days Calculator** | `add-days-to-date-calculator` | Date & Time | Adds/subtracts days, weeks, months, years with month-end clamping. | **Working with defects.** Completely missing `data-tool-id`, `tools-data.js`, and the Related Tools section. |
| **Age Calculator** | `age-calculator` | Date & Time | Calculates age in Y/M/D, total hours, countdown to next birthday. | **Working with editorial defects.** Inaccurate legal claim ("21 years = full contractual rights"), mislabeled "Biological & Time Facts", missing authoritative sources. |
| **Percentage Change Calculator** | `percentage-change-calculator` | Math | 3 modes: % increase/decrease, X% of Y, X is what % of Y. | **Working.** Contains inline `<style>` block in `<head>`. Missing `og:image`. Output lacks `aria-live`. |
| **Discount Calculator** | `discount-calculator` | Math | Single & double stacked discount calculation, sales tax addition. | **Working.** Contains inline `<style>` block in `<head>`. |
| **Word & Character Counter** | `word-counter` | Text | Live word, character, sentence, paragraph, reading/speaking time. | **Working.** Missing `og:image`. Counter updates lack `aria-live` polite announcement. |
| **Text Case Converter** | `text-case-converter` | Text | Converts between 7 case formats (upper, lower, title, camel, snake, etc.). | **Working.** Contains inline `<style>` block in `<head>`. Missing `og:image`. |
| **Strong Password Generator** | `password-generator` | Security | CSPRNG via `crypto.getRandomValues`, rejection sampling, entropy meter. | **Working.** Contains inline `<style>` block in `<head>`. Modal/copy output lacks `aria-live`. |
| **Random Name Picker Wheel** | `random-name-picker` | Fun | HTML5 Canvas spinning wheel, crypto-random winner selection. | **Working with defects.** Missing `data-tool-id`, `tools-data.js`, and Related Tools section. Winner modal lacks focus trap. |

---

## 4. Audit of Known Issues (Verification Checklist)

The 5 issues identified prior to this audit were tested directly against the codebase:

### 4.1 "og-image is an SVG (social platforms need PNG/JPG 1200x630)"
* **Result:** **TRUE**
* **Verification & Evidence:**
  * File on disk: `assets/img/og-image.svg` is an SVG vector graphic (964 bytes).
  * HTML references: In `index.html` (line 17), `about/index.html` (line 17), and 5 tool pages, `<meta property="og:image" content="https://toolsbuilt.com/assets/img/og-image.svg">` is hardcoded.
  * In addition, `assets/img/apple-touch-icon.png` is an SVG file fraudulently named with a `.png` extension (verified via file magic bytes: `SVG Scalable Vector Graphics image`).
  * Social scrapers (Facebook Open Graph, Twitter Card Validator, LinkedIn Post Inspector, WhatsApp, Discord) do not parse or render SVG images.
* **Required Fix:** Generate an official 1200x630 PNG/WebP raster social card and a 180x180 PNG Apple Touch Icon.

### 4.2 "Age calculator page says '21 years = full contractual rights' and a 'Biological & Time Facts' heading, which are inaccurate or US-centric"
* **Result:** **TRUE**
* **Verification & Evidence:**
  * File `tools/age-calculator/index.html`:
    * Line 295: `<h3>Biological &amp; Time Facts</h3>` introduces bullet points that contain zero biological facts (e.g., `1 Year = 365.2425 days`, `1 Decade = 120 months`, `Leap Day Birthday = Celebrated Feb 28`). These are purely astronomical and calendar conversion facts.
    * Line 320: Table row states `<td style="padding: 0.5rem; font-weight: 600;">21 Years</td><td style="padding: 0.5rem;">Full Contractual Rights</td>`.
    * In standard common law and civil jurisdictions worldwide (including the UK, Canada, Australia, EU, and virtually all 50 US states), the age of legal majority and full capacity to enter binding contracts is **18 years**, not 21. Age 21 was historically the voting age in the US prior to the 26th Amendment (1971) and remains the minimum age for alcohol/handgun purchases, but is legally incorrect for contractual rights.
* **Required Fix:** Rename the section to "Calendar & Astronomical Time Facts". Update the legal milestone table to accurately identify 18 as the Age of Majority / Contractual Capacity, and clarify jurisdiction-specific milestones (e.g., US alcohol purchase age 21, retirement benchmarks).

### 4.3 "No category pages; 'Related Tools' section on tool pages appears empty"
* **Result:** **TRUE**
* **Verification & Evidence:**
  * **Category Pages:** No directories, templates, or URLs exist for tool categories (e.g., `/category/date-time/` or `/date-time/`).
  * **Related Tools Empty in Static HTML:** In 8 tool pages, the HTML contains an empty container:
    ```html
    <div class="tools-grid" id="related-tools-grid">
      <!-- Rendered dynamically by tools-data.js -->
    </div>
    ```
    Search engine crawlers and users with JavaScript disabled receive a blank container with zero internal link equity.
  * **Omitted Entirely in 2 Tools:** In `tools/add-days-to-date-calculator/index.html` and `tools/random-name-picker/index.html`, `tools-data.js` is not loaded, `data-tool-id` is omitted from `<body>`, and `#related-tools-grid` is completely absent from the DOM.
* **Required Fix:** Introduce static category taxonomy pages and compile related tool links directly into the static HTML at build time so crawlers and users receive static anchor tags without relying on client-side DOM mutation.

### 4.4 "No real author/reviewer or sources shown (weak E-E-A-T)"
* **Result:** **TRUE**
* **Verification & Evidence:**
  * The `about/index.html` page contains generic anonymous copy ("At ToolsBuilt, our mission is simple... Built and maintained by ToolsBuilt"). No founders, software engineers, mathematicians, or editors are identified by name, credential, or background.
  * Tool pages have no author bylines, editorial review dates, or reviewer credentials.
  * Calculations involving legal milestones, leap year calendar math, financial percentages, and cryptographic randomness cite zero authoritative standards (e.g., ISO 8601, NIST SP 800-63B, RFC 4122).
  * JSON-LD schemas lack `author`, `reviewedBy`, and `citation` properties.
* **Required Fix:** Establish an editorial team profile, include author/reviewer bylines on tool pages, cite primary mathematical/technical standards, and embed structured author/reviewer schema.

### 4.5 "Header/footer/CSS likely duplicated across pages"
* **Result:** **TRUE**
* **Verification & Evidence:**
  * The entire `<header class="site-header">` (including raw inline SVGs for logo, sun, moon, and hamburger menu) is duplicated across all 17 HTML files.
  * The entire `<footer class="site-footer">` is duplicated across all 17 HTML files.
  * Inconsistency: `index.html` has 7 links in the "Popular Tools" footer column, while tool pages have 5 links.
  * 4 tool pages duplicate CSS rules inside page-level `<style>` tags in `<head>`, and inline `style="..."` attributes are littered throughout layout containers.
* **Required Fix:** Decompose the presentation into reusable layout components/partials (header, footer, head metadata, tool shell) compiled via a static site builder.

---

## 5. Detailed Findings Grouped by Severity

### 5.1 Critical Severity (P0)

#### CRIT-1: Invalid Apple Touch Icon File Format
* **File:** `/assets/img/apple-touch-icon.png`
* **Finding:** The file is an SVG vector image (303 bytes) misnamed with a `.png` file extension.
* **Impact:** iOS Safari and mobile operating systems require a valid raster PNG (recommended 180x180 px). Mobile bookmarks, home screen shortcuts, and touch icons fail to render properly.
* **Suggested Fix:** Generate an authentic 180x180 PNG image from the vector logo using Sharp/Canvas and save it as a valid PNG.

#### CRIT-2: Open Graph & Twitter Social Preview Images Fail on Social Platforms
* **File:** `/assets/img/og-image.svg`, `/index.html`, `/about/index.html`, `/tools/*/index.html`
* **Finding:** Social sharing meta tags (`og:image`, `twitter:image`) point to `https://toolsbuilt.com/assets/img/og-image.svg`.
* **Impact:** Open Graph specifications require raster formats (PNG, JPEG, WebP). Facebook, Twitter/X, LinkedIn, Slack, WhatsApp, and Discord fail to render link previews, destroying social click-through rates. Furthermore, 5 tool pages completely omit `og:image`.
* **Suggested Fix:** Generate a standard 1200x630 PNG social preview image (`/assets/img/og-image.png`) and include it systematically across all pages via shared metadata layouts.

#### CRIT-3: Existing Test Suite Fails Out-of-the-Box
* **File:** `/scripts/check-links.js`, `/scripts/test-all.js`
* **Finding:** Running `node scripts/test-all.js` exits with code 1 (`💥 TEST SUITE COMPLETED WITH 1 FAILURE(S)`). `check-links.js` collects all `.html` files in the repository root and fails on `google5758f81e977de6a2.html` because it lacks a title, description, h1, and canonical tag.
* **Impact:** Automated CI/CD verification is blocked; developers cannot verify regression tests cleanly.
* **Suggested Fix:** Update `collectHtmlFiles` in `scripts/check-links.js` and `scripts/test-all.js` to ignore Google Search Console verification files (`google*.html`).

#### CRIT-4: Client-Side Flash of Inverted Theme (FOUC)
* **File:** `/assets/js/common.js`, all HTML `<head>` blocks
* **Finding:** Theme restoration is executed inside `DOMContentLoaded` listener in `common.js`:
  ```javascript
  document.addEventListener('DOMContentLoaded', () => { ... initTheme(); });
  ```
* **Impact:** For users with dark mode enabled in `localStorage`, the browser first renders the entire page in bright white light mode, then flashes dark once DOM parsing completes.
* **Suggested Fix:** Inject an inline blocking 1-line script into the `<head>` of all pages before stylesheets load:
  ```html
  <script>(function(){const t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})();</script>
  ```

---

### 5.2 High Severity (P1)

#### HIGH-1: Zero Build Pipeline & 100% Code Duplication
* **File:** All 17 `.html` files in root, `/about/`, `/contact/`, `/privacy-policy/`, `/terms/`, and `/tools/*/`
* **Finding:** Navigation menus, SVG icons, header brand bars, footer link grids, Google Analytics scripts, and meta tags are manually duplicated across 17 files.
* **Impact:** Maintenance nightmare. Any global change (e.g., adding a new tool to navigation, updating copyright year, modifying tracking) requires 17 manual edits. Inconsistencies already exist between home and tool footers.
* **Suggested Fix:** Migrate to a data-driven static site generator (Eleventy or Astro) utilizing component partials and a single JSON tool registry.

#### HIGH-2: Inaccurate Legal Milestones & Misleading Fact Headings
* **File:** `/tools/age-calculator/index.html` (lines 295–327)
* **Finding:** States "21 Years = Full Contractual Rights" (legally inaccurate in almost all jurisdictions) and labels astronomical/calendar conversions as "Biological & Time Facts".
* **Impact:** Erodes user trust, undermines editorial credibility, and risks search engine demotion under Google's Quality Rater Guidelines for factual accuracy.
* **Suggested Fix:** Correct the age milestone table to state "18 Years: Legal Majority, Contractual Capacity & Voting (Most Jurisdictions)". Rename the facts section to "Calendar & Astronomical Facts".

#### HIGH-3: Empty Related Tools on Static HTML & Incomplete Tool Coverage
* **File:** `/tools/*/index.html`, `/assets/js/tools-data.js`
* **Finding:** 8 tool pages rely on client-side JS to populate `#related-tools-grid`. Search engine crawlers encounter empty containers. 2 tool pages (`add-days-to-date-calculator` and `random-name-picker`) omit the feature entirely.
* **Impact:** Search engine bots cannot crawl internal cross-tool links from the HTML payload. Users with disabled JavaScript or network drops see blank sections.
* **Suggested Fix:** Compile related tools directly into static HTML at build time using the shared tool registry.

#### HIGH-4: Complete Absence of Category Taxonomy Pages
* **File:** Entire site structure
* **Finding:** Tools are grouped by category on the homepage, but dedicated category hub pages (e.g., `/date-time/`, `/math/`, `/text/`, `/security/`) do not exist.
* **Impact:** Lost opportunity to rank for high-volume category search queries (e.g. "free date calculators", "online text tools") and weakened topical authority.
* **Suggested Fix:** Automatically generate category landing pages from the tool registry at build time.

#### HIGH-5: Weak E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
* **File:** Entire site, `/about/index.html`, JSON-LD schemas
* **Finding:** No individual authors, technical reviewers, credentials, methodology documentation, or official standards citations exist.
* **Impact:** Google search algorithms heavily scrutinize functional calculation and financial/legal utilities for E-E-A-T signals.
* **Suggested Fix:** Add author/reviewer bios with verifiable experience, document mathematical formulas, cite standards (ISO 8601, NIST, IEEE), and populate schema `author` and `reviewedBy` entities.

---

### 5.3 Medium Severity (P2)

#### MED-1: Dynamic Calculation Results Lack Accessibility Announcements (`aria-live`)
* **File:** `/tools/password-generator/index.html`, `/tools/random-name-picker/index.html`, `/tools/text-case-converter/index.html`, `/tools/word-counter/index.html`
* **Finding:** Result display boxes do not have `aria-live="polite"` or `role="status"`.
* **Impact:** Blind and visually impaired screen reader users are not notified when a new password is generated, text is converted, or a random winner is picked.
* **Suggested Fix:** Add `aria-live="polite"` and `role="status"` to all dynamic output wrappers.

#### MED-2: Form Control Label Association Gaps
* **File:** `/tools/add-days-to-date-calculator/index.html`, `/tools/date-difference-calculator/index.html`, `/tools/password-generator/index.html`
* **Finding:** Several input checkboxes rely on implicit wrapping without explicit `for="..."` and `id="..."` pairing.
* **Impact:** Inconsistent behavior on older screen readers and assistive tech.
* **Suggested Fix:** Ensure all form controls have explicit `<label for="[id]">` tags.

#### MED-3: Inline `<style>` Blocks & Unminified Assets
* **File:** `/tools/text-case-converter/index.html`, `/tools/password-generator/index.html`, `/tools/discount-calculator/index.html`, `/tools/percentage-change-calculator/index.html`
* **Finding:** 4 tools inject 50–100 lines of CSS in `<head>`, duplicating rules from `style.css`.
* **Impact:** Increases page weight, prevents CSS caching, and violates clean separation of concerns.
* **Suggested Fix:** Consolidate all tool styles into component CSS modules bundled and minified by the build pipeline.

#### MED-4: Manual Sitemap Maintenance
* **File:** `/sitemap.xml`
* **Finding:** Sitemap is hand-edited.
* **Impact:** High risk of dead URLs, missing new tools, or out-of-date `<lastmod>` timestamps.
* **Suggested Fix:** Generate `sitemap.xml` automatically during the build process from the tool registry.

#### MED-5: Lack of CI/CD Automated Testing & Deployment
* **File:** `.github/workflows/` (missing)
* **Finding:** Deployments happen via manual git pushes. No automated linting, link checking, or test execution occurs before publishing.
* **Impact:** Broken links, invalid JSON-LD, or syntax errors can be pushed directly to production.
* **Suggested Fix:** Create a GitHub Actions workflow that executes `test-all.js`, builds the static output, and deploys to GitHub Pages.

---

### 5.4 Low Severity (P3)

#### LOW-1: Font Stack References 'Inter' Without Web Font Delivery
* **File:** `/assets/css/style.css` (line 7)
* **Finding:** `--font-family: 'Inter', system-ui, -apple-system, ...;` is declared, but neither Google Fonts nor self-hosted `@font-face` definitions are included.
* **Impact:** Users without 'Inter' installed locally fallback to `system-ui`. This is excellent for performance (zero FOIT/FOUT), but causes minor cross-platform rendering variations.
* **Suggested Fix:** Either embrace system-ui cleanly (`system-ui, -apple-system, sans-serif`) or self-host a subsetted variable WOFF2 of Inter.

#### LOW-2: Footer Popular Tools Link Inconsistency
* **File:** `/index.html` vs `/tools/*/index.html`
* **Finding:** Homepage footer lists 7 popular tools; tool pages list 5.
* **Impact:** Inconsistent navigation signals.
* **Suggested Fix:** Standardize footer links globally through a shared layout component.

#### LOW-3: AdSense & Cookie Banner Placeholders
* **File:** All HTML files
* **Finding:** Commented-out `<div class="ad-placement">` and hidden empty `<div id="cookie-consent-banner">`.
* **Impact:** Clutters DOM without functional value. When AdSense is activated, an IAB TCF v2.2 compliant CMP is legally required for EEA/UK traffic.
* **Suggested Fix:** Manage advertising and consent containers dynamically through build-time environment flags.

---

## 6. Audit Conclusion & Next Steps

The ToolsBuilt codebase has strong foundational algorithms (e.g. CSPRNG with rejection sampling in the password generator, robust clamped month-end date arithmetic in date tools) and a clean visual style. However, the lack of a build system, massive HTML duplication, broken social/touch icons, and missing category taxonomy severely hinder its ability to scale to an 80+ tool destination.

The immediate next priority is establishing the **Architecture Plan** (`/docs/ARCHITECTURE_PLAN.md`) and the **Tools Backlog** (`/docs/TOOLS_BACKLOG.md`).
