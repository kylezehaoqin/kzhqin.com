// Everything interactive on the site. Each part is optional: the pages are
// complete HTML without this script. Pure logic lives in src/lib (unit-tested).
import { createFinderKeys, inTab, TABS, type Tab } from "../lib/finderkeys";
import { rank } from "../lib/fuzzy";
import { createKeymap, LEADER_GROUPS, LEADER_KEYS, MODIFIER_KEYS, type Action, type Group, type Page } from "../lib/keys";
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
function setMode(m: "NORMAL" | "INSERT" | "LEADER") {
  if (!modeEl) return;
  modeEl.dataset.m = m;
  modeEl.textContent = m;
}

/* ---------------- toast messages (like nvim-notify) ---------------- */
const msgEl = $("msg");
let msgTimer = 0;
// The live region stays in the page (never `hidden`), so screen readers announce
// each new text. It is only see-through while empty (CSS .notify:empty).
function say(text: string) {
  if (!msgEl) return;
  msgEl.textContent = text;
  clearTimeout(msgTimer);
  msgTimer = window.setTimeout(() => { msgEl.textContent = ""; }, 2500);
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
const fkeys = createFinderKeys();
const fmodeEl = $("finder-mode"); // the finder's own mode label: the status bar is hidden in zen
let tab: Tab = "All";
const tabsEl = $("finder-tabs");
function setTab(t: Tab) {
  tab = t; cur = 0;
  tabsEl?.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
  renderResults();
}
function setFinderMode(m: "INSERT" | "NORMAL") {
  if (!q) return;
  q.readOnly = m === "NORMAL";
  setMode(m);
  if (fmodeEl) { fmodeEl.textContent = m; fmodeEl.dataset.m = m; }
  if (m === "INSERT") { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}

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
  const pool = entries.filter((e) => inTab(e.kind, tab));
  shown = rank(pool, (e) => e.name, q.value.trim());
  cur = Math.min(cur, Math.max(0, shown.length - 1));
  countEl.textContent = `${shown.length}/${pool.length}`;
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
    ? `<span class="k">${esc(pick.kind)}${pick.meta ? " · " + esc(pick.meta) : ""}</span><h4>${esc(pick.name)}</h4><p>${esc(pick.text)}</p><span class="k">⏎ open · C-j/k move · C-h/l tab · esc normal</span>`
    : "");
  resultsEl.querySelector("li.on")?.scrollIntoView({ block: "nearest" });
}
function openFinder() {
  if (!overlay || !picker || !q) return;
  closeWhich();
  returnFocus = document.activeElement;
  overlay.hidden = false; picker.hidden = false;
  q.value = ""; cur = 0;
  fkeys.reset();
  setTab("All");
  setFinderMode("INSERT");
  loadIndex().then(renderResults);
}
function closeFinder() {
  if (!overlay || !picker) return;
  overlay.hidden = true; picker.hidden = true;
  if (q) { q.readOnly = false; q.blur(); } // returnFocus is often <body>, which cannot take focus from the input
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
q?.addEventListener("keydown", onFinderKey);
function onFinderKey(e: KeyboardEvent) {
  const a = fkeys.feed({ key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });
  if (!a) return;
  e.preventDefault();
  switch (a.type) {
    case "move": cur = Math.max(0, Math.min(shown.length - 1, cur + a.by)); renderResults(); break;
    case "first": cur = 0; renderResults(); break;
    case "last": cur = Math.max(0, shown.length - 1); renderResults(); break;
    case "tab": setTab(TABS[(TABS.indexOf(tab) + a.by + TABS.length) % TABS.length]); break;
    case "open": runCurrent(); break;
    case "mode": setFinderMode(a.to); break;
    case "close": closeFinder(); break;
  }
}
tabsEl?.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLElement>("[data-tab]");
  if (b) { setTab(b.dataset.tab as Tab); q?.focus(); }
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
  ["gx", "open link"], ["]] [[", "next / prev section"], ["K", "hover card"], ["yy", "copy link"],
  ["za zM zR", "fold"], ["␣gB", "source on GitHub"], ["␣uz", "zen mode"],
  ["␣", "leader menu"], ["t", "theme"], ["esc", "close / clear"],
];
function openWhich(kind: "leader" | "help" | Group) {
  if (!wk || !wkGrid || !wkTitle || !wkFoot) return;
  wk.hidden = false;
  const menu = kind === "help" ? null : kind === "leader" ? LEADER_KEYS : LEADER_GROUPS[kind];
  const rows: [string, string][] = menu ? Object.entries(menu).map(([k, v]) => [k, v.label]) : HELP;
  wkTitle.textContent = kind === "help" ? "keymaps" : kind === "leader" ? "␣ leader" : `␣ ${kind}`;
  wkFoot.textContent = menu ? "press a key · esc to close" : "a small easter egg · esc to close";
  wkGrid.innerHTML = rows.map(([k, d]) => `<div class="row-k"><b>${esc(k)}</b><span>${esc(d)}</span></div>`).join("");
  setMode(menu ? "LEADER" : "NORMAL");
}
function closeWhich() {
  if (wk) wk.hidden = true;
  if (modeEl?.dataset.m === "LEADER") setMode("NORMAL");
}

