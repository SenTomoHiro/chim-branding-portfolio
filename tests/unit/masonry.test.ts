import { describe, expect, it } from "vitest";
import { createMasonryLayout } from "../../lib/masonry";
import type { PortfolioCase } from "../../lib/types";

const item = (id: string, width: number, height: number): PortfolioCase => ({
  id, name: id, intro: "", business: "branding", categories: ["other"], primaryIndustry: "",
  cover: "", coverWidth: width, coverHeight: height,
  hero: "", bodyAssets: [], published: true, includeInPortfolioPdf: true, portfolioPdfImageIds: [],
});

describe("createMasonryLayout", () => {
  it("fills the shortest column while preserving source order", () => {
    const layout = createMasonryLayout([
      item("A", 100, 200), item("B", 100, 100), item("C", 100, 50), item("D", 100, 100),
    ], 3, 1000);
    expect(layout.placements.map((entry) => entry.column)).toEqual([0, 1, 2, 2]);
  });

  it("keeps every item in one column on mobile", () => {
    const layout = createMasonryLayout([item("A", 100, 200), item("B", 100, 50)], 1, 390);
    expect(layout.placements.map((entry) => entry.column)).toEqual([0, 0]);
  });
});
