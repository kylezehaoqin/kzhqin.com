import { describe, expect, it } from "vitest";
import { createKeymap, type KeyInput } from "../../src/lib/keys";

const k = (key: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key, meta: false, ctrl: false, alt: false, inEditable: false, ...extra,
});

describe("keymap", () => {
  it("maps single keys to actions", () => {
    const m = createKeymap();
    expect(m.feed(k("j"))).toEqual({ type: "down" });
    expect(m.feed(k("k"))).toEqual({ type: "up" });
    expect(m.feed(k("G"))).toEqual({ type: "bottom" });
    expect(m.feed(k("Enter"))).toEqual({ type: "open" });
    expect(m.feed(k("l"))).toEqual({ type: "open" });
    expect(m.feed(k("h"))).toEqual({ type: "back" });
    expect(m.feed(k("H"))).toEqual({ type: "prevBuffer" });
    expect(m.feed(k("L"))).toEqual({ type: "nextBuffer" });
    expect(m.feed(k("t"))).toEqual({ type: "theme" });
    expect(m.feed(k(":"))).toEqual({ type: "find" });
    expect(m.feed(k("/"))).toEqual({ type: "find" });
    expect(m.feed(k("?"))).toEqual({ type: "help" });
    expect(m.feed(k("3"))).toEqual({ type: "buffer", n: 3 });
  });

  it("needs gg for top, and shows g as pending in between", () => {
    const m = createKeymap();
    expect(m.feed(k("g"))).toBeNull();
    expect(m.pending()).toBe("g");
    expect(m.feed(k("g"))).toEqual({ type: "top" });
    expect(m.pending()).toBe("");
  });

  it("drops a lone g when another key follows, and runs that key", () => {
    const m = createKeymap();
    m.feed(k("g"));
    expect(m.feed(k("j"))).toEqual({ type: "down" });
    expect(m.pending()).toBe("");
  });

  it("runs leader menus: space, then a key", () => {
    const m = createKeymap();
    expect(m.feed(k(" "))).toEqual({ type: "leader" });
    expect(m.mode()).toBe("LEADER");
    expect(m.feed(k("p"))).toEqual({ type: "go", page: "projects" });
    expect(m.mode()).toBe("NORMAL");
    m.feed(k(" "));
    expect(m.feed(k("f"))).toEqual({ type: "find" });
    m.feed(k(" "));
    expect(m.feed(k("n"))).toEqual({ type: "go", page: "notes" });
    m.feed(k(" "));
    expect(m.feed(k("a"))).toEqual({ type: "go", page: "about" });
    m.feed(k(" "));
    expect(m.feed(k("h"))).toEqual({ type: "go", page: "home" });
    m.feed(k(" "));
    expect(m.feed(k("t"))).toEqual({ type: "theme" });
    m.feed(k(" "));
    expect(m.feed(k("?"))).toEqual({ type: "help" });
  });

  it("closes the leader menu on an unknown key", () => {
    const m = createKeymap();
    m.feed(k(" "));
    expect(m.feed(k("z"))).toEqual({ type: "escape" });
    expect(m.mode()).toBe("NORMAL");
  });

  it("escape clears pending keys and leader mode", () => {
    const m = createKeymap();
    m.feed(k("g"));
    expect(m.feed(k("Escape"))).toEqual({ type: "escape" });
    expect(m.pending()).toBe("");
    m.feed(k(" "));
    m.feed(k("Escape"));
    expect(m.mode()).toBe("NORMAL");
  });

  it("ignores keys with modifiers, so browser shortcuts keep working", () => {
    const m = createKeymap();
    expect(m.feed(k("j", { meta: true }))).toBeNull();
    expect(m.feed(k("t", { ctrl: true }))).toBeNull();
    expect(m.feed(k("l", { alt: true }))).toBeNull();
  });

  it("ignores keys typed into inputs", () => {
    const m = createKeymap();
    expect(m.feed(k("j", { inEditable: true }))).toBeNull();
    expect(m.feed(k(":", { inEditable: true }))).toBeNull();
  });

  it("ignores buffer numbers outside 1-5 and unknown keys", () => {
    const m = createKeymap();
    expect(m.feed(k("6"))).toBeNull();
    expect(m.feed(k("0"))).toBeNull();
    expect(m.feed(k("x"))).toBeNull();
  });

  it("runs two-key sequences", () => {
    const m = createKeymap();
    const seq = (a: string, b: string) => { m.feed(k(a)); return m.feed(k(b)); };
    expect(seq("g", "x")).toEqual({ type: "external" });
    expect(seq("]", "]")).toEqual({ type: "section", by: 1 });
    expect(seq("[", "[")).toEqual({ type: "section", by: -1 });
    expect(seq("y", "y")).toEqual({ type: "yank" });
    expect(seq("z", "a")).toEqual({ type: "fold" });
    expect(seq("z", "M")).toEqual({ type: "foldAll" });
    expect(seq("z", "R")).toEqual({ type: "unfoldAll" });
  });

  it("shows any prefix as pending", () => {
    const m = createKeymap();
    for (const p of ["g", "]", "[", "y", "z"]) {
      expect(m.feed(k(p))).toBeNull();
      expect(m.pending()).toBe(p);
      m.feed(k("Escape"));
    }
  });

  it("a broken prefix drops, and a second prefix becomes pending", () => {
    const m = createKeymap();
    m.feed(k("g"));
    expect(m.feed(k("q"))).toBeNull();
    expect(m.pending()).toBe("");
    m.feed(k("g"));
    expect(m.feed(k("y"))).toBeNull();
    expect(m.pending()).toBe("y");
    expect(m.feed(k("y"))).toEqual({ type: "yank" });
  });

  it("K opens the hover card", () => {
    expect(createKeymap().feed(k("K"))).toEqual({ type: "hover" });
  });

  it("runs leader groups: space g B, space u z", () => {
    const m = createKeymap();
    m.feed(k(" "));
    expect(m.feed(k("g"))).toEqual({ type: "leaderGroup", group: "g" });
    expect(m.mode()).toBe("LEADER");
    expect(m.group()).toBe("g");
    expect(m.feed(k("B"))).toEqual({ type: "source" });
    expect(m.mode()).toBe("NORMAL");
    expect(m.group()).toBe("");
    m.feed(k(" "));
    m.feed(k("u"));
    expect(m.feed(k("z"))).toEqual({ type: "zen" });
  });

  it("an unknown key in a leader group closes the menu; escape clears the group", () => {
    const m = createKeymap();
    m.feed(k(" ")); m.feed(k("g"));
    expect(m.feed(k("q"))).toEqual({ type: "escape" });
    expect(m.mode()).toBe("NORMAL");
    m.feed(k(" ")); m.feed(k("u"));
    m.feed(k("Escape"));
    expect(m.group()).toBe("");
    expect(m.mode()).toBe("NORMAL");
  });

  it("a modifier key alone (Shift before M) changes nothing", () => {
    const m = createKeymap();
    for (const mod of ["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"]) {
      m.feed(k("z"));
      expect(m.feed(k(mod))).toBeNull();
      expect(m.pending()).toBe("z");
      m.feed(k("Escape"));
    }
    m.feed(k("z")); m.feed(k("Shift"));
    expect(m.feed(k("M"))).toEqual({ type: "foldAll" });
    m.feed(k(" ")); m.feed(k("g")); m.feed(k("Shift"));
    expect(m.group()).toBe("g");
    expect(m.feed(k("B"))).toEqual({ type: "source" });
    m.feed(k(" ")); m.feed(k("Shift"));
    expect(m.feed(k("?"))).toEqual({ type: "help" });
  });
});
