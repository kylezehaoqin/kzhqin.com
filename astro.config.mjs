// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";

// The sitemap lists /notes only once a note is published, like every other
// link to it (verify-dist step 5 checks this).
const notesDir = process.env.KZ_NOTES_DIR ?? "./src/content/notes";
const hasNotes = fs.existsSync(notesDir) && fs.readdirSync(notesDir, { recursive: true })
  .map(String).filter((f) => /\.mdx?$/.test(f))
  .some((f) => !/^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(notesDir, f), "utf8")));

export default defineConfig({
  site: "https://kzhqin.com",
  trailingSlash: "never",
  outDir: process.env.KZ_OUT ?? "dist", // the E2E build writes dist-e2e
  build: { format: "file" }, // /notes/x is served from notes/x.html (Caddy try_files)
  // Astro 7 defaults to 'jsx', which drops spaces between inline elements
  // ("Kyle.<span>…" would lose its space). true keeps one space, like Astro 6.
  compressHTML: true,
  integrations: [mdx(), sitemap({ filter: (page) => hasNotes || !/\/notes(\/|$)/.test(new URL(page).pathname) })],
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" } },
  },
});
