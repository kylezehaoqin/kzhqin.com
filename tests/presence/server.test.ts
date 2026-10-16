import http from "node:http";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createPresenceServer } from "../../presence/app.mjs";

type Srv = { port: number; close(): Promise<void> };
let srv: Srv;
afterEach(async () => { await srv?.close(); });
const start = async (opts: object = {}) => {
  srv = await createPresenceServer({ port: 0, tickMs: 50, bodyMs: 300, trustProxy: true, origins: ["https://kzhqin.com"], log: () => {}, ...opts });
  return `http://127.0.0.1:${srv.port}`;
};

function stream(base: string, page: string, ip = "1.1.1.1") {
  return new Promise<{ status: number; next: (type: string, ms?: number) => Promise<any>; close: () => void }>((resolve) => {
    const req = http.get(`${base}/presence/stream?page=${encodeURIComponent(page)}`, { headers: { "X-Forwarded-For": ip } }, (res) => {
      const queue: { type: string; data: any }[] = [];
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => {
        buf += c;
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const type = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (type && data) queue.push({ type, data: JSON.parse(data) });
          else if (/^retry: /m.test(block)) queue.push({ type: "retry", data: block });
        }
      });
      res.on("error", () => {});
      const next = async (type: string, ms = 2000) => {
        const t0 = Date.now();
        for (;;) {
          const i = queue.findIndex((e) => e.type === type);
          if (i >= 0) return queue.splice(i, 1)[0].data;
          if (Date.now() - t0 > ms) throw new Error(`no "${type}" event in ${ms} ms`);
          await new Promise((r) => setTimeout(r, 20));
        }
      };
      resolve({ status: res.statusCode!, next, close: () => req.destroy() });
    });
    req.on("error", () => {});
  });
}

const post = (base: string, body: string, headers: Record<string, string> = {}) =>
  fetch(`${base}/presence/where`, { method: "POST", body, headers: { Origin: "https://kzhqin.com", "Content-Type": "application/json", ...headers } });

async function lastSnap(s: { next: (t: string, ms?: number) => Promise<any> }, until: (x: any) => boolean) {
  for (;;) { const x = await s.next("snap"); if (until(x)) return x; }
}

