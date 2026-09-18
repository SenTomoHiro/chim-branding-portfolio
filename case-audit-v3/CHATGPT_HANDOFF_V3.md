# V3 Handoff

Case discovery is driven by the repository-wide recursive inventory in `all-pdf-inventory.json`, never by an assumed N001–N020 range. The current filesystem contains 22 PDFs: 20 independent new-case final PDFs and two legacy multi-case reference PDFs. Those two legacy PDFs delimit 30 cases, which explains the full total of 50 and the Branding total of 32.

The 20 discovered new-case media sets are sourced exclusively from visually reviewed final PDFs. Use `case-inventory-v3.json` for cover, hero, alternatives, and body selections and `asset-manifest-v3.json` for provenance. Do not use V2 media selections or PPT/PPTX/DOC/DOCX media for new cases.

Legacy cases retain the AI/PSD authority rule. L001–L009 were re-mapped by visual content to the correct single-layer PSD files and recovered through whitespace/grid segmentation. Use `psd-segmentation-manifest.json`; do not reuse the incorrect V2 filename-to-case assumptions. L005 and L006 are Ready in admin but intentionally Draft because each is a multi-brand logo collection.

L013–L030 are 18 published Photography cases at `/photo`, using only formal assets extracted from `旧案例/摄影作品集.ai`. Their order is stored separately in `photographyCaseOrder`; all Branding routes and version priorities exclude them. The shared detail route and admin remain the single implementation for both categories.
