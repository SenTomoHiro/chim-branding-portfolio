import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const file = new URL("../data/content.json", import.meta.url);
const data = JSON.parse(process.argv.includes("--from-head") ? execFileSync("git", ["show", "HEAD:data/content.json"], { encoding: "utf8" }) : await readFile(file, "utf8"));

function migrate(item) {
  if (Array.isArray(item.media) && !("cover" in item) && !("hero" in item) && !("bodyAssets" in item)) return item;
  const oldMedia = Array.isArray(item.media) ? item.media : Array.isArray(item.bodyAssets) ? item.bodyAssets : [];
  const ordered = [];
  const bySource = new Map();
  const usedIds = new Set();
  const add = (asset, selected = false) => {
    if (!asset?.src) return;
    const existing = bySource.get(asset.src);
    if (existing) {
      if (selected) existing.portfolioPdfSelected = true;
      if (!existing.provenance && asset.provenance) existing.provenance = asset.provenance;
      if (!existing.section && asset.section) existing.section = asset.section;
      if (!existing.width && asset.width) existing.width = asset.width;
      if (!existing.height && asset.height) existing.height = asset.height;
      return;
    }
    const next = { ...asset };
    const baseId = next.id || `${item.id}-media`;
    let uniqueId = baseId;
    let suffix = 2;
    while (usedIds.has(uniqueId)) uniqueId = `${baseId}-${suffix++}`;
    next.id = uniqueId;
    usedIds.add(uniqueId);
    if (selected && next.type === "image") next.portfolioPdfSelected = true;
    bySource.set(next.src, next);
    ordered.push(next);
  };
  const cover = item.cover ? {
    id: item.coverProvenance?.assetId || `${item.id}-cover`, type: "image", src: item.cover,
    layout: "full", width: item.coverWidth, height: item.coverHeight, provenance: item.coverProvenance,
  } : undefined;
  const hero = item.hero ? {
    id: item.heroProvenance?.assetId || `${item.id}-hero`, type: "image", src: item.hero,
    layout: "full", provenance: item.heroProvenance,
  } : undefined;
  add(cover, Boolean(item.portfolioPdfCoverSelected));
  add(hero, Boolean(item.portfolioPdfHeroSelected));
  for (const asset of oldMedia) add(asset, Boolean(asset.portfolioPdfSelected));
  const roleIds = new Set(ordered.filter((asset) => asset.type === "image").slice(0, 2).map((asset) => asset.id));
  const deferredSections = [];
  for (const asset of ordered) {
    if (roleIds.has(asset.id) && asset.section) { deferredSections.push(asset.section); delete asset.section; }
  }
  for (const asset of ordered) {
    if (!roleIds.has(asset.id) && deferredSections.length && !asset.section) asset.section = deferredSections.shift();
  }
  const { cover: _cover, coverWidth: _coverWidth, coverHeight: _coverHeight, hero: _hero,
    coverProvenance: _coverProvenance, heroProvenance: _heroProvenance,
    bodyAssets: _bodyAssets, portfolioPdfCoverSelected: _coverSelected,
    portfolioPdfHeroSelected: _heroSelected, ...rest } = item;
  return { ...rest, media: ordered };
}

data.cases = data.cases.map(migrate);
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
