import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentMediaUrl, runtimeContentUrl } from "../../lib/runtime-content";

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

describe("runtime content architecture", () => {
  it("keeps content and case media on the configured provider while static assets stay local", () => {
    expect(runtimeContentUrl()).toContain("/data/content.json");
    expect(contentMediaUrl("/media/cases/N013/hero.webp")).toContain("/public/media/cases/N013/hero.webp");
    expect(contentMediaUrl("/favicon.svg")).toBe("/favicon.svg");
  });

  it("keeps Pages builds free of PDF generation, case media, and Chromium", () => {
    expect(read("scripts/build-pages.mjs")).not.toContain("generate-pdfs.mjs");
    expect(read("scripts/build-pages.mjs")).toContain("mediaRoot");
    const workflow = read(".github/workflows/deploy-pages.yml");
    expect(workflow).not.toContain("repository_dispatch");
    expect(workflow).not.toContain("playwright install");
    expect(workflow).toContain("data/content.json");
    expect(workflow).toContain("data/pdf-cache.json");
    expect(workflow).toContain("public/media/cases/**");
  });

  it("generates PDFs in a dedicated single-target workflow", () => {
    const workflow = read(".github/workflows/generate-pdf.yml");
    expect(workflow).toContain("admin_pdf_generate");
    expect(workflow).toContain("--target \"$PDF_TARGET\"");
    expect(workflow).toContain("--request-id \"$PDF_REQUEST_ID\"");
    expect(workflow).not.toContain("build:pages");
    expect(workflow).toContain("gh release upload pdf-cache");
  });
});
