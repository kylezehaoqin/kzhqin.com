// Tiny static server for tests: serves a build folder the way Caddy does in
// production (site.caddy): /x -> x.html, unknown paths -> 404.html with a 404.
// With PRESENCE_URL set, /presence/* is proxied there (like Caddy).
// Usage: node scripts/serve.mjs <dir> <port>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [dir = "dist", port = "4400"] = process.argv.slice(2);
const root = path.resolve(dir);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".xml": "application/xml", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".jpg": "image/jpeg", ".pdf": "application/pdf" };

function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  for (const p of [clean, `${clean}.html`, path.join(clean, "index.html")]) {
    const full = path.join(root, p);
    if (full.startsWith(root) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

const PRESENCE = process.env.PRESENCE_URL;
function proxy(req, res) {
  const up = http.request(PRESENCE + req.url, {
    method: req.method,
    headers: { ...req.headers, "x-forwarded-for": req.socket.remoteAddress ?? "" },
  }, (r) => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res); });
  up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  res.on("close", () => up.destroy());
  req.pipe(up);
}

http.createServer((req, res) => {
  if (PRESENCE && req.url?.startsWith("/presence/")) return proxy(req, res);
  const file = resolve(req.url ?? "/");
  const status = file ? 200 : 404;
  const body = file ?? path.join(root, "404.html");
  res.writeHead(status, { "Content-Type": TYPES[path.extname(body)] ?? "application/octet-stream" });
  fs.createReadStream(body).pipe(res);
}).listen(Number(port), "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
