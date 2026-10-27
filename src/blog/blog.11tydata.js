module.exports = {
  layout: "layouts/post.njk",
  tags: "post",
  eleventyComputed: {
    permalink: (data) => {
      if (!data.page.inputPath || !data.page.inputPath.endsWith('.md')) {
        return data.permalink;
      }
      const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
      if (isProduction && data.draft) {
        return false;
      }
      return `/blog/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => {
      if (!data.page.inputPath || !data.page.inputPath.endsWith('.md')) {
        return data.eleventyExcludeFromCollections;
      }
      const isProduction = process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
      return Boolean(isProduction && data.draft);
    }
  }
};
