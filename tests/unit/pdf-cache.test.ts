import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pdfFilename, pdfSourceHash, stableSha256 } from "../../lib/pdf-cache";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

describe("PDF source cache", () => {
  it("uses the standard SHA-256 algorithm in browser-compatible code", () => {
    expect(stableSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("hashes only the selected case for a single-case PDF", () => {
    const target = "case:N013" as const;
    const original = pdfSourceHash(content, target);
    const unrelated = structuredClone(content);
    unrelated.cases.find((item) => item.id !== "N013")!.intro += " unrelated";
    expect(pdfSourceHash(unrelated, target)).toBe(original);
    const pdfSelectionOnly = structuredClone(content);
    const selected = pdfSelectionOnly.cases.find((item) => item.id === "N013")!.media.find((media) => media.type === "image")!;
    selected.portfolioPdfSelected = !selected.portfolioPdfSelected;
    expect(pdfSourceHash(pdfSelectionOnly, target)).toBe(original);
    const changed = structuredClone(content);
    changed.cases.find((item) => item.id === "N013")!.intro += " changed";
    expect(pdfSourceHash(changed, target)).not.toBe(original);
    expect(original).toMatch(/^[a-f0-9]{64}$/);
  });

  it("invalidates a portfolio only for content that affects that portfolio", () => {
    const target = "design" as const;
    const original = pdfSourceHash(content, target);
    const relevant = structuredClone(content);
    const designCase = relevant.cases.find((item) => item.business === "branding" && item.published && item.includeInPortfolioPdf)!;
    designCase.intro += " changed";
    expect(pdfSourceHash(relevant, target)).not.toBe(original);
    const photography = structuredClone(content);
    photography.cases.find((item) => item.business === "photography")!.intro += " unrelated";
    expect(pdfSourceHash(photography, target)).toBe(original);
  });

  it("uses stable release filenames", () => {
    expect(pdfFilename("case:N013")).toBe("n013.pdf");
    expect(pdfFilename("design")).toBe("portfolio-design.pdf");
    expect(pdfFilename("photography")).toBe("portfolio-photography.pdf");
    expect(pdfFilename("category:food")).toBe("portfolio-design-food.pdf");
  });
});
