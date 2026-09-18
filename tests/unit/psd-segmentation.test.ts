import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContentData } from "../../lib/types";

const manifest = JSON.parse(readFileSync(new URL("../../case-audit-v3/psd-segmentation-manifest.json", import.meta.url), "utf8")) as {
  processed_psd_count: number;
  extracted_asset_count: number;
  cases: Array<{ case_id: string; cover_asset: string; hero_asset: string; body_assets: string[]; source_asset_status: string; website_assets_ready: boolean }>;
  assets: Array<{ case_id: string; file: string; source_psd: string; extraction_method: string; bounding_box: [number, number, number, number]; width: number; height: number; sha256: string }>;
};
const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

describe("single-layer PSD whitespace segmentation", () => {
  it("produces complete, traceable crops instead of tiny fragments", () => {
    expect(manifest.processed_psd_count).toBe(9);
    expect(manifest.extracted_asset_count).toBeGreaterThan(0);
    expect(manifest.assets).toHaveLength(manifest.extracted_asset_count);
    for (const asset of manifest.assets) {
      expect(asset.source_psd).toMatch(/\.psd$/i);
      expect(asset.extraction_method).toBe("whitespace_segmentation");
      expect(asset.bounding_box).toHaveLength(4);
      expect(asset.bounding_box[2]).toBeGreaterThanOrEqual(500);
      expect(asset.bounding_box[3]).toBeGreaterThanOrEqual(500);
      expect(asset.width).toBe(asset.bounding_box[2]);
      expect(asset.height).toBe(asset.bounding_box[3]);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(existsSync(new URL(`../../${asset.file}`, import.meta.url)), asset.file).toBe(true);
    }
  });

  it("makes every recovered case manageable with cover, hero, and body media", () => {
    for (const recovered of manifest.cases) {
      expect(recovered.source_asset_status).toBe("READY_FROM_SOURCE");
      expect(recovered.website_assets_ready).toBe(true);
      expect(recovered.cover_asset).toBeTruthy();
      expect(recovered.hero_asset).toBeTruthy();
      expect(recovered.body_assets.length).toBeGreaterThan(0);
      const websiteCase = content.cases.find((item) => item.id === recovered.case_id);
      expect(websiteCase, `${recovered.case_id} in admin data`).toBeTruthy();
      expect(websiteCase!.coverProvenance?.sourcePsd).toMatch(/\.psd$/i);
      expect(websiteCase!.heroProvenance?.extractionMethod).toBe("whitespace_segmentation");
      expect(websiteCase!.bodyAssets.length).toBeGreaterThan(0);
    }
  });
});
