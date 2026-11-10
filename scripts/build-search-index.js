const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const i18nData = require('./i18n-data.js');
const TOOLS_DATA_PATH = path.join(ROOT, 'src', '_data', 'tools.json');

// One index per language: search-index.<hash>.json for English, search-index.<lang>.<hash>.json
// otherwise. Text (name, description, keywords) comes from src/_data/i18n.
function buildSearchIndex({ outputDir = path.join(ROOT, '_site', 'assets'), lang = 'en' } = {}) {
  // Listed tools only: country pages (listed: false) are found through their parent tool
  const rawTools = JSON.parse(fs.readFileSync(TOOLS_DATA_PATH, 'utf-8')).filter(t => t.listed !== false).map(t => {
    const listing = (i18nData.tool(lang, t.slug) || {}).listing || {};
    return { ...t, ...listing };
  });

  // The palette shows the category's display name in the page language, not its slug
  const categoryNames = i18nData.page(lang, 'categories') || {};
  const searchEntries = rawTools.map(t => ({
    name: t.name,
    shortName: t.shortName || t.name,
    slug: t.slug,
    category: (categoryNames[t.category] || {}).name || t.category,
    categoryId: t.category,
    description: t.description || t.shortDescription || '',
    keywords: t.keywords || [],
    iconName: t.iconName || '',
    popular: !!t.popular,
    order: t.order || 99
  }));

  const jsonContent = JSON.stringify(searchEntries);
  const hash = crypto.createHash('md5').update(jsonContent).digest('hex').slice(0, 8);
  const stem = lang === 'en' ? 'search-index' : `search-index.${lang.toLowerCase()}`;
  const filename = `${stem}.${hash}.json`;
  const searchIndexPath = `/assets/${filename}`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clean old search-index.*.json
  try {
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      if (new RegExp(`^${stem.replace(/\./g, '\\.')}\\.[a-f0-9]+\\.json$`).test(f) && f !== filename) {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }
  } catch (e) {}

  fs.writeFileSync(path.join(outputDir, filename), jsonContent, 'utf-8');
  if (lang === 'en') fs.writeFileSync(path.join(outputDir, 'search-index.json'), jsonContent, 'utf-8');

  return {
    filename,
    searchIndexPath,
    hash,
    count: searchEntries.length
  };
}

if (require.main === module) {
  const res = buildSearchIndex();
  console.log(`Built search index: ${res.searchIndexPath} (${res.count} tools)`);
}

module.exports = { buildSearchIndex };
