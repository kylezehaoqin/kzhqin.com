import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const note = z.object({
  title: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  kind: z.enum(["finding", "workflow", "note"]),
  tags: z.array(z.string()).default([]),
  summary: z.string().max(160),
  draft: z.boolean().default(false),
});

// Published notes: committed, so public on GitHub (draft: true hides from the site only).
const notes = defineCollection({
  // KZ_NOTES_DIR lets the E2E build use fixture notes (tests/fixtures/notes).
  loader: glob({ base: process.env.KZ_NOTES_DIR ?? "./src/content/notes", pattern: "**/*.{md,mdx}" }),
  schema: note,
});

// Private drafts: the folder is gitignored; only `astro dev` renders them.
const drafts = defineCollection({
  loader: glob({ base: "./src/content/drafts", pattern: "**/*.{md,mdx}" }),
  schema: note,
});

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.md" }),
  schema: z.object({
    name: z.string(),
    year: z.number().int(),
    tags: z.array(z.string()).min(1).max(4),
    summary: z.string().max(140),
    period: z.string(), // "Sep 2026–present", shown on the project page
    role: z.string().optional(), // for team projects: "Technical Product Manager, 5-person team"
    repo: z.url().optional(),
    live: z.url().optional(), // a hosted version, when there is one
    order: z.number().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { notes, drafts, projects };
