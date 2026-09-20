import { describe, expect, it } from "vitest";
import { pdfTitleDensity, planPdfMediaPages, selectPdfLayout, splitPdfTitle } from "../../lib/pdf-layout";

const images = (...ratios: number[]) => ratios.map((ratio, index) => ({ id: index, ratio }));

describe("PDF editorial layout planning", () => {
  it("never packs more than four compatible images on one page", () => {
    const pages = planPdfMediaPages(images(1, 1.1, .9, 1.2, 1.05, .95));
    expect(pages.map((page) => page.images.length)).toEqual([4, 2]);
    expect(pages.every((page) => page.images.length <= 4)).toBe(true);
  });

  it("keeps chapter openings restrained and splits incompatible ratios", () => {
    expect(planPdfMediaPages(images(1, 1.1, .9), { chapterStart: true }).map((page) => page.images.length)).toEqual([2, 1]);
    expect(planPdfMediaPages(images(2.4, .62, 1.1)).map((page) => page.images.length)).toEqual([3]);
    expect(planPdfMediaPages(images(.42, 1.6, .7)).map((page) => page.images.length)).toEqual([1, 1, 1]);
    expect(planPdfMediaPages(images(5.2, 1.33, 1.92, 2.2, 1.07, 1.5, 1.41), { chapterStart: true }).map((page) => page.images.length)).toEqual([1, 2, 4]);
  });

  it("selects a finite set of hierarchy-aware templates", () => {
    expect(selectPdfLayout(images(.7, 1.7), 0)).toBe("asym-duo");
    expect(selectPdfLayout(images(1.6, 1.8), 0)).toBe("stack-duo");
    expect(selectPdfLayout(images(1.6, .9, 1.1), 0)).toBe("wide-trio");
    expect(selectPdfLayout(images(2.2, 1.07, 1.5, 1.41), 0)).toBe("mixed-four");
    expect(selectPdfLayout(images(1, 1, 1), 0)).toBe("dominant-trio");
    expect(selectPdfLayout(images(1, 1, 1), 1)).toBe("dominant-trio-reverse");
    expect(selectPdfLayout(images(1, 1.1, .95, 1.05), 0)).toBe("grid-four");
  });

  it("splits mixed-language titles into stable typographic levels", () => {
    expect(splitPdfTitle("堡乎乎 Manual Burger")).toEqual({ primary: "堡乎乎", secondary: "Manual Burger" });
    expect(splitPdfTitle("春莱 · 品牌视觉长期维护 / Brand Visual Evolution")).toEqual({ primary: "春莱", secondary: "品牌视觉长期维护 / Brand Visual Evolution" });
    expect(splitPdfTitle("JUJUS")).toEqual({ primary: "JUJUS", secondary: "" });
    expect(pdfTitleDensity("春莱 · 品牌视觉长期维护 / Brand Visual Evolution")).toBe("isDense");
  });
});
