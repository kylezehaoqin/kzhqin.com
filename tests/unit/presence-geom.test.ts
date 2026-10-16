import { describe, expect, it } from "vitest";
import { dotX, normalizePath, shouldPost, viewY } from "../../src/lib/presence-geom";

describe("presence geometry", () => {
  it("normalizes paths like the server expects", () => {
    expect(normalizePath("/projects/deuce.html")).toBe("/projects/deuce");
    expect(normalizePath("/About/")).toBe("/about");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
  });

  it("y is the viewport center as a fraction of the page, 2 decimals", () => {
    expect(viewY(0, 800, 4000)).toBe(0.1);
    expect(viewY(3200, 800, 4000)).toBe(0.9);
    expect(viewY(1000, 800, 4000)).toBe(0.35);
    expect(viewY(0, 800, 600)).toBe(0.5); // a page shorter than the screen
  });

  it("posts only when y moved by 0.03 or more", () => {
    expect(shouldPost(null, 0.4)).toBe(true);
    expect(shouldPost(0.4, 0.42)).toBe(false);
    expect(shouldPost(0.4, 0.43)).toBe(true);
    expect(shouldPost(0.4, 0.37)).toBe(true);
  });

  it("keeps dots out of the text column, or at the screen edge on phones", () => {
    for (const id of ["00000000", "0000000f", "deadbeef", "a1b2c3d4", "ffffffff"]) {
      const x = dotX(id, 1440);
      expect(x < 360 - 20 || x > 1080 + 20).toBe(true);
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(1430);
      expect([10, 380]).toContain(dotX(id, 390));
      expect(dotX(id, 1440)).toBe(x); // stable for the same id
    }
  });
});
