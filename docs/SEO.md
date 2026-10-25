# ToolsBuilt Technical SEO & Crawlability Architecture

> Comprehensive guide to metadata, automated social card generation, structured data schemas, crawlability guarantees, and Search Console verification for ToolsBuilt.

---

## Table of Contents

1. [Metadata System & Single Source of Truth](#1-metadata-system--single-source-of-truth)
2. [Title & Description Rules](#2-title--description-rules)
3. [Automated Social Cards (1200x630 Open Graph & Twitter)](#3-automated-social-cards)
4. [Structured Data System (JSON-LD)](#4-structured-data-system-json-ld)
5. [Crawlability, Click Depth & Architecture](#5-crawlability-click-depth--architecture)
6. [Staging vs. Production Indexing Guardrails](#6-staging-vs-production-indexing-guardrails)
7. [IndexNow Manual Submission Protocol](#7-indexnow-manual-submission-protocol)
8. [GitHub Pages Limitations & Recommended Cloudflare Rules](#8-github-pages-limitations--recommended-cloudflare-rules)
9. [Adding New Tools & Categories Checklist](#9-adding-new-tools--categories-checklist)
10. [Post-Launch Search Console Verification Checklist](#10-post-launch-search-console-verification-checklist)

---

## 1. Metadata System & Single Source of Truth

All HTML `<head>` metadata is centrally governed by [`src/_includes/layouts/base.njk`](file:///home/umair/toolsbuilt/src/_includes/layouts/base.njk). Page-specific templates supply front matter variables, with smart defaults computed automatically:

```njk
<title>{{ title }}</title>
<meta name="description" content="{{ description }}">
<link rel="canonical" href="{{ canonical or ('https://toolsbuilt.com' + page.url) }}">
{% if (not env.isProduction) or noindex %}<meta name="robots" content="noindex, nofollow">{% endif %}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#090a0f">

<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/atom+xml" title="ToolsBuilt - New & Updated Tools" href="/feed.xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">

<!-- Dynamic Open Graph -->
<meta property="og:site_name" content="ToolsBuilt">
<meta property="og:title" content="{{ ogTitle or title }}">
<meta property="og:description" content="{{ ogDescription or description }}">
<meta property="og:type" content="{{ ogType or 'website' }}">
<meta property="og:url" content="{{ canonical or ('https://toolsbuilt.com' + page.url) }}">
<meta property="og:image" content="{{ computedOgImage }}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{{ ogImageAlt or (title + ' - ToolsBuilt') }}">
<meta property="og:locale" content="en_US">

<!-- Twitter Card -->
<meta name="twitter:card" content="{{ twitterCard or 'summary_large_image' }}">
<meta name="twitter:title" content="{{ twitterTitle or ogTitle or title }}">
<meta name="twitter:description" content="{{ twitterDescription or ogDescription or description }}">
<meta name="twitter:image" content="{{ computedOgImage }}">
<meta name="twitter:image:alt" content="{{ ogImageAlt or (title + ' - ToolsBuilt') }}">
```

### Privacy & Analytics (Do Not Track)
The Google Analytics 4 tag (`G-QR15X9WS1J`) respects user privacy preferences by checking `navigator.doNotTrack` and `window.doNotTrack`. If DNT is set to `'1'`, `gtag('config')` is bypassed completely.

---

## 2. Title & Description Rules

Search engine result pages (SERPs) truncate snippet titles and meta descriptions that exceed standard pixel widths. Our automated audit suite (`scripts/check-seo.js`) enforces strict character boundaries on every indexable page:

| Field | Min Length | Max Length | Recommended | Rationale |
| :--- | :---: | :---: | :---: | :--- |
| `<title>` | 15 chars | 65 chars | 45–60 chars | Prevents truncation on desktop and mobile SERPs while preserving brand suffix. |
| `<meta name="description">` | 70 chars | 170 chars | 120–160 chars | Provides sufficient context for high CTR without ellipsis cutoff. |
| Canonical Tag | N/A | N/A | Exact match | Absolute URL starting with `https://toolsbuilt.com/` ending with trailing `/`. |

### Avoiding Double-Escaping
Nunjucks automatically escapes HTML entities when rendering `{{ title }}`. Do **not** use `&amp;` inside front matter or JSON titles; write clean `&` (e.g. `Free Date & Time Calculators | ToolsBuilt`).

---

## 3. Automated Social Cards

Open Graph and Twitter cards (1200x630 PNG) are generated at build time by [`scripts/generate-og-cards.js`](file:///home/umair/toolsbuilt/scripts/generate-og-cards.js) using Sharp and embedded SVG graphics with base64-encoded Inter Latin typography.

- **Storage Location:** `src/assets/og/<slug>.png` (copied to `_site/assets/og/<slug>.png`).
- **File Size Target:** Under 100 KB per card (achieved: 45 KB – 61 KB with level-9 PNG compression).
- **Design Tokens:** Obsidian dark palette (`#090a0f`), subtle accent glows per category, brand logo mark, pill badge, and trust badge strip.
- **Build Performance:** Cards are cached on disk; only modified or missing cards are re-rendered, keeping builds under 3 seconds.

---

## 4. Structured Data System (JSON-LD)

ToolsBuilt implements strict, honest structured data with **zero fabricated ratings, fake reviews, or invented awards**. The schema suite is verified on every build by [`scripts/check-schema.js`](file:///home/umair/toolsbuilt/scripts/check-schema.js).

### Supported Schemas

1. **`WebSite` (Homepage):**
   Includes honest `SearchAction` pointing to `https://toolsbuilt.com/?q={search_term_string}`. On homepage load, client-side JS (`src/assets/js/layout.js`) reads `?q=` from the URL and executes live filtering immediately.
2. **`Organization` (Homepage & `/about/`):**
   Declares name `ToolsBuilt`, official URL `https://toolsbuilt.com/`, and brand logo.
3. **`WebApplication` (All Tool Pages):**
   Includes `name`, `url`, `applicationCategory`, `operatingSystem: "Any"`, `browserRequirements`, `offers` (price: "0"), `inLanguage: "en-US"`, and `dateModified`.
4. **`BreadcrumbList` (All Pages):**
   Strictly consecutive positions `1..N` mapping site hierarchy (`Home > Category > Tool`).
5. **`CollectionPage` & `ItemList` (Category Hubs & `/tools/`):**
   Enumerates contained tools with direct URLs, names, and descriptions.
6. **`FAQPage` (Homepage, Category Hubs, Tool Pages):**
   Pairs each displayed FAQ question and accepted answer.

> [!CAUTION]
> Fabricating schema properties (such as fake `aggregateRating`, `reviewCount`, or `ratingValue` without genuine consumer reviews) violates Google Search Essentials guidelines and triggers algorithmic and manual spam penalties. Any forbidden fields fail the automated test suite immediately.

---

## 5. Crawlability, Click Depth & Architecture

ToolsBuilt guarantees that **every public page is reachable in $\le$ 3 clicks from the homepage**:

```
Homepage (Depth 0)
 │
 ├── All Tools Directory (/tools/) [Depth 1]
 │    └── All 10 Tools (/tools/<slug>/) [Depth 1]
 │
 ├── 5 Category Hubs (/category/<slug>/) [Depth 1]
 │    └── Categorized Tools [Depth 1]
 │
 └── Editorial Pages (/about/, /contact/, /privacy-policy/, /terms/) [Depth 1]
```

### Crawl Architecture Highlights
- **Global Header Mega-Menu:** Data-driven from `tools.json` and `categories.json`. Lists every category and top tools in pure HTML on every page.
- **Global Footer Directory:** Groups every category and tool link in the footer landmark.
- **Sticky Table of Contents:** On desktop tool pages, provides in-page anchors (`#main-content`, `#how-to-use-heading`, `#article-heading`, `#faq-heading`, `#related-tools-heading`).
- **Internal Trailing Slashes:** Every internal link strictly ends with a trailing slash `/` to eliminate 301 redirect hops.

---

## 6. Staging vs. Production Indexing Guardrails

To prevent search engines from accidentally indexing pre-production builds or pull requests, the build pipeline enforces strict environment separation:

| Setting | Non-Production / Staging (`SITE_ENV=development`) | Production (`SITE_ENV=production`) |
| :--- | :--- | :--- |
| `<meta name="robots">` | `<meta name="robots" content="noindex, nofollow">` | Omitted on public pages; `noindex, nofollow` only on `/design-system/` and `/404.html`. |
| `robots.txt` | `User-agent: *\nDisallow: /` | `User-agent: *\nAllow: /\nDisallow: /design-system/\nSitemap: https://toolsbuilt.com/sitemap.xml` |
| Canonical Domain | `https://toolsbuilt.com` | `https://toolsbuilt.com` |

---

## 7. IndexNow Manual Submission Protocol

ToolsBuilt supports the [IndexNow protocol](https://www.indexnow.org/) to instantly notify participating search engines (such as Microsoft Bing, Yandex, Naver, and Seznam) of newly published and updated URLs.

### Configuration & Key Verification
- Key is configured in `src/_data/indexnow.json`.
- Key file template is located at `src/indexnow-key.njk`, automatically generating `/<key>.txt` (e.g. `https://toolsbuilt.com/8f3b610c3b24479383637e7592cfdf36.txt`) at site build time.

### How to Run
Run manually after production deployments (**do NOT run in CI** to prevent spamming search engines or submitting test runs):

```bash
# Preview the submission payload without sending HTTP request:
npm run indexnow -- --dry-run

# Submit all production sitemap URLs to IndexNow:
npm run indexnow
```

---

## 8. GitHub Pages Limitations & Recommended Cloudflare Rules

GitHub Pages is a static file host that does **not** allow custom HTTP response headers (such as `X-Robots-Tag`, `Content-Security-Policy`, `Strict-Transport-Security`, or custom `Cache-Control` max-age headers).

### Recommended Cloudflare Configuration
When serving `toolsbuilt.com` through Cloudflare (free tier or Pro), configure the following **Transform Rules (Modify Response Header)**:

```http
# 1. Strict Transport Security (HSTS)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# 2. Content Security Policy (CSP)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; object-src 'none'; base-uri 'self'; form-action 'self';

# 3. Referrer Policy & Permissions
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Cache Optimization Rules
- **Static Assets (`/assets/*`):** `Cache-Control: public, max-age=31536000, immutable` (assets use content hashes).
- **HTML Pages (`/*`):** `Cache-Control: public, max-age=0, must-revalidate` (ensures instant deployment updates).

---

## 9. Adding New Tools & Categories Checklist

When adding a tool or category to ToolsBuilt, follow these steps to guarantee full technical SEO compliance:

1. **Register in `src/_data/categories.json` or `tools.json`:**
   - Provide `name`, `slug`, `category`, `description` (120–160 chars), `keywords`, and `updated` date (`YYYY-MM-DD`).
2. **Create Tool Directory:**
   - Create `src/tools/<slug>/index.njk`, `script.js`, and `style.css`.
   - Set front matter: `title` (30–60 chars), `description` (120–160 chars), `howto`, and `faqs`.
3. **Verify Heading IDs:**
   - Ensure the template has `<h2 id="how-to-use-heading">`, `<h2 id="article-heading">`, and `<h2 id="faq-heading">`.
4. **Run Build & Verification:**
   - Execute `npm test`.
   - Sharp automatically generates `src/assets/og/<slug>.png`.
   - `scripts/check-schema.js` validates structured data.
   - `scripts/check-seo.js` verifies links, click depth, metadata, and updates `docs/SEO_PAGE_REPORT.md`.

---

## 10. Post-Launch Search Console Verification Checklist

After deploying the production build to GitHub Pages and pointing `https://toolsbuilt.com`:

1. **Verify Ownership:**
   - Keep `google5758f81e977de6a2.html` accessible at `https://toolsbuilt.com/google5758f81e977de6a2.html`.
2. **Submit XML Sitemap:**
   - In Google Search Console > Sitemaps, submit `https://toolsbuilt.com/sitemap.xml`.
3. **Verify Robots.txt:**
   - Test `https://toolsbuilt.com/robots.txt` in the Search Console robots.txt tester. Ensure `/design-system/` is disallowed and `/` is allowed.
4. **Rich Results Testing:**
   - Run the [Google Rich Results Test](https://search.google.com/test/rich-results) on the homepage and a representative tool page (`/tools/age-calculator/`). Verify `WebSite`, `WebApplication`, `BreadcrumbList`, and `FAQPage` are recognized without errors.
5. **Inspect Live URLs:**
   - Inspect `https://toolsbuilt.com/` and request indexing.
   - Inspect `/tools/`, `/category/date-time/`, and `/tools/password-generator/`.
6. **Monitor Core Web Vitals:**
   - Verify LCP $\le$ 1.2s, INP $\le$ 50ms, and CLS = 0.
