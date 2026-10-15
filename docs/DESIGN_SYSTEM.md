# ToolsBuilt Design System Guide

A modern, fast, accessible, and theme-aware design system engineered for **ToolsBuilt** (Eleventy v3, vanilla CSS/JS, zero client frameworks).

---

## 1. Aesthetic Direction & Principles

- **Utility-Product Polish:** Inspired by the restrained elegance and calm utility of Linear, Vercel, and Raycast. Every tool feels like high-precision desktop software rendered in the browser.
- **Generous Whitespace & Crisp Typography:** Strict 4px spatial rhythm, fluid type scale using CSS `clamp()`, and self-hosted Inter Variable font.
- **Confident Accent Color:** A distinctive Iris/Indigo brand hue (`#4f46e5` in light mode, `#6366f1` in dark mode) paired with 12-step neutral scales.
- **Subtle Depth:** Soft, layered, theme-aware box shadows with subtle hover lift and luminous focus/glow states.
- **Mobile-First & Touch Target Compliance:** Minimum 44px hit-box on all interactive elements.
- **Zero Framework Bloat:** Self-hosted variable font (woff2), hand-crafted SVG sprite, lightningcss minification, yielding under **10 KB gzipped** main stylesheet.

---

## 2. CSS Cascade Layers (`@layer`)

All styles are organized into 5 CSS cascade layers to prevent specificity wars:

```css
@layer tokens, base, layout, components, utilities;
```

1. **`tokens`** (`src/assets/css/tokens.css`): Custom properties for colors, typography, spacing, radius, shadows, z-index, and transitions.
2. **`base`** (`src/assets/css/base.css`): Modern reset, `color-scheme` support, accessible `:focus-visible` rings, custom scrollbars, and print styles.
3. **`layout`** (`src/assets/css/layout.css`): Layout primitives: `.container`, `.stack`, `.cluster`, `.grid-auto-fit`, `.sidebar-layout`, and skip link.
4. **`components`** (`src/assets/css/components.css`): Buttons, form inputs, input groups, switches, slider, cards, calculator result panels, badges, accordions, and tables.
5. **`utilities`** (`src/assets/css/utilities.css`): Single-purpose classes like `.tabular-nums`, text alignments, margins, and visibility helpers.

---

## 3. Design Tokens Reference

### Color Palette

#### Neutral Scale (12 Steps)
| Step | Light Role | Dark Role |
| :--- | :--- | :--- |
| `--neutral-1` | Pure canvas base (`#ffffff`) | Deep dark canvas (`#090d16`) |
| `--neutral-2` | Body surface background (`#f8fafc`) | Body canvas (`#0f172a`) |
| `--neutral-3` | Muted background / panels (`#f1f5f9`) | Card background (`#161f33`) |
| `--neutral-4` | Subtle borders (`#e2e8f0`) | Card hover surface (`#1e293b`) |
| `--neutral-5` | Border hover state (`#cbd5e1`) | Dark border subtle (`#334155`) |
| `--neutral-6` | Placeholders & subtle icons (`#94a3b8`) | Border hover (`#475569`) |
| `--neutral-7` | High-contrast UI borders (`#768396`) | High-contrast UI border (`#64748b`) |
| `--neutral-8` | Muted secondary text (`#475569`) | Subtle text (`#94a3b8`) |
| `--neutral-9` | Subtitle text (`#334155`) | Secondary text (`#cbd5e1`) |
| `--neutral-10` | Headings & dark surface borders (`#1e293b`) | Light secondary text (`#e2e8f0`) |
| `--neutral-11` | Primary text (`#0f172a`) | Primary light text (`#f8fafc`) |
| `--neutral-12` | Obsidian contrast base (`#090d16`) | Pure white highlight (`#ffffff`) |

#### Brand Iris Accent Scale (12 Steps)
- Primary Light: `--accent-primary: #4f46e5` (Contrast 6.29:1 with white text)
- Primary Dark: `--accent-primary: #6366f1` (Contrast 6.29:1 with dark canvas)
- Subtle Tints: `--accent-1` through `--accent-3` for backgrounds, tags, and active states.

