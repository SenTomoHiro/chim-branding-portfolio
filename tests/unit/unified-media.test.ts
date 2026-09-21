import { describe, expect, it } from "vitest";
import { getCaseBodyMedia, getCaseCover, getCaseHero, mediaRole } from "../../lib/case-media";
import { parseCase } from "../../lib/validation";
import type { PortfolioCase } from "../../lib/types";

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

});
