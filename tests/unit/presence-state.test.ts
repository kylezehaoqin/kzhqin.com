import { describe, expect, it } from "vitest";
import { createState, validPage, validToken, validY } from "../../presence/state.mjs";

const tok = (n: number) => n.toString(16).padStart(32, "0");
const v = (id: string, page = "/x", ip = "1.1.1.1", n = 1) => ({ id, token: tok(n), ip, page });

describe("presence state", () => {
  it("join and leave change the site count and the page room", () => {
    const s = createState();
    expect(s.join(v("a", "/x", "1.1.1.1", 1))).toEqual({ ok: true });
    expect(s.join(v("b", "/y", "2.2.2.2", 2))).toEqual({ ok: true });
    expect(s.snapshot("a")!.n).toBe(2);
    expect(s.stats()).toEqual({ streams: 2, pages: 2 });
    s.leave("b");
    expect(s.snapshot("a")!.n).toBe(1);
    expect(s.stats()).toEqual({ streams: 1, pages: 1 });
    expect(s.snapshot("b")).toBeNull();
  });

  it("a snapshot lists others on the same page with a position, never the visitor", () => {
    const s = createState();
    s.join(v("a", "/x", "1.1.1.1", 1)); s.join(v("b", "/x", "2.2.2.2", 2)); s.join(v("c", "/y", "3.3.3.3", 3));
    expect(s.snapshot("a")!.dots).toEqual([]); // b has no position yet
    expect(s.where(tok(2), 0.42, 0)).toBe("ok");
    expect(s.where(tok(3), 0.9, 0)).toBe("ok");
    expect(s.snapshot("a")).toEqual({ n: 3, dots: [{ id: "b", y: 0.42 }] });
    expect(s.snapshot("b")).toEqual({ n: 3, dots: [] });
  });

  it("due() returns a snapshot only when it changed", () => {
    const s = createState();
    s.join(v("a", "/x", "1.1.1.1", 1));
    expect(s.due("a")).toEqual({ n: 1, dots: [] });
    expect(s.due("a")).toBeNull();
    s.join(v("b", "/x", "2.2.2.2", 2));
    expect(s.due("a")).toEqual({ n: 2, dots: [] });
    s.where(tok(2), 0.5, 0);
    expect(s.due("a")).toEqual({ n: 2, dots: [{ id: "b", y: 0.5 }] });
    expect(s.due("a")).toBeNull();
  });

  it("validates page, y, and token", () => {
    for (const p of ["/", "/projects/deuce", "/a-b/c1"]) expect(validPage(p)).toBe(true);
    for (const p of ["", "x", "/../etc", "/A", "/a?b", "/" + "a".repeat(81), 5, null]) expect(validPage(p)).toBe(false);
    for (const y of [0, 0.5, 1]) expect(validY(y)).toBe(true);
    for (const y of [-0.01, 1.01, NaN, Infinity, "0.5", null]) expect(validY(y)).toBe(false);
    expect(validToken(tok(7))).toBe(true);
    for (const t of ["", "z".repeat(32), tok(1).toUpperCase().replace("0", "A"), tok(1) + "0", 1]) expect(validToken(t)).toBe(false);
  });

  it("refuses a bad page on join", () => {
    expect(createState().join(v("a", "/../x"))).toEqual({ ok: false, reason: "page" });
  });

  it("rate limits where(): one per minPostGapMs per token", () => {
    const s = createState({ minPostGapMs: 1000 });
    s.join(v("a", "/x", "1.1.1.1", 1));
    expect(s.where(tok(1), 0.1, 5000)).toBe("ok");
    expect(s.where(tok(1), 0.2, 5999)).toBe("rate");
    expect(s.where(tok(1), 0.2, 6000)).toBe("ok");
    expect(s.where(tok(9), 0.2, 9000)).toBe("unknown");
  });

  it("caps streams per IP and in total", () => {
    const s = createState({ perIp: 4, total: 6 });
    for (let i = 1; i <= 4; i++) expect(s.join(v("i" + i, "/x", "9.9.9.9", i)).ok).toBe(true);
    expect(s.join(v("i5", "/x", "9.9.9.9", 5))).toEqual({ ok: false, reason: "perIp" });
    expect(s.join(v("j1", "/x", "8.8.8.8", 6)).ok).toBe(true);
    expect(s.join(v("j2", "/x", "7.7.7.7", 7)).ok).toBe(true);
    expect(s.join(v("j3", "/x", "6.6.6.6", 8))).toEqual({ ok: false, reason: "total" });
    s.leave("i1");
    expect(s.join(v("i5", "/x", "9.9.9.9", 5)).ok).toBe(true);
  });
});
