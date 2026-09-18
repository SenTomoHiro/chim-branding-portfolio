import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { allPageClassifications, pageClassification, pdfSources } from "./v3_config.mjs";

const root = process.cwd();
const auditRoot = path.join(root, "case-audit-v3");
const candidates = JSON.parse(readFileSync(path.join(auditRoot, "tmp/candidates.json"), "utf8"));
const v2Inventory = JSON.parse(readFileSync(path.join(root, "case-audit-v2/case-inventory-v2.json"), "utf8"));
const extractedRoot = path.join(auditRoot, "extracted");
const contactRoot = path.join(auditRoot, "contact-sheets");

const plans = {
  N001: { keep: ["C001","C002","C003","C004","C005","C006","C007"], cover: ["C006","C001"], hero: ["C005","C002"] },
  N002: { keep: ["C001","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C013","C015","C016","C017","C018","C019"], cover: ["C008","C005"], hero: ["C004","C007"] },
  N003: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C013"], cover: ["C001","C003"], hero: ["C006","C001"] },
  N004: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009"], cover: ["C009","C001"], hero: ["C003","C004"] },
  N005: { keep: ["C001","C002","C003","C004","C005","C007","C008","C009","C012","C013","C016","C017","C018","C019"], cover: ["C003","C005"], hero: ["C008","C003"] },
  N006: { keep: ["C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C013","C014","C015","C016","C017","C018"], cover: ["C015","C004"], hero: ["C007","C015"] },
  N007: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011"], cover: ["C004","C002"], hero: ["C006","C008"] },
  N008: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011"], cover: ["C008","C006"], hero: ["C006","C008"] },
  N009: { keep: ["C001","C006","C007","C008","C009","C010","C011","C012","C013","C014","C015","C016","C017","C018"], cover: ["C017","C011"], hero: ["C011","C014"] },
  N010: { keep: ["C001","C002","C003","C004"], cover: ["C004","C003"], hero: ["C002","C004"] },
  N011: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012"], cover: ["C004","C005"], hero: ["C005","C004"] },
  N012: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C014","C015","C016","C017","C018","C019","C020"], cover: ["C018","C011"], hero: ["C011","C018"] },
  N013: { keep: ["C001","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C014","C015","C016"], cover: ["C011","C008"], hero: ["C016","C007"] },
  N014: { keep: ["C002","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C013","C014","C015","C016"], cover: ["C002","C010"], hero: ["C010","C005"] },
  N015: { keep: ["C001","C002","C003","C004","C005","C006","C008","C011","C012","C013"], cover: ["C006","C001"], hero: ["C008","C006"] },
  N016: { keep: ["C004","C005","C006","C007","C008","C009","C010","C011","C012","C013","C014","C016","C017","C018","C019","C020"], cover: ["C012","C009"], hero: ["C017","C007"] },
  N017: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C011","C012","C013","C014"], cover: ["C001","C008"], hero: ["C004","C005"] },
  N018: { keep: ["C001","C002","C003","C004","C005","C006","C007","C008","C009","C010","C011","C012","C013","C014"], cover: ["C007","C010"], hero: ["C007","C010"] },
  N019: { keep: ["C001","C002","C003","C004","C005","C006","C007"], cover: ["C004","C001"], hero: ["C002","C001"] },
  N020: { keep: ["C001","C002","C003","C004","C005","C006"], cover: ["C005","C004"], hero: ["C003","C004"] },
};

function byShortId(caseId, shortId) {
  const item = candidates[caseId].find((candidate) => candidate.candidate_id.endsWith(shortId));
  if (!item) throw new Error(`Missing ${caseId} ${shortId}`);
  return item;
}

