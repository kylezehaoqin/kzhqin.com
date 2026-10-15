// Vim's ruler position for the status bar: All, Top, n%, or Bot.
export function scrollLabel(scrollY: number, scrollHeight: number, viewport: number): string {
  const max = scrollHeight - viewport;
  if (max <= 0) return "All";
  if (scrollY < 4) return "Top";
  const pct = Math.round((scrollY / max) * 100);
  return pct >= 99 ? "Bot" : `${pct}%`;
}
