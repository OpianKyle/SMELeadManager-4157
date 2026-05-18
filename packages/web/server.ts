import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import app from "./src/api/index";
import { startAutomation } from "./src/api/automation";

const PORT = parseInt(process.env.PORT ?? "5000");
const DIST = join(import.meta.dir, "dist");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".webp": "image/webp",
};

startAutomation();

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/api")) {
      return app.fetch(req);
    }

    let filePath = join(DIST, url.pathname);

    if (!existsSync(filePath) || filePath === DIST || filePath === DIST + "/") {
      filePath = join(DIST, "index.html");
    }

    try {
      const file = readFileSync(filePath);
      const ext = extname(filePath);
      return new Response(file, {
        headers: {
          "Content-Type": MIME[ext] ?? "application/octet-stream",
          ...(ext === ".html"
            ? { "Cache-Control": "no-cache" }
            : { "Cache-Control": "public, max-age=31536000, immutable" }),
        },
      });
    } catch {
      const index = readFileSync(join(DIST, "index.html"));
      return new Response(index, {
        headers: { "Content-Type": "text/html", "Cache-Control": "no-cache" },
      });
    }
  },
});

console.log(`[server] Production server running on http://0.0.0.0:${PORT}`);
