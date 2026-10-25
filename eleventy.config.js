const { buildCss } = require('./scripts/bundle-css.js');
const { buildSearchIndex } = require('./scripts/build-search-index.js');
const { generateAllCards } = require('./scripts/generate-og-cards.js');

module.exports = function(eleventyConfig) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';

  // Watch CSS directory for hot reloading
  eleventyConfig.addWatchTarget('src/assets/css/');

  // Initial CSS and search index build to get hashes before any template renders
  let cssBundle = buildCss({ isProduction });
  let searchBundle = buildSearchIndex();

  eleventyConfig.on('eleventy.before', async () => {
    cssBundle = buildCss({ isProduction });
    searchBundle = buildSearchIndex();
    await generateAllCards();
  });

  eleventyConfig.on('eleventy.after', async () => {
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
