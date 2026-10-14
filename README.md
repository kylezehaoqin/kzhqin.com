# kzhqin.com

Kyle Qin's personal site: plain HTML and CSS, no build step.

- Preview: `python3 -m http.server 8765`, then open http://127.0.0.1:8765
- Publish: push to `main`. GitHub Actions sends the files to the VPS, and the change is live in about a minute.
- Roll back: open the Actions run of the last good commit and click **Re-run jobs**.

How the server side works: see `MANUAL.md` in the private `kylezehaoqin/infra` repo.
