import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "data", "content.json");
const data = JSON.parse(await readFile(file, "utf8"));

function initialSelection(item) {
  if (!item.published) return [];
  const target = item.bodyAssets.length >= 15 || item.bodyAssets.filter((asset) => asset.section).length >= 3 ? 5 : 4;
  const selected = [];
  const sources = new Set();
  const add = (id, src) => {
    if (!src || sources.has(src) || selected.length >= target) return;
    selected.push(id);
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
  return selected;
}

for (const item of data.cases) {
  if (typeof item.includeInPortfolioPdf !== "boolean") item.includeInPortfolioPdf = Boolean(item.published);
  if (!Array.isArray(item.portfolioPdfImageIds)) item.portfolioPdfImageIds = initialSelection(item);
}

await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Migrated ${data.cases.length} cases with one-time PDF portfolio settings.`);
