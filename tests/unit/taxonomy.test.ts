import { describe, expect, it } from "vitest";
import { getPublishedCases } from "../../lib/sort-cases";
import { formatCaseMetadata } from "../../lib/taxonomy";
import type { ContentData, PortfolioCase } from "../../lib/types";

const item = (id: string, business: PortfolioCase["business"], categories: PortfolioCase["categories"]): PortfolioCase => ({ id, brandName: id, projectName: "", intro: "", business, categories, primaryIndustry: "", media: [], published: true, includeInPortfolioPdf: false });
const content: ContentData = { cases: [item("A", "branding", ["food", "ip"]), item("B", "photography", [])], defaultOrder: ["A"], photographyCaseOrder: ["B"] };

describe("portfolio taxonomy", () => {
  it("requires Branding categories and keeps Photography categories empty", () => {
    for (const item of content.cases) {
      expect(["branding", "photography"]).toContain(item.business);
      if (item.business === "branding") expect(item.categories.length).toBeGreaterThanOrEqual(1);
      else expect(item.categories).toEqual([]);
      expect(new Set(item.categories).size).toBe(item.categories.length);
      expect(item.categories.every((category) => ["food", "drinks", "ip", "other"].includes(category))).toBe(true);
    }
  });

  it("formats Branding and Photography metadata through one formatter", () => {
    expect(formatCaseMetadata({ business: "branding", categories: ["food", "ip"], primaryIndustry: "汉堡" })).toBe("餐饮 / IP · 汉堡");
    expect(formatCaseMetadata({ business: "photography", categories: [], primaryIndustry: "茶饮" })).toBe("商业摄影 · 茶饮");
  });

  it("separates published Branding and Photography cases", () => {
    expect(getPublishedCases(content.cases, content, { business: "branding" })).toHaveLength(1);
    expect(getPublishedCases(content.cases, content, { business: "photography" })).toHaveLength(1);
  });

  it("allows the same case to appear in multiple category filters", () => {
    const food = getPublishedCases(content.cases, content, { business: "branding", category: "food" });
    const ip = getPublishedCases(content.cases, content, { business: "branding", category: "ip" });
    expect(food.some((item) => item.id === "A")).toBe(true);
    expect(ip.some((item) => item.id === "A")).toBe(true);
  });
});
