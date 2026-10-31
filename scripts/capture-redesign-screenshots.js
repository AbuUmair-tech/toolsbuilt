#!/usr/bin/env node
/**
 * Captures redesign review screenshots from a running server (default: npm run dev).
 *
 * Usage: node scripts/capture-redesign-screenshots.js [baseUrl] [prefix] [pages]
 *   baseUrl  defaults to http://localhost:8080
 *   prefix   optional filename prefix, e.g. "before-"
 *   pages    optional comma-separated page names to capture, e.g. "home,tools-directory"
 *
 * Output: docs/screenshots/redesign/<prefix><page>-<width>-<theme>.png
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots', 'redesign');
const BASE_URL = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const PREFIX = process.argv[3] || '';

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'category-math-finance', path: '/category/math-finance/' },
  { name: 'percentage-change-calculator', path: '/tools/percentage-change-calculator/' },
  { name: 'tools-directory', path: '/tools/' }
];
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 }
];
const THEMES = ['light', 'dark'];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp, colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript(t => {
        try {
          localStorage.setItem('theme', t);
          localStorage.setItem('tb_cookie_consent', 'rejected');
        } catch (e) {}
      }, theme);
      const page = await context.newPage();
      for (const p of PAGES.filter(pg => !ONLY || ONLY.includes(pg.name))) {
        // The dev server keeps a live-reload socket open, so wait for load + fonts, not networkidle
        await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(300);
        const file = path.join(OUT_DIR, `${PREFIX}${p.name}-${vp.width}-${theme}.png`);
        // fullPage mode resizes the view mid-capture, which can stall on resize-driven layout
        // scripts; grow the viewport to the page height instead and take a plain screenshot.
        // Freeze viewport-relative min-heights first, or the taller viewport stretches <main>
        // and pushes the footer out of the captured area.
        const height = await page.evaluate(() => {
          const main = document.getElementById('main-content');
          if (main) main.style.minHeight = getComputedStyle(main).minHeight;
          return document.documentElement.scrollHeight;
        });
        await page.setViewportSize({ width: vp.width, height });
        await page.waitForTimeout(300);
        await page.screenshot({ path: file, animations: 'disabled', timeout: 90000 });
        await page.setViewportSize(vp);
        console.log(`Saved ${path.relative(ROOT, file)}`);
      }
      await context.close();
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
