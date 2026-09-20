import { describe, expect, it } from "vitest";
import { assertUniqueTitle, parseCase } from "../../lib/validation";
import type { ContentData } from "../../lib/types";

const input = {
  brandName: "规则测试",
  projectName: "项目 A",
  intro: "",
  primaryIndustry: "餐饮",
  cover: "",
  hero: "",
  media: [],
  published: false,
};

describe("case validation", () => {
  it("rejects Branding without a valid category", () => {
    expect(() => parseCase({ ...input, business: "branding", categories: [] })).toThrow("品牌设计请至少选择一个有效分类");
  });

  it("normalizes Photography categories to an empty array", () => {
    expect(parseCase({ ...input, business: "photography", categories: ["food", "invalid"] }).categories).toEqual([]);
  });

  it("accepts a unique title and rejects another case with the same title", () => {
    const existing = parseCase({ ...input, id: "A", business: "branding", categories: ["food"] });
    const data: ContentData = { cases: [existing], defaultOrder: ["A"], photographyCaseOrder: [] };
    expect(() => assertUniqueTitle(data, existing)).not.toThrow();
    const duplicate = parseCase({ ...input, id: "B", business: "branding", categories: ["other"] });
    expect(() => assertUniqueTitle(data, duplicate)).toThrow("品牌名与项目名组合已存在，请使用唯一标题。");
  });

  it("preserves optional editorial section headings on existing media", () => {
    const item = parseCase({ ...input, business: "branding", categories: ["drinks"], media: [{ id: "asset-1", type: "image", src: "/media/example.jpg", layout: "full", section: { eyebrow: "VI 04", title: "2025 品牌升级", description: "品牌应用更新。" } }] });
    expect(item.media[0].section).toEqual({ eyebrow: "CHAPTER 01", title: "2025 品牌升级", description: "品牌应用更新。" });
  });
});
