import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const root = process.cwd();
const productionRoot = path.join(root, "case-production/springlai-sol-v1.1");
const manifest = JSON.parse(await fs.readFile(path.join(productionRoot, "final-manifest.json"), "utf8"));
const mediaRoot = path.join(root, "public/media/springlai");
const contentPath = path.join(root, "data/content.json");

const cases = [
  {
    key: "整体VI更新", id: "SL001", folder: "brand-evolution",
    name: "春莱 · 品牌视觉长期维护 / Brand Visual Evolution",
    intro: "2022–2025，围绕春莱门店、包装与线上触点持续更新品牌视觉。从早期季节物料到 2023 秋冬 IP，再到 2025 品牌应用更新，呈现一套随经营场景逐步生长的视觉系统。",
    categories: ["drinks", "ip"], primaryIndustry: "茶饮", coverOrder: 22, heroOrder: 21,
  },
  {
    key: "古早咖啡", id: "SL002", folder: "vintage-coffee", name: "春莱 · 古早咖啡",
    intro: "2023，以旧报纸、印章与东南亚街头记忆构成古早咖啡系列。视觉从预告、上市海报延展到平台头图与产品菜单，保留朴素而鲜明的手作气质。",
    categories: ["drinks"], primaryIndustry: "咖啡", coverOrder: 2, heroOrder: 1,
  },
  {
    key: "铁观音", id: "SL003", folder: "tieguanyin", name: "春莱 · 铁观音系列",
    intro: "2023，以深绿、兰花与器物静物塑造铁观音系列的东方气质。主视觉、预告、限定周边与线上平台保持同一套克制的视觉语言。",
    categories: ["drinks"], primaryIndustry: "茶饮", coverOrder: 2, heroOrder: 1,
  },
  {
    key: "小蓝鸭联名", id: "SL004", folder: "xiaolanya", name: "春莱 × 小蓝鸭 · 联名系列",
    intro: "2023，围绕小蓝鸭角色与白玉龙眼产品建立轻松直接的联名视觉。角色、杯身插画、活动机制与平台传播共同组成完整的联名发布节奏。",
    categories: ["drinks", "ip"], primaryIndustry: "茶饮联名", coverOrder: 2, heroOrder: 1,
  },
  {
    key: "桃花桂花艺人", id: "SL005", folder: "peach-osmanthus", name: "春莱 · 桃花桂花艺人系列",
    intro: "2023–2024，从桃与乌龙暖饮延伸至桃花、桂花艺人合作。粉桃与金棕两套色彩系统分别组织包装、线下海报、平台头图与艺人同款产品。",
    categories: ["drinks"], primaryIndustry: "茶饮", coverOrder: 18, heroOrder: 1,
  },
  {
    key: "内蒙古限定", id: "SL006", folder: "inner-mongolia", name: "春莱 · 内蒙古限定",
    intro: "2024，为内蒙古区域限定热饮建立简洁的地域视觉。草原地貌、暖黄色与两款产品共同构成一组短而完整的门店传播单元。",
    categories: ["drinks"], primaryIndustry: "区域限定茶饮", coverOrder: 1, heroOrder: 2,
  },
  {
    key: "TATAN椰子", id: "SL007", folder: "tatan-coconut", name: "春莱 × TATAN · 椰子系列",
    intro: "2024，以宝宝角色、椰子产品与蓝绿放射图形建立联名系列。完成态海报、平台门店系统与三款产品共同呈现轻快、清晰的商业应用。",
    categories: ["drinks", "ip"], primaryIndustry: "茶饮联名", coverOrder: 3, heroOrder: 3,
  },
];

