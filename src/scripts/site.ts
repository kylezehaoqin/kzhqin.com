// Everything interactive on the site. Each part is optional: the pages are
// complete HTML without this script. Pure logic lives in src/lib (unit-tested).
import { rank } from "../lib/fuzzy";
import { createKeymap, LEADER_KEYS, type Action, type Page } from "../lib/keys";
import { scrollLabel } from "../lib/scrollpos";
import type { SearchEntry } from "../lib/search";

const root = document.documentElement;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const page = document.body.dataset.page ?? "home";
// Note and project pages are long reads: j/k scroll, and h goes back to the list.
const longPage = page === "note" || page === "project";
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* ---------------- theme + accent ---------------- */
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : darkQuery.matches);
function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  root.dataset.theme = next;
  store.set("theme", next === "dark" ? "night" : "paper");
  onColorsChanged();
}
function setAccent(a: "ember" | "signal") {
  if (a === "signal") root.dataset.accent = "signal";
  else delete root.dataset.accent;
  store.set("accent", a);
}
$("theme-btn")?.addEventListener("click", toggleTheme);
darkQuery.addEventListener("change", () => onColorsChanged());

/* ---------------- dot canvas: a quiet, neutral glow near the cursor ---------------- */
const canvas = $<HTMLCanvasElement>("dots");
const ctx = canvas?.getContext("2d") ?? null;
const GAP = 22, RADIUS = 110, RIPPLE_MS = 1200, RIPPLE_SPEED = 0.42, RIPPLE_BAND = 20;
let W = 0, H = 0, mx = -9999, my = -9999, frame = 0;
let dotRGB = "0,0,0", dotA = 0.08, glowA = 0.3;
const ripples: { x: number; y: number; t: number }[] = [];

function onColorsChanged() {
  const cs = getComputedStyle(root);
  dotRGB = cs.getPropertyValue("--dot-rgb").trim() || dotRGB;
  dotA = parseFloat(cs.getPropertyValue("--dot-a")) || dotA;
  glowA = parseFloat(cs.getPropertyValue("--glow-a")) || glowA;
  requestDraw();
}
function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}
function requestDraw() { if (ctx && !frame) frame = requestAnimationFrame(draw); }
function draw(now: number) {
  frame = 0;
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > RIPPLE_MS) ripples.splice(i, 1);
  for (let y = GAP / 2; y < H; y += GAP) {
    for (let x = GAP / 2; x < W; x += GAP) {
      let g = 0;
      const d = Math.hypot(x - mx, y - my);
      if (d < RADIUS) g = (1 - d / RADIUS) ** 2;
      for (const r of ripples) {
        const age = (now - r.t) / RIPPLE_MS;
        const band = Math.abs(Math.hypot(x - r.x, y - r.y) - age * RIPPLE_MS * RIPPLE_SPEED);
        if (band < RIPPLE_BAND) g = Math.max(g, (1 - band / RIPPLE_BAND) * (1 - age) * 0.8);
      }
      const a = dotA + (glowA - dotA) * g;
      const s = 1.5 + g * 1.1;
      ctx.fillStyle = `rgba(${dotRGB},${a.toFixed(3)})`;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  if (ripples.length) requestDraw();
}
if (ctx) {
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mx = e.clientX; my = e.clientY; requestDraw();
  }, { passive: true });
  document.addEventListener("pointerleave", () => { mx = my = -9999; requestDraw(); });
  addEventListener("click", (e) => {
    const t = e.target as Element;
    if (reduceMotion || t.closest("a, button, input, pre, .pane, .sl, .codeblock")) return;
    ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    requestDraw();
  });
  onColorsChanged();
  resize();
}

/* ---------------- status bar: clock, scroll position, reading progress ---------------- */
const clockEl = $("clock"), posEl = $("pos"), progressEl = $("progress");
const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short",
});
function tick() {
  if (!clockEl) return;
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  clockEl.textContent = `${p.weekday} ${p.month}/${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
}
function onScroll() {
  const sh = document.documentElement.scrollHeight;
  if (posEl) posEl.textContent = scrollLabel(scrollY, sh, innerHeight);
  if (progressEl && longPage) {
    const max = sh - innerHeight;
    progressEl.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 100}%`;
  }
}
tick(); setInterval(tick, 30_000);
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
onScroll();

/* ---------------- mode block ---------------- */
const modeEl = $("mode"), pendEl = $("pending");
function setMode(m: "NORMAL" | "COMMAND" | "LEADER") {
  if (!modeEl) return;
  modeEl.dataset.m = m;
  modeEl.textContent = m;
}

