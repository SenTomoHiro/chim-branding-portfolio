import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const repo = process.cwd();
const productionRoot = path.join(repo, "case-production/portfolio-jujus-ruihan-atai-v1");
const publicRoot = path.join(repo, "public/media/cases");
const contentPath = path.join(repo, "data/content.json");

const source = {
  jujusPdf: "/Users/chim/Downloads/jujus/240703-jujus第一批.pdf",
  ruihanPdf: "/Users/chim/Desktop/平面设计/260823-瑞瀚心理咨询/2608-瑞瀚-方案预览.pdf",
  initialAi: "/Users/chim/Downloads/阿泰珍奶/250501-阿泰珍奶-初步/250501-阿财珍奶-初步-改1.ai",
  storefrontAi: "/Users/chim/Downloads/阿泰珍奶/250508-阿泰珍奶-牌匾门头-1800x460mm/250508-阿泰珍奶-牌匾门头-1800x460mm.ai",
  bagAi: "/Users/chim/Downloads/阿泰珍奶/250621-阿泰珍奶-手提袋重做/250621-阿泰珍奶-手提袋重做.ai",
  posterAi: "/Users/chim/Downloads/阿泰珍奶/250630-阿泰珍奶-线上全套重做&海报/250627-阿泰珍奶-海报-改1-改文案.ai",
  onlineAi: "/Users/chim/Downloads/阿泰珍奶/250630-阿泰珍奶-线上全套重做&海报/250630-阿泰珍奶-线上全套重做-改文案.ai",
};

const selected = {
  N026: [
    ["cover", "tmp/pdfs/jujus/img-000.png", 1, "xref:16;smask:16"],
    ["hero", "tmp/pdfs/jujus/img-002.png", 2, "xref:20;smask:20"],
    ["brand-system", "tmp/pdfs/jujus/img-013.png", 6, "xref:38;smask:0"],
    ["menu-poster", "tmp/pdfs/jujus/img-000.png", 1, "xref:16;smask:16"],
    ["menu-foldout", "tmp/pdfs/jujus/img-004.png", 3, "xref:24;smask:24"],
    ["paper-bag", "tmp/pdfs/jujus/img-006.png", 3, "xref:25;smask:25"],
    ["apron", "tmp/pdfs/jujus/img-008.png", 4, "xref:29;smask:0"],
    ["uniform", "tmp/pdfs/jujus/img-009.png", 5, "xref:33;smask:33"],
  ],
  N027: [
    ["cover", "tmp/pdfs/ruihan/img-026.png", 8, "xref:85;smask:0"],
    ["hero", "tmp/pdfs/ruihan/img-017.png", 5, "xref:47;smask:0"],
    ["brand-system", "tmp/pdfs/ruihan-page3.jpg", 3, "page-render"],
    ["digital-platform", "tmp/pdfs/ruihan/img-015.png", 4, "xref:43;smask:43"],
    ["reception", "tmp/pdfs/ruihan/img-018.png", 5, "xref:48;smask:0"],
    ["service-posters", "tmp/pdfs/ruihan/img-019.png", 6, "xref:52;smask:0"],
    ["campaign-posters", "tmp/pdfs/ruihan/img-020.png", 7, "xref:73;smask:0"],
    ["door-sign", "tmp/pdfs/ruihan/img-025.png", 8, "xref:84;smask:0"],
    ["brand-items", "tmp/pdfs/ruihan/img-026.png", 8, "xref:85;smask:0"],
    ["stationery", "tmp/pdfs/ruihan/img-027.png", 8, "xref:86;smask:0"],
  ],
  N028: [
    ["cover", "tmp/illustrator/atai-v1/exports/poster-copy-20250627-folder/artboard-1.jpg", 1, source.posterAi],
    ["hero", "tmp/illustrator/atai-v1/selected-hq/online-final-artboard-10.jpg", 10, source.onlineAi],
    ["initial-direction", "tmp/illustrator/atai-v1/selected-hq/initial-artboard-1.jpg", 1, source.initialAi, { left: 0, top: 0, width: 1309, height: 1990 }],
    ["storefront-primary", "tmp/illustrator/atai-v1/exports/storefront-20250508/artboard-1.jpg", 1, source.storefrontAi],
    ["storefront-secondary", "tmp/illustrator/atai-v1/exports/storefront-20250508/artboard-2.jpg", 2, source.storefrontAi],
    ["bag-flat-design", "tmp/illustrator/atai-v1/exports/bag-20250621/artboard-1.jpg", 1, source.bagAi, { left: 0, top: 0, width: 4000, height: 1100 }],
    ["poster-primary", "tmp/illustrator/atai-v1/exports/poster-copy-20250627-folder/artboard-1.jpg", 1, source.posterAi],
    ["poster-information", "tmp/illustrator/atai-v1/exports/poster-copy-20250627-folder/artboard-2.jpg", 2, source.posterAi],
    ["online-avatar", "tmp/illustrator/atai-v1/selected-hq/online-final-artboard-1.jpg", 1, source.onlineAi],
    ["online-key-visual", "tmp/illustrator/atai-v1/selected-hq/online-final-artboard-3.jpg", 3, source.onlineAi],
    ["online-product", "tmp/illustrator/atai-v1/selected-hq/online-final-artboard-4.jpg", 4, source.onlineAi],
    ["online-banner", "tmp/illustrator/atai-v1/selected-hq/online-final-artboard-11.jpg", 11, source.onlineAi],
  ],
};

