// Keys inside the ":" finder, as a pure state machine (like Telescope).
// INSERT: typing filters; Ctrl keys move and switch tabs. NORMAL: vim keys.

export type FinderMode = "INSERT" | "NORMAL";
export type FinderAction =
  | { type: "move"; by: 1 | -1 } | { type: "first" } | { type: "last" }
  | { type: "tab"; by: 1 | -1 } | { type: "open" }
  | { type: "mode"; to: FinderMode } | { type: "close" };
export interface FinderKey { key: string; ctrl: boolean; meta: boolean; alt: boolean }

export const TABS = ["All", "Projects", "Notes", "Pages"] as const;
export type Tab = (typeof TABS)[number];
const KINDS: Record<Exclude<Tab, "All">, string[]> = {
  Projects: ["project"],
  Notes: ["finding", "workflow", "note"],
  Pages: ["page", "command"],
};
export const inTab = (kind: string, tab: Tab) => tab === "All" || KINDS[tab].includes(kind);

const CTRL: Record<string, FinderAction> = {
  j: { type: "move", by: 1 }, n: { type: "move", by: 1 },
  k: { type: "move", by: -1 }, p: { type: "move", by: -1 },
  l: { type: "tab", by: 1 }, h: { type: "tab", by: -1 },
};
const BOTH: Record<string, FinderAction> = {
  ArrowDown: { type: "move", by: 1 }, ArrowUp: { type: "move", by: -1 }, Enter: { type: "open" },
};
const NORMAL: Record<string, FinderAction> = {
  j: { type: "move", by: 1 }, k: { type: "move", by: -1 }, G: { type: "last" }, l: { type: "open" },
  q: { type: "close" }, Escape: { type: "close" },
  i: { type: "mode", to: "INSERT" }, a: { type: "mode", to: "INSERT" }, "/": { type: "mode", to: "INSERT" },
};

export function createFinderKeys() {
  let mode: FinderMode = "INSERT";
  let g = false; // a pending "g" in NORMAL

  function feed(k: FinderKey): FinderAction | null {
    if (k.meta || k.alt) return null;
    if (k.ctrl) return CTRL[k.key] ?? null;
    if (BOTH[k.key]) return BOTH[k.key];
    if (mode === "INSERT") {
      if (k.key !== "Escape") return null; // typing goes into the input
      mode = "NORMAL";
      return { type: "mode", to: "NORMAL" };
    }
    if (k.key === "g") {
      if (g) { g = false; return { type: "first" }; }
      g = true;
      return null;
    }
    g = false;
    const a = NORMAL[k.key] ?? null;
    if (a?.type === "mode") mode = a.to;
    return a;
  }

  return {
    feed,
    mode: () => mode,
    reset: () => { mode = "INSERT"; g = false; },
  };
}
