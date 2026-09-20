import { describe, expect, it } from "vitest";
import { assertPdfConfiguration, getPortfolioPdfCases, initializePortfolioPdfSelection, resolvePortfolioPdfImages } from "../../lib/pdf-portfolio";
import type { ContentData, PortfolioCase } from "../../lib/types";

const makeCase = (id: string, overrides: Partial<PortfolioCase> = {}): PortfolioCase => ({
  id, brandName: id, projectName: "", intro: "Intro", business: "branding", categories: ["other"], primaryIndustry: "",
  media: [
    { id: `${id}-cover`, type: "image", src: `/media/${id}/cover.jpg`, layout: "full" },
    { id: `${id}-hero`, type: "image", src: `/media/${id}/hero.jpg`, layout: "full", portfolioPdfSelected: true },
    { id: `${id}-a`, type: "image", src: `/media/${id}/a.jpg`, layout: "full", portfolioPdfSelected: true, section: { eyebrow: "CHAPTER 01", title: "A" } },
    { id: `${id}-b`, type: "image", src: `/media/${id}/b.jpg`, layout: "full", portfolioPdfSelected: false },
    { id: `${id}-c`, type: "image", src: `/media/${id}/c.jpg`, layout: "full", portfolioPdfSelected: true, section: { eyebrow: "CHAPTER 02", title: "B" } },
  ],
  published: true, includeInPortfolioPdf: true,
  ...overrides,
});

describe("portfolio PDF configuration", () => {
  it("initializes selected images in unified media order", () => {
    expect(resolvePortfolioPdfImages(initializePortfolioPdfSelection(makeCase("A"))).map((image) => image.id)).toEqual(["A-cover", "A-hero", "A-a", "A-b"]);
  });

  it("always resolves selected images in unified media order", () => {
    const item = makeCase("A");
    expect(resolvePortfolioPdfImages(item).map((image) => image.id)).toEqual(["A-hero", "A-a", "A-c"]);
    const reordered = { ...item, media: [item.media[4], item.media[1], item.media[2], item.media[0], item.media[3]] };
    expect(resolvePortfolioPdfImages(reordered).map((image) => image.id)).toEqual(["A-c", "A-hero", "A-a"]);
  });

  it("splits design and photography portfolios using official business data and order", () => {
    const a = makeCase("A"); const b = makeCase("B", { includeInPortfolioPdf: false }); const food = makeCase("F", { categories: ["food"] });
    const photo = makeCase("P", { business: "photography", categories: [] });
    const data: ContentData = { cases: [a, b, food, photo], defaultOrder: ["B", "F", "A"], photographyCaseOrder: ["P"] };
    expect(getPortfolioPdfCases(data, "branding").map((item) => item.id)).toEqual(["F", "A"]);
    expect(getPortfolioPdfCases(data, "branding", "food").map((item) => item.id)).toEqual(["F"]);
    expect(getPortfolioPdfCases(data, "photography").map((item) => item.id)).toEqual(["P"]);
  });

  it("fails loudly when an included published case has no selected media", () => {
    const item = makeCase("A", { media: makeCase("A").media.map((asset) => ({ ...asset, portfolioPdfSelected: false })) });
    const data: ContentData = { cases: [item], defaultOrder: ["A"], photographyCaseOrder: [] };
    expect(() => assertPdfConfiguration(data)).toThrow(/没有精选图片/);
  });
});
