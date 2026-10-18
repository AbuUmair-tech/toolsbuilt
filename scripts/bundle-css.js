const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lightningcss = require('lightningcss');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'src', 'assets', 'css', 'main.css');

function buildCss({ isProduction = false, outputDir = path.join(ROOT, '_site', 'assets', 'css') } = {}) {
  const bundleResult = lightningcss.bundle({
    filename: ENTRY,
    minify: true,
    sourceMap: !isProduction
  });

  const rawCode = bundleResult.code;
  const hash = crypto.createHash('md5').update(rawCode).digest('hex').slice(0, 8);
  const filename = `main.${hash}.css`;
  const cssPath = `/assets/css/${filename}`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clean old main.*.css files in outputDir to prevent bloat
  try {
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      if (/^main\.[a-f0-9]+\.css(\.map)?$/.test(f) && !f.startsWith(`main.${hash}`)) {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }
  } catch (e) {}

  let finalCode = rawCode;
  if (!isProduction && bundleResult.map) {
    const mapFilename = `${filename}.map`;
    fs.writeFileSync(path.join(outputDir, mapFilename), bundleResult.map);
    finalCode = Buffer.concat([rawCode, Buffer.from(`\n/*# sourceMappingURL=${mapFilename} */`)]);
  }

  fs.writeFileSync(path.join(outputDir, filename), finalCode);
  // Also write style.css for graceful fallback
  fs.writeFileSync(path.join(outputDir, 'style.css'), finalCode);

  return {
    filename,
    cssPath,
    hash,
    code: finalCode,
    rawCode
  };
}

if (require.main === module) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
  const res = buildCss({ isProduction });
  console.log(`Bundled CSS: ${res.cssPath} (${(res.code.length / 1024).toFixed(2)} KB)`);
}

module.exports = { buildCss };
