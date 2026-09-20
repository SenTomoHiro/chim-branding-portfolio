import fs from "node:fs/promises";
import path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "case-production/portfolio-additions-sol-v1");
const contentPath = path.join(repo, "data/content.json");
const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
const manifest = JSON.parse(await fs.readFile(path.join(root, "final-manifest.json"), "utf8"));
const renderManifest = JSON.parse(await fs.readFile(path.join(root, "render-manifest.json"), "utf8"));

const mediaFolders = {
  "mustache-matcha": "mustache-matcha",
  "zhenxin-tea": "zhenxin-tea",
  "chunlai-courtyard": "chunlai-courtyard",
  wenningji: "wenningji",
  "mustache-cocoa-winter": "mustache-cocoa-winter",
  "mustache-cocoa-tatan": "mustache-cocoa-tatan",
};
const halfOrders = {
  "mustache-matcha": new Set([6, 7, 10, 11]),
  "zhenxin-tea": new Set([2, 3, 6, 7]),
  "chunlai-courtyard": new Set([5, 6, 7, 8, 9, 10]),
  wenningji: new Set([2, 3, 5, 6, 9, 10]),
  "mustache-cocoa-winter": new Set([1, 2, 6, 7, 8, 9, 11, 12, 14, 15]),
  "mustache-cocoa-tatan": new Set([1, 2, 5, 6, 7, 8, 11, 12]),
};

const renderOrigins = new Map();
for (const render of renderManifest.renders) {
  for (const output of render.outputs) renderOrigins.set(path.join(repo, output), render);
}

function provenance(item, assetId) {
  const origin = item.sources.length === 1 ? renderOrigins.get(item.sources[0]) : undefined;
  const base = {
    assetId,
    sourceType: origin?.sourceType,
    sourcePdf: origin?.sourceType === "pdf" ? origin.source : undefined,
    sourcePsd: origin?.sourceType === "psd" || origin?.sourceType === "psb" ? origin.source : undefined,
    sourceAi: origin?.sourceType === "ai" ? origin.source : undefined,
    sourceObject: origin ? undefined : item.sources.map((value) => path.basename(value)).join(" + "),
    extractionMethod: item.productionMethod,
    width: item.width,
    height: item.height,
    sha256: item.sha256,
    classification: "final_design",
    finalWorkVerified: true,
  };
  return Object.fromEntries(Object.entries(base).filter(([, value]) => value !== undefined));
}

const importMap = [];
for (const caseInfo of manifest.cases) {
  const items = manifest.items.filter((item) => item.caseKey === caseInfo.caseKey).sort((a, b) => a.order - b.order);
  const folder = mediaFolders[caseInfo.caseKey];
  const mediaDir = path.join(repo, "public/media", folder);
  await fs.mkdir(mediaDir, { recursive: true });
  const chapterStarts = new Map();
  for (const chapter of caseInfo.chapters) {
    const first = items.find((item) => item.chapter === chapter.title);
    if (first) chapterStarts.set(first.order, chapter);
  }
  const media = [];
  for (const item of items) {
    const extension = ".jpg";
    const filename = `body-${String(item.order).padStart(2, "0")}${extension}`;
    const target = path.join(mediaDir, filename);
    await fs.copyFile(path.join(root, item.finalAsset), target);
    const section = chapterStarts.get(item.order);
    const assetId = `${caseInfo.id}-body-${item.order}`;
    media.push({
      id: assetId,
      type: "image",
      src: `/media/${folder}/${filename}`,
      layout: halfOrders[caseInfo.caseKey].has(item.order) ? "half" : "full",
      section: section ? { eyebrow: `CHAPTER ${String(caseInfo.chapters.indexOf(section) + 1).padStart(2, "0")}`, title: section.title, description: section.description } : undefined,
      provenance: provenance(item, assetId),
    });
    importMap.push({ case: caseInfo.case, caseAction: caseInfo.caseAction, caseId: caseInfo.id, order: item.order, finalAsset: item.finalAsset, websiteAsset: `/media/${folder}/${filename}`, sources: item.sources, chapter: item.chapter });
  }
  const coverItem = items.find((item) => item.order === caseInfo.coverOrder);
  const heroItem = items.find((item) => item.order === caseInfo.heroOrder);
  if (!coverItem || !heroItem) throw new Error(`Missing cover or hero selection for ${caseInfo.case}`);
  const coverAsset = media[caseInfo.coverOrder - 1];
  const heroAsset = media[caseInfo.heroOrder - 1];
  const orderedMedia = [
    { ...coverAsset, width: coverItem.width, height: coverItem.height },
    { ...heroAsset, width: heroItem.width, height: heroItem.height },
    ...media.filter((asset) => asset.src !== coverAsset.src && asset.src !== heroAsset.src),
  ];
  const siteCase = {
    id: caseInfo.id,
    name: caseInfo.siteName || caseInfo.case,
    intro: caseInfo.intro,
    media: orderedMedia,
    published: true,
    business: "branding",
    categories: caseInfo.categories,
    primaryIndustry: caseInfo.primaryIndustry,
  };
  const existingIndex = content.cases.findIndex((entry) => entry.id === caseInfo.id);
  if (caseInfo.caseAction === "update") {
    if (existingIndex < 0) throw new Error(`Existing case ${caseInfo.id} not found`);
    if (content.cases.filter((entry) => entry.name === siteCase.name && entry.id !== siteCase.id).length) throw new Error(`Duplicate case name: ${siteCase.name}`);
    content.cases[existingIndex] = siteCase;
  } else {
    if (existingIndex >= 0) {
      if (content.cases[existingIndex].name !== siteCase.name) throw new Error(`Case ID collision: ${siteCase.id}`);
      content.cases[existingIndex] = siteCase;
    } else {
      if (content.cases.some((entry) => entry.name === siteCase.name)) throw new Error(`Duplicate create case: ${siteCase.id} / ${siteCase.name}`);
      content.cases.push(siteCase);
    }
    if (!content.defaultOrder.includes(siteCase.id)) content.defaultOrder.push(siteCase.id);
  }
}

const targetNames = ["大胡子抹茶", "真心茶事", "春莱小院", "文柠记", "大胡子可可 · 冬季热饮新品系列", "大胡子可可 × TATAN"];
for (const name of targetNames) {
  const matches = content.cases.filter((entry) => entry.name.includes(name));
  if (matches.length !== 1) throw new Error(`Expected exactly one website case containing ${name}; found ${matches.length}`);
}
if (content.cases.filter((entry) => entry.id === "L012").length !== 1) throw new Error("文柠记 ID L012 must remain unique");

await fs.writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`);
await fs.writeFile(path.join(root, "website-import-map.json"), `${JSON.stringify(importMap, null, 2)}\n`);
console.log(JSON.stringify({ created: manifest.cases.filter((item) => item.caseAction === "create").length, updated: manifest.cases.filter((item) => item.caseAction === "update").length, websiteImages: importMap.length, cases: content.cases.length }, null, 2));
