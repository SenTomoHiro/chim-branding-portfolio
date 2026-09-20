import { describe, expect, it } from "vitest";
import { planPdfMediaPages, selectPdfLayout } from "../../lib/pdf-layout";
import { caseFullTitle, caseTitleDensity } from "../../lib/case-title";

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

  it("formats explicit title fields without guessing separators", () => {
    const title = { brandName: "春莱 × 小蓝鸭", projectName: "联名系列" };
    expect(caseFullTitle(title)).toBe("春莱 × 小蓝鸭 · 联名系列");
    expect(caseFullTitle({ brandName: "华南行", projectName: "" })).toBe("华南行");
    expect(caseTitleDensity({ brandName: "春莱", projectName: "品牌视觉长期维护 / Brand Visual Evolution" })).toBe("isDense");
  });
});