const sections = {
  "VI 01 · 夏季度物料定稿": { eyebrow: "VI 01", title: "夏季视觉体系", description: "以热带花卉、浅绿与手绘图形建立早期门店识别。" },
  "VI 02 · 冬季物料定稿": { eyebrow: "VI 02", title: "冬季视觉体系", description: "冬季菜单、平台与门店物料延续品牌语言，并扩展热饮场景。" },
  "VI 03 · 23年秋冬含IP物料与热饮上线": { eyebrow: "VI 03", title: "2023 秋冬 IP 更新", description: "IP 角色进入包装、平台、菜单与空间应用，形成更完整的触点系统。" },
  "VI 04 · 25年品牌升级与2025春夏": { eyebrow: "VI 04", title: "2025 品牌升级", description: "以电子菜单与新店围挡为核心的持续视觉更新，并延展至 2025 春夏应用。" },
  "桃与乌龙": { eyebrow: "Chapter 01", title: "桃与乌龙", description: "以粉桃色、暖饮与产品静物开启季节系列。" },
  "桃花艺人": { eyebrow: "Chapter 02", title: "桃花艺人", description: "桃花包装、艺人海报与线上平台构成完整发布链路。" },
  "桂花艺人": { eyebrow: "Chapter 03", title: "桂花艺人", description: "桂花包装与杯套先行，随后延展至布景海报、艺人视觉与产品应用。" },
};

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const titleFields = (value) => { const [brandName, ...project] = value.split("·"); return { brandName: brandName.trim(), projectName: project.join("·").trim() }; };
const fullTitle = (item) => item.projectName ? `${item.brandName} · ${item.projectName}` : item.brandName;
const routeFor = (id) => `/work/${id.toLowerCase()}`;
const stageCounters = new Map();
const imports = [];
sharp.cache({ memory: 256, files: 16, items: 64 });

await fs.rm(mediaRoot, { recursive: true, force: true });
await fs.mkdir(mediaRoot, { recursive: true });

for (const item of manifest.items) {
  const config = cases.find((entry) => entry.key === item.caseKey);
  if (!config) throw new Error(`Missing website case config: ${item.caseKey}`);
  let filename;
  if (item.caseKey === "整体VI更新") {
    const match = item.chapter.match(/^VI\s(\d{2})/);
    if (!match) throw new Error(`Missing VI stage: ${item.chapter}`);
    const stage = `vi${match[1]}`;
    const counterKey = `${config.key}:${stage}`;
    const count = (stageCounters.get(counterKey) || 0) + 1;
    stageCounters.set(counterKey, count);
    filename = `${stage}-${String(count).padStart(2, "0")}.jpg`;
  } else {
    filename = `${String(item.order).padStart(2, "0")}.jpg`;
  }
  const source = path.join(productionRoot, item.finalAsset);
  const destinationDirectory = path.join(mediaRoot, config.folder);
  const destination = path.join(destinationDirectory, filename);
  await fs.mkdir(destinationDirectory, { recursive: true });
  const sourceBuffer = await fs.readFile(source);
  await sharp(sourceBuffer)
    .rotate()
    .resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .toColourspace("srgb")
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(destination);
  const outputBuffer = await fs.readFile(destination);
  const metadata = await sharp(outputBuffer).metadata();
  imports.push({
    case: config.name,
    caseKey: item.caseKey,
    route: routeFor(config.id),
    order: item.order,
    chapter: item.chapter,
    subchapter: item.subchapter,
    editorialRole: item.editorialRole,
    type: item.type,
    sourceFinalAsset: item.finalAsset,
    sources: item.sources,
    sourceSha256: sha256(sourceBuffer),
    websiteAsset: `/media/springlai/${config.folder}/${filename}`,
    websiteSha256: sha256(outputBuffer),
    width: metadata.width,
    height: metadata.height,
    bytes: outputBuffer.byteLength,
    cover: item.order === config.coverOrder,
    hero: item.order === config.heroOrder,
  });
}

