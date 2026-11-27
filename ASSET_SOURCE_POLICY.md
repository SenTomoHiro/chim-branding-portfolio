# Asset source policy

## New cases discovered from submitted PDFs

Final visual authority = PDF.

PPT, PPTX, DOC, and DOCX are client brief/reference sources only. Their embedded images must never be imported as formal cover, hero, or body media. A PDF image object is eligible only after the rendered PDF page has been visually reviewed, classified as `final_design`, and the independent visual has been verified as final work.

The authoritative new-case set must be read from `case-audit-v3/all-pdf-inventory.json` (`NEW_CASE_FINAL`) and `case-audit-v3/case-inventory-v3.json`; code must not hardcode a count or terminal Case ID. The current recursive scan happens to resolve to N001–N020.

## Legacy cases

AI and PSD files establish the design source. A verified final-delivery JPG may be used directly when it matches the case and artwork, preserves the full composition, and has readable text. Resizing for the web is allowed. When a fresh export is needed and the same-case Illustrator source is available, export from its original artboard. Reference JPG and PDF files still support case identification and comparison.

For single-layer legacy PSD boards, complete visuals may be recovered with visually checked whitespace segmentation. Each crop must retain PSD path, layer count, bounding box, dimensions, hash, and extraction method. `case-audit-v3/psd-segmentation-manifest.json` is the authority for these recovered assets.

Photography cases L013–L030 use formal embedded images recovered from `旧案例/摄影作品集.ai`. They stay in the shared case data model, publish under `/photo`, and use the independent `photographyCaseOrder` rather than the Branding order.

`case-audit-v3/asset-manifest-v3.json` is the provenance authority for discovered new cases. `npm run import:cases` intentionally has no PPT/PPTX/DOC/DOCX fallback and preserves existing business fields while replacing new-case media, then synchronizes approved legacy PSD recoveries and Photography source assets.

## Baidu Netdisk sources

For website publication, the permitted roots under `/硬盘备份/` are:

- `GAY老板历史文件`
- `春莱2024`
- `春莱2025`
- `春莱21-22年` (shown as 春莱21–22年 in the supplied screenshot)
- `春莱23年`

Verify the full source path under a permitted root before staging Baidu Netdisk artwork, including local copies. A matching basename alone does not establish origin.

Exclude the 滇回堂 fold-out menu shown in the review screenshot, including individual pages, printer spreads, mockups, and other derivatives, from the site's public files. The exclusion applies regardless of where a copy is stored.

## WeChat Official Account long-form artwork

Keep WeChat Official Account article artwork in the project archive. Exclude it from public case covers and galleries.
