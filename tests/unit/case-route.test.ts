import { describe, expect, it } from "vitest";
import { casePath, findPublishedCaseById } from "../../lib/case-route";
import type { PortfolioCase } from "../../lib/types";

const item: PortfolioCase = { id: "A-01", brandName: "堡乎乎 Manual Burger", projectName: "", intro: "", business: "branding", categories: ["food"], primaryIndustry: "餐饮", cover: "", coverWidth: 1400, coverHeight: 1050, hero: "", bodyAssets: [], published: true, includeInPortfolioPdf: true, portfolioPdfHeroSelected: false, portfolioPdfCoverSelected: false };

describe("case id routes", () => {
  it("uses the stable id without depending on title changes", () => {
    expect(casePath(item.id)).toBe("/work/a-01");
    expect(findPublishedCaseById([item], "A-01")).toBe(item);
    const renamed = { ...item, brandName: "春莱", projectName: "品牌视觉长期维护 / Brand Visual Evolution" };
    expect(casePath(renamed.id)).toBe("/work/a-01");
    expect(findPublishedCaseById([renamed], "a-01")).toBe(renamed);
  });
});