#### Semantic States
- **Success:** `--color-success-bg`, `--color-success-border`, `--color-success-text` (Emerald)
- **Warning:** `--color-warning-bg`, `--color-warning-border`, `--color-warning-text` (Amber)
- **Danger:** `--color-danger-bg`, `--color-danger-border`, `--color-danger-text` (Rose)
- **Info:** `--color-info-bg`, `--color-info-border`, `--color-info-text` (Sky)

#### 6 Category Accent Scales
- **Date & Time:** `--cat-date-bg`, `--cat-date-border`, `--cat-date-color` (Indigo/Blue)
- **Math & Finance:** `--cat-math-bg`, `--cat-math-border`, `--cat-math-color` (Emerald)
- **Text & Writing:** `--cat-text-bg`, `--cat-text-border`, `--cat-text-color` (Amber)
- **Security & Dev:** `--cat-security-bg`, `--cat-security-border`, `--cat-security-color` (Rose)
- **Fun & Chance:** `--cat-fun-bg`, `--cat-fun-border`, `--cat-fun-color` (Purple)
- **Developer / Utilities (Spare):** `--cat-dev-bg`, `--cat-dev-border`, `--cat-dev-color` (Teal)

---

### Typography

- **Primary Font:** Self-hosted `Inter Variable` (`src/assets/fonts/inter-latin-wght-normal.woff2`), preloaded in `<head>`.
- **CLS Mitigation:** `Inter Fallback` `@font-face` configured with `size-adjust: 107.5%`, `ascent-override: 90%`, and `descent-override: 22.5%`.
- **System Mono:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
- **Fluid Type Scale (12 steps):**
  - `--font-size-2xs`: `0.625rem` (10px)
  - `--font-size-xs`: `clamp(0.6875rem, 0.65rem + 0.18vw, 0.75rem)` (11px -> 12px)
  - `--font-size-sm`: `clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)` (13px -> 14px)
  - `--font-size-base`: `clamp(0.9375rem, 0.9rem + 0.19vw, 1rem)` (15px -> 16px)
  - `--font-size-md`: `clamp(1.0625rem, 1.01rem + 0.26vw, 1.125rem)` (17px -> 18px)
  - `--font-size-lg`: `clamp(1.1875rem, 1.11rem + 0.39vw, 1.25rem)` (19px -> 20px)
  - `--font-size-xl`: `clamp(1.3125rem, 1.21rem + 0.52vw, 1.5rem)` (21px -> 24px)
  - `--font-size-2xl`: `clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem)` (24px -> 30px)
  - `--font-size-3xl`: `clamp(1.75rem, 1.51rem + 1.2vw, 2.25rem)` (28px -> 36px)
  - `--font-size-4xl`: `clamp(2rem, 1.66rem + 1.7vw, 2.75rem)` (32px -> 44px)
  - `--font-size-5xl`: `clamp(2.375rem, 1.85rem + 2.6vw, 3.5rem)` (38px -> 56px)
  - `--font-size-display`: `clamp(2.75rem, 2rem + 3.75vw, 4.5rem)` (44px -> 72px)
- **Tabular Digits:** Use `.tabular-nums` on calculation results, metrics, and data tables.

---

### Spacing Scale (4px Base)

`--space-0` (0) | `--space-1` (4px) | `--space-2` (8px) | `--space-3` (12px) | `--space-4` (16px) | `--space-5` (20px) | `--space-6` (24px) | `--space-8` (32px) | `--space-10` (40px) | `--space-12` (48px) | `--space-16` (64px) | `--space-20` (80px) | `--space-24` (96px)

---

## 4. Components Reference

