#!/usr/bin/env node
/**
 * scripts/check-seo.js
 * Comprehensive Technical SEO and Accessibility Audit
 *
 * Verifies:
 * 1. Internal link integrity & crawlability (BFS from /)
 * 2. Click depth <= 3 for all reachable pages
 * 3. Trailing slash consistency on all page links
 * 4. Anchor integrity (#hash targets existing ID on destination page)
 * 5. Descriptive anchor text (no "click here", "more", empty text without aria)
 * 6. Accessible images and SVGs (alt attributes, aria-hidden, aria-label)
 * 7. Metadata bounds:
 *    - Title: 15..65 chars, unique
 *    - Description: 70..170 chars, unique
 *    - Canonical: absolute URL matching page URL
 *    - og:image: present, exists in _site/, <= 100 KB
 * 8. Generates docs/SEO_PAGE_REPORT.md
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, '_site');
const REPORT_FILE = path.join(ROOT, 'docs', 'SEO_PAGE_REPORT.md');

const BASE_URL = 'https://toolsbuilt.com';

function normalizeUrlPath(urlPath) {
  if (!urlPath) return '/';
  let clean = urlPath.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (!path.extname(clean) && !clean.endsWith('/')) {
    clean = clean + '/';
  }
  return clean;
}

function urlPathToFilePath(urlPath) {
  let clean = normalizeUrlPath(urlPath);
  if (clean === '/') return path.join(SITE_DIR, 'index.html');
  if (path.extname(clean)) {
    return path.join(SITE_DIR, clean.slice(1));
  }
  return path.join(SITE_DIR, clean.slice(1), 'index.html');
}

function filePathToUrlPath(filePath) {
  const rel = path.relative(SITE_DIR, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  if (rel.endsWith('/index.html')) {
    return '/' + rel.slice(0, -10);
  }
  return '/' + rel;
}

function getAllHtmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractIds(html) {
  const ids = new Set();
  const idRegex = /\bid=["']([^"']+)["']/gi;
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

function checkSeo() {
  console.log('--- Running Technical SEO & Accessibility Audit ---');

  if (!fs.existsSync(SITE_DIR)) {
    console.error(`❌ _site directory not found at ${SITE_DIR}. Run build first.`);
    process.exit(1);
  }

  const allHtmlFiles = getAllHtmlFiles(SITE_DIR);
  const auditFiles = allHtmlFiles.filter(f => {
    const rel = path.relative(SITE_DIR, f);
    return !rel.startsWith('design-system') && !rel.startsWith('google');
  });

  const pageDataMap = new Map();
  const fileToUrl = new Map();
  const urlToFile = new Map();

  for (const f of auditFiles) {
    const u = filePathToUrlPath(f);
    fileToUrl.set(f, u);
    urlToFile.set(u, f);
  }

  // Pre-parse pages
  for (const [url, filePath] of urlToFile.entries()) {
    const html = fs.readFileSync(filePath, 'utf8');
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim() : '';

    const descMatch = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const canonicalMatch = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                           html.match(/<link\b[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';

    const ogImageMatch = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';

    const isNoindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const isDraft = html.includes('draft-banner');

    pageDataMap.set(url, {
      url,
      filePath,
      html,
      title,
      description,
      canonical,
      ogImage,
      isNoindex,
      isDraft,
      ids: extractIds(html),
      inboundLinks: 0,
      clickDepth: url === '/' ? 0 : Infinity,
      outboundLinks: []
    });
  }

  let errors = [];
  let warnings = [];

  // Crawl links and validate
  for (const [pageUrl, data] of pageDataMap.entries()) {
    const html = data.html;

    // 1. Check images
    const imgRegex = /<img\b([^>]*)>/gi;
    let imgM;
    while ((imgM = imgRegex.exec(html)) !== null) {
      const attrs = imgM[1];
      if (!/\balt=["']/i.test(attrs)) {
        errors.push(`${pageUrl}: <img> missing alt attribute: ${imgM[0].slice(0, 80)}`);
      }
    }

    // 2. Check SVGs
    const svgRegex = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/gi;
    let svgM;
    while ((svgM = svgRegex.exec(html)) !== null) {
      const attrs = svgM[1];
      const body = svgM[2];
      const hasAriaHidden = /aria-hidden=["']true["']/i.test(attrs);
      const hasAriaLabel = /aria-label=/i.test(attrs);
      const hasRole = /role=["']img["']/i.test(attrs);
      const hasTitle = /<title\b/i.test(body);
      if (!hasAriaHidden && !hasAriaLabel && !hasRole && !hasTitle) {
        errors.push(`${pageUrl}: <svg> missing aria-hidden, aria-label, role="img", or <title>: ${attrs.slice(0, 60)}`);
      }
    }

    // 3. Check links
    const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let linkM;
    while ((linkM = linkRegex.exec(html)) !== null) {
      const attrs = linkM[1];
      const linkContent = linkM[2];
      const linkText = linkContent.replace(/<[^>]+>/g, '').trim().toLowerCase();

      const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
      if (!hrefMatch) continue;
      const rawHref = hrefMatch[1].trim();

      if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        continue;
      }

      // Check anchor text descriptive quality
      const badTexts = ['click here', 'read more', 'link', 'here', 'more', 'view more', 'learn more'];
      const hasAriaLabel = /\baria-label=["'][^"']+["']/i.test(attrs);
      const hasAriaHidden = /\baria-hidden=["']true["']/i.test(attrs);
      const hasInnerSvgWithTitle = /<svg[\s\S]*?<title>/i.test(linkContent);

      if (badTexts.includes(linkText) && !hasAriaLabel) {
        errors.push(`${pageUrl}: Generic non-descriptive link text "${linkText}" without aria-label (target: ${rawHref})`);
      } else if (!linkText && !hasAriaLabel && !hasAriaHidden && !hasInnerSvgWithTitle) {
        errors.push(`${pageUrl}: Empty link text without aria-label or accessible icon (target: ${rawHref})`);
      }

      // External links
      if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
        if (!rawHref.startsWith(BASE_URL)) {
          continue; // external
        }
      }

      // Internal link processing
      let cleanHref = rawHref;
      if (cleanHref.startsWith(BASE_URL)) {
        cleanHref = cleanHref.slice(BASE_URL.length);
      }

      const [pathPart, hashPart] = cleanHref.split('#');

      // Trailing slash check on internal page paths
      if (pathPart && pathPart.startsWith('/') && !path.extname(pathPart)) {
        if (!pathPart.endsWith('/')) {
          errors.push(`${pageUrl}: Internal page link missing trailing slash: "${rawHref}"`);
        }
      }

      // Check destination target page
      const targetUrl = normalizeUrlPath(pathPart || pageUrl);

      // Verify file existence for static resources or pages
      const targetFile = urlPathToFilePath(targetUrl);
      if (!fs.existsSync(targetFile)) {
        errors.push(`${pageUrl}: Broken internal link to "${rawHref}" (file not found: ${targetFile})`);
        continue;
      }

      // Check hash integrity
      if (hashPart) {
        const destData = pageDataMap.get(targetUrl);
        if (destData && !destData.ids.has(hashPart)) {
          errors.push(`${pageUrl}: Broken hash anchor "#${hashPart}" (id not found on ${targetUrl})`);
        }
      }

      if (pageDataMap.has(targetUrl)) {
        data.outboundLinks.push(targetUrl);
        pageDataMap.get(targetUrl).inboundLinks++;
      }
    }
  }

  // 4. Click Depth BFS Calculation starting from '/'
  const queue = [{ url: '/', depth: 0 }];
  const visited = new Set(['/']);

  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    const curr = pageDataMap.get(url);
    if (!curr) continue;
    curr.clickDepth = depth;

    for (const nextUrl of curr.outboundLinks) {
      if (!visited.has(nextUrl) && pageDataMap.has(nextUrl)) {
        visited.add(nextUrl);
        queue.push({ url: nextUrl, depth: depth + 1 });
      }
    }
  }

  // 5. Verify Sitemap URLs Exist on Disk in _site
  const sitemapFile = path.join(SITE_DIR, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) {
    errors.push(`sitemap.xml not found at ${sitemapFile}`);
  } else {
    const xml = fs.readFileSync(sitemapFile, 'utf8');
    const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    if (locMatches.length === 0) {
      errors.push('sitemap.xml contains no <loc> entries');
    }
    for (const loc of locMatches) {
      if (loc.includes('design-system')) {
        errors.push(`sitemap.xml includes forbidden design-system URL: ${loc}`);
      }
      if (!loc.startsWith(BASE_URL)) {
        errors.push(`sitemap.xml URL does not start with BASE_URL (${BASE_URL}): ${loc}`);
        continue;
      }
      const urlPath = loc.slice(BASE_URL.length) || '/';
      const diskPath = urlPathToFilePath(urlPath);
      if (!fs.existsSync(diskPath)) {
        errors.push(`Sitemap URL "${loc}" does not exist in _site (expected: ${diskPath})`);
      }
    }
  }

  // 6. Audit Metadata Bounds & Uniqueness
  const titles = new Map();
  const descriptions = new Map();

  for (const [url, data] of pageDataMap.entries()) {
    // 404 page and draft pages are excluded from standard click-depth and duplicate rules
    if (url === '/404.html' || data.isDraft) {
      continue;
    }

    // Reachability
    if (data.clickDepth > 3) {
      errors.push(`${url}: Page is not reachable in <= 3 clicks from homepage (current depth: ${data.clickDepth === Infinity ? 'Unreachable' : data.clickDepth})`);
    }

    // Title checks
    if (!data.title) {
      errors.push(`${url}: Missing <title>`);
    } else {
      if (data.title.length < 30 || data.title.length > 60) {
        errors.push(`${url}: <title> length ${data.title.length} is outside allowed range [30, 60] ("${data.title}")`);
      }
      if (titles.has(data.title)) {
        errors.push(`${url}: Duplicate <title> shared with ${titles.get(data.title)} ("${data.title}")`);
      } else {
        titles.set(data.title, url);
      }
    }

    // Description checks
    if (!data.description) {
      errors.push(`${url}: Missing meta description`);
    } else {
      if (data.description.length < 120 || data.description.length > 160) {
        errors.push(`${url}: Meta description length ${data.description.length} is outside allowed range [120, 160] ("${data.description.slice(0, 50)}...")`);
      }
      if (descriptions.has(data.description)) {
        errors.push(`${url}: Duplicate meta description shared with ${descriptions.get(data.description)}`);
      } else {
        descriptions.set(data.description, url);
      }
    }

    // Canonical tag check
    const expectedCanonical = `${BASE_URL}${url}`;
    if (!data.canonical) {
      errors.push(`${url}: Missing canonical tag`);
    } else if (data.canonical !== expectedCanonical) {
      errors.push(`${url}: Canonical tag "${data.canonical}" does not match expected "${expectedCanonical}"`);
    }

    // og:image check
    if (!data.ogImage) {
      errors.push(`${url}: Missing og:image tag`);
    } else {
      let ogLocalPath = data.ogImage;
      if (ogLocalPath.startsWith(BASE_URL)) {
        ogLocalPath = ogLocalPath.slice(BASE_URL.length);
      }
      const ogDiskFile = path.join(SITE_DIR, ogLocalPath.startsWith('/') ? ogLocalPath.slice(1) : ogLocalPath);
      if (!fs.existsSync(ogDiskFile)) {
        errors.push(`${url}: og:image file not found: ${ogDiskFile} (URL: ${data.ogImage})`);
      } else {
        const ogSize = fs.statSync(ogDiskFile).size;
        if (ogSize > 100 * 1024) {
          errors.push(`${url}: og:image exceeds 100 KB (${Math.round(ogSize / 1024)} KB)`);
        }
      }
    }
  }

  // 6. Audit Published Blog Posts (non-draft only)
  checkBlogPosts(errors, warnings);

  // 7. Forbidden text check: fail if "TODO_", "editorial team" or "zero trackers" appears in _site
  const forbiddenPhrases = ['TODO_', 'editorial team', 'zero trackers'];
  function scanSiteForForbidden(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanSiteForForbidden(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
          continue;
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const phrase of forbiddenPhrases) {
          const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          if (regex.test(content)) {
            const rel = path.relative(SITE_DIR, fullPath).replace(/\\/g, '/');
            errors.push(`Forbidden phrase "${phrase}" found in _site/${rel}`);
          }
        }
      }
    }
  }
  scanSiteForForbidden(SITE_DIR);

  // 8. Double-escaped HTML entity and plain-text entity checks
  const doubleEscapedEntities = ['&amp;amp;', '&amp;quot;', '&amp;#39;', '&amp;lt;', '&amp;gt;'];
  for (const f of allHtmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const rel = path.relative(SITE_DIR, f).replace(/\\/g, '/');
    for (const ent of doubleEscapedEntities) {
      if (html.includes(ent)) {
        errors.push(`Double-escaped entity "${ent}" found in _site/${rel}`);
      }
    }
  }

  for (const plainTextRel of ['llms.txt', 'robots.txt']) {
    const plainTextFile = path.join(SITE_DIR, plainTextRel);
    if (fs.existsSync(plainTextFile)) {
      const text = fs.readFileSync(plainTextFile, 'utf8');
      if (text.includes('&amp;')) {
        errors.push(`HTML entity "&amp;" found in _site/${plainTextRel}`);
      }
    }
  }

  // Print Summary Table
  console.log('\n========================================================================================');
  console.log('PAGE AUDIT SUMMARY');
  console.log('========================================================================================');
  console.log(`URL`.padEnd(46) + `| Depth | Links | Title (${'[30,60]'}) | Desc (${'[120,160]'}`);
  console.log('----------------------------------------------------------------------------------------');

  const sortedPages = Array.from(pageDataMap.values()).sort((a, b) => a.clickDepth - b.clickDepth || a.url.localeCompare(b.url));

  for (const p of sortedPages) {
    const depthStr = p.clickDepth === Infinity ? 'INF' : String(p.clickDepth);
    const linkStr = String(p.inboundLinks);
    const titleStr = `${p.title.length}c`;
    const descStr = `${p.description.length}c`;
    console.log(`${p.url.padEnd(46)}| ${depthStr.padStart(5)} | ${linkStr.padStart(5)} | ${titleStr.padStart(13)} | ${descStr.padStart(13)}`);
  }
  console.log('========================================================================================\n');

  // Generate docs/SEO_PAGE_REPORT.md
  generateReport(sortedPages, errors, warnings);

  if (errors.length > 0) {
    console.error(`❌ SEO & Accessibility audit failed with ${errors.length} errors:`);
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`✅ Technical SEO & Accessibility audit PASSED (${sortedPages.length} pages audited, 0 errors).`);
  console.log(`📄 Generated comprehensive report at: ${REPORT_FILE}`);
}

function generateReport(pages, errors, warnings) {
  const docsDir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let md = `# ToolsBuilt SEO & Crawlability Page Report

> Automatically generated by \`scripts/check-seo.js\` on ${new Date().toISOString().split('T')[0]}.

## Audit Summary

- **Total Audited Pages:** ${pages.length}
- **Indexable Pages:** ${pages.filter(p => !p.isNoindex && p.url !== '/404.html').length}
- **Maximum Click Depth:** ${Math.max(...pages.filter(p => p.clickDepth !== Infinity).map(p => p.clickDepth))}
- **Audit Errors:** ${errors.length}
- **Audit Warnings:** ${warnings.length}

---

## Page-by-Page Audit Details

| URL | Status | Depth | Inbound Links | Title Length | Description Length | Canonical | Open Graph Card |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
`;

  for (const p of pages) {
    const status = p.isNoindex ? 'Noindex' : '200 OK';
    const depth = p.clickDepth === Infinity ? 'Unreachable' : p.clickDepth;
    const ogFilename = path.basename(p.ogImage || '');
    md += `| \`${p.url}\` | ${status} | ${depth} | ${p.inboundLinks} | ${p.title.length} chars | ${p.description.length} chars | \`${p.canonical}\` | \`${ogFilename}\` |\n`;
  }

  md += `
---

## Metadata Inventory

`;

  for (const p of pages) {
    md += `### \`${p.url}\`
- **Title (${p.title.length} chars):** ${p.title}
- **Description (${p.description.length} chars):** ${p.description}
- **Canonical:** \`${p.canonical}\`
- **OG Image:** \`${p.ogImage}\`
- **Click Depth from /:** ${p.clickDepth === Infinity ? 'Unreachable' : p.clickDepth}
- **Inbound Internal Links:** ${p.inboundLinks}

`;
  }

  fs.writeFileSync(REPORT_FILE, md);
}

function checkBlogPosts(errors, warnings) {
  const blogDir = path.join(ROOT, 'src', 'blog');
  const toolsFile = path.join(ROOT, 'src', '_data', 'tools.json');

  if (!fs.existsSync(blogDir)) return;

  let tools = [];
  if (fs.existsSync(toolsFile)) {
    try {
      tools = JSON.parse(fs.readFileSync(toolsFile, 'utf8'));
    } catch (e) {
      errors.push(`src/_data/tools.json: Failed to parse JSON: ${e.message}`);
    }
  }
  const validToolSlugs = new Set(tools.map(t => t.slug));

  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

  for (const filename of blogFiles) {
    const fullPath = path.join(blogDir, filename);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const rawContent = fs.readFileSync(fullPath, 'utf8');

    // Parse front matter
    let frontMatter = {};
    let body = rawContent;

    if (rawContent.startsWith('---')) {
      const endMatch = rawContent.indexOf('\n---', 3);
      if (endMatch !== -1) {
        const yamlStr = rawContent.slice(3, endMatch).trim();
        body = rawContent.slice(endMatch + 4).trim();
        try {
          frontMatter = yaml.load(yamlStr) || {};
        } catch (e) {
          errors.push(`${relPath}: YAML parse error: ${e.message}`);
          continue;
        }
      }
    }

    // Published (non-draft) posts only: skip if draft: true
    if (frontMatter.draft === true) {
      continue;
    }

    // 1. Title: 30-60 chars
    const title = frontMatter.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push(`${relPath}: Missing title in front matter`);
    } else {
      const titleLen = title.trim().length;
      if (titleLen < 30 || titleLen > 60) {
        errors.push(`${relPath}: Title length ${titleLen} is outside allowed range [30, 60] ("${title.trim()}")`);
      }
    }

    // 2. Description: 120-160 chars
    const description = frontMatter.description;
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.push(`${relPath}: Missing description in front matter`);
    } else {
      const descLen = description.trim().length;
      if (descLen < 120 || descLen > 160) {
        errors.push(`${relPath}: Description length ${descLen} is outside allowed range [120, 160] ("${description.trim()}")`);
      }
    }

    // 3. Tool exists and valid in tools.json
    const tool = frontMatter.tool;
    if (!tool || typeof tool !== 'string' || !tool.trim()) {
      errors.push(`${relPath}: Missing "tool" property in front matter`);
    } else if (!validToolSlugs.has(tool.trim())) {
      errors.push(`${relPath}: Tool "${tool.trim()}" does not exist in tools.json`);
    }

    // 4. At least 600 words in body
    const cleanBody = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .trim();
    const words = cleanBody.split(/\s+/).filter(Boolean);
    if (words.length < 600) {
      errors.push(`${relPath}: Word count (${words.length}) is below required minimum of 600 words`);
    }

    // 5. At least 3 internal links & at least one link to its tool
    const links = [];
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let mdM;
    while ((mdM = mdLinkRegex.exec(body)) !== null) {
      links.push(mdM[2].trim());
    }
    const htmlLinkRegex = /<a\b[^>]*href=["']([^"']*)["']/gi;
    let htmlM;
    while ((htmlM = htmlLinkRegex.exec(body)) !== null) {
      links.push(htmlM[1].trim());
    }

    const internalLinks = links.filter(href => {
      if (!href) return false;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('#')) return false;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href.startsWith('https://toolsbuilt.com') || href.startsWith('http://toolsbuilt.com');
      }
      return href.startsWith('/');
    });

    if (internalLinks.length < 3) {
      errors.push(`${relPath}: Has ${internalLinks.length} internal link(s) (minimum 3 required)`);
    }

    if (tool) {
      const toolSlug = tool.trim();
      const hasToolLink = internalLinks.some(href => {
        let clean = href.replace(/^https?:\/\/toolsbuilt\.com/, '');
        clean = clean.split('?')[0].split('#')[0];
        if (!clean.endsWith('/')) clean += '/';
        return clean === `/tools/${toolSlug}/`;
      });
      if (!hasToolLink) {
        errors.push(`${relPath}: Missing link to its tool (/tools/${toolSlug}/)`);
      }
    }

    // 7. No "TODO"/"VERIFY"/lorem text
    if (/\bTODO\b/i.test(rawContent)) {
      errors.push(`${relPath}: Contains forbidden placeholder text "TODO"`);
    }
    if (/\bVERIFY\b/.test(rawContent)) {
      errors.push(`${relPath}: Contains forbidden placeholder text "VERIFY"`);
    }
    const nonToolContent = rawContent
      .replace(/lorem-ipsum-generator/gi, '')
      .replace(/lorem\s+ipsum\s+generator/gi, '');
    if (/\blorem\b/i.test(nonToolContent)) {
      errors.push(`${relPath}: Contains forbidden placeholder text "lorem"`);
    }

    // 8. FAQs present and non-empty
    const faqs = frontMatter.faqs;
    if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
      errors.push(`${relPath}: Missing or empty "faqs" in front matter`);
    } else {
      const incompleteFaqs = faqs.filter(f => !f || !(f.question || f.q)?.trim() || !(f.answer || f.a)?.trim());
      if (incompleteFaqs.length > 0) {
        errors.push(`${relPath}: Contains ${incompleteFaqs.length} empty or incomplete FAQ item(s)`);
      }
    }
  }
}

if (require.main === module) {
  checkSeo();
}

module.exports = { checkSeo };
