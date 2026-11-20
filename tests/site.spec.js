import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import yaml from "js-yaml";

const load = async (file) =>
  yaml.load(await readFile(new URL(`../src/_data/${file}`, import.meta.url), "utf8"));

const site = await load("site.yml");
const content = {};
for (const lang of site.languages) content[lang.code] = await load(`resume/${lang.code}.yml`);

// Text differs between languages; everything else (which entries exist, how many
// bullets they have, their dates and links) must not.
const shape = (value, key = "") => {
  if (Array.isArray(value)) return value.map((item) => shape(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v, k)]));
  }
  return ["start", "end", "url"].includes(key) ? value : typeof value;
};

// Links written inside sentences as [text](https://address), in order.
const inlineLinks = (value) =>
  [...JSON.stringify(value).matchAll(/\]\((https?:[^)\s]+)\)/g)].map((match) => match[1]);

test("every language file has the same structure, dates and links", () => {
  const [first, ...rest] = site.languages;
  for (const lang of rest) {
    expect(shape(content[lang.code]), `${lang.code}.yml vs ${first.code}.yml`).toEqual(
      shape(content[first.code]),
    );
    expect(inlineLinks(content[lang.code]), `links inside sentences in ${lang.code}.yml`).toEqual(
      inlineLinks(content[first.code]),
    );
  }
});

for (const lang of site.languages) {
  const text = content[lang.code];

  test.describe(`${lang.label} page`, () => {
    test("renders the resume with nothing failing to load", async ({ page }) => {
      const problems = [];
      page.on("pageerror", (error) => problems.push(error.message));
      page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
      page.on("response", (response) => {
        if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
      });

      await page.goto(lang.path);

      await expect(page).toHaveTitle(`${site.name} | ${text.title}`);
      await expect(page.locator("html")).toHaveAttribute("lang", lang.code);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(site.name);
      for (const section of ["about", "experience", "projects", "skills", "education", "certification"]) {
        await expect(page.getByRole("heading", { level: 2, name: text.ui[section] })).toBeVisible();
      }
      await expect(page.locator(".highlights li")).toHaveCount(text.about.highlights.length);
      for (const url of inlineLinks(text)) {
        await expect(page.locator(`main a[href="${url}"]`)).toHaveCount(1);
      }
      await expect(page.locator("main")).not.toContainText("](");
      await expect(page.locator(".job .role").first()).toHaveText(text.experience[0].role);
      await expect(page.locator(".bullets li")).toHaveCount(
        text.experience.reduce((total, job) => total + job.bullets.length, 0),
      );
      await expect(page.getByRole("link", { name: text.ui.email, exact: true })).toHaveAttribute(
        "href",
        `mailto:${site.email}`,
      );
      expect(problems).toEqual([]);
    });

    test("fits a phone screen without sideways scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(lang.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    test("offers a PDF of at most two pages", async ({ page, request }) => {
      await page.goto(lang.path);
      const link = page.getByRole("link", { name: text.ui.download });
      await expect(link).toHaveAttribute("download", "");

      const href = await link.getAttribute("href");
      expect(href.endsWith(lang.pdf)).toBe(true);

      const response = await request.get(new URL(href, page.url()).href);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");

      const pdf = (await response.body()).toString("latin1");
      expect(pdf.startsWith("%PDF-")).toBe(true);
      const pages = pdf.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || [];
      expect(pages.length).toBeGreaterThanOrEqual(1);
      expect(pages.length, "the PDF should stay within two pages").toBeLessThanOrEqual(2);
    });
  });
}

test("the language switch goes to the other language and back", async ({ page }) => {
  const [en, tr] = site.languages;
  await page.goto(en.path);

  await page.getByRole("link", { name: tr.label, exact: true }).click();
  await expect(page).toHaveURL(/\/resume\/tr\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", tr.code);
  await expect(page.getByRole("link", { name: tr.label, exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: en.label, exact: true }).click();
  await expect(page).toHaveURL(/\/resume\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", en.code);
});

test("on a wide screen the sidebar stays in view while the resume scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("");
  await page.mouse.wheel(0, 1500);
  await expect(page.locator(".sidebar .photo")).toBeInViewport();
});

test("print layout is light, with contact details written out", async ({ page }) => {
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".links")).toBeHidden();
  await expect(page.locator(".photo")).toBeHidden();
  await expect(page.getByText(site.links[1].display)).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(255, 255, 255)",
  );
});
