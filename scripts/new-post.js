#!/usr/bin/env node
/**
 * scripts/new-post.js
 * Scaffolds a new blog post in src/blog/<slugified-title>.md
 * Usage: npm run new-post -- "<Post title>" <tool-slug>
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_FILE = path.join(ROOT, 'src', '_data', 'tools.json');
const BLOG_DIR = path.join(ROOT, 'src', 'blog');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npm run new-post -- "<Post title>" <tool-slug>');
    console.error('Example: npm run new-post -- "How to Calculate Percentage Increase" percentage-change-calculator');
    process.exit(1);
  }

  const title = args[0].trim();
  const toolSlug = args[1].trim();

  if (!title) {
    console.error('Error: Post title cannot be empty.');
    process.exit(1);
  }

  if (!toolSlug) {
    console.error('Error: Tool slug cannot be empty.');
    process.exit(1);
  }

  if (!fs.existsSync(TOOLS_FILE)) {
    console.error(`Error: tools.json not found at ${TOOLS_FILE}`);
    process.exit(1);
  }

  let tools = [];
  try {
    tools = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
  } catch (e) {
    console.error(`Error parsing tools.json: ${e.message}`);
    process.exit(1);
  }

  const validTool = tools.find(t => t.slug === toolSlug);
  if (!validTool) {
    console.error(`Error: Tool slug "${toolSlug}" not found in tools.json.`);
    console.error(`Available tool slugs:\n  - ${tools.map(t => t.slug).join('\n  - ')}`);
    process.exit(1);
  }

  const slug = slugify(title);
  if (!slug) {
    console.error(`Error: Unable to generate a valid slug from title: "${title}"`);
    process.exit(1);
  }

  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  const targetFile = path.join(BLOG_DIR, `${slug}.md`);
  if (fs.existsSync(targetFile)) {
    console.error(`Error: Blog post file already exists at ${path.relative(ROOT, targetFile)}`);
    process.exit(1);
  }

  const today = getTodayString();

  const fileContent = `---
title: ${JSON.stringify(title)}
description: "" # 140-155 chars
date: ${today}
updated: ${today}
tool: "${toolSlug}"
faqs:
  - question: ""
    answer: ""
  - question: ""
    answer: ""
  - question: ""
    answer: ""
draft: true
---

## Quick answer

## How it works / formula

## Worked example

## Common mistakes

## FAQ

## Try the tool
`;

  fs.writeFileSync(targetFile, fileContent, 'utf8');
  console.log(`✅ Created new draft post: ${path.relative(ROOT, targetFile)}`);
  console.log(`   Title: ${title}`);
  console.log(`   Tool: ${toolSlug} (${validTool.name})`);
  console.log(`   Status: draft: true`);
}

if (require.main === module) {
  main();
}

module.exports = { slugify, getTodayString };
