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
