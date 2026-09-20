import { describe, expect, it } from "vitest";
import { casePath, findPublishedCaseByName } from "../../lib/case-route";
import type { PortfolioCase } from "../../lib/types";

const item: PortfolioCase = { id: "A", name: "堡乎乎 Manual Burger", intro: "", business: "branding", categories: ["food"], primaryIndustry: "餐饮", cover: "", coverWidth: 1400, coverHeight: 1050, hero: "", bodyAssets: [], published: true, includeInPortfolioPdf: true, portfolioPdfImageIds: [] };

describe("case name routes", () => {
  it("encodes the case name as the only URL identifier", () => {
    expect(casePath(item.name)).toBe("/work/%E5%A0%A1%E4%B9%8E%E4%B9%8E%20Manual%20Burger");
    expect(findPublishedCaseByName([item], encodeURIComponent(item.name))).toBe(item);
  });

  it("uses a Pages-safe route segment without changing a title that contains a slash", () => {
    const slashItem = { ...item, name: "春莱 · 品牌视觉长期维护 / Brand Visual Evolution" };
    expect(casePath(slashItem.name)).toContain("%EF%BC%8F");
    expect(casePath(slashItem.name)).not.toContain("%2F");
    expect(findPublishedCaseByName([slashItem], encodeURIComponent("春莱 · 品牌视觉长期维护 ／ Brand Visual Evolution"))).toBe(slashItem);
  });
});
