// Prints each language's page to an A4 PDF, using the print styles in style.css.
// Runs after `eleventy`, so the PDFs always match what is on the site.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import yaml from "js-yaml";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const siteDir = resolve(root, "_site");
const site = yaml.load(await readFile(resolve(root, "src/_data/site.yml"), "utf8"));

// CI uses Playwright's own Chromium. Set PW_CHANNEL=chrome to use an installed Chrome instead.
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });

try {
  for (const lang of site.languages) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(siteDir, lang.path, "index.html")).href);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: resolve(siteDir, lang.pdf),
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
    });
    await page.close();
    console.log(`[pdf] Wrote _site/${lang.pdf}`);
  }
} finally {
  await browser.close();
}
