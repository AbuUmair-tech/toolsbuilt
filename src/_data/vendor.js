// Self-hosted third-party engines for the code formatters and the password strength checker.
// Each package is copied from node_modules (exact versions pinned in package.json) to
// /assets/vendor/<package>-<version>/ by eleventy.config.js, and pages load it with an
// inline import map + dynamic import(), so nothing is fetched from another domain.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// files: { publishedName: pathInsideThePackage }
const PACKAGES = {
  ruff: {
    name: '@wasm-fmt/ruff_fmt',
    files: {
      'ruff_fmt_web.js': 'ruff_fmt_web.js',
      'ruff_fmt_bg.js': 'ruff_fmt_bg.js',
      'ruff_fmt_bg.wasm': 'ruff_fmt_bg.wasm',
      'LICENSE': 'LICENSE'
    },
    entry: 'ruff_fmt_web.js'
  },
  prettier: {
    name: 'prettier',
    files: {
      'standalone.mjs': 'standalone.mjs',
      'doc.mjs': 'doc.mjs',
      // HTML formatter: the html parser plus postcss and babel/estree for inline <style> and <script>
      'plugins/html.mjs': 'plugins/html.mjs',
      'plugins/postcss.mjs': 'plugins/postcss.mjs',
      'plugins/babel.mjs': 'plugins/babel.mjs',
      'plugins/estree.mjs': 'plugins/estree.mjs',
      'LICENSE': 'LICENSE'
    },
    entry: 'standalone.mjs'
  },
  prettierJava: {
    name: 'prettier-plugin-java',
    files: {
      'index.mjs': 'dist/index.mjs',
      'tree-sitter-java_orchard.wasm': 'dist/tree-sitter-java_orchard.wasm',
      'LICENSE': 'LICENSE'
    },
    entry: 'index.mjs'
  },
  treeSitter: {
    name: 'web-tree-sitter',
    files: { 'web-tree-sitter.js': 'web-tree-sitter.js', 'web-tree-sitter.wasm': 'web-tree-sitter.wasm', 'LICENSE': 'LICENSE' },
    entry: 'web-tree-sitter.js'
  },
  // zxcvbn-ts ships self-contained browser builds (dist/zxcvbn-ts.js) that set window.zxcvbnts.*.
  // The three share a final name segment, so each gets its own folder.
  zxcvbnCore: {
    name: '@zxcvbn-ts/core',
    folder: 'zxcvbn-ts-core',
    files: { 'zxcvbn-ts.js': 'dist/zxcvbn-ts.js', 'LICENSE.txt': 'LICENSE.txt' },
    entry: 'zxcvbn-ts.js'
  },
  zxcvbnCommon: {
    name: '@zxcvbn-ts/language-common',
    folder: 'zxcvbn-ts-language-common',
    files: { 'zxcvbn-ts.js': 'dist/zxcvbn-ts.js', 'LICENSE.txt': 'LICENSE.txt' },
    entry: 'zxcvbn-ts.js'
  },
  zxcvbnEn: {
    name: '@zxcvbn-ts/language-en',
    folder: 'zxcvbn-ts-language-en',
    files: { 'zxcvbn-ts.js': 'dist/zxcvbn-ts.js', 'LICENSE.txt': 'LICENSE.txt' },
    entry: 'zxcvbn-ts.js'
  }
};

function packageDir(name) {
  return path.join(ROOT, 'node_modules', ...name.split('/'));
}

const packages = {};
const passthrough = {};

for (const [key, pkg] of Object.entries(PACKAGES)) {
  const dir = packageDir(pkg.name);
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const folder = `${pkg.folder || pkg.name.split('/').pop()}-${version}`;
  const base = `/assets/vendor/${folder}/`;
  const sizes = {};
  for (const [published, inside] of Object.entries(pkg.files)) {
    const src = path.join(dir, inside);
    passthrough[path.relative(ROOT, src)] = `assets/vendor/${folder}/${published}`;
    sizes[published] = fs.statSync(src).size;
  }
  packages[key] = { name: pkg.name, version, base, entry: base + pkg.entry, sizes };
}

module.exports = {
  packages,
  passthrough,
  // Import maps used by each formatter page (bare specifiers -> self-hosted files)
  importMaps: {
    python: { imports: { '@wasm-fmt/ruff_fmt': packages.ruff.entry } },
    html: {
      imports: {
        prettier: packages.prettier.entry,
        'prettier/plugins/html': packages.prettier.base + 'plugins/html.mjs',
        'prettier/plugins/postcss': packages.prettier.base + 'plugins/postcss.mjs',
        'prettier/plugins/babel': packages.prettier.base + 'plugins/babel.mjs',
        'prettier/plugins/estree': packages.prettier.base + 'plugins/estree.mjs'
      }
    },
    java: {
      imports: {
        prettier: packages.prettier.entry,
        'prettier/doc': packages.prettier.base + 'doc.mjs',
        'prettier-plugin-java': packages.prettierJava.entry,
        'web-tree-sitter': packages.treeSitter.entry
      }
    }
  }
};
