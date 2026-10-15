// The hidden LazyVim-style keymap, as a pure state machine. The page feeds it
// key presses and performs the returned action, so all key logic is testable
// without a browser.

export type Page = "home" | "projects" | "notes" | "about";

export type Action =
  | { type: "down" } | { type: "up" } | { type: "top" } | { type: "bottom" }
  | { type: "open" } | { type: "back" }
  | { type: "prevBuffer" } | { type: "nextBuffer" } | { type: "buffer"; n: number }
  | { type: "theme" } | { type: "find" } | { type: "help" }
  | { type: "leader" } | { type: "go"; page: Page } | { type: "escape" };

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
  t: { type: "theme" },
  ":": { type: "find" },
  "/": { type: "find" },
  "?": { type: "help" },
};

export const LEADER_KEYS: Record<string, { label: string; action: Action }> = {
  f: { label: "find", action: { type: "find" } },
  p: { label: "projects", action: { type: "go", page: "projects" } },
  n: { label: "notes", action: { type: "go", page: "notes" } },
  a: { label: "about", action: { type: "go", page: "about" } },
  h: { label: "home", action: { type: "go", page: "home" } },
  t: { label: "toggle theme", action: { type: "theme" } },
  "?": { label: "all keys", action: { type: "help" } },
};

export function createKeymap() {
  let pending = "";
  let mode: Mode = "NORMAL";

  function feed(e: KeyInput): Action | null {
    // Browser shortcuts and typing always win over the easter egg.
    if (e.meta || e.ctrl || e.alt || e.inEditable) return null;

    if (e.key === "Escape") {
      pending = "";
      mode = "NORMAL";
      return { type: "escape" };
    }

    if (mode === "LEADER") {
      mode = "NORMAL";
      return LEADER_KEYS[e.key]?.action ?? { type: "escape" };
    }

    if (e.key === "g") {
      if (pending === "g") {
        pending = "";
        return { type: "top" };
      }
      pending = "g";
      return null;
    }
    pending = ""; // a lone g followed by another key is dropped

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
  };
}
