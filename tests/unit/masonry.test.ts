import { describe, expect, it } from "vitest";
import { createMasonryLayout } from "../../lib/masonry";
import type { PortfolioCase } from "../../lib/types";

const item = (id: string, width: number, height: number): PortfolioCase => ({
  id, brandName: id, projectName: "", intro: "", business: "branding", categories: ["other"], primaryIndustry: "",
  media: [{ id: `${id}-cover`, type: "image", src: `/media/${id}-cover.jpg`, layout: "full", width, height }, { id: `${id}-hero`, type: "image", src: `/media/${id}-hero.jpg`, layout: "full" }], published: true, includeInPortfolioPdf: true,
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