### Buttons
- Classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-copy`
- Sizes: `.btn-sm` (36px), `.btn-md` (44px default), `.btn-lg` (48px)
- State modifier: `.btn-loading` (renders pure CSS spinner)

### Form Controls
- Text / Numbers / Dates: `.form-input`
- Select: `.form-select`
- Textarea: `.form-textarea`
- Unit Prefix/Suffix: Wrap with `.input-group`:
  ```html
  <div class="input-group">
    <span class="input-prefix">$</span>
    <input type="number" class="form-input">
  </div>
  ```
- Toggle Switch:
  ```html
  <label class="switch">
    <input type="checkbox">
    <span class="switch-track"><span class="switch-thumb"></span></span>
    <span>Label text</span>
  </label>
  ```

### Calculator Result Panel
Features large tabular primary numbers, secondary metric grid, copy button slot, and an accessible update cue:
```html
<div class="result-box is-updated">
  <div class="copy-btn-slot">
    <button class="btn btn-copy btn-sm" onclick="ToolsBuilt.copy('...')">Copy</button>
  </div>
  <div class="result-title">Result</div>
  <div class="result-value">42.00%</div>
  <div class="result-secondary metrics-grid">
    <div class="result-metric">
      <span class="result-metric-label">Difference</span>
      <span class="result-metric-val">+$12.50</span>
    </div>
  </div>
</div>
```

### Micro-Helpers (`src/assets/js/ui.js`)
- `ToolsBuilt.toast(message)`: Triggers non-intrusive toast with ARIA live region announcement.
- `ToolsBuilt.copy(text, successMessage)`: Copies to clipboard and announces to screen readers.

### Icon System
- Hand-authored 24px stroke SVG sprite at `src/assets/icons.svg`.
- Nunjucks macro:
  ```njk
  {% import "partials/icon.njk" as icons %}
  {{ icons.icon("calculator", "custom-class", 20) }}
  ```
- Client-side injection: `<span data-icon="calculator"></span>` backed by `window.ICONS`.

---

## 5. How to Add a New Component

1. Define the HTML structure adhering to semantic elements (e.g. `<details>` for expandable disclosures, `<button>` for actions).
2. Place styles in `src/assets/css/components.css` inside the `@layer components` block.
3. Use tokens for every color, radius, spacing, shadow, and font property (`var(--...)`). Never hardcode hex values.
4. Ensure dark mode styles are supported through token inheritance (`--surface-*`, `--border-*`, `--text-*`).
5. Ensure a minimum 44px touch target on mobile (`min-height: var(--touch-target-min)`).
6. Verify WCAG AA contrast by running `npm test`.
7. Add an interactive showcase entry to `src/design-system/index.njk`.

---

## 6. Do's and Don'ts

| Do | Don't |
| :--- | :--- |
| Use `var(--font-mono)` and `.tabular-nums` for calculator results. | Don't use proportional numerals for numerical data comparisons. |
| Use `.input-group` with `.input-prefix` or `.input-suffix` for units. | Don't bake unit labels inside placeholder text alone. |
| Use `<details class="accordion">` for new FAQ accordions. | Don't write complex JavaScript for basic expandable disclosures. |
| Use `ToolsBuilt.copy(text)` and `ToolsBuilt.toast(msg)`. | Don't use disruptive `alert()` modals. |
| Keep all non-essential animation wrapped in `prefers-reduced-motion` overrides. | Don't use unconstrained infinite CSS animations. |
| Use semantic tokens (`--surface-card`, `--border-subtle`). | Don't use raw CSS utility frameworks or Tailwind classes. |

---

## 7. Testing & Quality Assurance

Run the automated test suite:
```bash
npm test
```
The suite verifies:
1. **WCAG AA Contrast Check:** Every token text/background pair meets >= 4.5:1 (>= 3:1 for borders).
2. **CSS Size Budget Check:** The bundled main CSS must be under 30 KB gzipped (currently ~9.1 KB).
3. **Design System Security Check:** `/design-system/` must always have `noindex, nofollow` in both staging and production, and be absent from `sitemap.xml` and navigation links.
4. **Eleventy Parity Check:** Verifies 100% metadata and SEO parity for existing tools.
