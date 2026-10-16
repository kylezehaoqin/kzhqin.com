// Live presence: other visitors on this page as soft dots in the side gutters,
// and "● N here" for the whole site. Server: presence/ (SSE + POST). Optional:
// if the service is down, nothing on the page changes.
import { dotX, normalizePath, shouldPost, viewY } from "../lib/presence-geom";

interface Api { addLayer(fn: (c: CanvasRenderingContext2D, rgb: string) => boolean): void; requestDraw(): void }
type Dot = { y: number; shown: number; target: number; leaving: boolean };

export function startPresence(api: Api) {
  const seg = document.getElementById("presence");
  const num = seg?.querySelector("b");
  const canvas = document.getElementById("dots");
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = normalizePath(location.pathname);
  const dots = new Map<string, Dot>();
  let es: EventSource | null = null, token = "", lastY: number | null = null, lastPost = 0;
  let postTimer = 0, retryTimer = 0, errors = 0;

  const optedOut = () => { try { return localStorage.getItem("presence") === "off"; } catch { return false; } };
  const docH = () => document.documentElement.scrollHeight;

  function setCount(n: number | null) {
    if (!seg || !num) return;
    seg.hidden = n === null;
    seg.dataset.n = String(n ?? 0);
    num.textContent = String(n ?? 0);
  }
  function mark() {
    if (!canvas) return;
    canvas.dataset.presenceDots = String([...dots.values()].filter((d) => !d.leaving).length);
    canvas.dataset.presenceHidden = String(root.classList.contains("zen"));
  }

  function sendY() {
    if (!token) return;
    const y = viewY(scrollY, innerHeight, docH());
    if (!shouldPost(lastY, y)) return;
    const wait = 1000 - (Date.now() - lastPost);
    if (wait > 0) { clearTimeout(postTimer); postTimer = window.setTimeout(sendY, wait); return; }
    lastY = y; lastPost = Date.now();
    // A refused or lost update must not stick: forget lastY so the next scroll (or the timer) sends again.
    const retry = () => { lastY = null; clearTimeout(postTimer); postTimer = window.setTimeout(sendY, 1000); };
    fetch("/presence/where", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, y }), keepalive: true })
      .then((r) => { if (!r.ok) retry(); }, retry);
  }

  function connect() {
    if (es || optedOut() || document.hidden) return;
    es = new EventSource(`/presence/stream?page=${encodeURIComponent(page)}`);
    es.addEventListener("hello", (e) => { errors = 0; token = JSON.parse((e as MessageEvent).data).token; lastY = null; sendY(); });
    es.addEventListener("snap", (e) => {
      errors = 0;
      const s = JSON.parse((e as MessageEvent).data) as { n: number; dots: { id: string; y: number }[] };
      setCount(s.n);
      const had = dots.size;
      const ids = new Set(s.dots.map((d) => d.id));
      for (const d of s.dots) {
        const cur = dots.get(d.id);
        if (cur) { cur.target = d.y; cur.leaving = false; if (reduce) cur.y = d.y; }
        else dots.set(d.id, { y: d.y, target: d.y, shown: 0, leaving: false });
      }
      for (const [id, d] of dots) if (!ids.has(id)) d.leaving = true;
      mark();
      if (had || dots.size) api.requestDraw(); // no dots before or now: no frame to draw
    });
    // EventSource retries a dropped stream by itself, but an HTTP error (502, 503,
    // 429) closes it for good. Either way: after 3 errors in a row, or once it is
    // closed, hide the count and try again in 60 s.
    es.onerror = () => {
      if (++errors >= 3 || es?.readyState === EventSource.CLOSED) {
        disconnect();
        clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => { errors = 0; connect(); }, 60_000);
      }
    };
  }
  function disconnect() {
    es?.close(); es = null; token = "";
    clearTimeout(postTimer);
    setCount(null);
    const had = dots.size;
    dots.clear(); mark();
    if (had) api.requestDraw();
  }

  // Draw: a soft neutral dot per visitor, eased toward its target y.
  api.addLayer((c, rgb) => {
    mark();
    if (root.classList.contains("zen") || !dots.size) return false;
    let more = false;
    const H = docH();
    for (const [id, d] of dots) {
      d.shown = reduce ? (d.leaving ? 0 : 1) : Math.max(0, Math.min(1, d.shown + (d.leaving ? -0.06 : 0.06)));
      if (d.leaving && d.shown === 0) { dots.delete(id); continue; }
      if (!reduce) d.y += (d.target - d.y) * 0.08;
      if (Math.abs(d.target - d.y) > 0.0005 || (d.shown > 0 && d.shown < 1)) more = true;
      const x = dotX(id, innerWidth), y = d.y * H - scrollY;
      if (y < -20 || y > innerHeight + 20) continue;
      const g = c.createRadialGradient(x, y, 0, x, y, 12);
      g.addColorStop(0, `rgba(${rgb},${(0.35 * d.shown).toFixed(3)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(${rgb},${(0.45 * d.shown).toFixed(3)})`; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    }
    return more;
  });

  addEventListener("scroll", () => { sendY(); if (dots.size) api.requestDraw(); }, { passive: true });
  addEventListener("resize", () => { sendY(); if (dots.size) api.requestDraw(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) disconnect(); else connect(); });
  new MutationObserver(() => { mark(); if (dots.size) api.requestDraw(); }).observe(root, { attributes: true, attributeFilter: ["class"] });

  connect();
  return {
    off() { clearTimeout(retryTimer); disconnect(); },
    on() { errors = 0; connect(); },
  };
}
