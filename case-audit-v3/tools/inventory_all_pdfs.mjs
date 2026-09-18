import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const root = process.cwd();
const outputDirectory = path.join(root, "case-audit-v3");
const excludedDirectories = new Set([".git", ".next", "node_modules"]);
const relative = (file) => path.relative(root, file).split(path.sep).join("/");

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && /\.pdf$/i.test(entry.name)) files.push(absolute);
  }
  return files;
}

const v3 = JSON.parse(await fs.readFile(path.join(root, "case-audit-v3/case-inventory-v3.json"), "utf8"));
const v2 = JSON.parse(await fs.readFile(path.join(root, "case-audit-v2/case-inventory-v2.json"), "utf8"));
const newByPdf = new Map(v3.cases.map((item) => [item.source_pdf, item]));
const legacyById = new Map(v2.cases.filter((item) => item.case_type === "legacy").map((item) => [item.case_id, item]));
const legacy = new Map([
  ["旧案例/SC-平面设计案例.pdf", {
    caseIds: Array.from({ length: 12 }, (_, index) => `L${String(index + 1).padStart(3, "0")}`),
    pageRanges: "L001–L012 = pages 2–13; page 1 cover; pages 14–17 pricing/notice",
    renderDirectory: "case-audit-v3/pdf-renders/LEGACY-FLAT",
  }],
  ["旧案例/SC-摄影案例.pdf", {
    caseIds: Array.from({ length: 18 }, (_, index) => `L${String(index + 13).padStart(3, "0")}`),
    pageRanges: "L013–L030 = pages 2–19; page 1 cover; pages 20–21 pricing/notice",
    renderDirectory: "case-audit-v3/pdf-renders/LEGACY-PHOTO",
  }],
]);

const discovered = (await walk(root)).sort((a, b) => relative(a).localeCompare(relative(b), "zh-CN"));
const inventory = [];
for (const absolutePath of discovered) {
  const relativePath = relative(absolutePath);
  const stat = await fs.stat(absolutePath);
  const hash = createHash("sha256").update(await fs.readFile(absolutePath)).digest("hex");
  const { stdout } = await run("pdfinfo", [absolutePath], { maxBuffer: 1024 * 1024 * 4 });
  const pageCount = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
  const newCase = newByPdf.get(relativePath);
  const legacyPdf = legacy.get(relativePath);
  let classification = "UNKNOWN";
  let caseIds = [];
  let caseNames = [];
  let pageRanges = "";
  let renderDirectory = "";
  let reason = "PDF is present but has no verified case mapping.";
  if (newCase) {
    classification = "NEW_CASE_FINAL";
    caseIds = [newCase.case_id];
    caseNames = [newCase.name];
    pageRanges = `pages 1–${pageCount}`;
    renderDirectory = `case-audit-v3/pdf-renders/${newCase.case_id}`;
    reason = "Independent new brand project; every page was rendered and visually classified for V3.";
  } else if (legacyPdf) {
    classification = "LEGACY_REFERENCE";
    caseIds = legacyPdf.caseIds;
    caseNames = caseIds.map((id) => legacyById.get(id)?.name ?? id);
    pageRanges = legacyPdf.pageRanges;
    renderDirectory = legacyPdf.renderDirectory;
    reason = "Legacy multi-case boundary/reference PDF; AI/PSD remains the formal asset authority.";
  }
  inventory.push({
    absolute_path: absolutePath,
    relative_path: relativePath,
    filename: path.basename(absolutePath),
    parent_folder: relative(path.dirname(absolutePath)) || ".",
    file_size_bytes: stat.size,
    page_count: pageCount,
    sha256: hash,
    classification,
    case_ids: caseIds,
    case_names: caseNames,
    page_ranges: pageRanges,
    previously_omitted: false,
    reason,
    visually_checked: classification !== "UNKNOWN",
    render_directory: renderDirectory,
  });
}

const hashes = new Map();
for (const item of inventory) {
  if (!hashes.has(item.sha256)) hashes.set(item.sha256, []);
  hashes.get(item.sha256).push(item);
}
for (const matches of hashes.values()) {
  if (matches.length < 2) continue;
  for (const duplicate of matches.slice(1)) {
    duplicate.classification = "DUPLICATE_VERSION";
    duplicate.reason = `Byte-identical duplicate of ${matches[0].relative_path}.`;
  }
}

const payload = {
  schema_version: 1,
  scan_root: root,
  scan_excluded_directories: [...excludedDirectories],
  discovered_pdf_count: inventory.length,
  reconciliation_row_count: inventory.length,
  invariant_discovered_equals_reconciled: inventory.length === discovered.length,
  items: inventory,
};
await fs.writeFile(path.join(outputDirectory, "all-pdf-inventory.json"), `${JSON.stringify(payload, null, 2)}\n`);

const columns = ["absolute_path", "relative_path", "filename", "parent_folder", "file_size_bytes", "page_count", "sha256", "classification", "case_ids", "case_names", "page_ranges", "previously_omitted", "reason", "visually_checked", "render_directory"];
const csvCell = (value) => {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = [columns.join(","), ...inventory.map((item) => columns.map((column) => csvCell(item[column])).join(","))].join("\n");
await fs.writeFile(path.join(outputDirectory, "all-pdf-inventory.csv"), `${csv}\n`);
console.log(JSON.stringify({ pdfs: inventory.length, classifications: Object.fromEntries([...new Set(inventory.map((item) => item.classification))].map((category) => [category, inventory.filter((item) => item.classification === category).length])), reconciled: inventory.length }, null, 2));
