import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPublishedCases } from "../../lib/sort-cases";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

describe("portfolio taxonomy", () => {
  it("requires one business and at least one unique fixed category for every case", () => {
    for (const item of content.cases) {
      expect(["branding", "photography"]).toContain(item.business);
      expect(item.categories.length).toBeGreaterThan(0);
      expect(new Set(item.categories).size).toBe(item.categories.length);
      expect(item.categories.every((category) => ["food", "drinks", "ip", "other"].includes(category))).toBe(true);
    }
  });

  it("keeps 30 published Branding and 18 published Photography cases", () => {
    expect(getPublishedCases(content.cases, content, { business: "branding" })).toHaveLength(30);
    expect(getPublishedCases(content.cases, content, { business: "photography" })).toHaveLength(18);
  });

  it("allows the same case to appear in multiple category filters", () => {
    const food = getPublishedCases(content.cases, content, { business: "branding", category: "food" });
    const ip = getPublishedCases(content.cases, content, { business: "branding", category: "ip" });
    expect(food.some((item) => item.id === "N013")).toBe(true);
    expect(ip.some((item) => item.id === "N013")).toBe(true);
  });
});
