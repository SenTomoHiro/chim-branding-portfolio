import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const audit = JSON.parse(readFileSync(new URL("../../case-audit-v3/case-inventory-v3.json", import.meta.url), "utf8")) as { cases: Array<{ case_id: string }> };
const discoveredNewCaseIds = new Set(audit.cases.map((item) => item.case_id));
const newCases = content.cases.filter((item) => discoveredNewCaseIds.has(item.id));
const forbiddenDocument = /\.(?:pptx?|docx?)(?:$|[?#])/i;

describe("V3 new-case asset provenance", () => {
  it("keeps every discovered formal new-case asset PDF-only and verified", () => {
    expect(newCases).toHaveLength(discoveredNewCaseIds.size);
    for (const item of newCases) {
      const sources = [item.coverProvenance, item.heroProvenance, ...item.bodyAssets.map((asset) => asset.provenance)];
      expect(sources.every(Boolean), `${item.id} must retain provenance`).toBe(true);
      for (const source of sources) {
        expect(source!.sourcePdf).toMatch(/\.pdf$/i);
        expect(source!.sourcePdf).not.toMatch(forbiddenDocument);
        expect(source!.classification).toBe("final_design");
        expect(source!.finalWorkVerified).toBe(true);
        expect(source!.sourcePage).toBeGreaterThan(0);
        expect(source!.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });

  it("requires complete published media for every new case", () => {
    for (const item of newCases.filter((entry) => entry.published)) {
      expect(item.cover, `${item.id} cover`).toBeTruthy();
      expect(item.hero, `${item.id} hero`).toBeTruthy();
      expect(item.bodyAssets.length, `${item.id} body assets`).toBeGreaterThanOrEqual(1);
    }
  });
});
