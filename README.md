# kzhqin.com

Kyle Qin's personal site: projects and notes. Astro + MDX, static output.

## Write a note

1. Make `src/content/notes/<slug>.mdx`. The file name becomes the URL: `/notes/<slug>`.
   ```mdx
   ---
   title: "Measure the index, don't guess"
   date: 2026-09-30
   kind: finding            # finding | workflow | note
   tags: [postgres]
   summary: "One line, 160 characters at most. Shown in lists, RSS, and search."
   ---
   import Callout from "../../components/mdx/Callout.astro";

   Text in Markdown. Code fences get syntax highlighting and a copy button.

   <Callout label="Note">Use components where they help.</Callout>
   ```
2. Preview: `npm run dev`, then open http://localhost:4321.
3. Publish: `git push` to `main`. The note is live in about 3 minutes.

**Drafts:** this repo is public. `draft: true` hides a note from the site, but anyone can read it on GitHub. For private drafts, use `src/content/drafts/` (gitignored). `npm run dev` shows them; builds never include them.

## Add a project

Make `src/content/projects/<slug>.md` with `name`, `year`, `period` (for example `Sep 2026–present`), `tags` (1-4), `summary` (140 characters at most), and optional `role`, `repo`, `live`, `order`, and `featured` (the home page shows up to 4 featured projects). The Markdown body becomes the page at `/projects/<slug>`; use `##` headings for each story.

Skills on the home and about pages live in `src/data/skills.ts`. Each domain lists project ids as proof; the build fails if an id does not exist.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview with drafts |
| `npm run build` | Production build into `dist/` |
| `npm run check` | Types and frontmatter |
| `npm test` | Unit tests |
| `npm run verify` | Checks `dist/`: links, TODOs, drafts, size, JS budget |
| `npm run build:e2e && npm run test:e2e` | End-to-end tests on a build with fixture notes (they start the presence servers too) |
| `npm run presence` | The live presence service on port 8090, for `npm run dev` |

## Live presence

Other visitors on the same page show as soft dots in the side margins, and the status bar shows `● N here` for the whole site. The service is in `presence/`: Node with no npm dependencies, Server-Sent Events plus small POSTs, nothing stored. Locally, run `npm run presence` next to `npm run dev`. Visitors can opt out with `:presence off`.

It deploys on its own with `.github/workflows/presence.yml` (only when `presence/` changes) as a `deploy-gate` app; server side: `apps/presence` in `kylezehaoqin/infra`. If the service is down, the site works as before and the `● N` segment hides.

## How it deploys

GitHub Actions runs every check above on each push. On `main`, it sends only `dist/` to the VPS, where `deploy-gate` switches the site over atomically and rolls back on its own if the smoke check fails. To roll back by hand, re-run the Actions job of the last good commit. Server side: `MANUAL.md` in the private `kylezehaoqin/infra` repo.

Try pressing `:` on the site. Then press `?`. The finder has INSERT and NORMAL modes, like Telescope.
