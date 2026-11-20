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

test("every language file has the same structure, dates and links", () => {
  const [first, ...rest] = site.languages;
  for (const lang of rest) {
    expect(shape(content[lang.code]), `${lang.code}.yml vs ${first.code}.yml`).toEqual(
      shape(content[first.code]),
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
      for (const section of ["experience", "projects", "skills", "education", "certification"]) {
        await expect(page.getByRole("heading", { level: 2, name: text.ui[section] })).toBeVisible();
      }
      await expect(page.locator("main article h3").first()).toHaveText(text.experience[0].role);
      await expect(page.locator(".bullets li")).toHaveCount(
        text.experience.reduce((total, job) => total + job.bullets.length, 0),
      );
      await expect(page.getByRole("link", { name: site.email })).toHaveAttribute(
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
  await expect(page.getByRole("link", { name: tr.label, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: en.label, exact: true }).click();
  await expect(page).toHaveURL(/\/resume\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", en.code);
});

test("the theme toggle switches theme and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await background();

  await page.getByRole("button", { name: content.en.ui.theme }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await background()).not.toBe(light);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("print layout hides the on-screen controls", async ({ page }) => {
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".controls")).toBeHidden();
  await expect(page.locator(".photo")).toBeHidden();
  await expect(page.getByText(site.links[1].display)).toBeVisible();
});
