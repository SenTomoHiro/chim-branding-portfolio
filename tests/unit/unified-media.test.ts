import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCaseBodyMedia, getCaseCover, getCaseHero, getRoleImages, mediaRole } from "../../lib/case-media";
import { parseCase } from "../../lib/validation";
import type { ContentData, PortfolioCase } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const base = (media: PortfolioCase["media"], published = false): PortfolioCase => ({
  id: "T001", brandName: "Test", projectName: "", intro: "", business: "branding",
  categories: ["other"], primaryIndustry: "", media, published, includeInPortfolioPdf: false,
});

describe("unified case media", () => {
  it("derives cover and hero from the first two images while videos remain body media", () => {
    const item = base([
      { id: "v", type: "video", src: "/v.mp4", layout: "full" },
      { id: "a", type: "image", src: "/a.jpg", layout: "full" },
      { id: "b", type: "image", src: "/b.jpg", layout: "full" },
      { id: "c", type: "image", src: "/c.jpg", layout: "full" },
    ]);
    expect(getCaseCover(item)?.id).toBe("a");
    expect(getCaseHero(item)?.id).toBe("b");
    expect(getCaseBodyMedia(item).map((asset) => asset.id)).toEqual(["v", "c"]);
  });

  it("updates both role labels immediately after reordering", () => {
    const a = { id: "a", type: "image" as const, src: "/a.jpg", layout: "full" as const };
    const b = { id: "b", type: "image" as const, src: "/b.jpg", layout: "full" as const };
    const c = { id: "c", type: "image" as const, src: "/c.jpg", layout: "full" as const };
    expect(mediaRole([a, b, c], a)).toBe("cover");
    expect(mediaRole([c, a, b], c)).toBe("cover");
    expect(mediaRole([c, a, b], a)).toBe("hero");
  });

  it("allows image-light drafts but rejects published cases without two images", () => {
    const one = [{ id: "a", type: "image" as const, src: "/a.jpg", layout: "full" as const }];
    expect(parseCase(base(one)).published).toBe(false);
    expect(() => parseCase(base(one, true))).toThrow(/2 张图片/);
  });

  it("migrated content has one unique sequence and no legacy role fields", () => {
    for (const item of content.cases) {
      expect("cover" in item || "hero" in item || "bodyAssets" in item).toBe(false);
      expect(new Set(item.media.map((asset) => asset.src)).size).toBe(item.media.length);
      expect(new Set(item.media.map((asset) => asset.id)).size).toBe(item.media.length);
      if (item.published) expect(getRoleImages(item.media).hero).toBeTruthy();
    }
  });

  it("preserves N013 roles, PDF selection, provenance, and body without role duplication", () => {
    const item = content.cases.find((entry) => entry.id === "N013")!;
    expect(getCaseCover(item)?.src).toBe("/media/cases/N013/v3-cover.webp");
    expect(getCaseHero(item)?.src).toBe("/media/cases/N013/v3-hero.webp");
    expect(getCaseHero(item)?.portfolioPdfSelected).toBe(true);
    expect(getCaseCover(item)?.provenance?.assetId).toBe("N013-V3-A10");
    expect(getCaseBodyMedia(item).some((asset) => asset.src === getCaseCover(item)?.src || asset.src === getCaseHero(item)?.src)).toBe(false);
  });
});
