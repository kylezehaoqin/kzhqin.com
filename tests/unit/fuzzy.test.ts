import { describe, expect, it } from "vitest";
import { rank, score } from "../../src/lib/fuzzy";

describe("score", () => {
  it("matches a subsequence and reports the matched indices", () => {
    expect(score("projects", "pjs")?.hits).toEqual([0, 3, 7]);
  });

  it("returns null when the letters are not all present in order", () => {
    expect(score("notes", "sn")).toBeNull();
    expect(score("about", "xyz")).toBeNull();
  });

  it("ignores case", () => {
    expect(score("Deuce", "DEU")).not.toBeNull();
  });

  it("scores consecutive letters above scattered ones", () => {
    const tight = score("deuce", "deu")!;
    const loose = score("d-e-u", "deu")!;
    expect(tight.score).toBeGreaterThan(loose.score);
  });

  it("scores word starts above mid-word letters", () => {
    const start = score("accent signal", "s")!;
    const mid = score("baseline", "s")!;
    expect(start.score).toBeGreaterThan(mid.score);
  });

  it("matches everything with an empty query and no hits", () => {
    expect(score("anything", "")).toEqual({ score: 0, hits: [] });
  });
});

describe("rank", () => {
  const items = ["home", "projects", "notes", "about", "Determination Drill"];

  it("drops non-matches and puts the best match first", () => {
    const out = rank(items, (s) => s, "dd").map((r) => r.item);
    expect(out[0]).toBe("Determination Drill");
    expect(out).not.toContain("home");
  });

  it("keeps the original order for an empty query", () => {
    expect(rank(items, (s) => s, "").map((r) => r.item)).toEqual(items);
  });
});
