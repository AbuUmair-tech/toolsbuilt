const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildCss } = require('./scripts/bundle-css.js');
const { buildSearchIndex } = require('./scripts/build-search-index.js');
const { generateAllCards } = require('./scripts/generate-og-cards.js');

function syncToolsDataJs() {
  const toolsPath = path.join(__dirname, 'src', '_data', 'tools.json');
  const catPath = path.join(__dirname, 'src', '_data', 'categories.json');
  const outPath = path.join(__dirname, 'src', 'assets', 'js', 'tools-data.js');
  if (fs.existsSync(toolsPath) && fs.existsSync(catPath)) {
    const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    const cats = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    const catMap = new Map(cats.map(c => [c.slug, c.name]));
    const data = tools.map(t => ({
      id: t.slug,
      name: t.name,
      url: `/tools/${t.slug}/`,
      icon: t.iconName || '',
      description: t.description || '',
      category: catMap.get(t.category) || t.category,
      categoryId: t.category,
      popular: !!t.popular,
      related: t.related || []
    }));
    const content = `/**\n * Shared Registry of ToolsBuilt Tools (Generated from tools.json & categories.json)\n */\n\nwindow.TOOLS_DATA = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(outPath, content, 'utf8');
  }
}

module.exports = function(eleventyConfig) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';

  // Watch CSS directory for hot reloading
  eleventyConfig.addWatchTarget('src/assets/css/');

  // Initial CSS, tools-data, and search index build to get hashes before any template renders
  syncToolsDataJs();
  let cssBundle = buildCss({ isProduction });
  let searchBundle = buildSearchIndex();

  eleventyConfig.on('eleventy.before', async () => {
    syncToolsDataJs();
    cssBundle = buildCss({ isProduction });
    searchBundle = buildSearchIndex();
    await generateAllCards();
  });

  eleventyConfig.on('eleventy.after', async () => {
    syncToolsDataJs();
    buildCss({ isProduction });
    buildSearchIndex();
  });

  // Shortcode for referencing content-hashed main CSS
  eleventyConfig.addShortcode('mainCss', function() {
    return cssBundle.cssPath;
  });

  // Shortcode for referencing content-hashed search index
  eleventyConfig.addShortcode('searchIndexUrl', function() {
    return searchBundle.searchIndexPath;
  });

  // Global data for environment
  eleventyConfig.addGlobalData('env', {
    isProduction,
    siteEnv: process.env.SITE_ENV || (isProduction ? 'production' : 'development')
  });

  // Passthrough static files
  eleventyConfig.ignores.add('src/google5758f81e977de6a2.html');
  eleventyConfig.addPassthroughCopy({ 'src/CNAME': 'CNAME' });
  eleventyConfig.addPassthroughCopy({ 'src/.nojekyll': '.nojekyll' });
  eleventyConfig.addPassthroughCopy({ 'src/google5758f81e977de6a2.html': 'google5758f81e977de6a2.html' });
  eleventyConfig.addPassthroughCopy({ 'src/manifest.webmanifest': 'manifest.webmanifest' });
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Passthrough tool-specific scripts and styles
  eleventyConfig.addPassthroughCopy('src/tools/**/*.js');
  eleventyConfig.addPassthroughCopy('src/tools/**/*.css');

  // Collections: filter drafts out of production builds
  eleventyConfig.addCollection('post', function(collectionApi) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
    const posts = collectionApi.getFilteredByTag('post');
    if (isProd) {
      return posts.filter(item => !item.data.draft);
    }
    return posts;
  });

  // Filters
  eleventyConfig.addFilter('findTool', function(tools, slug) {
    if (!tools || !Array.isArray(tools)) return null;
    return tools.find(t => t.slug === slug) || null;
  });

  eleventyConfig.addFilter('findCategory', function(categories, slug) {
    if (!categories || !Array.isArray(categories)) return null;
    return categories.find(c => c.slug === slug) || null;
  });

  eleventyConfig.addFilter('filterByCategory', function(tools, catSlug) {
    if (!tools || !Array.isArray(tools)) return [];
    return tools.filter(t => t.category === catSlug);
  });

  eleventyConfig.addFilter('getRelatedTools', function(tool, allTools) {
    if (!tool || !tool.related || !Array.isArray(allTools)) return [];
    return tool.related
      .map(slug => allTools.find(t => t.slug === slug))
      .filter(Boolean);
  });

  eleventyConfig.addFilter('getCategoryOtherTools', function(tool, allTools, limit = 4) {
    if (!tool || !Array.isArray(allTools)) return [];
    return allTools
      .filter(t => t.category === tool.category && t.slug !== tool.slug)
      .slice(0, limit);
  });

  eleventyConfig.addFilter('categoryUrl', function(slug) {
    return '/category/' + slug + '/';
  });

  eleventyConfig.addFilter('itemListSchema', function(tools, listName) {
    if (!tools || !Array.isArray(tools)) return '';
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": listName || "Tools",
      "numberOfItems": tools.length,
      "itemListElement": tools.map((t, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": t.name,
        "description": t.description,
        "url": `https://toolsbuilt.com/tools/${t.slug}/`
      }))
    };
    return JSON.stringify(schema, null, 2);
  });

  eleventyConfig.addFilter('filterPopular', function(tools, limit) {
    if (!tools || !Array.isArray(tools)) return [];
    const popular = tools.filter(t => t.popular).sort((a, b) => (a.order || 99) - (b.order || 99));
    return limit ? popular.slice(0, limit) : popular;
  });

  eleventyConfig.addFilter('faqPageSchema', function(faqItems) {
    if (!faqItems || !Array.isArray(faqItems)) return '';
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };
    return JSON.stringify(schema, null, 2);
  });

  eleventyConfig.addFilter('jsonify', function(value) {
    return JSON.stringify(value, null, 2);
  });

  eleventyConfig.addFilter('pluralize', function(count, word) {
    return Number(count) === 1 ? word : word + 's';
  });

  eleventyConfig.addFilter('humanDate', function(str) {
    if (!str) return '';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  // Blog Filters: readingTime, isoDate, readableDate, jsonStr
  eleventyConfig.addFilter('readingTime', function(content) {
    if (!content) return '1 min read';
    const text = String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  });

  eleventyConfig.addFilter('isoDate', function(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  });

  eleventyConfig.addFilter('readableDate', function(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  eleventyConfig.addFilter('jsonStr', function(value) {
    if (value === undefined || value === null) return '""';
    return JSON.stringify(value);
  });

  function slugifyHeading(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  eleventyConfig.addFilter('withHeadingIds', function(content) {
    if (!content) return '';
    return content.replace(/<(h[23])(\s*[^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
      if (/id=["']/i.test(attrs)) return match;
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      const id = slugifyHeading(cleanText);
      return `<${tag} id="${id}"${attrs}>${text}</${tag}>`;
    });
  });

  eleventyConfig.addFilter('extractToc', function(content) {
    if (!content) return [];
    const toc = [];
    const regex = /<(h[23])\b([^>]*)>(.*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = parseInt(match[1].slice(1), 10);
      const attrs = match[2];
      const rawText = match[3];
      const text = rawText.replace(/<[^>]*>/g, '').trim();
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const id = idMatch ? idMatch[1] : slugifyHeading(text);
      toc.push({ level, text, id });
    }
    return toc;
  });

  eleventyConfig.addFilter('filterGuidesByTool', function(posts, toolSlug) {
    if (!posts || !Array.isArray(posts) || !toolSlug) return [];
    return posts.filter(p => p.data && p.data.tool === toolSlug);
  });

  eleventyConfig.addFilter('filterOtherPosts', function(posts, currentUrl, limit = 3) {
    if (!posts || !Array.isArray(posts)) return [];
    return posts
      .filter(p => p.url !== currentUrl)
      .slice(0, limit);
  });

  eleventyConfig.addFilter('getCuratedRelatedTools', function(currentTool, allTools, limit = 4) {
    if (!currentTool || !Array.isArray(allTools)) return [];
    const result = [];
    const addedSlugs = new Set([currentTool.slug]);

    if (Array.isArray(currentTool.related)) {
      for (const slug of currentTool.related) {
        if (!addedSlugs.has(slug)) {
          const match = allTools.find(t => t.slug === slug);
          if (match) {
            result.push(match);
            addedSlugs.add(slug);
            if (result.length >= limit) return result;
          }
        }
      }
    }

    for (const tool of allTools) {
      if (tool.category === currentTool.category && !addedSlugs.has(tool.slug)) {
        result.push(tool);
        addedSlugs.add(tool.slug);
        if (result.length >= limit) return result;
      }
    }

    for (const tool of allTools) {
      if (!addedSlugs.has(tool.slug)) {
        result.push(tool);
        addedSlugs.add(tool.slug);
        if (result.length >= limit) return result;
      }
    }

    return result.slice(0, limit);
  });

  eleventyConfig.addGlobalData('buildDate', () => new Date().toISOString().split('T')[0]);

  eleventyConfig.addFilter('limit', function(arr, count) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, count);
  });

  eleventyConfig.addFilter('fileLastmod', function(relativePath) {
    const fullPath = path.join(__dirname, relativePath);
    if (!fs.existsSync(fullPath)) return new Date().toISOString().split('T')[0];
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/^updated:\s*["']?([0-9]{4}-[0-9]{2}-[0-9]{2})["']?/m);
      if (match) return match[1];
    } catch (e) {}
    try {
      const gitDate = execSync(`git log -1 --format=%cs "${fullPath}"`, { encoding: 'utf8' }).trim();
      if (gitDate && /^\d{4}-\d{2}-\d{2}$/.test(gitDate)) {
        return gitDate;
      }
    } catch (e) {}
    try {
      const stat = fs.statSync(fullPath);
      return stat.mtime.toISOString().split('T')[0];
    } catch (e) {}
    return '2026-10-24';
  });

  eleventyConfig.addFilter('latestToolDate', function(tools, catSlug) {
    if (!Array.isArray(tools) || tools.length === 0) return '2026-10-15';
    let filtered = tools;
    if (catSlug) {
      filtered = tools.filter(t => t.category === catSlug);
    }
    const dates = filtered.map(t => t.updated).filter(Boolean).sort().reverse();
    return dates[0] || '2026-10-15';
  });

  function formatIsoDate(val) {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  }

  eleventyConfig.addFilter('latestSiteDate', function(tools, posts) {
    const dates = [];
    if (Array.isArray(tools)) {
      tools.forEach(t => {
        if (t.updated) {
          const iso = formatIsoDate(t.updated);
          if (iso) dates.push(iso);
        }
      });
    }
    if (Array.isArray(posts)) {
      posts.forEach(p => {
        const raw = (p.data && p.data.updated) || p.date;
        const iso = formatIsoDate(raw);
        if (iso) dates.push(iso);
      });
    }
    dates.sort().reverse();
    return dates[0] || '2026-10-15';
  });

  eleventyConfig.addFilter('blogPagesList', function(posts, pageSize = 9) {
    if (!Array.isArray(posts) || posts.length === 0) return [];
    const isProd = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
    const published = isProd ? posts.filter(p => !p.data.draft) : posts;
    const sorted = [...published].reverse();
    const totalPages = Math.ceil(sorted.length / pageSize) || 1;
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      const chunk = sorted.slice(i * pageSize, (i + 1) * pageSize);
      const latestPost = chunk[0];
      const raw = (latestPost && latestPost.data && latestPost.data.updated) || (latestPost && latestPost.date);
      const lastmod = formatIsoDate(raw) || '2026-10-24';
      pages.push({
        pageNumber: i + 1,
        url: i === 0 ? '/blog/' : `/blog/page/${i + 1}/`,
        lastmod
      });
    }
    return pages;
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data'
    },
    templateFormats: ['html', 'njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
