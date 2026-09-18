import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const auditDirectory = path.join(root, "case-audit-v3");
const inventory = JSON.parse(await fs.readFile(path.join(auditDirectory, "all-pdf-inventory.json"), "utf8"));
const pageClassificationPath = path.join(auditDirectory, "pdf-page-classification.json");
const pageClassification = JSON.parse(await fs.readFile(pageClassificationPath, "utf8"));
const segmentation = JSON.parse(await fs.readFile(path.join(auditDirectory, "psd-segmentation-manifest.json"), "utf8"));
const v2 = JSON.parse(await fs.readFile(path.join(root, "case-audit-v2/case-inventory-v2.json"), "utf8"));
const content = JSON.parse(await fs.readFile(path.join(root, "data/content.json"), "utf8"));

const legacyClassifications = [
  {
    case_id: "LEGACY-FLAT",
    source_pdf: "旧案例/SC-平面设计案例.pdf",
    visual_review: "rendered_page_reviewed",
    case_boundaries: "L001–L012 map one-to-one to pages 2–13",
    pages: Array.from({ length: 17 }, (_, index) => {
      const page = index + 1;
      return page >= 2 && page <= 13
        ? { page, classification: "final_design", note: `Legacy case L${String(page - 1).padStart(3, "0")} boundary/reference page; AI/PSD remains formal source.` }
        : { page, classification: "reference", note: page === 1 ? "Portfolio cover; non-case." : "Pricing or notice page; non-case." };
    }),
  },
  {
    case_id: "LEGACY-PHOTO",
    source_pdf: "旧案例/SC-摄影案例.pdf",
    visual_review: "rendered_page_reviewed",
    case_boundaries: "L013–L030 map one-to-one to pages 2–19",
    pages: Array.from({ length: 21 }, (_, index) => {
      const page = index + 1;
      return page >= 2 && page <= 19
        ? { page, classification: "final_design", note: `Legacy photography case L${String(page + 11).padStart(3, "0")} boundary/reference page; source photography files remain formal source.` }
        : { page, classification: "reference", note: page === 1 ? "Portfolio cover; non-case." : "Pricing or notice page; non-case." };
    }),
  },
];
pageClassification.cases = pageClassification.cases.filter((item) => !item.case_id.startsWith("LEGACY-")).concat(legacyClassifications);
pageClassification.generated_at = new Date().toISOString();
await fs.writeFile(pageClassificationPath, `${JSON.stringify(pageClassification, null, 2)}\n`);

const rows = inventory.items.map((item) => `| \`${item.relative_path}\` | ${item.classification} | ${item.case_ids.join(", ") || "—"} | ${item.case_names.join(" / ") || "—"} | ${item.previously_omitted ? "是" : "否"} | ${item.page_ranges || item.reason} |`);
const categoryCounts = Object.fromEntries(["NEW_CASE_FINAL", "LEGACY_REFERENCE", "NON_CASE", "DUPLICATE_VERSION", "UNKNOWN"].map((category) => [category, inventory.items.filter((item) => item.classification === category).length]));
const newCases = inventory.items.flatMap((item) => item.classification === "NEW_CASE_FINAL" ? item.case_ids : []);
const legacyCases = v2.cases.filter((item) => item.case_type === "legacy");
const brandingCount = newCases.length + legacyCases.filter((item) => /^L0(?:0[1-9]|1[0-2])$/.test(item.case_id)).length;
const photographyCount = legacyCases.filter((item) => /^L0(?:1[3-9]|2\d|30)$/.test(item.case_id)).length;
const publishedCount = content.cases.filter((item) => item.published).length;
const draftCount = content.cases.filter((item) => !item.published).length;

const markdown = `# CASE COUNT RECONCILIATION

## Result

- Recursively discovered PDFs: **${inventory.discovered_pdf_count}**
- Reconciliation rows: **${inventory.reconciliation_row_count}**
- Invariant: **${inventory.invariant_discovered_equals_reconciled ? "PASS" : "FAIL"}**
- Confirmed new cases: **${newCases.length}**
- Legacy cases represented by the two multi-case PDFs: **${legacyCases.length}**
- Total cases: **${newCases.length + legacyCases.length}**
- Branding cases: **${brandingCount}**
- Photography cases: **${photographyCount}**

## Why the previous result was 20

The earlier V2 inventory did **not** obtain 20 by counting only top-level folders. It explicitly mapped N001–N020 to the 20 PDFs currently present under \`新案例/\`. The new case scanner now walks the complete repository recursively, case-insensitively matching \`.pdf\` and \`.PDF\`, including hidden and multi-level directories (except generated dependency/build directories \`.git\`, \`.next\`, and \`node_modules\`). It still finds exactly the same 20 new-case PDFs, plus two legacy portfolio PDFs.

The concrete source of the apparent **32** is the Branding case total: **20 new Branding cases + 12 legacy flat/Branding cases (L001–L012) = 32**. The two legacy PDFs were never one-case-per-PDF: visual rendering confirms \`SC-平面设计案例.pdf\` contains 12 case pages and \`SC-摄影案例.pdf\` contains 18 case pages. Therefore the filesystem supports 50 total cases, but only 20 PDFs qualify as \`NEW_CASE_FINAL\`.

No recursively discovered PDF was omitted. No extra new PDF exists in the shared workspace, so no unsupported N021+ ID was invented.

## Classification totals

- NEW_CASE_FINAL: ${categoryCounts.NEW_CASE_FINAL}
- LEGACY_REFERENCE: ${categoryCounts.LEGACY_REFERENCE}
- NON_CASE: ${categoryCounts.NON_CASE}
- DUPLICATE_VERSION: ${categoryCounts.DUPLICATE_VERSION}
- UNKNOWN: ${categoryCounts.UNKNOWN}

## Per-PDF reconciliation

| PDF | Classification | Case ID | Case name | Previously omitted | Evidence / page range |
| --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## PSD recovery and website pool

- Single-layer PSDs processed: **${segmentation.processed_psd_count}**
- Independent visual crops: **${segmentation.extracted_asset_count}**
- PARTIALLY_EXTRACTED → READY_FROM_SOURCE: **${segmentation.cases.length}** (L001–L009)
- Added to admin case library: **${segmentation.cases.length}**
- Newly published: **${segmentation.cases.filter((item) => item.published).length}** (L001–L004, L007–L009)
- Kept Draft: **${segmentation.cases.filter((item) => !item.published).length}** (L005–L006 multi-brand logo collections)
- Website case records: **${content.cases.length}**; published: **${publishedCount}**; draft: **${draftCount}**
`;
await fs.writeFile(path.join(auditDirectory, "CASE_COUNT_RECONCILIATION.md"), `${markdown}\n`);

const summary = {
  discovered_pdfs: inventory.discovered_pdf_count,
  reconciled_pdfs: inventory.reconciliation_row_count,
  confirmed_new_cases: newCases.length,
  legacy_cases: legacyCases.length,
  total_cases: newCases.length + legacyCases.length,
  branding_cases: brandingCount,
  photography_cases: photographyCount,
  ready_branding_cases: content.cases.length,
  published_branding_cases: publishedCount,
  draft_branding_cases: draftCount,
  psd_processed: segmentation.processed_psd_count,
  psd_assets: segmentation.extracted_asset_count,
};
await fs.writeFile(path.join(auditDirectory, "case-count-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
