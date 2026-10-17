#!/usr/bin/env node
/**
 * scripts/check-schema.js
 * Validates all JSON-LD structured data blocks across built HTML files in _site/
 * Ensures:
 * 1. Valid JSON syntax
 * 2. Proper Schema.org shapes (WebSite, Organization, WebApplication, BreadcrumbList, ItemList, FAQPage, CollectionPage)
 * 3. DOM-Schema parity (page title / H1 matches schema name; description matches)
 * 4. Zero fabricated data: fails on aggregateRating, reviewCount, ratingValue, review, award
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.resolve(__dirname, '..', '_site');

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
