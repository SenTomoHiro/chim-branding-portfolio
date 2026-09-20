import { describe, expect, it } from "vitest";
import { assertPdfConfiguration, createInitialPortfolioPdfSelection, getPortfolioPdfCases, resolvePortfolioPdfImages } from "../../lib/pdf-portfolio";
import type { ContentData, PortfolioCase } from "../../lib/types";

const makeCase = (id: string, overrides: Partial<PortfolioCase> = {}): PortfolioCase => ({
  id, name: id, intro: "Intro", business: "branding", categories: ["other"], primaryIndustry: "",
  cover: `/media/${id}/cover.jpg`, coverWidth: 1400, coverHeight: 1050, hero: `/media/${id}/hero.jpg`,
  bodyAssets: [
    { id: `${id}-a`, type: "image", src: `/media/${id}/a.jpg`, layout: "full", section: { eyebrow: "CHAPTER 01", title: "A" } },
    { id: `${id}-b`, type: "image", src: `/media/${id}/b.jpg`, layout: "full" },
    { id: `${id}-c`, type: "image", src: `/media/${id}/c.jpg`, layout: "full", section: { eyebrow: "CHAPTER 02", title: "B" } },
  ],
  published: true, includeInPortfolioPdf: true, portfolioPdfImageIds: ["hero", `${id}-a`, `${id}-c`],
  ...overrides,
});

describe("portfolio PDF configuration", () => {
  it("initializes with hero and representatives from different chapters", () => {
    expect(createInitialPortfolioPdfSelection(makeCase("A"))).toEqual(["hero", "A-a", "A-c", "A-b"]);
  });

  it("resolves selected images in the administrator-defined order", () => {
    const item = makeCase("A", { portfolioPdfImageIds: ["A-c", "hero", "A-a"] });
    expect(resolvePortfolioPdfImages(item).map((image) => image.id)).toEqual(["A-c", "hero", "A-a"]);
  });

  it("splits design and photography portfolios using official business data and order", () => {
    const a = makeCase("A"); const b = makeCase("B", { includeInPortfolioPdf: false });
    const photo = makeCase("P", { business: "photography", categories: [] });
    const data: ContentData = { cases: [a, b, photo], defaultOrder: ["B", "A"], photographyCaseOrder: ["P"] };
    expect(getPortfolioPdfCases(data, "branding").map((item) => item.id)).toEqual(["A"]);
    expect(getPortfolioPdfCases(data, "photography").map((item) => item.id)).toEqual(["P"]);
  });

  it("fails loudly for a missing selected image reference", () => {
    const item = makeCase("A", { portfolioPdfImageIds: ["missing"] });
    const data: ContentData = { cases: [item], defaultOrder: ["A"], photographyCaseOrder: [] };
    expect(() => assertPdfConfiguration(data)).toThrow(/引用不存在/);
  });
});