function hash(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function webAsset(caseId, entry, index) {
  const [role, relativeSource, locator, detail, crop] = entry;
  const input = path.join(repo, relativeSource);
  const directory = path.join(publicRoot, caseId);
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${String(index + 1).padStart(2, "0")}-${role}.webp`;
  const destination = path.join(directory, filename);
  let pipeline = sharp(input, { limitInputPixels: false }).rotate();
  if (crop) pipeline = pipeline.extract(crop);
  const cover = role === "cover";
  const info = await pipeline.resize(cover
    ? { width: 1400, height: 1800, fit: "inside", withoutEnlargement: true }
    : { width: 2200, height: 2600, fit: "inside", withoutEnlargement: true }
  ).webp({ quality: cover ? 84 : 87, alphaQuality: 95, smartSubsample: true }).toFile(destination);
  const isPdf = caseId !== "N028";
  const provenance = {
    assetId: `${caseId}-A${String(index + 1).padStart(2, "0")}`,
    sourceType: isPdf ? "pdf" : "ai",
    ...(isPdf ? { sourcePdf: caseId === "N026" ? "240703-jujus第一批.pdf" : "2608-瑞瀚-方案预览.pdf", sourcePage: locator, sourceObject: detail } : { sourceAi: detail, sourceArtboard: locator }),
    extractionMethod: isPdf ? (detail === "page-render" ? "pdf_page_render_for_design_system" : "pdf_embedded_image_object") : (crop ? "illustrator_30_artboard_export_curated_crop" : "illustrator_30_artboard_export"),
    width: info.width,
    height: info.height,
    sha256: hash(destination),
    classification: "final_design",
    finalWorkVerified: true,
  };
  return { role, src: `/media/cases/${caseId}/${filename}`, width: info.width, height: info.height, provenance, source: relativeSource };
}

const built = {};
for (const [caseId, entries] of Object.entries(selected)) {
  built[caseId] = [];
  for (const [index, entry] of entries.entries()) built[caseId].push(await webAsset(caseId, entry, index));
}

const section = (title, description) => ({ title, description });
function body(caseId, roles) {
  let chapterNumber = 0;
  return roles.map(([role, layout, chapter]) => {
    const asset = built[caseId].find((item) => item.role === role);
    if (!asset) throw new Error(`Missing ${caseId} ${role}`);
    const numberedChapter = chapter
      ? { ...chapter, eyebrow: `CHAPTER ${String(++chapterNumber).padStart(2, "0")}` }
      : undefined;
    return { id: asset.provenance.assetId, type: "image", src: asset.src, layout, ...(numberedChapter ? { section: numberedChapter } : {}), provenance: asset.provenance };
  });
}

function unifiedMedia(caseId, roles) {
  const roleMedia = built[caseId].slice(0, 2).map((asset) => ({ id: asset.provenance.assetId, type: "image", src: asset.src, layout: "full", width: asset.width, height: asset.height, provenance: asset.provenance }));
  const sources = new Set(roleMedia.map((asset) => asset.src));
  return [...roleMedia, ...body(caseId, roles).filter((asset) => !sources.has(asset.src))];
}

const cases = [
  {
    id: "N026", name: "JUJUS", intro: "以蓝粉配色与波浪字标构建品牌视觉，延展至菜单、包装与工作服。", business: "branding", categories: ["drinks"], primaryIndustry: "饮品",
    media: unifiedMedia("N026", [
      ["brand-system", "full", section("品牌识别系统", "字标、字体、色彩与基础版式。")],
      ["menu-poster", "half", section("菜单与包装", "品牌视觉在菜单与外带包装中的应用。")],
      ["menu-foldout", "half"], ["paper-bag", "full"],
      ["apron", "half", section("工作服与服务形象", "围裙与工作服延续统一的蓝粉视觉。")], ["uniform", "half"],
    ]), published: true,
  },
  {
    id: "N027", name: "瑞瀚心理", intro: "心理咨询品牌视觉更新，涵盖识别系统、数字平台、空间传播与品牌物料。", business: "branding", categories: ["other"], primaryIndustry: "心理咨询",
    media: unifiedMedia("N027", [
      ["brand-system", "full", section("识别与色彩", "以蓝色识别、辅助色与水面意象建立品牌基调。")],
      ["digital-platform", "full", section("数字平台", "面向线上咨询入口的品牌界面呈现。")],
      ["reception", "half", section("空间与传播", "门店前台、服务海报与空间传播应用。")], ["service-posters", "half"], ["campaign-posters", "full"],
      ["door-sign", "half", section("品牌物料", "门牌、手提袋、纸杯与印刷物料。")], ["brand-items", "half"], ["stationery", "full"],
    ]), published: true,
  },
  {
    id: "N028", name: "阿泰珍奶", intro: "围绕古法泰茶建立品牌视觉，并延展至门店招牌、手提袋、海报与线上视觉。", business: "branding", categories: ["drinks"], primaryIndustry: "泰式奶茶",
    media: unifiedMedia("N028", [
      ["initial-direction", "full", section("初期品牌方向", "从早期字标、图形与门店应用方向开始建立识别基础。")],
      ["storefront-primary", "full", section("门店与招牌", "以深红、木色与双语字标形成线下门店识别。")], ["storefront-secondary", "full"],
      ["bag-flat-design", "full", section("包装与手提袋", "手提袋正反面与不同容量规格的统一设计。")],
      ["poster-primary", "half", section("宣传海报", "以泰式街头茶摊与蓝黄红色彩构成主视觉。")], ["poster-information", "half"],
      ["online-avatar", "half", section("线上视觉系统", "头像、主视觉、产品图与平台横幅形成连续的线上识别。")], ["online-key-visual", "half"], ["online-product", "full"], ["online-banner", "full"],
    ]), published: true,
  },
];

const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
for (const item of cases) {
  const index = content.cases.findIndex((entry) => entry.id === item.id || entry.name === item.name);
  if (index >= 0) content.cases[index] = item;
  else content.cases.push(item);
  content.defaultOrder = content.defaultOrder.filter((id) => id !== item.id);
  content.defaultOrder.push(item.id);
}
fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`);

fs.mkdirSync(productionRoot, { recursive: true });
fs.copyFileSync(path.join(repo, "tmp/illustrator/atai-v1/illustrator-export-report.json"), path.join(productionRoot, "illustrator-export-report.json"));
const manifest = {
  generatedAt: new Date().toISOString(),
  cases: cases.map((item) => ({ id: item.id, name: item.name, chapterCount: item.media.filter((asset) => asset.section).length, bodyImageCount: item.media.length, distinctDisplayImageCount: item.media.length + 1, sourceFiles: item.id === "N026" ? [source.jujusPdf] : item.id === "N027" ? [source.ruihanPdf] : [source.initialAi, source.storefrontAi, source.bagAi, source.posterAi, source.onlineAi] })),
  pdfExtraction: { JUJUS: { pages: 6, embeddedPrimaryImages: 8, selectedSourceObjects: 7 }, ruihan: { pages: 8, embeddedPrimaryImages: 24, selectedEmbeddedObjects: 8, selectedPageRenders: 1 } },
  atmosphereImagesRemoved: { total: 14, ruihan: 14, jujus: 0, types: ["海景", "室内静物", "人物肖像", "亲子生活方式", "户外人物摄影"] },
  mockupsKept: { total: 17, jujus: 6, ruihan: 8, atai: 3 },
  illustrator: { application: "Adobe Illustrator", version: "30.0.0", sourceFilesOverwritten: 0, exportedArtboards: 49, missingLinkedAssets: 0, finalSelectedArtboardsOrCrops: 11 },
  ataiNamingDecision: "250501-阿财珍奶-初步-改1.ai 是阿泰珍奶的早期品牌方向，归入阿泰珍奶案例。",
  exclusions: ["纯氛围背景摄影", "重复嵌入与同图不同尺寸", "占位文案版本", "同视觉早期版本", "红色内部标注区域", "刀模、尺寸与印刷生产信息", "空白或无展示价值画板"],
  assets: Object.values(built).flat(),
};
fs.writeFileSync(path.join(productionRoot, "final-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ cases: manifest.cases, atmosphereImagesRemoved: manifest.atmosphereImagesRemoved.total, mockupsKept: manifest.mockupsKept.total }, null, 2));
