import { describe, expect, it } from "vitest";
import {
  layoutPdfMasonry,
  PDF_CONTENT_WIDTH_MM,
  PDF_WATERFALL_COLUMN_WIDTH_MM,
  PDF_WATERFALL_GAP_MM,
} from "../../lib/pdf-masonry";

describe("PDF masonry layout", () => {
  it("uses one formal width calculation", () => {
    expect(PDF_WATERFALL_COLUMN_WIDTH_MM).toBe((PDF_CONTENT_WIDTH_MM - PDF_WATERFALL_GAP_MM) / 2);
  });

  it("keeps source order while placing each image in the current shortest column", () => {
    const source = [
      { id: "a", ratio: 2 },
      { id: "b", ratio: 0.5 },
      { id: "c", ratio: 1 },
      { id: "d", ratio: 1.5 },
    ];
    const result = layoutPdfMasonry(source);
    expect(result.placements.map((item) => item.id)).toEqual(source.map((item) => item.id));
    expect(result.placements.map((item) => item.column)).toEqual([0, 1, 0, 0]);
    expect(result.placements[2].top).toBeCloseTo(result.placements[0].height + PDF_WATERFALL_GAP_MM);
    expect(result.placements[3].top).toBeCloseTo(result.placements[2].top + result.placements[2].height + PDF_WATERFALL_GAP_MM);
  });

  it("rejects fabricated or invalid ratios", () => {
    expect(() => layoutPdfMasonry([{ id: "missing", ratio: 0 }])).toThrow("尺寸无效");
  });
});