/* ---------------- selection for j/k ---------------- */
let sel = -1;
const items = () => Array.from(document.querySelectorAll<HTMLElement>("main .nav-item"));
const canonical = () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href;
// gx target: a row's data-ext, or an external link itself (the hero's GitHub button).
function extOf(el: HTMLElement | undefined): string | undefined {
  if (!el) return undefined;
  if (el.dataset.ext) return el.dataset.ext;
  if (el instanceof HTMLAnchorElement && /^https?:/.test(el.href) && el.host !== location.host) return el.href;
  return undefined;
}
const openTab = (url: string) => window.open(url, "_blank", "noopener");

/* ---------------- hover card (K) ---------------- */
const card = document.createElement("div");
card.id = "hovercard"; card.className = "pane hovercard"; card.hidden = true;
card.setAttribute("role", "note");
document.body.append(card);
let cardOpenedAt = 0;
function closeCard() { card.hidden = true; }
function toggleCard() {
  if (!card.hidden) return closeCard();
  const row = longPage ? undefined : items()[sel];
  if (!row?.dataset.summary) return;
  const name = row.querySelector("h3, .t")?.childNodes[0]?.textContent?.trim() ?? "";
  const ext = row.dataset.ext;
  card.innerHTML = `<b>${esc(name)}</b><span class="k">${esc(row.dataset.meta ?? "")}</span><p>${esc(row.dataset.summary)}</p>`
    + (ext ? `<span class="k">gx → ${esc(ext.replace(/^https?:\/\//, ""))}</span>` : "");
  const r = row.getBoundingClientRect();
  card.style.top = `${scrollY + r.bottom + 6}px`;
  card.style.left = `${scrollX + r.left}px`;
  card.hidden = false;
  cardOpenedAt = performance.now();
}
// Close on scroll, but not on a scroll that the selection itself caused in the last 300 ms.
addEventListener("scroll", () => { if (!card.hidden && performance.now() - cardOpenedAt > 300) closeCard(); }, { passive: true });
addEventListener("click", closeCard);
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
    case "leaderGroup": openWhich(a.group); break;
    case "external": {
      const url = longPage ? document.body.dataset.ext : extOf(list[sel]);
      if (url) openTab(url); else say("no external link");
      break;
    }
    case "yank": {
      const url = (longPage ? undefined : list[sel]?.dataset.url) ?? canonical();
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject(new Error("no clipboard")))
        .then(() => say(`yanked ${url}`), () => say("clipboard blocked"));
      break;
    }
    case "hover": toggleCard(); break;
    case "section": jumpSection(a.by); break;
    case "fold": if (longPage) foldAtTop(); break;
    case "foldAll": folds.forEach((s) => setFold(s, true)); break;
    case "unfoldAll": folds.forEach((s) => setFold(s, false)); break;
    case "source": {
      const src = document.body.dataset.src;
      if (src) openTab(`https://github.com/kylezehaoqin/kzhqin.com/blob/main/${src}`);
      break;
    }
    case "zen": { const on = root.classList.toggle("zen"); say(on ? "zen on · ␣uz to exit" : "zen off"); break; }
    case "escape": closeWhich(); sel = -1; paintSel(); break;
  }
}

