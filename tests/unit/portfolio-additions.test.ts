import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentData } from "../../lib/types";

type Manifest = {
  sourceCandidateCount: number;
  sourceFileCount: number;
  psdPsbRenderSuccess: number;
  aiPdfRenderSuccess: number;
  skippedForFontsRenderOrProductionMarks: number;
  cropCount: number;
  compositeCount: number;
  finalDisplayImageCount: number;
  photoshopVerification: { application: string; exported: number; failed: number; sourceFilesOverwritten: number };
  illustratorVerification: { application: string; version: string; artboardCount: number; hiddenProductionLayers: string[]; sourceFilesOverwritten: number; selectedWebsiteAssetsReplaced: number };
  springlaiCorrection: { caseId: string; correctedAssetCount: number; productionLayersExcluded: string[] };
  cases: Array<{ id: string; siteName: string; caseAction: "create" | "update"; chapterCount: number; finalImageCount: number }>;
  items: Array<{ websiteAsset?: string }>;
};

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const manifest = JSON.parse(readFileSync(new URL("../../case-production/portfolio-additions-sol-v1/final-manifest.json", import.meta.url), "utf8")) as Manifest;
const importMap = JSON.parse(readFileSync(new URL("../../case-production/portfolio-additions-sol-v1/website-import-map.json", import.meta.url), "utf8")) as Array<{ websiteAsset: string }>;
const targets = ["N021", "N022", "N023", "L012", "N024", "N025"];

describe("portfolio additions Sol v1", () => {
  it("creates five cases, updates L012 in place, and preserves the selected structure", () => {
    expect(manifest.cases).toHaveLength(6);
    expect(manifest.cases.filter((item) => item.caseAction === "create")).toHaveLength(5);
    expect(manifest.cases.filter((item) => item.caseAction === "update")).toEqual([
      expect.objectContaining({ id: "L012", siteName: "文柠记" }),
    ]);
    expect(manifest.cases.map((item) => item.finalImageCount)).toEqual([12, 11, 10, 10, 15, 12]);
    expect(manifest.cases.map((item) => item.chapterCount)).toEqual([0, 2, 0, 0, 3, 2]);
    expect(content.cases.filter((item) => item.id === "L012")).toHaveLength(1);
    expect(content.cases.find((item) => item.id === "L012")?.brandName).toBe("文柠记");
    for (const id of targets) expect(content.cases.filter((item) => item.id === id), id).toHaveLength(1);
  });

  it("maps all 70 selected display units to unique, existing website assets", () => {
    expect(manifest.finalDisplayImageCount).toBe(70);
    expect(importMap).toHaveLength(70);
    expect(new Set(importMap.map((item) => item.websiteAsset)).size).toBe(70);
    for (const asset of importMap) {
      expect(asset.websiteAsset).toMatch(/^\/media\//);
      expect(existsSync(new URL(`../../public${asset.websiteAsset}`, import.meta.url)), asset.websiteAsset).toBe(true);
    }
  });

  it("records deterministic production and native Photoshop verification", () => {
    expect(manifest).toMatchObject({
      sourceCandidateCount: 334,
      sourceFileCount: 177,
      psdPsbRenderSuccess: 22,
      aiPdfRenderSuccess: 12,
      skippedForFontsRenderOrProductionMarks: 4,
      cropCount: 6,
      compositeCount: 9,
    });
    expect(manifest.photoshopVerification).toEqual({
      application: "Adobe Photoshop",
      version: "27.2.0",
      exported: 22,
      failed: 0,
      sourceFilesOverwritten: 0,
    });
    expect(manifest.illustratorVerification).toEqual({
      application: "Adobe Illustrator",
      version: "30.0.0",
      artboardCount: 38,
      hiddenProductionLayers: ["标注信息"],
      sourceFilesOverwritten: 0,
      selectedWebsiteAssetsReplaced: 0,
    });
  });

  it("does not change the frozen Springlai body counts or chapter titles", () => {
    const springlai = content.cases.filter((item) => item.id.startsWith("SL"));
    expect(springlai.map((item) => item.media.length)).toEqual([33, 10, 7, 8, 21, 3, 6]);
    expect(springlai.flatMap((item) => item.media)).toHaveLength(88);
    expect(springlai.find((item) => item.id === "SL001")?.media.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
      "夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级",
    ]);
    expect(springlai.find((item) => item.id === "SL005")?.media.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
      "桃与乌龙", "桃花艺人", "桂花艺人",
    ]);
    expect(manifest.springlaiCorrection).toEqual({
      caseId: "SL005",
      correctedAssetCount: 3,
      productionLayersExcluded: ["标注信息", "各种包装线"],
    });
    const correctedAssets = {
      "05.jpg": "56a506c8a75b2b05031b831516b3b70c8c87304286a0379fcb1a797f393206bf",
      "11.jpg": "4ac200ae3fd9be6c91db9c8cd281204b59ca3f01194bec29c8c2ece91f3f720d",
      "12.jpg": "0849e186d53f61a378df86713fc6efc04be24c3a18918fddc409660c73fc1def",
    };
    for (const [fileName, expectedHash] of Object.entries(correctedAssets)) {
      const bytes = readFileSync(new URL(`../../public/media/springlai/peach-osmanthus/${fileName}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex"), fileName).toBe(expectedHash);
    }
  });
});
