import { describe, expect, it } from "vitest";
import { scrollLabel } from "../../src/lib/scrollpos";

describe("scrollLabel", () => {
  it("says All when the page fits the window", () => {
    expect(scrollLabel(0, 800, 900)).toBe("All");
    expect(scrollLabel(0, 900, 900)).toBe("All");
  });

  it("says Top near the top", () => {
    expect(scrollLabel(0, 3000, 1000)).toBe("Top");
    expect(scrollLabel(3, 3000, 1000)).toBe("Top");
  });

  it("says Bot at the bottom", () => {
    expect(scrollLabel(2000, 3000, 1000)).toBe("Bot");
    expect(scrollLabel(1985, 3000, 1000)).toBe("Bot");
  });

  it("shows a rounded percentage in between", () => {
    expect(scrollLabel(1000, 3000, 1000)).toBe("50%");
    expect(scrollLabel(843, 3000, 1000)).toBe("42%");
  });
});
