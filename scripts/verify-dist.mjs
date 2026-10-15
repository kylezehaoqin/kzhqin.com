// Checks the built site before it may deploy. Usage: node scripts/verify-dist.mjs [dir]
// Fails on: broken internal links/assets, "TODO" in HTML, any draft in the output,
// dist over 20 MB, missing index.html/404.html, or home-page JS over 30 KB gzipped.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dir = path.resolve(process.argv[2] ?? "dist");
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_HOME_JS_GZ = 30 * 1024;
const errors = [];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(dir);
const rel = (f) => "/" + path.relative(dir, f).split(path.sep).join("/");
const exists = (urlPath) => {
  const p = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  return [p, `${p}.html`, path.posix.join(p, "index.html")].some((c) => fs.existsSync(path.join(dir, c)) && fs.statSync(path.join(dir, c)).isFile());
};

// 1. Required files.
for (const f of ["index.html", "404.html"]) if (!fs.existsSync(path.join(dir, f))) errors.push(`missing ${f}`);

// 2. Total size.
const total = files.reduce((s, f) => s + fs.statSync(f).size, 0);
if (total > MAX_BYTES) errors.push(`dist is ${(total / 1048576).toFixed(1)} MB (limit 20 MB)`);

// 3. Links, assets, and TODOs in every HTML file.
for (const f of files.filter((x) => x.endsWith(".html"))) {
  const html = fs.readFileSync(f, "utf8");
  if (/TODO/.test(html)) errors.push(`${rel(f)}: contains "TODO"`);
  for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (!url.startsWith("/") || url.startsWith("//")) continue; // external, mailto, anchors
    if (url === "/" || exists(url)) continue;
    errors.push(`${rel(f)}: broken link ${url}`);
  }
}

// 4. No drafts: draft: true in published notes, or anything in the private drafts folder.
const draftIds = [];
const notesDir = process.env.KZ_NOTES_DIR ?? "src/content/notes";
for (const d of [notesDir, "src/content/drafts"]) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /\.mdx?$/.test(x))) {
    const src = fs.readFileSync(path.join(d, f), "utf8");
    const isPrivate = d.endsWith("drafts");
    if (isPrivate || /^draft:\s*true\s*$/m.test(src.split("---")[1] ?? "")) draftIds.push(f.replace(/\.mdx?$/, "").toLowerCase());
  }
}
const textOut = files.filter((f) => /\.(html|json|xml)$/.test(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const id of draftIds) {
  if (fs.existsSync(path.join(dir, "notes", `${id}.html`)) || textOut.includes(`/notes/${id}"`) || textOut.includes(`/notes/${id}<`))
    errors.push(`draft "${id}" is in the build`);
}

// 5. JavaScript the home page loads.
const home = fs.existsSync(path.join(dir, "index.html")) ? fs.readFileSync(path.join(dir, "index.html"), "utf8") : "";
let homeJs = 0;
for (const [, src] of home.matchAll(/<script[^>]+src="(\/[^"]+)"/g)) homeJs += zlib.gzipSync(fs.readFileSync(path.join(dir, src))).length;
for (const [, body] of home.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) homeJs += zlib.gzipSync(body).length;
if (homeJs > MAX_HOME_JS_GZ) errors.push(`home page loads ${(homeJs / 1024).toFixed(1)} KB of JS gzipped (limit 30 KB)`);

if (errors.length) {
  console.error(`verify-dist: ${errors.length} problem(s) in ${dir}\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`verify-dist: ok (${files.length} files, ${(total / 1024).toFixed(0)} KB, home JS ${(homeJs / 1024).toFixed(1)} KB gz)`);
