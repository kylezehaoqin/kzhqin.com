// Presence over Server-Sent Events. GET /presence/stream (server -> browser),
// POST /presence/where (browser -> server), GET /presence/healthz.
// Node stdlib only. All state is in memory; nothing is written to disk.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { createState, validToken, validY } from "./state.mjs";

const MAX_BODY = 256;

export function createPresenceServer({
  port = 8090, total = 200, perIp = 4, tickMs = 1000, pingMs = 25_000, lifeMs = 30 * 60_000, bodyMs = 5000,
  origins = ["https://kzhqin.com"], trustProxy = false, log = (line) => console.log(line),
} = {}) {
  const state = createState({ total, perIp });
  const streams = new Map(); // id -> ServerResponse
  const allowed = new Set(origins);
  const refused = new Map(); // reason -> count, for the minute log line (no IPs, no paths)

  const refuse = (reason) => refused.set(reason, (refused.get(reason) ?? 0) + 1);
  function send(res, code, body = "", headers = {}, close = false) {
    if (res.headersSent) return;
    res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...(close ? { Connection: "close" } : {}), ...headers });
    res.end(body, () => { if (close) res.socket?.destroy(); });
  }
  // Behind Caddy (port bound to 127.0.0.1 on the host), the client IP is the last X-Forwarded-For entry.
  function clientIp(req) {
    const fwd = req.headers["x-forwarded-for"];
    if (trustProxy && typeof fwd === "string" && fwd) return fwd.split(",").pop().trim();
    return req.socket.remoteAddress ?? "";
  }
  const write = (res, chunk) => { if (!res.destroyed && !res.writableEnded) res.write(chunk); };
  function flush(id) {
    const s = state.due(id);
    const res = streams.get(id);
    if (s && res) write(res, `event: snap\ndata: ${JSON.stringify(s)}\n\n`);
  }

  function openStream(req, res, url) {
    const id = randomBytes(4).toString("hex");
    const token = randomBytes(16).toString("hex");
    const r = state.join({ id, token, ip: clientIp(req), page: url.searchParams.get("page") ?? "" });
    if (!r.ok) {
      refuse(r.reason);
      if (r.reason === "total") return send(res, 503, "", { "Retry-After": "60" });
      return send(res, r.reason === "perIp" ? 429 : 400);
    }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
    res.write(`retry: 3000\n\nevent: hello\ndata: ${JSON.stringify({ id, token })}\n\n`);
    streams.set(id, res);
    flush(id);
    const life = setTimeout(() => res.end(), lifeMs);
    // The response closing (tab closed, network gone, life over) is what ends a visit.
    res.on("close", () => { clearTimeout(life); streams.delete(id); state.leave(id); });
  }

  function postWhere(req, res) {
    if (!allowed.has(req.headers.origin ?? "")) { refuse("origin"); req.resume(); return send(res, 403, "", {}, true); }
    if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) { refuse("size"); return send(res, 413, "", {}, true); }
    let size = 0, done = false;
    const chunks = [];
    const timer = setTimeout(() => { if (!done) { done = true; refuse("slow"); send(res, 408, "", {}, true); } }, bodyMs);
    req.on("data", (c) => {
      if (done) return;
      size += c.length;
      if (size > MAX_BODY) { done = true; clearTimeout(timer); refuse("size"); send(res, 413, "", {}, true); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (done) return;
      done = true; clearTimeout(timer);
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { refuse("json"); return send(res, 400); }
      if (!body || typeof body !== "object" || !validToken(body.token) || !validY(body.y)) { refuse("value"); return send(res, 400); }
      const r = state.where(body.token, body.y, Date.now());
      if (r !== "ok") refuse(r);
      send(res, r === "ok" ? 204 : r === "unknown" ? 404 : 429);
    });
    req.on("error", () => clearTimeout(timer));
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://presence");
    const route = { "/presence/healthz": "GET", "/presence/stream": "GET", "/presence/where": "POST" }[url.pathname];
    if (!route) return send(res, 404);
    if (req.method !== route) return send(res, 405, "", { Allow: route });
    if (url.pathname === "/presence/healthz") return send(res, 200, "ok");
    if (url.pathname === "/presence/stream") return openStream(req, res, url);
    return postWhere(req, res);
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 0; // streams are long; POST bodies have their own limit (bodyMs)

  let lastLine = "";
  const timers = [
    setInterval(() => { for (const id of streams.keys()) flush(id); }, tickMs),
    setInterval(() => { for (const res of streams.values()) write(res, ": ping\n\n"); }, pingMs),
    setInterval(() => {
      const { streams: n, pages } = state.stats();
      const ref = [...refused].map(([k, c]) => `${k}=${c}`).join(" ");
      refused.clear();
      const line = `streams=${n} pages=${pages}${ref ? " refused: " + ref : ""}`;
      if (line !== lastLine) { log(line); lastLine = line; }
    }, 60_000),
  ];

  return new Promise((resolve) => {
    server.listen(port, "0.0.0.0", () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => {
          timers.forEach(clearInterval);
          for (const res of streams.values()) res.destroy();
          server.closeAllConnections?.();
          server.close(() => done());
        }),
      });
    });
  });
}
