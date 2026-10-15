# CLAUDE.md: kzhqin.com

Kyle Qin's personal site. It is in the header of every resume, so it must never break.

## Read first

- **Server and deploy reference:** `~/dev/vps/MANUAL.md` (private repo `kylezehaoqin/infra`).
- **Past bugs and the rules that came from them:** `~/dev/vps/docs/LESSONS.md`. Follow its "Rules" section.
- **Redesign in progress:** `docs/design/2026-10-14-redesign.md`. It records every decision so far and the next step. Continue from there; do not restart the design.

## Keep the working docs current (Kyle's request)

`docs/` is a **gitignored**, local-only folder. Update it in the same session as the work:

- `docs/LOG.md`: every increment, newest first (what changed, why, how it was checked).
- `docs/ERRORS.md`: every error or mistake, with the cause, the fix, and a rule.
- `docs/TODO.md`: open tasks; mark who it needs (Kyle or Claude).
- `docs/design/`: design decisions and rejected options.

Because `docs/` is not in git, it exists only on Kyle's Mac. Never reference its content from a published file.

## How a deploy works

1. Push to `main`. GitHub Actions runs `.github/workflows/deploy.yml`.
2. The workflow checks the page, then sends a `tar.gz` over SSH to `deploy@89.116.191.153`.
3. On the VPS, sshd allows that key to run only `deploy-gate static kzhqin.com`. The gate checks the upload, unpacks it into `/srv/kzhqin.com/releases/<sha>`, and switches the `current` symlink. If the smoke check fails, it switches back.

**Only `dist/` (the Astro build output) is published:** `tar -czf - -C dist .`. Everything else in this repo stays off the site. But the repo is **public on GitHub**, so anything committed is readable there; `docs/` and `src/content/drafts/` are gitignored for that reason.

The workflow has two jobs: `check` (every push and PR: `astro check`, Vitest, build, `verify-dist`, Playwright on a fixture build) and `deploy` (main only, ships the artifact `check` built).

## Before you commit

```bash
if npm run check && npm test && npm run build && npm run verify && npm run build:e2e && npm run test:e2e; then
  git add -A && git commit -m "…"
fi
```

Structure and content model: `README.md` (how to write a note) and `docs/design/2026-10-14-astro-spec.md`.

## Verify and roll back

- Watch a deploy: `gh run list -R kylezehaoqin/kzhqin.com --limit 1`, then `gh run watch <id> -R kylezehaoqin/kzhqin.com --exit-status`.
- Check the live site **from outside**: Kyle's Mac often runs a VPN proxy that breaks connections to the VPS. Use https://check-host.net (its JSON API works with curl), not `curl` from the Mac.
- Exit codes in a red log: 0 deployed, 1 rolled back, 4 refused (details: MANUAL §5).
- Roll back: re-run the Actions job of the last good commit.

## Never

- Never SSH as `deploy`, and never edit files on the VPS by hand. Server changes go through `~/dev/vps` and `./bootstrap.sh`, which Kyle runs (it needs his sudo password).
- Never put secrets, the phone number, or private notes in a published file.
- Never invent facts in site copy. Facts come from `~/dev/opensource-projects/career-ops/cv.md`. Copy is in Kyle's voice: `~/dev/opensource-projects/career-ops/voice-dna.md` (no em dashes, contractions, no banned words).

## Shell pitfalls on this Mac (from LESSONS.md)

- The Bash tool runs **zsh**: no `PIPESTATUS`, no `timeout`. `ls` is an eza alias that can hang; use `/bin/ls`.
- Commit only inside `if <checks>; then git commit …; fi`. Never chain a commit after `grep` of test output.
- Give every scripted `ssh` the input `< /dev/null`.
