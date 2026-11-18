const languages = require('../_data/languages.json');

// Translated posts live in src/blog/<lang>/<slug>.md and are served at /<prefix>/blog/<slug>/.
// The i18n plugin never copies the blog into language folders (i18n: false); each language's
// posts are written by hand and listed in their own collection (posts_<lang>, eleventy.config.js).
function postLanguage(inputPath) {
  const m = (inputPath || '').replace(/\\/g, '/').match(/\/blog\/([^/]+)\/[^/]+\.md$/);
  return m ? languages.find(l => l.code === m[1]) || null : null;
}
// A post in the folder of a language that is not enabled is not built at all
const disabled = inputPath => Boolean(postLanguage(inputPath) && !postLanguage(inputPath).enabled);

const isProduction = () => process.env.NODE_ENV === 'production' || process.env.SITE_ENV === 'production';
const isPost = data => Boolean(data.page.inputPath && data.page.inputPath.endsWith('.md'));

module.exports = {
  i18n: false,
  layout: "layouts/post.njk",
  tags: "post",
  eleventyComputed: {
    lang: data => (isPost(data) && postLanguage(data.page.inputPath) ? postLanguage(data.page.inputPath).code : data.lang),
    dir: data => (isPost(data) && postLanguage(data.page.inputPath) ? postLanguage(data.page.inputPath).dir : data.dir),
    permalink: (data) => {
      if (!isPost(data)) {
        return data.permalink;
      }
      if ((isProduction() && data.draft) || disabled(data.page.inputPath)) {
        return false;
      }
      const lang = postLanguage(data.page.inputPath);
      return `${lang ? `/${lang.prefix}` : ''}/blog/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => {
      if (!isPost(data)) {
        return data.eleventyExcludeFromCollections;
      }
      return Boolean((isProduction() && data.draft) || disabled(data.page.inputPath));
    }
  }
};