document.addEventListener("keydown", (e) => {
  // Any other key closes the hover card (a lone Shift before K does not).
  if (!MODIFIER_KEYS.has(e.key) && (e.key !== "K" || e.metaKey || e.ctrlKey || e.altKey)) closeCard();
  if (picker && !picker.hidden) {
    // The input handles its own keys. If Tab or a click moved focus elsewhere, take it back first.
    if (e.target !== q) { q?.focus(); onFinderKey(e); }
    return;
  }
  const t = e.target as HTMLElement;
  const action = keymap.feed({
    key: e.key,
    meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey,
    inEditable: !!t.closest?.("input, textarea, select, [contenteditable]"),
  });
  if (pendEl) pendEl.textContent = keymap.pending() || (keymap.mode() === "LEADER" ? "␣" + keymap.group() : "");
  if (keymap.mode() === "NORMAL" && modeEl?.dataset.m === "LEADER" && action?.type !== "leader") closeWhich();
  if (!action) return;
  e.preventDefault();
  if (action.type !== "leader" && action.type !== "leaderGroup" && action.type !== "help") closeWhich();
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

/* ---------------- sections and folds (]] [[ za zM zR) ---------------- */
// Runs after the code blocks above, so the fold wrappers move finished blocks.
const navH = () => (document.querySelector<HTMLElement>(".nav-band")?.offsetHeight ?? 0) + 8; // 0 in zen mode
const headings = () => Array.from(document.querySelectorAll<HTMLElement>(longPage ? ".prose h2" : "main section.sec .sec-h h2"));
function jumpSection(by: 1 | -1) {
  const hs = headings(), y = navH();
  const target = by === 1
    ? hs.find((h) => h.getBoundingClientRect().top > y + 4)
    : [...hs].reverse().find((h) => h.getBoundingClientRect().top < y - 4);
  // Instant, like nvim's ]]: no smooth scroll, so the position is final when the key returns.
  if (target) scrollTo({ top: scrollY + target.getBoundingClientRect().top - y, behavior: "instant" });
}
const folds: HTMLElement[] = [];
if (longPage) {
  document.querySelectorAll<HTMLElement>(".prose > h2").forEach((h) => {
    const sec = document.createElement("section");
    sec.className = "fold";
    h.before(sec);
    let n: Element | null = h;
    while (n && !(n !== h && n.tagName === "H2")) { const next: Element | null = n.nextElementSibling; sec.append(n); n = next; }
    // Disclosure pattern: aria-expanded belongs on a button, not on the heading.
    // A heading with a link inside keeps its text (a link cannot sit in a button).
    if (!h.querySelector("a")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fold-btn";
      btn.setAttribute("aria-expanded", "true");
      btn.append(...h.childNodes);
      h.append(btn);
      btn.addEventListener("click", () => setFold(sec, !sec.classList.contains("folded")));
    }
    folds.push(sec);
  });
}
function setFold(sec: HTMLElement, folded: boolean) {
  sec.classList.toggle("folded", folded);
  sec.querySelector("h2 > .fold-btn")?.setAttribute("aria-expanded", String(!folded));
}
// A #link into a folded section would land on hidden text: unfold it first.
function unfoldHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  const sec = el?.closest<HTMLElement>(".fold.folded");
  if (el && sec) { setFold(sec, false); el.scrollIntoView(); }
}
addEventListener("hashchange", unfoldHash);
function foldAtTop() {
  const line = innerHeight / 3;
  const sec = [...folds].reverse().find((s) => s.getBoundingClientRect().top <= line) ?? folds[0];
  if (sec) setFold(sec, !sec.classList.contains("folded"));
}
