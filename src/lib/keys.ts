// The hidden LazyVim-style keymap, as a pure state machine. The page feeds it
// key presses and performs the returned action, so all key logic is testable
// without a browser.

export type Page = "home" | "projects" | "notes" | "about";
export type Group = "g" | "u";

export type Action =
  | { type: "down" } | { type: "up" } | { type: "top" } | { type: "bottom" }
  | { type: "open" } | { type: "back" }
  | { type: "prevBuffer" } | { type: "nextBuffer" } | { type: "buffer"; n: number }
  | { type: "theme" } | { type: "find" } | { type: "help" }
  | { type: "leader" } | { type: "leaderGroup"; group: Group } | { type: "go"; page: Page } | { type: "escape" }
  | { type: "external" } | { type: "section"; by: 1 | -1 } | { type: "hover" } | { type: "yank" }
  | { type: "fold" } | { type: "foldAll" } | { type: "unfoldAll" } | { type: "source" } | { type: "zen" };

export interface KeyInput {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  inEditable: boolean; // focus is in an input, textarea, or contenteditable
}

export type Mode = "NORMAL" | "LEADER";

const SINGLE: Record<string, Action> = {
  j: { type: "down" },
  k: { type: "up" },
  G: { type: "bottom" },
  Enter: { type: "open" },
  l: { type: "open" },
  h: { type: "back" },
  H: { type: "prevBuffer" },
  L: { type: "nextBuffer" },
  K: { type: "hover" },
  t: { type: "theme" },
  ":": { type: "find" },
  "/": { type: "find" },
  "?": { type: "help" },
};

// Two-key sequences, as in nvim. The first key of each is a prefix that waits.
export const SEQUENCES: Record<string, Action> = {
  gg: { type: "top" },
  gx: { type: "external" },
  "]]": { type: "section", by: 1 },
  "[[": { type: "section", by: -1 },
  yy: { type: "yank" },
  za: { type: "fold" },
  zM: { type: "foldAll" },
  zR: { type: "unfoldAll" },
};
const PREFIXES = new Set(Object.keys(SEQUENCES).map((s) => s[0]));
// A real keyboard sends a keydown for Shift itself before "M", "B", "K", or "?".
export const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"]);

type Entry = { label: string; action: Action };
export const LEADER_KEYS: Record<string, Entry> = {
  f: { label: "find", action: { type: "find" } },
  p: { label: "projects", action: { type: "go", page: "projects" } },
  n: { label: "notes", action: { type: "go", page: "notes" } },
  a: { label: "about", action: { type: "go", page: "about" } },
  h: { label: "home", action: { type: "go", page: "home" } },
  t: { label: "toggle theme", action: { type: "theme" } },
  g: { label: "+git", action: { type: "leaderGroup", group: "g" } },
  u: { label: "+ui", action: { type: "leaderGroup", group: "u" } },
  "?": { label: "all keys", action: { type: "help" } },
};

export const LEADER_GROUPS: Record<Group, Record<string, Entry>> = {
  g: { B: { label: "source on GitHub", action: { type: "source" } } },
  u: { z: { label: "zen mode", action: { type: "zen" } } },
};

export function createKeymap() {
  let pending = "";
  let mode: Mode = "NORMAL";
  let group: Group | "" = "";

  function feed(e: KeyInput): Action | null {
    // Browser shortcuts and typing always win over the easter egg.
    if (e.meta || e.ctrl || e.alt || e.inEditable) return null;
    if (MODIFIER_KEYS.has(e.key)) return null; // keep any pending prefix or leader group

    if (e.key === "Escape") {
      pending = "";
      mode = "NORMAL";
      group = "";
      return { type: "escape" };
    }

    if (mode === "LEADER") {
      if (group) {
        const hit = LEADER_GROUPS[group][e.key];
        group = "";
        mode = "NORMAL";
        return hit?.action ?? { type: "escape" };
      }
      const hit = LEADER_KEYS[e.key];
      if (hit?.action.type === "leaderGroup") {
        group = hit.action.group; // stay in LEADER for the group's key
        return hit.action;
      }
      mode = "NORMAL";
      return hit?.action ?? { type: "escape" };
    }

    if (pending) {
      const seq = SEQUENCES[pending + e.key];
      pending = "";
      if (seq) return seq;
      // A broken prefix is dropped; the key then runs on its own (below).
    }
    if (PREFIXES.has(e.key)) {
      pending = e.key;
      return null;
    }

    if (e.key === " ") {
      mode = "LEADER";
      return { type: "leader" };
    }
    if (/^[1-5]$/.test(e.key)) return { type: "buffer", n: Number(e.key) };
    return SINGLE[e.key] ?? null;
  }

  return {
    feed,
    pending: () => pending,
    mode: () => mode,
    group: () => group,
  };
}
