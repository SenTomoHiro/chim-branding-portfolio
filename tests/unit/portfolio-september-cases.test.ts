import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const manifest = JSON.parse(readFileSync(new URL("../../case-production/portfolio-jujus-ruihan-atai-v1/final-manifest.json", import.meta.url), "utf8"));

describe("JUJUS, 瑞瀚心理 and 阿泰珍奶 portfolio cases", () => {
  it("uses the existing case model with the curated chapter structure", () => {
    expect(manifest.cases.map((item: { id: string; chapterCount: number; bodyImageCount: number }) => [item.id, item.chapterCount, item.bodyImageCount])).toEqual([
      ["N026", 3, 6],
      ["N027", 4, 8],
      ["N028", 5, 10],
    ]);
    for (const id of ["N026", "N027", "N028"]) {
      const item = content.cases.find((entry) => entry.id === id);
      expect(item?.published, id).toBe(true);
      expect(item?.bodyAssets.every((asset) => asset.provenance?.finalWorkVerified), id).toBe(true);
      expect(item?.bodyAssets.filter((asset) => asset.section).map((asset) => asset.section?.eyebrow), id).toEqual(
        item?.bodyAssets.filter((asset) => asset.section).map((_, index) => `CHAPTER ${String(index + 1).padStart(2, "0")}`),
      );
      expect(content.defaultOrder.includes(id), id).toBe(true);
    }

    const existing = content.cases.find((entry) => entry.name === "春莱 · 桃花桂花艺人系列");
    expect(existing?.bodyAssets.filter((asset) => asset.section).map((asset) => asset.section?.eyebrow)).toEqual([
      "CHAPTER 01",
      "CHAPTER 02",
      "CHAPTER 03",
    ]);
  });

  it("records native Illustrator export and keeps every selected web asset", () => {
    expect(manifest.illustrator).toMatchObject({ application: "Adobe Illustrator", version: "30.0.0", sourceFilesOverwritten: 0, exportedArtboards: 49, missingLinkedAssets: 0 });
    expect(manifest.ataiNamingDecision).toContain("阿泰珍奶");
    for (const asset of manifest.assets) expect(existsSync(new URL(`../../public${asset.src}`, import.meta.url)), asset.src).toBe(true);
  });
});