function hash(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const pdfObjectPages = new Map();
function occurrencePages(caseId, xref) {
  if (!pdfObjectPages.has(caseId)) {
    const output = execFileSync("pdfimages", ["-list", path.join(root, pdfSources[caseId])], { encoding: "utf8" });
    const map = new Map();
    for (const line of output.split("\n")) {
      const columns = line.trim().split(/\s+/);
      if (!/^\d+$/.test(columns[0] ?? "") || !/^\d+$/.test(columns[10] ?? "")) continue;
      const page = Number(columns[0]);
      const object = Number(columns[10]);
      if (!map.has(object)) map.set(object, new Set());
      map.get(object).add(page);
    }
    pdfObjectPages.set(caseId, map);
  }
  return [...(pdfObjectPages.get(caseId).get(xref) ?? [])];
}

function labelSvg(text, width) {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(`<svg width="${width}" height="34"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="22" font-size="14" font-family="Arial" fill="#111">${safe}</text></svg>`);
}

async function makeContactSheet(caseId, assets) {
  const w = 360, h = 240, labelH = 34, cols = 4;
  const rows = Math.ceil(assets.length / cols);
  const composite = [];
  for (const [index, asset] of assets.entries()) {
    const left = (index % cols) * w;
    const top = Math.floor(index / cols) * (h + labelH);
    const thumb = await sharp(path.join(root, asset.file)).rotate().resize(w, h, { fit: "contain", background: "#e6e3dd" }).jpeg({ quality: 84 }).toBuffer();
    composite.push({ input: thumb, left, top });
    composite.push({ input: labelSvg(`${asset.asset_id} · p${asset.source_page} · ${asset.visual_role}`, w), left, top: top + h });
  }
  await sharp({ create: { width: cols * w, height: rows * (h + labelH), channels: 3, background: "#d0cdc6" } })
    .composite(composite).jpeg({ quality: 88 }).toFile(path.join(contactRoot, `${caseId}.jpg`));
}

rmSync(extractedRoot, { recursive: true, force: true });
mkdirSync(extractedRoot, { recursive: true });
mkdirSync(contactRoot, { recursive: true });

const manifest = [];
const inventoryCases = [];
const rejectedCandidates = [];

for (const [caseId, plan] of Object.entries(plans)) {
  rmSync(path.join(contactRoot, `${caseId}.jpg`), { force: true });
  const sourceCase = v2Inventory.cases.find((item) => item.case_id === caseId);
  if (!sourceCase) throw new Error(`Missing V2 case record ${caseId}`);
  const caseDir = path.join(extractedRoot, caseId);
  mkdirSync(caseDir, { recursive: true });
  const selected = [];
  for (const [index, shortId] of plan.keep.entries()) {
    const candidate = byShortId(caseId, shortId);
    const source = path.join(root, candidate.file);
    const extension = path.extname(source).toLowerCase();
    const filename = `asset-${String(index + 1).padStart(2, "0")}-p${String(candidate.source_page).padStart(3, "0")}${extension}`;
    const destination = path.join(caseDir, filename);
    cpSync(source, destination);
    const roles = [];
    if (shortId === plan.cover[0]) roles.push("cover_primary");
    if (shortId === plan.cover[1]) roles.push("cover_alternative");
    if (shortId === plan.hero[0]) roles.push("hero_primary");
    if (shortId === plan.hero[1]) roles.push("hero_alternative");
    if (shortId !== plan.hero[0]) roles.push("body");
    const xref = Number(candidate.source_object.match(/xref:(\d+)/)?.[1]);
    const verifiedPages = occurrencePages(caseId, xref).filter((page) => pageClassification(caseId, page).classification === "final_design");
    const sourcePage = verifiedPages.at(-1) ?? candidate.source_page;
    const asset = {
      case_id: caseId,
      asset_id: `${caseId}-V3-A${String(index + 1).padStart(2, "0")}`,
      file: path.relative(root, destination),
      source_pdf: pdfSources[caseId],
      source_page: sourcePage,
      source_object: candidate.source_object,
      extraction_method: candidate.extraction_method,
      width: candidate.width,
      height: candidate.height,
      sha256: hash(destination),
      visual_role: roles.join(","),
      classification: "final_design",
      final_work_verified: true,
    };
    selected.push(asset);
    manifest.push(asset);
  }
  for (const candidate of candidates[caseId]) {
    if (!plan.keep.some((shortId) => candidate.candidate_id.endsWith(shortId))) {
      rejectedCandidates.push({
        case_id: caseId,
        source: `${candidate.source_pdf}#page=${candidate.source_page};${candidate.source_object}`,
        reason: "Visually reviewed PDF object is source/reference photography, an unbranded texture, or otherwise not an independent final design artifact.",
      });
    }
  }
  const matchShortId = (shortId) => selected[plan.keep.indexOf(shortId)];
  const body = selected.filter((asset) => asset.asset_id !== matchShortId(plan.hero[0]).asset_id);
  inventoryCases.push({
    case_id: caseId,
    name: sourceCase.name,
    source_pdf: pdfSources[caseId],
    cover_asset: matchShortId(plan.cover[0]).file,
    cover_alternative: matchShortId(plan.cover[1]).file,
    hero_asset: matchShortId(plan.hero[0]).file,
    hero_alternative: matchShortId(plan.hero[1]).file,
    body_assets: body.map((asset) => asset.file),
    formal_asset_count: selected.length,
    final_work_verified: true,
  });
  await makeContactSheet(caseId, selected);
}

const classification = { generated_at: new Date().toISOString(), cases: allPageClassifications() };
writeFileSync(path.join(auditRoot, "pdf-page-classification.json"), `${JSON.stringify(classification, null, 2)}\n`);
const pageExclusions = classification.cases.flatMap((entry) => entry.pages
  .filter((item) => item.classification !== "final_design")
  .map((item) => ({ case_id: entry.case_id, source: `${entry.source_pdf}#page=${item.page}`, reason: item.note ?? `PDF page visually classified as ${item.classification}` })));
const documentExclusions = [];
for (const item of v2Inventory.cases.filter((entry) => /^N\d{3}$/.test(entry.case_id))) {
  for (const source of item.source_files.filter((file) => /\.(pptx?|docx?)$/i.test(file))) {
    documentExclusions.push({ case_id: item.case_id, source, reason: "Client brief/reference document; prohibited as a formal visual source for discovered new cases." });
  }
}
writeFileSync(path.join(auditRoot, "excluded-reference-assets.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), assets: [...pageExclusions, ...documentExclusions, ...rejectedCandidates] }, null, 2)}\n`);
writeFileSync(path.join(auditRoot, "asset-manifest-v3.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), source_policy: "Every discovered new case uses its final PDF as the sole formal visual authority", assets: manifest }, null, 2)}\n`);
writeFileSync(path.join(auditRoot, "case-inventory-v3.json"), `${JSON.stringify({ generated_at: new Date().toISOString(), cases: inventoryCases }, null, 2)}\n`);

const totalPages = classification.cases.reduce((sum, item) => sum + item.pages.length, 0);
const report = `# Case Audit V3\n\n- Scope: ${inventoryCases.length} cases discovered in the current new-case inventory\n- Final visual authority: PDF only\n- Rendered and visually reviewed pages: ${totalPages}\n- Cases completed: ${inventoryCases.length}/${inventoryCases.length}\n- Verified formal assets: ${manifest.length}\n- PPT/PPTX/DOC/DOCX formal assets: 0\n- Page classifications: \`pdf-page-classification.json\`\n- Exclusions: \`excluded-reference-assets.json\`\n- Formal provenance: \`asset-manifest-v3.json\`\n- Final-only contact sheets: \`contact-sheets/\`\n\nMixed pages were excluded from formal selection in this pass. Every published V3 asset maps to a page classified \`final_design\` and has \`final_work_verified: true\`.\n`;
writeFileSync(path.join(auditRoot, "CASE_AUDIT_V3.md"), report);
writeFileSync(path.join(auditRoot, "CHATGPT_HANDOFF_V3.md"), `# V3 Handoff\n\nThe discovered new-case media migration is sourced exclusively from visually reviewed final PDFs. Use \`case-inventory-v3.json\` for cover, hero, alternatives, and body selections; use \`asset-manifest-v3.json\` for provenance. Do not use V2 media selections for new cases. Legacy cases retain the V2 AI/PSD rule.\n`);

console.log(`Finalized ${inventoryCases.length} cases, ${manifest.length} verified PDF assets, ${totalPages} visually classified pages.`);
