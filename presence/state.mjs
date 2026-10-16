// Presence state: who is connected, on which page, at which position. Pure:
// no I/O and no timers, so every rule is unit-tested. Nothing here is stored.

const PAGE_RE = /^\/[a-z0-9/-]{0,80}$/;
const TOKEN_RE = /^[0-9a-f]{32}$/;
export const validPage = (p) => typeof p === "string" && PAGE_RE.test(p) && !p.includes("..");
export const validY = (y) => typeof y === "number" && Number.isFinite(y) && y >= 0 && y <= 1;
export const validToken = (t) => typeof t === "string" && TOKEN_RE.test(t);

// minPostGapMs is 900, not 1000: the client waits 1000 ms by its own clock, and
// network jitter can make two POSTs arrive a little closer than they were sent.
export function createState({ total = 200, perIp = 4, minPostGapMs = 900 } = {}) {
  const byId = new Map();    // id -> visitor
  const byToken = new Map(); // token -> visitor
  const perIpCount = new Map();

  function join({ id, token, ip, page }) {
    if (!validPage(page)) return { ok: false, reason: "page" };
    if (byId.size >= total) return { ok: false, reason: "total" };
    if ((perIpCount.get(ip) ?? 0) >= perIp) return { ok: false, reason: "perIp" };
    const v = { id, token, ip, page, y: null, lastPost: -Infinity, lastSent: "" };
    byId.set(id, v); byToken.set(token, v);
    perIpCount.set(ip, (perIpCount.get(ip) ?? 0) + 1);
    return { ok: true };
  }

  function leave(id) {
    const v = byId.get(id);
    if (!v) return;
    byId.delete(id); byToken.delete(v.token);
    const n = (perIpCount.get(v.ip) ?? 1) - 1;
    if (n > 0) perIpCount.set(v.ip, n); else perIpCount.delete(v.ip);
  }

  function where(token, y, now) {
    const v = byToken.get(token);
    if (!v) return "unknown";
    if (now - v.lastPost < minPostGapMs) return "rate";
    v.lastPost = now; v.y = y;
    return "ok";
  }

  function snapshot(id) {
    const me = byId.get(id);
    if (!me) return null;
    const dots = [];
    for (const o of byId.values()) if (o !== me && o.page === me.page && o.y !== null) dots.push({ id: o.id, y: o.y });
    return { n: byId.size, dots };
  }

  function due(id) {
    const s = snapshot(id);
    if (!s) return null;
    const json = JSON.stringify(s);
    const v = byId.get(id);
    if (json === v.lastSent) return null;
    v.lastSent = json;
    return s;
  }

  function stats() {
    return { streams: byId.size, pages: new Set([...byId.values()].map((v) => v.page)).size };
  }

  return { join, leave, where, snapshot, due, stats };
}
