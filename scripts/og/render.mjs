// Renders the social preview card and the iOS icon into public/. Run it by hand after
// a change to card.html or icon.html: `node scripts/og/render.mjs`. The PNGs are committed,
// so the build and CI never need a browser for them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const font = (pkg, family, weight) => {
  const file = path.join("node_modules/@fontsource", pkg, "files", `${pkg}-latin-${weight}-normal.woff2`);
  const data = fs.readFileSync(file).toString("base64");
  return `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format("woff2"); }`;
};
// Inline the fonts as data URLs: a page made with setContent cannot load file:// fonts.
const fonts = [
  font("nunito", "Nunito", 800),
  font("geist-sans", "Geist Sans", 500),
  font("geist-mono", "Geist Mono", 500),
  font("geist-mono", "Geist Mono", 600),
].join("\n");

const jobs = [
  { src: "card.html", out: "public/og.png", width: 1200, height: 630 },
  { src: "icon.html", out: "public/apple-touch-icon.png", width: 180, height: 180 },
];

const browser = await chromium.launch();
try {
  for (const { src, out, width, height } of jobs) {
    const page = await browser.newPage({ viewport: { width, height } });
    const html = fs.readFileSync(path.join(here, src), "utf8").replace("/*FONTS*/", fonts);
    await page.setContent(html, { waitUntil: "load" });
    // Load every face, used or not, so a bad font file fails here and not silently.
    await page.evaluate(() => Promise.allSettled([...document.fonts].map((f) => f.load())));
    const missing = await page.evaluate(() => [...document.fonts].filter((f) => f.status !== "loaded").map((f) => f.family));
    if (missing.length) throw new Error(`${src}: fonts not loaded: ${missing.join(", ")}`);
    await page.screenshot({ path: out, type: "png" });
    console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
    await page.close();
  }
} finally {
  await browser.close();
}
