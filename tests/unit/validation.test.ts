import { describe, expect, it } from "vitest";
import { assertUniqueName, parseCase } from "../../lib/validation";
import type { ContentData } from "../../lib/types";

const input = {
  name: "规则测试",
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

  it("accepts a unique name and rejects another case with the same name", () => {
    const existing = parseCase({ ...input, id: "A", business: "branding", categories: ["food"] });
    const data: ContentData = { cases: [existing], defaultOrder: ["A"], photographyCaseOrder: [] };
    expect(() => assertUniqueName(data, existing)).not.toThrow();
    const duplicate = parseCase({ ...input, id: "B", business: "branding", categories: ["other"] });
    expect(() => assertUniqueName(data, duplicate)).toThrow("案例名称已存在，请使用唯一名称。");
  });
});
