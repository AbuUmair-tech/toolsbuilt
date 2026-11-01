# ToolsBuilt translation guide

How to translate ToolsBuilt into a new language, and the quality rules every translation follows.
English in `src/_data/i18n/**/en*` is the source. A translation only contains text: URLs, ids
and other data always come from English.

## Workflow

1. Export the strings a language needs, as flat `"key path": "English text"` files:
   ```bash
   node scripts/i18n-strings.js export es all --out i18n-export
   ```
   Add `--missing` to list only strings the language does not have yet (after English changes).
2. Translate the values. Never change the keys.
3. Import each file back (this writes `src/_data/i18n/ui/es.json`, `tools/es/<slug>.json`,
   `pages/es/<page>.json`):
   ```bash
   node scripts/i18n-strings.js import es i18n-export/es/tools/age-calculator.json tools/age-calculator.json
   node scripts/i18n-strings.js import es i18n-export/es/ui.json ui
   ```
4. Check, and fix everything it reports as an error:
   ```bash
   node scripts/check-translations.js --lang es
   ```
   Errors: missing keys, broken placeholders or HTML tags, missing plural forms, titles over 60 or
   descriptions over 155 characters. Warnings (text identical to English, numbers in worked
   examples that differ) must be reviewed; they are fine only for names that stay the same.
5. Enable the language in `src/_data/languages.json` once it passes.

## Quality rules

### Write like a native speaker
- Natural text for a general audience, not word-for-word. Rephrase sentences so they read well,
  keeping the meaning, facts and tone (friendly, plain, confident).
- Use the words people in that language actually search for. Put the language's main search
  term for the tool in the `title`, `h1`, `description` and `quickAnswer`. Examples:

  | Language | "percentage calculator" |
  |---|---|
  | Spanish | calculadora de porcentaje |
  | Portuguese (Brazil) | calculadora de porcentagem |
  | French | calculateur de pourcentage |
  | German | Prozentrechner |
  | Indonesian | kalkulator persentase |
  | Hindi | प्रतिशत कैलकुलेटर |
  | Arabic | حاسبة النسبة المئوية |
  | Urdu | فیصد کیلکولیٹر |

- `listing.keywords` are search terms: write the terms people use in that language (they do not
  have to be translations of the English keywords).

### Language variants
- **es**: neutral international Spanish (understood in Spain and Latin America); `usted` is not
  needed, address the reader with `tú`.
- **pt**: Brazilian Portuguese (pt-BR spelling and vocabulary: "arquivo", "celular", "você"),
  language code stays `pt`.
- **fr**: standard French, `vous`.
- **de**: standard German, `du` for UI and instructions (common for web tools), consistent everywhere.
- **id**: standard Indonesian (Bahasa Indonesia baku but not stiff), `Anda`.
- **hi**: simple everyday Hindi in Devanagari. Keep common English tech words that Hindi speakers
  use (कैलकुलेटर, ऑनलाइन, ब्राउज़र, पासवर्ड, टूल) instead of rare Sanskrit coinages.
- **ar**: Modern Standard Arabic. Right-to-left: write sentences naturally; numbers stay as
  Western digits (0-9) exactly as in English.
- **ur**: standard Urdu in Urdu script (Nastaliq-friendly; never Roman Urdu). Numbers stay as
  Western digits.

### Never change
- Numbers, formulas, units and results in worked examples and steps. Translate the meaning of an
  example ("Revenue increase") but keep every number, sign and unit exactly. The checker warns
  when numbers in worked examples differ.
- URLs and link targets (`href`), ids, codes.
- Placeholders: `{{count}}`, `{{name}}`, `%s`. Keep each one exactly once (you may move it).
- HTML tags: keep every tag (`<strong>`, `<a href="...">`, `<span class="text-accent">*</span>`)
  and its attributes; translate only the text between tags. Entities such as `&amp;` stay
  entities.
- Glossary terms in `src/_data/i18n/glossary.json` `doNotTranslate` (ToolsBuilt, JSON, SQL, XML,
  YAML, UUID, SHA-256, Base64, JWT, CGPA, GPA, EMI, SIP, GST, VAT, BISE, HEC, FBR, ISO 8601,
  Unix, tola). Use the `preferred` translations once they are filled in.
- Data of country-specific tools (tax slabs, rates, dates). Translate their text like any page.

### Length limits (characters, not bytes)
- `title` ≤ 60 characters, `description` ≤ 155 characters. Shorten wording, never cut a sentence.

### Plurals
Plural keys have one entry per plural category of the language (e.g. Arabic: zero, one, two,
few, many, other). The export lists the ones your language needs; write each form correctly.

### Legal pages
Privacy policy, terms and disclaimer are translated faithfully (no rewriting of obligations).
The page shows the `legal.translationNote` line on top: "This translation is provided for
convenience; the English version prevails." (translated).

### Code and samples
Code samples, sample JSON/HTML, lorem ipsum and parser messages stay as they are.
