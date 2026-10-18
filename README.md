# ToolsBuilt

> Free, fast, privacy-first online calculators & tools. All tools run entirely in the browser — no uploads, no server processing.

🌐 **Live Site:** [https://toolsbuilt.com](https://toolsbuilt.com)

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Static Site Generator** | [Eleventy (11ty) v3](https://www.11ty.dev/) | Modern, zero-config-runtime static compiler |
| **Templating** | [Nunjucks](https://mozilla.github.io/nunjucks/) | Extensible layouts, filters, and partial inheritance |
| **Styling** | Vanilla CSS | Custom responsive design system with CSS custom properties (no CSS framework) |
| **Client-Side Scripting** | Vanilla JavaScript (ES6+) | Native browser Web APIs, zero client runtime frameworks |
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

---

## Project Structure

```
src/
├── _data/           # Global data files
│   ├── site.json    # Site configuration
│   ├── tools.json   # Tool registry (single source of truth)
│   └── categories.json  # Category definitions
├── _includes/
│   ├── layouts/     # Nunjucks layouts
│   │   ├── base.njk    # Base HTML shell
│   │   ├── tool.njk    # Tool page layout
│   │   └── page.njk    # Generic page layout
│   └── partials/    # Reusable components
│       ├── header.njk
│       ├── footer.njk
│       ├── breadcrumbs.njk
│       └── related-tools.njk
├── assets/
│   ├── css/style.css    # Global stylesheet
│   ├── js/              # Shared JavaScript
│   └── img/             # Images & icons
├── tools/           # One folder per tool
│   └── [slug]/
│       ├── index.njk    # Tool template
│       ├── script.js    # Tool logic (client-side)
│       └── style.css    # Tool-specific styles (optional)
├── index.njk        # Homepage
├── 404.njk          # 404 page
├── sitemap.xml.njk  # Auto-generated sitemap
└── robots.txt.njk   # Environment-conditional robots.txt
scripts/             # Build & test scripts
├── check-links.js   # Link & quality checker
├── test-all.js      # Full test suite
├── parity-check.js  # Migration parity checker
└── generate-assets.js  # One-off asset generation
docs/                # Documentation
├── AUDIT.md
├── ARCHITECTURE_PLAN.md
├── TOOLS_BACKLOG.md
└── MIGRATION_REPORT.md
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
title: "Tip Calculator - Split Bills & Calculate Tips Fast"
description: "Free online tip calculator. Calculate tip amounts and split bills between multiple people."
ogTitle: "Tip & Bill Split Calculator"
ogDescription: "Calculate tip amounts and split bills instantly in your browser."
howto:
  name: "How to Calculate a Tip and Split a Bill"
  description: "Step-by-step guide to calculating tip amounts and per-person totals."
  steps:
    - name: "Enter Bill Amount"
      text: "Input total pre-tax or post-tax bill."
    - name: "Select Tip Percentage"
      text: "Choose a preset percentage or enter a custom rate."
    - name: "Split the Bill"
      text: "Specify the number of people sharing the check."
faqs:
  - q: "How is the tip calculated?"
    a: "Tip amount is calculated by multiplying the bill total by the tip percentage."
  - q: "Is my payment information saved?"
    a: "No. All calculations run client-side in your browser. No data is stored or transmitted."
---

<!-- Tool Form and Results UI -->
<div class="info-callout" style="margin-top: 0; margin-bottom: 2rem;">
  <h3 style="font-size: 1.05rem; margin-bottom: 0.35rem; color: var(--primary);">Quick Answer</h3>
  <p style="margin-bottom: 0;">Calculate standard 15%, 18%, or 20% tips and split bills across any number of people.</p>
</div>

<section class="tool-container" aria-label="Tip Calculator">
  <!-- Calculator controls & output markup -->
</section>
```

### 3. Create the Client-Side Script (`src/tools/[slug]/script.js`)
Implement the tool's interactive calculation logic in pure client-side JavaScript. Ensure calculation results update accessible ARIA regions (`aria-live="polite"`).

### 4. Create Tool-Specific Styles (Optional: `src/tools/[slug]/style.css`)
If the tool requires bespoke styling not covered by global styles in `assets/css/style.css`, add `style.css` in the tool directory. Eleventy automatically passes it through to the output build.

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

- **On PR to `staging` and push to `staging`:**
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
