import yaml from "js-yaml";

// Where the site is served from. GitHub Actions passes the real Pages URL;
// the fallback is only used for local builds.
const siteUrl = (process.env.SITE_URL || "https://egecansen.github.io/resume").replace(/\/+$/, "");

const monthYear = (value, locale) =>
  new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}-01T00:00:00Z`),
  );

export default function (eleventyConfig) {
  // Content is written in YAML: src/_data/site.yml and src/_data/resume/<lang>.yml
  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("src/assets/");

  eleventyConfig.addGlobalData("build", () => ({ siteUrl, date: new Date() }));

  // "2025-09" -> "Sep 2025" (en) / "Eyl 2025" (tr)
  eleventyConfig.addFilter("monthYear", monthYear);

  // Build date -> "November 2026" (en) / "Kasım 2026" (tr)
  eleventyConfig.addFilter("longMonthYear", (date, locale) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date),
  );

  // Safe to drop inside a <script type="application/ld+json"> block.
  eleventyConfig.addFilter("jsonld", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
