import { describe, expect, it } from "vitest";
import { getCaseBodyMedia, getCaseCover, getCaseHero } from "../../lib/case-media";
import { getBrandingCases, getPhotographyCases, sortPublishedCases } from "../../lib/sort-cases";
import { fetchOfficialContent, fetchOfficialJson } from "../helpers/official-content";

const [content, audit] = await Promise.all([
  fetchOfficialContent(),
  fetchOfficialJson<{ cases: Array<{ case_id: string }> }>("case-audit-v3/case-inventory-v3.json"),
]);

describe("GitHub official portfolio data", () => {
  it("has complete, unique case and media identities", () => {
    expect(new Set(content.cases.map((item) => item.id)).size).toBe(content.cases.length);
    for (const item of content.cases) {
      expect(new Set(item.media.map((asset) => asset.id)).size, item.id).toBe(item.media.length);
      expect(new Set(item.media.map((asset) => asset.src)).size, item.id).toBe(item.media.length);
      if (item.published) {
        expect(getCaseCover(item), `${item.id} cover`).toBeTruthy();
        expect(getCaseHero(item), `${item.id} hero`).toBeTruthy();
      }
    }
  });

  it("keeps business taxonomy and independent orders valid", () => {
    for (const item of content.cases) {
      if (item.business === "branding") expect(item.categories.length, item.id).toBeGreaterThan(0);
      else expect(item.categories, item.id).toEqual([]);
    }
    expect(sortPublishedCases(getBrandingCases(content.cases), content.defaultOrder).map((item) => item.id))
      .toEqual(content.defaultOrder.filter((id) => content.cases.some((item) => item.id === id && item.published && item.business === "branding")));
    expect(sortPublishedCases(getPhotographyCases(content.cases), content.photographyCaseOrder).map((item) => item.id))
      .toEqual(content.photographyCaseOrder);
  });

  it("retains the N013 Chinese PDF source, roles and selection", () => {
    const item = content.cases.find((entry) => entry.id === "N013")!;
    const images = item.media.filter((asset) => asset.type === "image");
    const cover = getCaseCover(item);
    const hero = getCaseHero(item);
    expect(item.brandName).toContain("堡乎乎");
    expect(item.intro).toMatch(/[\u3400-\u9fff]/);
    expect(cover?.id).toBe(images[0]?.id);
    expect(hero?.id).toBe(images[1]?.id);
    expect(item.media.some((asset) => asset.portfolioPdfSelected)).toBe(true);
    expect(getCaseBodyMedia(item).some((asset) => asset.id === cover?.id || asset.id === hero?.id)).toBe(false);
  });

  it("keeps imported V3 provenance complete and verified", () => {
    const ids = new Set(audit.cases.map((item) => item.case_id));
    const cases = content.cases.filter((item) => ids.has(item.id));
    expect(cases).toHaveLength(ids.size);
    for (const item of cases) {
      const sources = item.media.flatMap((asset) => asset.provenance ? [asset.provenance] : []);
      expect(sources.length, `${item.id} provenance`).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source.sourcePdf).toMatch(/\.pdf$/i);
        expect(source.sourcePdf).not.toMatch(/\.(?:pptx?|docx?)(?:$|[?#])/i);
        expect(source.classification).toBe("final_design");
        expect(source.finalWorkVerified).toBe(true);
        expect(source.sourcePage).toBeGreaterThan(0);
        expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
      if (item.published) expect(item.media.filter((asset) => asset.type === "image").length, `${item.id} images`).toBeGreaterThanOrEqual(2);
    }
  });
});
