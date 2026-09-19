import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getBrandingCases, getPhotographyCases, sortPublishedCases } from "../../lib/sort-cases";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

describe("Photography category", () => {
  it("keeps all 17 ready cases outside Branding after the retired ChunLai photography entry is migrated", () => {
    const photography = getPhotographyCases(content.cases);
    expect(photography).toHaveLength(17);
    expect(photography.every((item) => item.published && item.cover && item.hero && item.bodyAssets.length > 0)).toBe(true);
    expect(getBrandingCases(content.cases).some((item) => item.business === "photography")).toBe(false);
  });

  it("uses the approved independent order and formal AI provenance", () => {
    const ordered = sortPublishedCases(getPhotographyCases(content.cases), content.photographyCaseOrder);
    expect(ordered.map((item) => item.id)).toEqual(content.photographyCaseOrder);
    for (const item of ordered) {
      const provenance = [item.coverProvenance, item.heroProvenance, ...item.bodyAssets.map((asset) => asset.provenance)];
      expect(provenance.every((entry) => entry?.sourceType === "ai" && entry.sourceAi === "旧案例/摄影作品集.ai" && entry.finalWorkVerified)).toBe(true);
    }
  });
});
