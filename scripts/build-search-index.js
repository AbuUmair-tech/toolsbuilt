const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DATA_PATH = path.join(ROOT, 'src', '_data', 'tools.json');

function buildSearchIndex({ outputDir = path.join(ROOT, '_site', 'assets') } = {}) {
  const rawTools = JSON.parse(fs.readFileSync(TOOLS_DATA_PATH, 'utf-8'));

  const searchEntries = rawTools.map(t => ({
    name: t.name,
    shortName: t.shortName || t.name,
    slug: t.slug,
    category: t.category,
    description: t.description || t.shortDescription || '',
    keywords: t.keywords || [],
    iconName: t.iconName || '',
    popular: !!t.popular,
    order: t.order || 99
  }));

  const jsonContent = JSON.stringify(searchEntries);
  const hash = crypto.createHash('md5').update(jsonContent).digest('hex').slice(0, 8);
  const filename = `search-index.${hash}.json`;
  const searchIndexPath = `/assets/${filename}`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clean old search-index.*.json
  try {
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      if (/^search-index\.[a-f0-9]+\.json$/.test(f) && f !== filename) {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }
  } catch (e) {}

  fs.writeFileSync(path.join(outputDir, filename), jsonContent, 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'search-index.json'), jsonContent, 'utf-8');

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