/* ---------------- finder (":" "/" or leader f) ---------------- */
type Entry = SearchEntry & { run?: () => void };
const COMMANDS: Entry[] = [
  { kind: "command", name: "theme", text: "Switch between light and dark.", href: "", run: toggleTheme },
  { kind: "command", name: "accent ember", text: "Orange accent.", href: "", run: () => setAccent("ember") },
  { kind: "command", name: "accent signal", text: "Cyan accent.", href: "", run: () => setAccent("signal") },
  { kind: "command", name: "top", text: "Scroll to the top.", href: "", run: () => scrollTo(0, 0) },
  { kind: "command", name: "help", text: "Show every key.", href: "", run: () => openWhich("help") },
];
const ICON: Record<string, string> = { page: "▸", project: "◆", command: ":", finding: "✎", workflow: "✎", note: "✎" };
const overlay = $("overlay"), picker = $("picker");
const q = $<HTMLInputElement>("finder-q"), resultsEl = $("finder-results"), countEl = $("finder-count"), previewEl = $("finder-preview");
let entries: Entry[] = COMMANDS;
let loaded: Promise<void> | null = null;
let shown: ReturnType<typeof rank<Entry>> = [];
let cur = 0;
let returnFocus: Element | null = null;

function loadIndex() {
  loaded ??= fetch("/search.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((index: SearchEntry[]) => { entries = [...index, ...COMMANDS]; })
    .catch(() => { /* offline: commands still work */ });
  return loaded;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function renderResults() {
  if (!q || !resultsEl || !countEl || !previewEl) return;
  shown = rank(entries, (e) => e.name, q.value.trim());
  cur = Math.min(cur, Math.max(0, shown.length - 1));
  countEl.textContent = `${shown.length}/${entries.length}`;
  resultsEl.innerHTML = shown.length
    ? shown.map((r, i) => {
        const hits = new Set(r.hits);
        const name = Array.from(r.item.name).map((ch, j) => (hits.has(j) ? `<mark>${esc(ch)}</mark>` : esc(ch))).join("");
        return `<li role="option" id="fr-${i}" data-i="${i}" class="${i === cur ? "on" : ""}" aria-selected="${i === cur}"><span class="ic">${ICON[r.item.kind] ?? "•"}</span><span class="nm">${name}</span><span class="kd">${esc(r.item.kind)}</span></li>`;
      }).join("")
    : `<li class="none">no match</li>`;
  q.setAttribute("aria-activedescendant", shown.length ? `fr-${cur}` : "");
  const pick = shown[cur]?.item;
  previewEl.innerHTML = '<span class="title">Preview</span>' + (pick
    ? `<span class="k">${esc(pick.kind)}${pick.meta ? " · " + esc(pick.meta) : ""}</span><h4>${esc(pick.name)}</h4><p>${esc(pick.text)}</p><span class="k">⏎ open · ctrl-j/k move · esc close</span>`
    : "");
  resultsEl.querySelector("li.on")?.scrollIntoView({ block: "nearest" });
}
function openFinder() {
  if (!overlay || !picker || !q) return;
  closeWhich();
  returnFocus = document.activeElement;
  overlay.hidden = false; picker.hidden = false;
  q.value = ""; cur = 0;
  setMode("COMMAND");
  renderResults();
  q.focus();
  loadIndex().then(renderResults);
}
function closeFinder() {
  if (!overlay || !picker) return;
  overlay.hidden = true; picker.hidden = true;
  setMode("NORMAL");
  (returnFocus as HTMLElement | null)?.focus?.();
}
function runCurrent() {
  const pick = shown[cur]?.item;
  closeFinder();
  if (!pick) return;
  if (pick.run) pick.run();
  else if (pick.href) location.href = pick.href;
}
q?.addEventListener("input", () => { cur = 0; renderResults(); });
q?.addEventListener("keydown", (e) => {
  const down = e.key === "ArrowDown" || (e.ctrlKey && ["j", "n"].includes(e.key));
  const up = e.key === "ArrowUp" || (e.ctrlKey && ["k", "p"].includes(e.key));
  if (down) cur = Math.min(shown.length - 1, cur + 1);
  else if (up) cur = Math.max(0, cur - 1);
  else if (e.key === "Enter") return e.preventDefault(), runCurrent();
  else if (e.key === "Escape") return e.preventDefault(), closeFinder();
  else return;
  e.preventDefault();
  renderResults();
});
resultsEl?.addEventListener("click", (e) => {
  const li = (e.target as Element).closest<HTMLElement>("li[data-i]");
  if (li) { cur = Number(li.dataset.i); runCurrent(); }
});
overlay?.addEventListener("click", () => { closeFinder(); closeWhich(); });

/* ---------------- which-key: leader menu and the full keymap ---------------- */
const wk = $("whichkey"), wkGrid = $("wk-grid"), wkTitle = $("wk-title"), wkFoot = $("wk-foot");
const HELP: [string, string][] = [
  ["j k", "next / prev"], ["gg G", "top / bottom"], ["⏎ l", "open"], ["h", "back"],
  ["H L", "prev / next buffer"], ["1-5", "go to buffer"], [": /", "find anything"],
  ["␣", "leader menu"], ["t", "theme"], ["esc", "close / clear"],
];
function openWhich(kind: "leader" | "help") {
  if (!wk || !wkGrid || !wkTitle || !wkFoot) return;
  wk.hidden = false;
  const rows: [string, string][] = kind === "leader"
    ? Object.entries(LEADER_KEYS).map(([k, v]) => [k, v.label])
    : HELP;
  wkTitle.textContent = kind === "leader" ? "␣ leader" : "keymaps";
  wkFoot.textContent = kind === "leader" ? "press a key · esc to close" : "a small easter egg · esc to close";
  wkGrid.innerHTML = rows.map(([k, d]) => `<div class="row-k"><b>${esc(k)}</b><span>${esc(d)}</span></div>`).join("");
  setMode(kind === "leader" ? "LEADER" : "NORMAL");
}
function closeWhich() {
  if (wk) wk.hidden = true;
  if (modeEl?.dataset.m === "LEADER") setMode("NORMAL");
}

/* ---------------- selection for j/k ---------------- */
let sel = -1;
const items = () => Array.from(document.querySelectorAll<HTMLElement>("main .nav-item"));
function paintSel() {
  document.querySelectorAll(".sel").forEach((el) => el.classList.remove("sel"));
  const list = items();
  const el = list[sel];
  if (!el) return;
  el.classList.add("sel");
  el.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
}

/* ---------------- the hidden keys ---------------- */
const keymap = createKeymap();
const bufferLinks = () => Array.from(document.querySelectorAll<HTMLAnchorElement>(".bufs .buf"));
const PAGE_HREF: Record<Page, string> = { home: "/", projects: "/projects", notes: "/notes", about: "/about" };
function perform(a: Action) {
  const list = items();
  switch (a.type) {
    case "down": if (longPage) scrollBy(0, 70); else { sel = Math.min(list.length - 1, sel + 1); paintSel(); } break;
    case "up": if (longPage) scrollBy(0, -70); else { sel = Math.max(0, sel - 1); paintSel(); } break;
    case "top": sel = 0; scrollTo(0, 0); if (!longPage) paintSel(); break;
    case "bottom": sel = list.length - 1; scrollTo(0, document.documentElement.scrollHeight); if (!longPage) paintSel(); break;
    case "open": list[sel]?.click(); break;
    case "back": if (longPage) location.href = `/${page}s`; else if (page !== "home") location.href = "/"; break;
    case "prevBuffer": case "nextBuffer": {
      const bufs = bufferLinks();
      const i = bufs.findIndex((b) => b.getAttribute("aria-current") === "page");
      const next = bufs[(i + (a.type === "nextBuffer" ? 1 : -1) + bufs.length) % bufs.length];
      if (next) location.href = next.href;
      break;
    }
    case "buffer": { const b = bufferLinks()[a.n - 1]; if (b) location.href = b.href; break; }
    case "go": location.href = PAGE_HREF[a.page]; break;
    case "theme": toggleTheme(); break;
    case "find": openFinder(); break;
    case "help": if (wk?.hidden === false && wkTitle?.textContent === "keymaps") closeWhich(); else openWhich("help"); break;
    case "leader": openWhich("leader"); break;
    case "escape": closeWhich(); sel = -1; paintSel(); break;
  }
}

document.addEventListener("keydown", (e) => {
  if (picker && !picker.hidden) return; // the finder handles its own keys
  const t = e.target as HTMLElement;
  const action = keymap.feed({
    key: e.key,
    meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey,
    inEditable: !!t.closest?.("input, textarea, select, [contenteditable]"),
  });
  if (pendEl) pendEl.textContent = keymap.pending() || (keymap.mode() === "LEADER" ? "␣" : "");
  if (keymap.mode() === "NORMAL" && modeEl?.dataset.m === "LEADER" && action?.type !== "leader") closeWhich();
  if (!action) return;
  e.preventDefault();
  if (action.type !== "leader" && action.type !== "help") closeWhich();
  perform(action);
});

/* ---------------- code blocks: header bar + copy ---------------- */
document.querySelectorAll<HTMLPreElement>(".prose pre.astro-code").forEach((pre) => {
  const box = document.createElement("div");
  box.className = "codeblock";
  const bar = document.createElement("div");
  bar.className = "bar";
  const lang = document.createElement("span");
  lang.textContent = pre.dataset.language ?? "code";
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "copy"; btn.textContent = "copy";
  btn.addEventListener("click", () => {
    const done = (ok: boolean) => {
      btn.textContent = ok ? "copied" : "select + ⌘C";
      btn.classList.toggle("done", ok);
      setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("done"); }, 1600);
    };
    navigator.clipboard?.writeText(pre.innerText).then(() => done(true), () => done(false)) ?? done(false);
  });
  bar.append(lang, btn);
  pre.replaceWith(box);
  box.append(bar, pre);
});
