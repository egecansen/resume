import { defineConfig } from "@playwright/test";

// The tests run against the built site (`npm run build` first), served under
// /resume/ exactly as GitHub Pages serves it.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/resume/",
    // CI uses Playwright's own Chromium. Set PW_CHANNEL=chrome to use an installed Chrome.
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173/resume/",
    reuseExistingServer: !process.env.CI,
  },
});