const sectionSeen = new Set();
const websiteCases = cases.map((config) => {
  const assets = imports.filter((item) => item.caseKey === config.key).sort((a, b) => a.order - b.order);
  const cover = assets.find((item) => item.cover);
  const hero = assets.find((item) => item.hero);
  if (!cover || !hero) throw new Error(`Missing cover or hero for ${config.key}`);
  const bodyAssets = assets.map((item) => {
    const sectionKey = config.key === "整体VI更新" ? item.chapter : config.key === "桃花桂花艺人" ? item.subchapter : undefined;
    const uniqueSectionKey = sectionKey ? `${config.key}:${sectionKey}` : undefined;
    const section = uniqueSectionKey && !sectionSeen.has(uniqueSectionKey) ? sections[sectionKey] : undefined;
    if (uniqueSectionKey && section) sectionSeen.add(uniqueSectionKey);
    return {
      id: `${config.id}-${String(item.order).padStart(2, "0")}`,
      type: "image",
      src: item.websiteAsset,
      layout: "full",
      ...(section ? { section } : {}),
    };
  });
  return {
    id: config.id,
    ...titleFields(config.name),
    intro: config.intro,
    cover: cover.websiteAsset,
    coverWidth: cover.width,
    coverHeight: cover.height,
    hero: hero.websiteAsset,
    bodyAssets,
    published: true,
    business: "branding",
    categories: config.categories,
    primaryIndustry: config.primaryIndustry,
    includeInPortfolioPdf: true,
    portfolioPdfImageIds: ["hero", ...bodyAssets.slice(0, bodyAssets.length >= 15 ? 4 : 3).map((asset) => asset.id)],
  };
});

const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
const retired = content.cases.filter((item) => /春莱|ChunLai/i.test(`${fullTitle(item)} ${item.intro || ""}`));
const retiredIds = new Set(retired.map((item) => item.id));
const existingIds = new Set(content.cases.map((item) => item.id));
for (const item of websiteCases) if (existingIds.has(item.id) && !retiredIds.has(item.id)) throw new Error(`Case ID already exists: ${item.id}`);

const firstBrandingPosition = content.defaultOrder.findIndex((id) => retiredIds.has(id));
const cleanDefaultOrder = content.defaultOrder.filter((id) => !retiredIds.has(id) && !websiteCases.some((item) => item.id === id));
cleanDefaultOrder.splice(firstBrandingPosition >= 0 ? firstBrandingPosition : cleanDefaultOrder.length, 0, ...websiteCases.map((item) => item.id));
const nextContent = {
  ...content,
  cases: [...content.cases.filter((item) => !retiredIds.has(item.id) && !websiteCases.some((entry) => entry.id === item.id)), ...websiteCases],
  defaultOrder: cleanDefaultOrder,
  photographyCaseOrder: content.photographyCaseOrder.filter((id) => !retiredIds.has(id)),
};
const temporaryContent = `${contentPath}.springlai-import.tmp`;
await fs.writeFile(temporaryContent, `${JSON.stringify(nextContent, null, 2)}\n`);
await fs.rename(temporaryContent, contentPath);

const totalBytes = imports.reduce((sum, item) => sum + item.bytes, 0);
const importMap = {
  version: "springlai-sol-v1.1-website-import",
  generatedAt: new Date().toISOString(),
  sourceManifest: "case-production/springlai-sol-v1.1/final-manifest.json",
  importedCaseCount: websiteCases.length,
  importedMediaCount: imports.length,
  totalBytes,
  retiredCases: retired.map(({ id, brandName, projectName, business }) => ({ id, brandName, projectName, business })),
  schemaChange: "optional bodyAssets[].section metadata",
  cases: websiteCases.map((item) => ({ id: item.id, brandName: item.brandName, projectName: item.projectName, route: routeFor(item.id), cover: item.cover, hero: item.hero, bodyAssetCount: item.bodyAssets.length })),
  assets: imports,
};
await fs.writeFile(path.join(productionRoot, "website-import-map.json"), `${JSON.stringify(importMap, null, 2)}\n`);

console.log(JSON.stringify({
  importedCases: websiteCases.length,
  importedMedia: imports.length,
  totalBytes,
  retiredCases: importMap.retiredCases,
  routes: importMap.cases.map(({ brandName, projectName, route }) => ({ brandName, projectName, route })),
}, null, 2));
