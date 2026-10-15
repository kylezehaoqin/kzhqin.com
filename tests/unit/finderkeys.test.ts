import { describe, expect, it } from "vitest";
import { createFinderKeys, inTab, TABS, type FinderKey } from "../../src/lib/finderkeys";

const k = (key: string, extra: Partial<FinderKey> = {}): FinderKey => ({ key, ctrl: false, meta: false, alt: false, ...extra });
const c = (key: string) => k(key, { ctrl: true });

describe("finder keys", () => {
  it("starts in INSERT and lets typing through", () => {
    const f = createFinderKeys();
    expect(f.mode()).toBe("INSERT");
    for (const key of ["j", "k", "q", "g", "G", "i", "l", "/"]) expect(f.feed(k(key))).toBeNull();
  });

  it("moves, switches tabs, and opens in INSERT", () => {
    const f = createFinderKeys();
    expect(f.feed(c("j"))).toEqual({ type: "move", by: 1 });
    expect(f.feed(c("n"))).toEqual({ type: "move", by: 1 });
    expect(f.feed(k("ArrowDown"))).toEqual({ type: "move", by: 1 });
    expect(f.feed(c("k"))).toEqual({ type: "move", by: -1 });
    expect(f.feed(c("p"))).toEqual({ type: "move", by: -1 });
    expect(f.feed(k("ArrowUp"))).toEqual({ type: "move", by: -1 });
    expect(f.feed(c("l"))).toEqual({ type: "tab", by: 1 });
    expect(f.feed(c("h"))).toEqual({ type: "tab", by: -1 });
    expect(f.feed(k("Enter"))).toEqual({ type: "open" });
  });

  it("Esc goes INSERT → NORMAL, and Esc again closes", () => {
    const f = createFinderKeys();
    expect(f.feed(k("Escape"))).toEqual({ type: "mode", to: "NORMAL" });
    expect(f.mode()).toBe("NORMAL");
    expect(f.feed(k("Escape"))).toEqual({ type: "close" });
  });

  it("NORMAL: j k gg G l, and i a / back to INSERT, q closes", () => {
    const f = createFinderKeys();
    f.feed(k("Escape"));
    expect(f.feed(k("j"))).toEqual({ type: "move", by: 1 });
    expect(f.feed(k("k"))).toEqual({ type: "move", by: -1 });
    expect(f.feed(k("G"))).toEqual({ type: "last" });
    expect(f.feed(k("g"))).toBeNull();
    expect(f.feed(k("g"))).toEqual({ type: "first" });
    expect(f.feed(k("l"))).toEqual({ type: "open" });
    expect(f.feed(c("l"))).toEqual({ type: "tab", by: 1 });
    for (const key of ["i", "a", "/"]) {
      expect(f.feed(k(key))).toEqual({ type: "mode", to: "INSERT" });
      expect(f.mode()).toBe("INSERT");
      f.feed(k("Escape"));
    }
    expect(f.feed(k("q"))).toEqual({ type: "close" });
  });

  it("NORMAL: a lone g then another key drops the g", () => {
    const f = createFinderKeys();
    f.feed(k("Escape"));
    f.feed(k("g"));
    expect(f.feed(k("j"))).toEqual({ type: "move", by: 1 });
    expect(f.feed(k("g"))).toBeNull();
  });

  it("Meta and Alt always pass through", () => {
    const f = createFinderKeys();
    expect(f.feed(k("j", { meta: true }))).toBeNull();
    expect(f.feed(k("l", { alt: true }))).toBeNull();
  });

  it("reset goes back to INSERT", () => {
    const f = createFinderKeys();
    f.feed(k("Escape"));
    f.reset();
    expect(f.mode()).toBe("INSERT");
  });
});

describe("inTab", () => {
  it("puts each kind in the right tabs", () => {
    expect(TABS).toEqual(["All", "Projects", "Notes", "Pages"]);
    for (const kind of ["page", "project", "command", "finding", "workflow", "note"]) expect(inTab(kind, "All")).toBe(true);
    expect(inTab("project", "Projects")).toBe(true);
    expect(inTab("page", "Projects")).toBe(false);
    for (const kind of ["finding", "workflow", "note"]) expect(inTab(kind, "Notes")).toBe(true);
    expect(inTab("project", "Notes")).toBe(false);
    expect(inTab("page", "Pages")).toBe(true);
    expect(inTab("command", "Pages")).toBe(true);
    expect(inTab("note", "Pages")).toBe(false);
  });
});
