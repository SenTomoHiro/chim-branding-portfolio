# Case Audit V3

- Recursive PDF discovery: 22/22 inventoried and reconciled
- New final PDFs discovered: 20 (currently N001–N020; this is an observed result, not a fixed scanner limit)
- Legacy multi-case reference PDFs: 2, representing L001–L030
- Total rendered and visually reviewed PDF pages: 678 (640 new + 38 legacy)
- Confirmed case boundaries: 50 total; 32 Branding and 18 Photography
- New-case final visual authority: PDF only
- Verified new-case PDF assets: 241
- Recovered legacy single-layer PSD assets: 81 across L001–L009
- PPT/PPTX/DOC/DOCX formal assets: 0
- Website Branding records: 32 Ready; 30 Published and 2 Draft
- Website Photography records: 18 Ready and 18 Published under `/photo`
- Website total: 50 records; 48 Published and 2 Draft

Primary records:

- Complete PDF inventory: `all-pdf-inventory.json` and `all-pdf-inventory.csv`
- Count and boundary evidence: `CASE_COUNT_RECONCILIATION.md`
- Page classifications: `pdf-page-classification.json`
- New-case exclusions: `excluded-reference-assets.json`
- New-case PDF provenance: `asset-manifest-v3.json`
- Legacy PSD segmentation provenance: `psd-segmentation-manifest.json`
- Photography provenance: V2 `asset-manifest.json` entries backed by `旧案例/摄影作品集.ai`
- Final-only contact sheets: `contact-sheets/`

Mixed pages were excluded from formal new-case selection in this pass. Every published new-case asset maps to a page classified `final_design` and has `final_work_verified: true`. L001–L009 use visually verified, complete crops from their actual single-layer PSD composites; unrelated panels on mixed boards are excluded.

L013–L030 are published as a separate Photography category. Their cover, hero, and body assets are formal Illustrator-source extractions and retain artboard/xref provenance in `data/content.json`; they do not participate in Branding default or targeted-version ordering.
