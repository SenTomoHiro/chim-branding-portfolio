import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "data", "content.json");
const data = JSON.parse(await readFile(file, "utf8"));

function applyInitialSelection(item) {
  if (!item.published) return;
  const target = item.bodyAssets.length >= 15 || item.bodyAssets.filter((asset) => asset.section).length >= 3 ? 5 : 4;
  const selected = new Set();
  const sources = new Set();
  const add = (id, src) => {
    if (!src || sources.has(src) || selected.size >= target) return;
    selected.add(id);
    sources.add(src);
  };
  add("hero", item.hero);
  let chapter = "";
  const representatives = new Map();
  for (const asset of item.bodyAssets) {
    if (asset.section) chapter = asset.id;
    if (asset.type === "image" && chapter && !representatives.has(chapter)) representatives.set(chapter, asset);
  }
  for (const asset of representatives.values()) add(asset.id, asset.src);
  for (const asset of item.bodyAssets) if (asset.type === "image") add(asset.id, asset.src);
  add("cover", item.cover);
  item.portfolioPdfHeroSelected = selected.has("hero");
  item.portfolioPdfCoverSelected = selected.has("cover");
  item.bodyAssets = item.bodyAssets.map(({ portfolioPdfSelected: _selected, ...asset }) => ({ ...asset, ...(asset.type === "image" && selected.has(asset.id) ? { portfolioPdfSelected: true } : {}) }));
}

for (const item of data.cases) {
  if (typeof item.includeInPortfolioPdf !== "boolean") item.includeInPortfolioPdf = Boolean(item.published);
  item.portfolioPdfHeroSelected = Boolean(item.portfolioPdfHeroSelected);
  item.portfolioPdfCoverSelected = Boolean(item.portfolioPdfCoverSelected);
  item.bodyAssets = item.bodyAssets.map(({ portfolioPdfSelected, ...asset }) => ({ ...asset, ...(asset.type === "image" && portfolioPdfSelected ? { portfolioPdfSelected: true } : {}) }));
  const hasSelection = item.portfolioPdfHeroSelected || item.portfolioPdfCoverSelected || item.bodyAssets.some((asset) => asset.portfolioPdfSelected);
  if (item.includeInPortfolioPdf && !hasSelection) applyInitialSelection(item);
}

await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Normalized ${data.cases.length} cases with media-owned PDF portfolio selection.`);
