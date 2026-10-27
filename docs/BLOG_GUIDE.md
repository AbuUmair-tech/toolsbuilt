# ToolsBuilt Blog Authoring & Tooling Guide

This guide describes the editorial workflow, front matter specifications, writing checklist, and SEO validation tooling for the ToolsBuilt blog (`src/blog/`).

> [!IMPORTANT]
> All blog posts on ToolsBuilt are authored exclusively by the site owner (**Abu Umair**). Do NOT generate automated blog posts. Use the tooling below to scaffold, preview, validate, and publish posts.

---

## 1. Editorial Workflow: Lifecycle of a Post

### Step 1: Scaffold a New Post Draft
Use the automated scaffolding script:
```bash
npm run new-post -- "<Post Title>" <tool-slug>
```

**Example:**
```bash
npm run new-post -- "How to Calculate Percentage Change in 3 Steps" percentage-change-calculator
```

This creates `src/blog/<slugified-title>.md` populated with:
- `title`: The formatted title string
- `description: "" # 140-155 chars`: Empty meta description with recommended character length annotation
- `date`: Today's date (`YYYY-MM-DD`)
- `updated`: Today's date (`YYYY-MM-DD`)
- `tool`: Validated against `src/_data/tools.json`
- `faqs`: 3 empty FAQ items (`question` and `answer`)
- `draft: true`: Keeps the post unpublished
- Skeleton of required H2 sections:
  1. `## Quick answer`
  2. `## How it works / formula`
  3. `## Worked example`
  4. `## Common mistakes`
  5. `## FAQ`
  6. `## Try the tool`

### Step 2: Write the Content
Draft the content following the **Writing Checklist** in Section 2 below.

### Step 3: Preview the Draft
Start the local development server:
```bash
npm run dev
# or
npm run build
```
- While `draft: true`, the post renders locally and on staging with a visible yellow **DRAFT** banner.
- Staging builds are protected with `<meta name="robots" content="noindex, nofollow">`.
- Draft posts are excluded from `collections.post`, `sitemap.xml`, `feed.xml`, `llms.txt`, and the blog index during production builds (`build:prod`).

### Step 4: Publish the Post
1. In the front matter of `src/blog/<post>.md`, change:
   ```yaml
   draft: false
   ```
2. Verify all quality and technical SEO constraints pass:
   ```bash
   node scripts/check-seo.js
   # or run the full suite:
   npm test
   ```
3. Build for production:
   ```bash
   npm run build:prod
   ```

### Step 5: Update an Existing Post
Whenever updating an existing published post with new examples, refreshed figures, or revisions:
1. Update the content in `src/blog/<post>.md`.
2. Bump the `updated` date in the front matter to today's date (`updated: YYYY-MM-DD`):
   ```yaml
   updated: 2026-11-15
   ```
3. Run `npm test` and `npm run build:prod` to deploy.

---

## 2. Writing Checklist

Every published post must satisfy this checklist before running `build:prod`:

- [ ] **Original Examples Computed by Hand**:
  Compute all numbers and step-by-step calculations manually. Do not use generic AI-generated arithmetic; show the exact manual steps.
- [ ] **No Invented Statistics**:
  Never cite fake survey numbers, unsourced industry averages, or speculative metrics (e.g., avoid "85% of people do this"). Stick to mathematical facts and official reference formulas.
- [ ] **Short Quick-Answer at the Top**:
  Under `## Quick answer`, provide a direct 2–3 sentence answer that immediately resolves the user's intent without preamble.
- [ ] **Link to the Tool 3 Times**:
  1. Once early in the intro / quick answer.
  2. Once in the worked example demonstrating how the inputs map to the tool.
  3. Once in the `## Try the tool` section or CTA box.
- [ ] **Internal Links to at Least 2 Other Pages**:
  Link naturally to related calculators, category hub pages (e.g., `/category/math-finance/`), or other guides.
- [ ] **Front Matter Length Constraints**:
  - `title`: 30 to 60 characters.
  - `description`: 120 to 160 characters (action-oriented summary).
  - `tool`: Must match an active slug in `src/_data/tools.json`.
  - `faqs`: At least 3 non-empty, practical questions and answers.
