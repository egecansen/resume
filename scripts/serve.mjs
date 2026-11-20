// Serves the built site the way GitHub Pages does: under /resume/, not at the root.
// That way a link that only works at the root shows up as broken locally too.
//
//   npm run build && npm run preview   ->   http://127.0.0.1:4173/resume/

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = resolve(fileURLToPath(new URL("../_site", import.meta.url)));
const base = "/resume/";
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/" || pathname === base.slice(0, -1)) {
    res.writeHead(302, { Location: base }).end();
    return;
  }
  if (!pathname.startsWith(base)) {
    res.writeHead(404).end("Not found");
    return;
  }

  let file = join(siteDir, normalize(decodeURIComponent(pathname.slice(base.length))));
  if (!file.startsWith(siteDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: `${pathname}/` }).end();
        return;
      }
      file = join(file, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving _site at http://127.0.0.1:${port}${base}`);
});
