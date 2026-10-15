// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://kzhqin.com",
  trailingSlash: "never",
  outDir: process.env.KZ_OUT ?? "dist", // the E2E build writes dist-e2e
  build: { format: "file" }, // /notes/x is served from notes/x.html (Caddy try_files)
  // Astro 7 defaults to 'jsx', which drops spaces between inline elements
  // ("Kyle.<span>…" would lose its space). true keeps one space, like Astro 6.
  compressHTML: true,
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" } },
  },
});
