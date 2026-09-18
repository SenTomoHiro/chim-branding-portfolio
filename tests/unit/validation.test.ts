import { describe, expect, it } from "vitest";
import { parseCase } from "../../lib/validation";

const input = {
  name: "规则测试",
  slug: "taxonomy-test",
  intro: "",
  primaryIndustry: "餐饮",
  cover: "",
  hero: "",
  bodyAssets: [],
  published: false,
};

describe("case validation", () => {
  it("rejects Branding without a valid category", () => {
    expect(() => parseCase({ ...input, business: "branding", categories: [] })).toThrow("品牌设计请至少选择一个有效分类");
  });

  it("normalizes Photography categories to an empty array", () => {
    expect(parseCase({ ...input, business: "photography", categories: ["food", "invalid"] }).categories).toEqual([]);
  });
});
