# Egecan Şen — Resume

The source of my web resume. One template, two languages (English and Turkish),
and a PDF per language that is generated from the page on every deploy.

## Editing the content

All text lives in three files. You never need to touch the HTML.

| File | What is in it |
|---|---|
| `src/_data/site.yml` | Name, email, links, PDF file names: the things that are the same in every language |
| `src/_data/resume/en.yml` | English text |
| `src/_data/resume/tr.yml` | Turkish text |

The two language files must keep the same structure: the same entries in the
same order, the same number of bullets, the same dates and links. Change one,
change the other. The tests fail if they drift apart.

Push to `main` and GitHub Actions rebuilds the site and the PDFs. On a pull
request the same checks run without deploying.

## Running it locally

Needs Node 20 or newer.

```bash
npm install
npx playwright install chromium   # once: the browser that prints the PDFs and runs the tests

npm run dev       # live-reloading preview while you edit (no PDFs)
npm run build     # full build into _site/, including the PDFs
npm run preview   # serve _site/ at http://127.0.0.1:4173/resume/, the way GitHub Pages does
npm test          # run the checks against the built site
```

If you would rather use the Chrome you already have than download Chromium,
prefix the build and test commands with `PW_CHANNEL=chrome`.

## What the checks cover

- Both language files have the same structure, dates and links
- Each page renders, in the right language, with nothing failing to load
- No sideways scrolling on a phone-sized screen
- Each language has a PDF, and it is at most two pages
- The language switch and the theme toggle work
- The print layout hides the on-screen controls

## How it is put together

- [Eleventy](https://www.11ty.dev/) turns `src/resume.njk` and the YAML files into `_site/`
- `scripts/make-pdf.mjs` prints each page to A4 with the print styles in `src/assets/css/style.css`
- `scripts/serve.mjs` serves the build under `/resume/` for previews and tests
- `tests/site.spec.js` holds the [Playwright](https://playwright.dev/) checks
- `.github/workflows/deploy.yml` builds, tests and deploys

The typeface is [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/),
used under the SIL Open Font License (`src/assets/fonts/OFL.txt`).
