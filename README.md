# ToolsBuilt (https://toolsbuilt.com)

**ToolsBuilt** is a fast, light, accessible static website offering free online calculators and web tools in English. Built with zero frameworks, external build tools, or third-party dependencies.

---

## 📁 Repository Structure

```
/
├── index.html                           # Home page with hero, live card search & tools grid
├── about/
│   └── index.html                       # About page detailing mission and accuracy standards
├── contact/
│   └── index.html                       # Contact page with email (abuumair2025@gmail.com)
├── privacy-policy/
│   └── index.html                       # Privacy policy for Google AdSense & CCPA/GDPR compliance
├── terms/
│   └── index.html                       # Terms of Service agreement page
├── assets/
│   ├── css/
│   │   └── style.css                    # Complete CSS design system, dark mode & components
│   ├── js/
│   │   └── common.js                    # Shared JS (Theme toggle, mobile drawer, search, accordion)
│   └── img/
│       └── favicon.svg                  # Custom SVG site icon
├── tools/
│   └── days-until-date-calculator/
│       ├── index.html                   # Tool UI, 700+ word article, FAQ accordion & JSON-LD
│       └── script.js                    # Tool logic (Local midnight calculation)
├── sitemap.xml                          # XML Sitemap listing all pages
├── robots.txt                           # Search engine instructions pointing to sitemap.xml
├── 404.html                             # Custom 404 error page
├── CNAME                                # GitHub Pages / hosting domain setup (toolsbuilt.com)
└── README.md                            # Documentation & local testing instructions
```

---

## 🎨 Design & Technical Features

- **Zero External Dependencies**: Pure HTML5, CSS3, and Vanilla JavaScript (ES6+). No frameworks, no external fonts (system font stack), and no remote scripts.
- **Design System**: Max-width `1100px`, indigo accent `#4f46e5`, system font stack (`Inter`, `system-ui`, `-apple-system`, `Segoe UI`, `Roboto`), rounded cards (`16px`), and soft shadows.
- **Theme Support**: Automatic system dark mode detection (`prefers-color-scheme`) paired with a persistent header toggle (`localStorage`).
- **Clean Absolute URLs**: All internal links use root-relative absolute paths (e.g. `/tools/days-until-date-calculator/`).
- **SEO & Schema Data**: Standardized Open Graph, Twitter cards, and JSON-LD schemas (`WebApplication`, `BreadcrumbList`, `FAQPage`).
- **AdSense Ready**: Comprehensive privacy disclosures, contact mailto link, and designated structural comment placements (`<!-- AdSense Placement -->`).

---

## 🚀 How to Run & Test Locally

Because internal links rely on root absolute paths (e.g., `/tools/days-until-date-calculator/`), serve the root folder using a standard local HTTP server rather than opening `.html` files directly via `file://`.

### Method 1: Python HTTP Server (Built-in)
Run the following command in the root directory:
```bash
python3 -m http.server 8000
```
Then open your web browser to:
[http://localhost:8000](http://localhost:8000)

### Method 2: Node.js `serve` / `npx http-server`
```bash
npx http-server -p 8000
```

---

## 🧩 How to Add New Tools

To add a new calculator or utility to ToolsBuilt:

1. Create a new folder inside `/tools/`, e.g. `/tools/age-calculator/`.
2. Create `index.html` inside the folder following the template of `/tools/days-until-date-calculator/index.html`.
3. Create `script.js` inside the tool folder for your tool's isolated logic.
4. Add a new tool card in `/index.html` within the `#tools-grid` container.
5. Add the new tool URL to `/sitemap.xml`.
