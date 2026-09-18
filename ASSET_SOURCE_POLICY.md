# Asset source policy

## New cases discovered from submitted PDFs

Final visual authority = PDF.

PPT, PPTX, DOC, and DOCX are client brief/reference sources only. Their embedded images must never be imported as formal cover, hero, or body media. A PDF image object is eligible only after the rendered PDF page has been visually reviewed, classified as `final_design`, and the independent visual has been verified as final work.

The authoritative new-case set must be read from `case-audit-v3/all-pdf-inventory.json` (`NEW_CASE_FINAL`) and `case-audit-v3/case-inventory-v3.json`; code must not hardcode a count or terminal Case ID. The current recursive scan happens to resolve to N001–N020.

## Legacy cases

AI/PSD = source. Legacy JPG/PDF files are reference and case-boundary material only.

For single-layer legacy PSD boards, complete visuals may be recovered with visually checked whitespace segmentation. Each crop must retain PSD path, layer count, bounding box, dimensions, hash, and extraction method. `case-audit-v3/psd-segmentation-manifest.json` is the authority for these recovered assets.

Photography cases L013–L030 use formal embedded images recovered from `旧案例/摄影作品集.ai`. They stay in the shared case data model, publish under `/photo`, and use the independent `photographyCaseOrder` rather than the Branding order or targeted versions.

`case-audit-v3/asset-manifest-v3.json` is the provenance authority for discovered new cases. `npm run import:cases` intentionally has no PPT/PPTX/DOC/DOCX fallback and preserves existing business fields while replacing new-case media, then synchronizes approved legacy PSD recoveries and Photography source assets.
