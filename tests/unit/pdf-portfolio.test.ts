import { describe, expect, it } from "vitest";
import { assertPdfConfiguration, getPortfolioPdfCases, initializePortfolioPdfSelection, resolvePortfolioPdfImages } from "../../lib/pdf-portfolio";
import type { ContentData, PortfolioCase } from "../../lib/types";

const makeCase = (id: string, overrides: Partial<PortfolioCase> = {}): PortfolioCase => ({
  id, brandName: id, projectName: "", intro: "Intro", business: "branding", categories: ["other"], primaryIndustry: "",
  cover: `/media/${id}/cover.jpg`, coverWidth: 1400, coverHeight: 1050, hero: `/media/${id}/hero.jpg`,
  bodyAssets: [
    { id: `${id}-a`, type: "image", src: `/media/${id}/a.jpg`, layout: "full", portfolioPdfSelected: true, section: { eyebrow: "CHAPTER 01", title: "A" } },
    { id: `${id}-b`, type: "image", src: `/media/${id}/b.jpg`, layout: "full", portfolioPdfSelected: false },
    { id: `${id}-c`, type: "image", src: `/media/${id}/c.jpg`, layout: "full", portfolioPdfSelected: true, section: { eyebrow: "CHAPTER 02", title: "B" } },
  ],
  published: true, includeInPortfolioPdf: true, portfolioPdfHeroSelected: true, portfolioPdfCoverSelected: false,
  ...overrides,
});

describe("portfolio PDF configuration", () => {
  it("initializes with hero and representatives from different chapters", () => {
    expect(resolvePortfolioPdfImages(initializePortfolioPdfSelection(makeCase("A"))).map((image) => image.id)).toEqual(["hero", "A-a", "A-b", "A-c"]);
  });

  it("always resolves selected images in fixed hero, cover, and body-media order", () => {
    const item = makeCase("A", { portfolioPdfCoverSelected: true });
    expect(resolvePortfolioPdfImages(item).map((image) => image.id)).toEqual(["hero", "cover", "A-a", "A-c"]);
    const reordered = { ...item, bodyAssets: [item.bodyAssets[2], item.bodyAssets[1], item.bodyAssets[0]] };
    expect(resolvePortfolioPdfImages(reordered).map((image) => image.id)).toEqual(["hero", "cover", "A-c", "A-a"]);
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
    const item = makeCase("A", { portfolioPdfHeroSelected: false, bodyAssets: makeCase("A").bodyAssets.map((asset) => ({ ...asset, portfolioPdfSelected: false })) });
    const data: ContentData = { cases: [item], defaultOrder: ["A"], photographyCaseOrder: [] };
    expect(() => assertPdfConfiguration(data)).toThrow(/没有精选图片/);
  });
});