- [ ] **Length & Substance**:
  - At least 600 words of original, comprehensive content.
- [ ] **No Placeholder Text**:
  - Must not contain `TODO`, `VERIFY`, or lorem ipsum filler text.

---

## 3. Suggested Post Ideas for the 13 Tools

The table below outlines 10 high-value blog post concepts covering all 13 tools (percentage, GPA, grade, unit conversion, EMI, SIP, compound interest, JSON, Base64, URL encoding, UUID, SHA-256, and Lorem Ipsum):

| # | Suggested Post Title | Target Keyword | Linked Tool Slug | One-Line Angle |
| :---: | :--- | :--- | :--- | :--- |
| **1** | How to Calculate Percentage: 3 Everyday Formulas | how to calculate percentage formula | `percentage-calculator` | Breaks down value-of-total, percentage increase, and percentage decrease with manual step-by-step arithmetic. |
| **2** | How to Calculate College GPA on a 4.0 Scale | how to calculate college gpa | `gpa-calculator` | Explains weighted credit hours, letter-grade honor points, and cumulative semester GPA with a worked student transcript. |
| **3** | What Score Do I Need on My Final to Pass? | final grade calculator formula | `grade-calculator` | Demonstrates the weighted course category formula so students can calculate the exact target score required on their final exam. |
| **4** | Metric to Imperial Conversions: Formulas and Traps | metric to imperial conversion factors | `unit-converter` | Covers essential length, mass, and temperature conversion factors with mental math shortcuts and rounding rules. |
| **5** | How Loan EMI is Calculated: The Reducing Balance Equation | how loan emi is calculated formula | `loan-emi-calculator` | Unpacks the reducing-balance monthly compounding equation to show how monthly installments split between principal and interest. |
| **6** | The Math of SIP: How Regular Monthly Investing Compounds | sip return calculation formula | `sip-calculator` | Walks through the future value annuity formula for systematic investment plans with realistic inflation and duration scenarios. |
| **7** | Compound vs Simple Interest: Compounding Frequencies | compound interest formula explained | `compound-interest-calculator` | Compares annual, monthly, and daily compounding using $A = P(1 + r/n)^{nt}$ and demonstrates the Rule of 72. |
| **8** | Common JSON Syntax Errors and How to Fix Them | json syntax errors fix | `json-formatter` | A developer troubleshooting guide covering unquoted keys, single quotes, trailing commas, and valid RFC 8259 syntax. |
| **9** | Base64 vs URL Encoding: When and How to Use Each | base64 vs url encoding differences | `base64-encoder-decoder` | Compares 6-bit binary byte packing in Base64 with percent-encoding in URL query strings, linking both utilities. |
| **10** | UUID v4 vs SHA-256: Random IDs vs Cryptographic Hashes | uuid v4 vs sha256 differences | `uuid-generator` | Explains 128-bit pseudo-random entropy for unique keys versus 256-bit one-way hashes for tamper-proof data integrity. |

*(Note: Tool slugs for text utilities such as `lorem-ipsum-generator`, `url-encoder-decoder`, and `hash-generator` are referenced within developer workflows in guides 8, 9, and 10).*

---

## 4. Automated SEO Verification (`check-seo.js`)

When you run `node scripts/check-seo.js` or `npm test`, the audit checks every published (non-draft) post in `src/blog/`:

1. **Title Length**: Verifies between 30 and 60 characters.
2. **Description Length**: Verifies between 120 and 160 characters.
3. **Tool Existence**: Verifies that `tool` references an existing tool in `src/_data/tools.json`.
4. **Word Count**: Verifies at least 600 words of body copy.
5. **Internal Links**: Verifies at least 3 valid internal links within the domain.
6. **Tool Link**: Verifies at least one explicit link directly to `/tools/<tool-slug>/`.
7. **Clean Copy**: Verifies zero instances of `TODO`, `VERIFY`, or lorem ipsum filler text.
8. **FAQs**: Verifies `faqs` is present with valid, non-empty question and answer pairs.

Draft posts (`draft: true`) are skipped during this audit to allow work-in-progress drafting, while non-draft posts must pass with zero errors.
