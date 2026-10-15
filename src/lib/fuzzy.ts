// fzf-style subsequence matching for the ":" finder.
// Every query letter must appear in order. Consecutive letters and letters at
// the start of a word score higher, so "dd" ranks "Determination Drill" first.

export interface Match {
  score: number;
  hits: number[]; // indices into the name, for highlighting
}

const WORD_BREAK = /[\s\-_./]/;

export function score(name: string, query: string): Match | null {
  if (!query) return { score: 0, hits: [] };
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  const hits: number[] = [];
  let total = 0;
  let last = -2;
  let qi = 0;
  for (let i = 0; i < n.length && qi < q.length; i++) {
    if (n[i] !== q[qi]) continue;
    const consecutive = i === last + 1;
    const wordStart = i === 0 || WORD_BREAK.test(n[i - 1]);
    total += (consecutive ? 5 : 1) + (wordStart ? 3 : 0);
    hits.push(i);
    last = i;
    qi++;
  }
  if (qi < q.length) return null;
  return { score: total - n.length * 0.01, hits };
}

export function rank<T>(items: T[], key: (item: T) => string, query: string) {
  return items
    .map((item) => ({ item, match: score(key(item), query) }))
    .filter((r): r is { item: T; match: Match } => r.match !== null)
    .sort((a, b) => b.match.score - a.match.score) // stable: ties keep input order
    .map(({ item, match }) => ({ item, score: match.score, hits: match.hits }));
}
