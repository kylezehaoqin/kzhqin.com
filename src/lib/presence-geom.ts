// Pure helpers for the presence client: what to send and where to draw.

export function normalizePath(p: string): string {
  let s = p.toLowerCase().replace(/\.html$/, "");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
}

/** The viewport's vertical center as a fraction of the page (0..1), 2 decimals. */
export function viewY(scrollY: number, viewH: number, docH: number): number {
  if (docH <= viewH) return 0.5;
  const y = Math.min(1, Math.max(0, (scrollY + viewH / 2) / docH));
  return Math.round(y * 100) / 100;
}

export const shouldPost = (last: number | null, y: number) => last === null || Math.abs(y - last) >= 0.03 - 1e-9;

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** A stable x for a visitor's dot: in a side gutter, 24-96 px from the text column. */
export function dotX(id: string, viewW: number, col = 720): number {
  const h = hash(id);
  const right = (h & 1) === 1;
  if (viewW < col + 96) return right ? viewW - 10 : 10;
  const edge = (viewW - col) / 2;
  const off = 24 + ((h >>> 1) % 73);
  const x = right ? viewW - edge + off : edge - off;
  return Math.min(viewW - 10, Math.max(10, x));
}
