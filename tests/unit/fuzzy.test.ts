import { describe, expect, it } from "vitest";
import { rank, score, search } from "../../src/lib/fuzzy";

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

describe("search (the finder)", () => {
  const items = [
    { name: "Tie", text: "Two-way recommender.", meta: "2023 · react" },
    { name: "Deuce", text: "Warehouse with a text-to-SQL agent.", meta: "2026 · python · postgresql" },
    { name: "theme", text: "Switch between light and dark.", alias: "t" },
  ];
  const names = (q: string) => search(items, q).map((r) => r.item.name);

  it("puts an exact alias first, so :t runs the theme command", () => {
    expect(names("t")[0]).toBe("theme");
    expect(names("T")[0]).toBe("theme");
  });

  it("finds an item by its summary or tags when the name does not match", () => {
    expect(names("sql")).toEqual(["Deuce"]);
    expect(names("python")).toEqual(["Deuce"]);
  });

  it("ranks any name match above a summary match", () => {
    // "te": Tie and theme match by name (t…e); Deuce only by "text" in its summary.
    const r = names("te");
    expect(r).toHaveLength(3);
    expect(r[2]).toBe("Deuce");
  });

  it("needs 2+ letters to match a summary", () => {
    expect(names("q")).toEqual([]);
  });

  it("returns everything in input order for an empty query", () => {
    expect(names("")).toEqual(["Tie", "Deuce", "theme"]);
  });
});
