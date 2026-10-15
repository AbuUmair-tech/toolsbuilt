const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const tools = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => fs.statSync(path.join(ROOT, 'tools', f)).isDirectory());

const styledTools = [
  'text-case-converter',
  'password-generator',
  'discount-calculator',
  'percentage-change-calculator'
];

for (const slug of tools) {
  const htmlPath = path.join(ROOT, 'tools', slug, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // H1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].trim() : '';

  // Extract HowTo JSON-LD
  let howto = null;
  const howtoMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (howtoMatch) {
    for (const block of howtoMatch) {
      const jsonText = block.replace(/<\/?script[^>]*>/gi, '').trim();
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed['@type'] === 'HowTo') {
          howto = {
            name: parsed.name || '',
            description: parsed.description || '',
            steps: (parsed.step || []).map(s => ({
              name: s.name || '',
              text: (s.text || '').replace(/"/g, '\\"')
            }))
          };
        }
      } catch (e) {}
    }
  }

  // Extract FAQPage JSON-LD
  let faqs = [];
  if (howtoMatch) {
    for (const block of howtoMatch) {
      const jsonText = block.replace(/<\/?script[^>]*>/gi, '').trim();
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed['@type'] === 'FAQPage' && Array.isArray(parsed.mainEntity)) {
          faqs = parsed.mainEntity.map(item => ({
            q: (item.name || '').replace(/"/g, '\\"'),
            a: (item.acceptedAnswer?.text || '').replace(/"/g, '\\"')
          }));
        }
      } catch (e) {}
    }
  }

  // Extract inner HTML between </header> (the page header inside <main>) and the FAQ or Related section
  const mainIdx = html.indexOf('<main id="main-content"');
  if (mainIdx === -1) {
    console.error(`Cannot find <main> in ${slug}`);
    continue;
  }
  const mainPart = html.slice(mainIdx);
  const pageHeaderEnd = mainPart.indexOf('</header>');
  if (pageHeaderEnd === -1) {
    console.error(`Cannot find </header> in ${slug}`);
    continue;
  }

  let contentStart = pageHeaderEnd + '</header>'.length;
  let contentEnd = -1;

  // Find stop marker: FAQ section or Related section or </main>
  const faqIdx = mainPart.indexOf('<section class="faq-section"');
  const relatedIdx = mainPart.indexOf('<section style="margin: 4rem 0 2rem 0;"');
  const endMainIdx = mainPart.indexOf('</main>');

  if (faqIdx !== -1) {
    contentEnd = faqIdx;
  } else if (relatedIdx !== -1) {
    contentEnd = relatedIdx;
  } else if (endMainIdx !== -1) {
    contentEnd = endMainIdx;
  }

  let innerContent = mainPart.slice(contentStart, contentEnd).trim();

  // Strip trailing AdSense placeholder comments if they appear at the very end
  // We keep all inner content as-is

  const extraCss = styledTools.includes(slug) ? `/tools/${slug}/style.css` : null;

  // Construct Nunjucks file
  let frontMatter = `---
layout: layouts/tool.njk
toolSlug: ${slug}
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
permalink: /tools/${slug}/
h1: "${h1.replace(/"/g, '\\"')}"`;

  if (extraCss) {
    frontMatter += `\nextraCss: "${extraCss}"`;
  }

  if (howto) {
    frontMatter += `\nhowto:
  name: "${howto.name.replace(/"/g, '\\"')}"
  description: "${howto.description.replace(/"/g, '\\"')}"
  steps:`;
    for (const step of howto.steps) {
      frontMatter += `
    - name: "${step.name}"
      text: "${step.text}"`;
    }
  }

  if (faqs.length > 0) {
    frontMatter += `\nfaqs:`;
    for (const faq of faqs) {
      frontMatter += `
  - q: "${faq.q}"
    a: "${faq.a}"`;
    }
  }

  frontMatter += `\n---\n\n`;

  const targetDir = path.join(ROOT, 'src', 'tools', slug);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.njk'), frontMatter + innerContent + '\n');
  console.log(`Ported tool: ${slug}`);
}

console.log('All tools ported successfully!');
