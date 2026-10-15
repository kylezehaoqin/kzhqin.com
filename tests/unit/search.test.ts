import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/lib/search";

const notes = [
  { id: "live", data: { title: "Live note", kind: "finding", summary: "s1", date: new Date("2026-09-30"), tags: ["pg"], draft: false } },
  { id: "hidden", data: { title: "Hidden draft", kind: "note", summary: "s2", date: new Date("2026-10-01"), tags: [], draft: true } },
];
const projects = [
  { id: "deuce", data: { name: "Deuce", year: 2026, summary: "warehouse", tags: ["python", "dbt"], href: "https://github.com/kylezehaoqin/deuce" } },
  { id: "bird-bingo", data: { name: "Bird Bingo", year: 2025, summary: "cards", tags: ["react"] } },
];

describe("buildIndex", () => {
  const index = buildIndex({ notes, projects });

  it("includes the 4 pages first", () => {
    expect(index.slice(0, 4).map((e) => e.href)).toEqual(["/", "/projects", "/notes", "/about"]);
  });

  it("includes published notes with their URL", () => {
    expect(index).toContainEqual(expect.objectContaining({ name: "Live note", kind: "finding", href: "/notes/live" }));
  });

  it("never includes drafts", () => {
    expect(index.some((e) => e.name === "Hidden draft")).toBe(false);
    expect(JSON.stringify(index)).not.toContain("hidden");
  });

  it("links projects to their href, or to /projects when they have none", () => {
    expect(index).toContainEqual(expect.objectContaining({ name: "Deuce", kind: "project", href: "https://github.com/kylezehaoqin/deuce" }));
    expect(index).toContainEqual(expect.objectContaining({ name: "Bird Bingo", href: "/projects" }));
  });

  it("puts tags in the meta line", () => {
    expect(index.find((e) => e.name === "Deuce")?.meta).toBe("2026 · python · dbt");
  });
});
