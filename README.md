# ToolsBuilt

**[toolsbuilt.com](https://toolsbuilt.com)** — Free online calculators and tools built with plain HTML, CSS, and vanilla JavaScript. No frameworks, no build steps, no tracking.

---

## Project Structure

```
/
├── index.html                        # Home page (all tool categories)
├── about/index.html
├── contact/index.html
├── privacy-policy/index.html
├── terms/index.html
├── 404.html
├── sitemap.xml
├── robots.txt
├── CNAME                             # toolsbuilt.com
├── .nojekyll                         # Disables Jekyll processing on GitHub Pages
├── assets/
│   ├── css/style.css                 # Global design system & component styles
│   ├── js/
│   │   ├── common.js                 # Theme toggle, mobile nav, search, icon injection
│   │   ├── icons.js                  # SVG icon registry (window.ICONS)
│   │   └── tools-data.js             # Tool registry with categories and related tools
│   └── img/
│       ├── favicon.svg
│       ├── apple-touch-icon.png
│       └── og-image.svg
├── tools/
│   ├── days-until-date-calculator/   # Date & Time
│   ├── date-difference-calculator/   # Date & Time
│   ├── add-days-to-date-calculator/  # Date & Time
│   ├── age-calculator/               # Date & Time
│   ├── percentage-change-calculator/ # Math
│   ├── discount-calculator/          # Math
│   ├── word-counter/                 # Text
│   ├── text-case-converter/          # Text
│   ├── password-generator/           # Security
│   └── random-name-picker/           # Fun & Random
└── scripts/
    └── check-links.js                # Zero-dependency link audit script
```

---

## Adding a New Tool (5-Step Guide)

1. **Register the tool** in `assets/js/tools-data.js` — add an entry with `id`, `name`, `url`, `icon`, `description`, `category`, `categoryId`, and `related` array.

2. **Choose or create an icon** — open `assets/js/icons.js` and add a new 24×24 SVG string under the appropriate icon name.

3. **Create the folder** — create `/tools/your-tool-name/` with two files: `index.html` and `script.js`.

4. **Build the HTML** — follow the pattern of an existing tool. Required elements:
   - `<a href="#main-content" class="skip-link">` immediately after `<body>`
   - `<main id="main-content">`
   - One `<h1>` only
   - `<link rel="canonical">` pointing to the tool's absolute URL
   - `<meta name="description">` under 155 characters
   - Quick Answer Box (`.quick-answer-box`)
   - Key Facts Box (`.key-facts-box`)
   - 5 FAQs using `<details>/<summary>` pattern
   - JSON-LD schemas: `WebApplication`, `BreadcrumbList`, `HowTo`, `FAQPage`
   - Last updated line (`.last-updated`)
   - Related tools section (3 tools, hardcoded or dynamic via `tools-data.js`)

5. **Update global files**:
   - Add a card to the correct category section in `index.html`
   - Add the URL to `sitemap.xml`
   - Add the tool to the footer "Popular Tools" if applicable

---

## Running the Link Checker

The zero-dependency link auditor crawls all `.html` files and checks for:
- Broken internal links
- Missing `<title>` tags
- Missing `<meta name="description">`
- Duplicate `<title>` values
- Pages with 0 or 2+ `<h1>` tags
- Missing `<link rel="canonical">`
- Invalid JSON-LD blocks

```bash
node scripts/check-links.js
```

Expected output when all is well:
```
=== ToolsBuilt Link Checker ===
Scanning 16 HTML files...
All checks passed! No errors or warnings found.
```

---

## Running Locally

No build step required. Serve with any static server:

```bash
# Python 3 (simplest)
python3 -m http.server 8080

# Or Node.js
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Deployment (GitHub Pages)

1. Push to the `main` branch of your GitHub repository.
2. Go to **Settings → Pages → Source** → set to `main` branch, root `/`.
3. The `CNAME` file handles the custom domain `toolsbuilt.com`.
4. The `.nojekyll` file prevents GitHub from running Jekyll preprocessing.
5. DNS: Add a `CNAME` record pointing `toolsbuilt.com` → `<your-username>.github.io`.

---

## Ads Note

When Google AdSense is approved, add your AdSense script tag in the `<head>` and replace `<!-- ad placement -->` comments with `<ins class="adsbygoogle">` blocks. The `.ad-placement` containers have a `min-height: 90px` to prevent Cumulative Layout Shift (CLS).

For EEA/UK compliance, Google's certified CMP will replace the `#cookie-consent-banner` placeholder div.

---

## Tech Stack

- **HTML5** semantic markup
- **Vanilla CSS** (custom properties / design tokens, no Tailwind or Bootstrap)
- **Vanilla JavaScript** (ES2020+, no frameworks, no npm dependencies)
- **Web Crypto API** — used by password generator and random name picker for cryptographically secure randomness

---

## Privacy

All tools run entirely in the browser. No user input is ever sent to external servers. No cookies are set by the site itself.
