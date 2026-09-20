import { describe, expect, it } from "vitest";
import { pdfTitleDensity, planPdfMediaPages, selectPdfLayout, splitPdfTitle } from "../../lib/pdf-layout";

const images = (...ratios: number[]) => ratios.map((ratio, index) => ({ id: index, ratio }));

describe("PDF editorial layout planning", () => {
  it("balances long image sequences without leaving a final orphan", () => {
    expect(planPdfMediaPages(images(1, 1.1, .9, 1.2, 1.8)).map((page) => page.images.length)).toEqual([3, 2]);
    expect(planPdfMediaPages(images(1, 1.1, .9, 1.2, 1.8, .7, 1.3)).map((page) => page.images.length)).toEqual([4, 3]);
    expect(planPdfMediaPages(images(1, 1.1, .9, 1.2, 1.3, .95)).map((page) => page.images.length)).toEqual([6]);
  });

  it("selects a finite set of hierarchy-aware templates", () => {
    expect(selectPdfLayout(images(.7, 1.7), 0)).toBe("asym-duo");
    expect(selectPdfLayout(images(1, 1, 1), 0)).toBe("dominant-trio");
    expect(selectPdfLayout(images(1, 1, 1), 1)).toBe("dominant-trio-reverse");
    expect(selectPdfLayout(images(.7, 1.7, 1, 1), 0)).toBe("asym-quad");
  });

  it("splits mixed-language titles into stable typographic levels", () => {
    expect(splitPdfTitle("堡乎乎 Manual Burger")).toEqual({ primary: "堡乎乎", secondary: "Manual Burger" });
    expect(splitPdfTitle("春莱 · 品牌视觉长期维护 / Brand Visual Evolution")).toEqual({ primary: "春莱", secondary: "品牌视觉长期维护 / Brand Visual Evolution" });
    expect(splitPdfTitle("JUJUS")).toEqual({ primary: "JUJUS", secondary: "" });
    expect(pdfTitleDensity("春莱 · 品牌视觉长期维护 / Brand Visual Evolution")).toBe("isDense");
  });
});