describe("presence server", () => {
  it("healthz answers ok", async () => {
    const base = await start();
    const r = await fetch(`${base}/presence/healthz`);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("ok");
  });

  it("a stream sends retry, hello, then a snapshot", async () => {
    const base = await start();
    const a = await stream(base, "/x");
    expect(a.status).toBe(200);
    expect(await a.next("retry")).toContain("retry: 3000");
    const hello = await a.next("hello");
    expect(hello.id).toMatch(/^[0-9a-f]{8}$/);
    expect(hello.token).toMatch(/^[0-9a-f]{32}$/);
    expect(await a.next("snap")).toEqual({ n: 1, dots: [] });
    a.close();
  });

  it("B's position reaches A on the same page; C on another page sees the count only", async () => {
    const base = await start();
    const a = await stream(base, "/x", "1.1.1.1");
    const b = await stream(base, "/x", "2.2.2.2");
    const c = await stream(base, "/y", "3.3.3.3");
    const hb = await b.next("hello");
    expect((await post(base, JSON.stringify({ token: hb.token, y: 0.42 }))).status).toBe(204);
    expect(await lastSnap(a, (s) => s.dots.length === 1)).toEqual({ n: 3, dots: [{ id: hb.id, y: 0.42 }] });
    expect(await lastSnap(c, (s) => s.n === 3)).toEqual({ n: 3, dots: [] });
    a.close(); b.close(); c.close();
  });

  it("B stays counted across ticks, and leaves when its stream closes", async () => {
    const base = await start();
    const a = await stream(base, "/x", "1.1.1.1");
    const b = await stream(base, "/x", "2.2.2.2");
    await lastSnap(a, (s) => s.n === 2);
    await new Promise((r) => setTimeout(r, 150)); // 3 ticks
    await expect(a.next("snap", 100)).rejects.toThrow(); // nothing changed, so no new snapshot
    expect((await fetch(`${base}/presence/healthz`)).status).toBe(200);
    b.close();
    expect(await lastSnap(a, (s) => s.n === 1)).toEqual({ n: 1, dots: [] });
    expect((await fetch(`${base}/presence/healthz`)).status).toBe(200);
    a.close();
  });

  it("refuses bad input", async () => {
    const base = await start();
    const a = await stream(base, "/x");
    const { token } = await a.next("hello");
    expect((await post(base, "{not json")).status).toBe(400);
    expect((await post(base, JSON.stringify({ token, y: 2 }))).status).toBe(400);
    expect((await post(base, JSON.stringify({ token, y: "a" }))).status).toBe(400);
    expect((await post(base, JSON.stringify({ token: "x", y: 0.5 }))).status).toBe(400);
    expect((await post(base, JSON.stringify({ token: "f".repeat(32), y: 0.5 }))).status).toBe(404);
    expect((await post(base, JSON.stringify({ token, y: 0.5 }), { Origin: "https://evil.example" })).status).toBe(403);
    expect((await post(base, JSON.stringify({ token, y: 0.5, pad: "x".repeat(300) }))).status).toBe(413);
    expect((await fetch(`${base}/presence/stream?page=${encodeURIComponent("/../etc")}`)).status).toBe(400);
    expect((await fetch(`${base}/presence/where`)).status).toBe(405);
    expect((await fetch(`${base}/presence/nope`)).status).toBe(404);
    a.close();
  });

  it("rate limits POSTs to 1 per second per token", async () => {
    const base = await start();
    const a = await stream(base, "/x");
    const { token } = await a.next("hello");
    expect((await post(base, JSON.stringify({ token, y: 0.1 }))).status).toBe(204);
    expect((await post(base, JSON.stringify({ token, y: 0.2 }))).status).toBe(429);
    a.close();
  });

  it("a slow body gets 408 and the server keeps working", async () => {
    const base = await start({ bodyMs: 300 });
    const status = await new Promise<number>((resolve) => {
      const req = http.request(`${base}/presence/where`, { method: "POST", headers: { Origin: "https://kzhqin.com", "Content-Length": "100" } }, (res) => resolve(res.statusCode!));
      req.on("error", () => resolve(-1));
      req.write("{");
    });
    expect(status).toBe(408);
    expect((await fetch(`${base}/presence/healthz`)).status).toBe(200);
  });

  it("caps streams per IP (429) and in total (503)", async () => {
    const base = await start({ perIp: 2, total: 3 });
    const s1 = await stream(base, "/x", "5.5.5.5");
    const s2 = await stream(base, "/x", "5.5.5.5");
    const s3 = await stream(base, "/x", "5.5.5.5");
    expect([s1.status, s2.status, s3.status]).toEqual([200, 200, 429]);
    const s4 = await stream(base, "/x", "6.6.6.6");
    const s5 = await stream(base, "/x", "7.7.7.7");
    expect([s4.status, s5.status]).toEqual([200, 503]);
    for (const s of [s1, s2, s3, s4, s5]) s.close();
  });

  it("a header flood is refused and the server keeps working", async () => {
    const base = await start();
    const { port } = srv;
    await new Promise<void>((resolve) => {
      const sock = net.connect(port, "127.0.0.1", () => {
        sock.write(`GET /presence/healthz HTTP/1.1\r\nHost: x\r\nX-Big: ${"a".repeat(20000)}\r\n\r\n`);
      });
      sock.on("data", () => {}); sock.on("close", () => resolve()); sock.on("error", () => resolve());
    });
    expect((await fetch(`${base}/presence/healthz`)).status).toBe(200);
  });

  it("a request path Node cannot parse as a URL is refused (4xx), and the server keeps working", async () => {
    // Caddy cleans "//x:99999/../presence/stream" to /presence/stream for its matcher,
    // but forwards the raw path; new URL() then throws on the bad port.
    const base = await start();
    const { port } = srv;
    const reply = await new Promise<string>((resolve) => {
      let got = "";
      const sock = net.connect(port, "127.0.0.1", () => {
        sock.write("GET //x:99999/../presence/stream HTTP/1.1\r\nHost: kzhqin.com\r\nConnection: close\r\n\r\n");
      });
      sock.on("data", (c) => { got += c; }); sock.on("close", () => resolve(got)); sock.on("error", () => resolve(got));
    });
    expect(reply).toMatch(/^HTTP\/1\.1 4\d\d /);
    expect((await fetch(`${base}/presence/healthz`)).status).toBe(200);
  });
});
