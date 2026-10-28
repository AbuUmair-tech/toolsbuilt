#!/usr/bin/env node
/**
 * scripts/indexnow.js
 * Submits updated site URLs to search engines via the IndexNow API.
 * Run manually after production deployments. (Do NOT run in CI).
 *
 * Usage:
 *   node scripts/indexnow.js
 *   node scripts/indexnow.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, '_site', 'sitemap.xml');
const INDEXNOW_DATA_PATH = path.join(ROOT, 'src', '_data', 'indexnow.json');
const HOST = 'toolsbuilt.com';

function getIndexNowKey() {
  if (fs.existsSync(INDEXNOW_DATA_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(INDEXNOW_DATA_PATH, 'utf8'));
      if (data && data.key) return data.key;
    } catch (e) {}
  }
  return '8f3b610c3b24479383637e7592cfdf36';
}

function extractUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`❌ Sitemap not found at ${SITEMAP_PATH}. Build production site first (npm run build:prod).`);
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  const urls = locMatches
    .map(m => m[1].trim())
    .filter(u => u.startsWith(`https://${HOST}`) && !u.includes('design-system'));

  return [...new Set(urls)];
}

function submitToIndexNow(key, urls, dryRun = false) {
  const payload = JSON.stringify({
    host: HOST,
    key: key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList: urls
  }, null, 2);

  console.log('========================================================');
  console.log('                 IndexNow Submission                    ');
  console.log('========================================================');
  console.log(`Host:         ${HOST}`);
  console.log(`Key:          ${key}`);
  console.log(`Key Location: https://${HOST}/${key}.txt`);
  console.log(`Total URLs:   ${urls.length}`);
  console.log('========================================================\n');

  if (dryRun) {
    console.log('🔎 [DRY RUN] Payload preview:');
    console.log(payload);
    console.log('\n✅ Dry run completed successfully. No HTTP request sent.');
    return;
  }

  const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, res => {
    let responseBody = '';
    res.on('data', chunk => { responseBody += chunk; });
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode === 200) {
        console.log('🎉 URLs submitted successfully (200 OK)!');
      } else if (res.statusCode === 202) {
        console.log('⏳ URLs accepted for processing (202 Accepted, key validation pending).');
      } else {
        console.warn(`⚠️  Unexpected response (${res.statusCode}): ${responseBody}`);
      }
    });
  });

  req.on('error', err => {
    console.error(`❌ IndexNow request failed: ${err.message}`);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const key = getIndexNowKey();
const urls = extractUrlsFromSitemap();

submitToIndexNow(key, urls, isDryRun);
