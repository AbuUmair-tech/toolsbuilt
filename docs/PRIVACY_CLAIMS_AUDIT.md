# Privacy & Tracking Claims Audit

## Executive Summary
ToolsBuilt loads Google Analytics 4 (`G-QR15X9WS1J`) via Google Tag Manager (`https://www.googletagmanager.com/gtag/js?id=G-QR15X9WS1J`) in `src/_includes/layouts/base.njk`.
The tag respects `navigator.doNotTrack` and `window.doNotTrack` ('1').

Because web analytics is loaded on all pages, marketing claims such as "no tracking" or "zero tracking pixels" were audited and updated to strictly truthful copy:
- **Calculator privacy**: "Your inputs never leave your browser", "Calculations run entirely client-side"
- **Analytics disclosure**: Anonymous page traffic statistics are measured via Google Analytics (respecting Do Not Track).

---

## 1. Analytics Load Locations

| File | Line(s) | Exact Code / Content | Purpose |
|------|---------|----------------------|---------|
| `src/_includes/layouts/base.njk` | 72-82 | `<script async src="https://www.googletagmanager.com/gtag/js?id=G-QR15X9WS1J"></script>`<br>`<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); if (navigator.doNotTrack !== '1' && window.doNotTrack !== '1') { gtag('config', 'G-QR15X9WS1J'); }</script>` | Google Analytics 4 web traffic measurement (DNT-aware) |
| `index.html` (root legacy file) | 55-63 | Google Analytics script snippet | Legacy root redirect/fallback file |
| `404.html` (root legacy file) | 11-19 | Google Analytics script snippet | Legacy root redirect/fallback file |

---

## 2. All "Tracking" Mentions & Audit Status

| File | Line | Text / Claim | Audit Decision |
|------|------|--------------|----------------|
| `src/index.njk` | 49 | "Free, fast, and privacy-first web utilities designed to solve everyday calculations instantly—no signup, your inputs never leave your browser, and zero bloat." | **Accurate**: Claims browser-local execution and no signup; does not claim "no tracking". |
| `src/index.njk` | 233 | "All calculations run locally inside your browser. No inputs, form data, or generated passwords are ever sent across the wire." | **Accurate**: Accurately describes calculation isolation. |
| `src/index.njk` | 241 | "Zero JavaScript frameworks, client-side calculations where inputs never leave your browser, and zero forced account signups." | **Accurate**: Updated from previous "zero tracking pixels" to truthful statement. |
| `src/llms.txt.njk` | 14 | `- **Privacy by Design**: No account creation, client-side calculations, and zero storage of user inputs.` | **Accurate**: Updated to avoid "no tracking" ambiguity. |
| `src/design-system/index.njk` | 570 | `<span class="text-xs text-secondary mt-1">100% Free, client-side calculations</span>` | **Accurate**: Replaced "zero client tracking" with "client-side calculations". |
| `src/_includes/layouts/base.njk` | 93 | `<!-- Cookie consent banner placeholder (hidden by default).` | **Accurate**: Removed "(no tracking)" comment. |
| `src/tools/age-calculator/index.njk` | 130 | `Pediatric health tracking, vaccine schedules...` | **Unrelated**: Refers to pediatric medical milestone tracking by parents/doctors. |
| `src/tools/days-until-date-calculator/index.njk` | 100 | `Tracking time until an upcoming date is helpful...` | **Unrelated**: Refers to calendar schedule tracking by users. |

---

## 3. Privacy Policy & Terms Review

### Current State: `src/privacy-policy/index.njk`
- **Cookies & LocalStorage**: Mentions `localStorage` is used to remember light/dark theme preference. Mentions basic cookies.
- **Google AdSense**: Details third-party advertisement cookies and opt-out links via Google Ads Settings and www.aboutads.info.
- **Mismatch / Recommended Decision**:
  - The privacy policy currently discusses Google AdSense and advertising cookies, but does not explicitly name Google Analytics 4 (`G-QR15X9WS1J`).
  - As instructed by safety rules, Privacy Policy and Terms texts have **not** been modified in this branch. A future update should add a concise clause clarifying that Google Analytics 4 is used for aggregated traffic metrics and honors Do Not Track.

### Current State: `src/terms/index.njk`
- Covers acceptable use, limitation of liability for calculation outputs, and intellectual property. No privacy or tracking statements that conflict with actual site behavior.

---

## 4. Automated Verification Test
An automated build test in `scripts/test-all.js` verifies that:
1. When Google Analytics or Tag Manager is present in the build (`gtag.js` or `googletagmanager.com`), neither "no tracking" nor "zero tracking" appears anywhere in user-facing HTML.
2. Build fails immediately if any marketing text claims "no tracking" while analytics is active.
