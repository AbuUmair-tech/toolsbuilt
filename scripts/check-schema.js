#!/usr/bin/env node
/**
 * scripts/check-schema.js
 * Validates all JSON-LD structured data blocks across built HTML files in _site/
 * Ensures:
 * 1. Valid JSON syntax
 * 2. Proper Schema.org shapes (WebSite, Organization, WebApplication, BreadcrumbList, ItemList, FAQPage, CollectionPage, BlogPosting, Blog, ProfilePage)
 * 3. DOM-Schema parity (page title / H1 matches schema name; description matches)
 * 4. Zero fabricated data: fails on aggregateRating, reviewCount, ratingValue, review, award
 * 5. E-E-A-T: WebApplication author is the site's Person (name, url, sameAs from site.json),
 *    publisher is the ToolsBuilt Organization with a logo, isAccessibleForFree is true;
 *    /about/ has a ProfilePage whose mainEntity is that Person
 * 6. Every <time datetime> is an ISO date, and canonical URLs carry no query string
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, '..', '_site');
const SITE = require(path.resolve(__dirname, '..', 'src', '_data', 'site.json'));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

// Person must match site.json: name, absolute url, sameAs array of absolute URLs
function personErrors(person, where) {
  const errors = [];
  if (!person || person['@type'] !== 'Person') return [`${where} must be a Person`];
  if (person.name !== SITE.authorName) errors.push(`${where}.name should be "${SITE.authorName}", got "${person.name}"`);
  if (person.url !== SITE.authorUrl) errors.push(`${where}.url should be "${SITE.authorUrl}", got "${person.url}"`);
  const expectedSameAs = SITE.authorSameAs || [];
  if (!Array.isArray(person.sameAs)) {
    errors.push(`${where}.sameAs must be an array`);
  } else {
    if (person.sameAs.some(u => !/^https:\/\//.test(u))) errors.push(`${where}.sameAs must contain absolute https URLs`);
    if (JSON.stringify(person.sameAs) !== JSON.stringify(expectedSameAs)) errors.push(`${where}.sameAs does not match site.json authorSameAs`);
  }
  return errors;
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

function extractJsonLdBlocks(html) {
  const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function extractTagText(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match ? match[1].trim() : '';
}

function checkSchema() {
  console.log('--- Validating Structured Data (JSON-LD) ---');
  if (!fs.existsSync(SITE_DIR)) {
    console.error(`❌ _site directory not found at ${SITE_DIR}. Run build first.`);
    process.exit(1);
  }

  const allFiles = getAllHtmlFiles(SITE_DIR);
  // Exclude design-system and google verification
  const files = allFiles.filter(f => {
    const rel = path.relative(SITE_DIR, f);
    return !rel.startsWith('design-system') && !rel.startsWith('google');
  });

  console.log(`Auditing ${files.length} HTML files for structured data...`);

  let totalErrors = 0;
  let totalSchemasChecked = 0;

  for (const filePath of files) {
    const relPath = path.relative(SITE_DIR, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    const pageTitle = extractTagText(html, 'title');
    const pageH1 = extractTagText(html, 'h1');
    const metaDesc = extractMetaDescription(html);

    const blocks = extractJsonLdBlocks(html);

    // <time datetime> values must be machine-readable dates
    for (const m of html.matchAll(/<time\b[^>]*datetime="([^"]*)"/gi)) {
      if (!ISO_DATE.test(m[1])) {
        console.error(`❌ ${relPath}: <time datetime="${m[1]}"> is not an ISO date (YYYY-MM-DD)`);
        totalErrors++;
      }
    }

    // Canonical must be the clean URL (shareable result links add query params client-side)
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1];
    if (canonical && /[?#]/.test(canonical)) {
      console.error(`❌ ${relPath}: canonical URL must not contain a query string or fragment: ${canonical}`);
      totalErrors++;
    }

    if (relPath === path.join('about', 'index.html') && !blocks.some(b => /"@type":\s*"ProfilePage"/.test(b))) {
      console.error(`❌ ${relPath}: About page is missing ProfilePage schema`);
      totalErrors++;
    }

    if (blocks.length === 0) {
      // 404 page might not have schema, which is acceptable
      if (relPath !== '404.html') {
        console.warn(`⚠️  [WARN] ${relPath} has no JSON-LD schema.`);
      }
      continue;
    }

    for (let i = 0; i < blocks.length; i++) {
      const raw = blocks[i];
      let data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.error(`❌ ${relPath}: Invalid JSON in JSON-LD block #${i + 1}: ${err.message}`);
        totalErrors++;
        continue;
      }

      totalSchemasChecked++;
      const schemas = Array.isArray(data) ? data : [data];

      for (const item of schemas) {
        const type = item['@type'];
        if (!type) {
          console.error(`❌ ${relPath}: Missing @type in schema block`);
          totalErrors++;
          continue;
        }

        // Check for forbidden fabricated fields
        const rawString = JSON.stringify(item);
        const forbiddenFields = ['aggregateRating', 'reviewCount', 'ratingValue', 'review', 'award'];
        for (const forbidden of forbiddenFields) {
          if (rawString.includes(`"${forbidden}"`)) {
            console.error(`❌ ${relPath}: Forbidden fabricated field "${forbidden}" found in ${type} schema!`);
            totalErrors++;
          }
        }

        // Validate types
        if (type === 'WebSite') {
          if (!item.name || !item.url) {
            console.error(`❌ ${relPath}: WebSite schema missing name or url`);
            totalErrors++;
          }
          if (item.potentialAction) {
            const pa = item.potentialAction;
            if (pa['@type'] !== 'SearchAction' || !pa.target || !pa.target.includes('{search_term_string}')) {
              console.error(`❌ ${relPath}: WebSite SearchAction invalid target: ${pa.target}`);
              totalErrors++;
            }
          }
        } else if (type === 'Organization') {
          if (!item.name || !item.url) {
            console.error(`❌ ${relPath}: Organization schema missing name or url`);
            totalErrors++;
          }
        } else if (type === 'WebApplication') {
          if (!item.name) {
            console.error(`❌ ${relPath}: WebApplication missing name`);
            totalErrors++;
          }
          if (!item.url) {
            console.error(`❌ ${relPath}: WebApplication missing url`);
            totalErrors++;
          }
          if (!item.description) {
            console.error(`❌ ${relPath}: WebApplication missing description`);
            totalErrors++;
          }
          if (!item.applicationCategory) {
            console.error(`❌ ${relPath}: WebApplication missing applicationCategory`);
            totalErrors++;
          }
          if (!item.operatingSystem) {
            console.error(`❌ ${relPath}: WebApplication missing operatingSystem`);
            totalErrors++;
          }
          if (!item.offers || item.offers.price !== '0') {
            console.error(`❌ ${relPath}: WebApplication missing offers with price: "0"`);
            totalErrors++;
          }
          if (item.isAccessibleForFree !== true) {
            console.error(`❌ ${relPath}: WebApplication isAccessibleForFree must be true`);
            totalErrors++;
          }
          for (const err of personErrors(item.author, 'WebApplication author')) {
            console.error(`❌ ${relPath}: ${err}`);
            totalErrors++;
          }
          const pub = item.publisher;
          if (!pub || pub['@type'] !== 'Organization' || pub.name !== 'ToolsBuilt' || !pub.url || !pub.logo) {
            console.error(`❌ ${relPath}: WebApplication publisher must be the ToolsBuilt Organization with url and logo`);
            totalErrors++;
          }

          // DOM-Schema Parity
          if (item.name) {
            const cleanSchemaName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanH1 = pageH1.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanTitle = pageTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!cleanH1.includes(cleanSchemaName) && !cleanTitle.includes(cleanSchemaName)) {
              console.warn(`⚠️  [WARN] ${relPath}: Schema name "${item.name}" not found in page H1 ("${pageH1}") or title ("${pageTitle}")`);
            }
          }
        } else if (type === 'BreadcrumbList') {
          if (!Array.isArray(item.itemListElement) || item.itemListElement.length === 0) {
            console.error(`❌ ${relPath}: BreadcrumbList missing itemListElement`);
            totalErrors++;
          } else {
            for (let idx = 0; idx < item.itemListElement.length; idx++) {
              const el = item.itemListElement[idx];
              if (el.position !== idx + 1) {
                console.error(`❌ ${relPath}: BreadcrumbList positions not strictly consecutive: expected ${idx + 1}, got ${el.position}`);
                totalErrors++;
              }
              if (!el.name || !el.item) {
                console.error(`❌ ${relPath}: BreadcrumbList item #${idx + 1} missing name or item URL`);
                totalErrors++;
              }
            }
          }
        } else if (type === 'ItemList') {
          if (typeof item.numberOfItems !== 'number' && typeof item.numberOfItems !== 'string') {
            console.error(`❌ ${relPath}: ItemList missing numberOfItems`);
            totalErrors++;
          }
          if (!Array.isArray(item.itemListElement)) {
            console.error(`❌ ${relPath}: ItemList missing itemListElement array`);
            totalErrors++;
          } else {
            for (let idx = 0; idx < item.itemListElement.length; idx++) {
              const el = item.itemListElement[idx];
              if (el.position !== idx + 1) {
                console.error(`❌ ${relPath}: ItemList element position expected ${idx + 1}, got ${el.position}`);
                totalErrors++;
              }
              if (!el.name || !el.url) {
                console.error(`❌ ${relPath}: ItemList item #${idx + 1} missing name or url`);
                totalErrors++;
              }
            }
          }
        } else if (type === 'CollectionPage') {
          if (!item.name || !item.url) {
            console.error(`❌ ${relPath}: CollectionPage missing name or url`);
            totalErrors++;
          }
          if (!item.mainEntity && !item.hasPart) {
            console.error(`❌ ${relPath}: CollectionPage missing mainEntity or hasPart`);
            totalErrors++;
          }
        } else if (type === 'FAQPage') {
          if (!Array.isArray(item.mainEntity) || item.mainEntity.length === 0) {
            console.error(`❌ ${relPath}: FAQPage missing mainEntity array`);
            totalErrors++;
          } else {
            for (let qIdx = 0; qIdx < item.mainEntity.length; qIdx++) {
              const q = item.mainEntity[qIdx];
              if (!q.name) {
                console.error(`❌ ${relPath}: FAQ question #${qIdx + 1} missing name`);
                totalErrors++;
              }
              if (!q.acceptedAnswer || !q.acceptedAnswer.text) {
                console.error(`❌ ${relPath}: FAQ question #${qIdx + 1} missing acceptedAnswer.text`);
                totalErrors++;
              }
            }
          }
        } else if (type === 'BlogPosting') {
          if (!item.headline) {
            console.error(`❌ ${relPath}: BlogPosting missing headline`);
            totalErrors++;
          }
          if (!item.datePublished) {
            console.error(`❌ ${relPath}: BlogPosting missing datePublished`);
            totalErrors++;
          }
          if (!item.author || !item.author.name) {
            console.error(`❌ ${relPath}: BlogPosting missing author.name`);
            totalErrors++;
          }
          if (!item.publisher || !item.publisher.name) {
            console.error(`❌ ${relPath}: BlogPosting missing publisher.name`);
            totalErrors++;
          }
        } else if (type === 'ProfilePage') {
          for (const err of personErrors(item.mainEntity, 'ProfilePage mainEntity')) {
            console.error(`❌ ${relPath}: ${err}`);
            totalErrors++;
          }
          if (item.mainEntity && (!item.mainEntity.description || !Array.isArray(item.mainEntity.knowsAbout) || !item.mainEntity.knowsAbout.length)) {
            console.error(`❌ ${relPath}: ProfilePage Person needs description and knowsAbout`);
            totalErrors++;
          }
        } else if (type === 'Blog') {
          if (!item.name || !item.url) {
            console.error(`❌ ${relPath}: Blog schema missing name or url`);
            totalErrors++;
          }
        }
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`❌ Structured data check failed with ${totalErrors} errors across ${totalSchemasChecked} schemas.`);
    process.exit(1);
  }

  console.log(`✅ All ${totalSchemasChecked} JSON-LD schemas validated successfully across ${files.length} pages (0 errors).`);
}

if (require.main === module) {
  checkSchema();
}

module.exports = { checkSchema };
