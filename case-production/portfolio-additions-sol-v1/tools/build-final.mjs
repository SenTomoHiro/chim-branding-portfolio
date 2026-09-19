import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const repo = process.cwd();
const root = path.join(repo, "case-production/portfolio-additions-sol-v1");
const source = (...parts) => path.join(...parts);
const local = (...parts) => path.join(root, ...parts);

const M = "/Users/chim/Downloads/大胡子抹茶/240905-大胡子全套提案/提案";
const Z = "/Users/chim/Downloads/真心茶事";
const C = "/Users/chim/Downloads/春莱小院/提案";
const W = "/Users/chim/Downloads/文柠记/提案";
const CW14 = "/Users/chim/Downloads/大胡子可可/241014-大胡子可可-热饮6款";
const CW24 = "/Users/chim/Downloads/大胡子可可/241024-大胡子可可-热饮2款";

const item = (src, type, role, reason, options = {}) => ({ kind: "direct", sources: [src], type, editorialRole: role, decisionReason: reason, ...options });
const composite = (sources, role, reason, options = {}) => ({ kind: "composite", sources, type: "composite", editorialRole: role, decisionReason: reason, ...options });

const cases = [
  {
    key: "mustache-matcha", case: "大胡子抹茶 · 品牌视觉", caseAction: "create", existingCaseId: null,
    id: "N021", categories: ["drinks", "ip"], primaryIndustry: "抹茶饮品",
    intro: "围绕人物肖像、抹茶色系与中泰文字语汇建立品牌识别，并延展至菜单、平台门店与空间应用。",
    coverOrder: 10, heroOrder: 9,
    items: [
      item(local("rendered/mustache-matcha/pdf/01-240905-大胡子抹茶-全套提案-04.jpg"), "mockup", "品牌空间开场", "完整门头与室内场景最适合作为品牌叙事开场。"),
      item(local("rendered/mustache-matcha/pdf/01-240905-大胡子抹茶-全套提案-06.jpg"), "mockup", "线上门店系统", "以手机界面呈现线上触点的完整适配。"),
      item(local("rendered/mustache-matcha/pdf/01-240905-大胡子抹茶-全套提案-09.jpg"), "mockup", "开业落地", "展示开业信息在户外立牌上的实际应用。"),
      item(local("rendered-photoshop/mustache-matcha/psd/03-菜单-MacBook.jpg"), "mockup", "电子菜单", "完成态 PSD 样机清楚呈现菜单在桌面设备中的使用。"),
      item(local("rendered-photoshop/mustache-matcha/psd/04-菜单.jpg"), "mockup", "门店菜单系统", "宽幅屏幕样机展示完整产品矩阵。"),
      item(local("rendered-photoshop/mustache-matcha/psd/05-点评.jpg"), "mockup", "大众点评", "平台页面与品牌图形保持一致。"),
      item(local("rendered-photoshop/mustache-matcha/psd/08-美团.jpg"), "mockup", "美团门店", "补充另一主要线上渠道的完成态。"),
      item(local("rendered-photoshop/mustache-matcha/psd/06-欢迎光临海报-户外.jpg"), "mockup", "户外欢迎海报", "真实空间尺度强化开业物料的可读性。"),
      item(local("rendered-photoshop/mustache-matcha/psd/09-门头发光字.jpg"), "mockup", "门头识别", "横向门头适合作为详情页 Hero。"),
      item(local("rendered-photoshop/mustache-matcha/psd/10-室内发光字.jpg"), "mockup", "室内灯箱", "纵向空间画面在列表缩略图中仍具辨识度。"),
      item(local("rendered-photoshop/mustache-matcha/psd/11-室内立体字.jpg"), "mockup", "室内品牌墙", "品牌标识与材质、光线关系清晰。"),
      item(local("rendered-photoshop/mustache-matcha/psd/12-招牌产品海报.jpg"), "mockup", "招牌产品海报", "以主打产品和肖像语言收束品牌系统。"),
    ],
  },
  {
    key: "zhenxin-tea", case: "真心茶事 · 品牌视觉", caseAction: "create", existingCaseId: null,
    id: "N022", categories: ["drinks"], primaryIndustry: "中式茶饮",
    intro: "以清淡留白、书写字与器物意象构成中式茶饮识别，再以花材和产品摄影延展季节传播。",
    coverOrder: 2, heroOrder: 1,
    chapters: [
      { title: "真心制茶", description: "从杯贴、纸袋到门店与线上界面建立克制、温润的品牌基础。" },
      { title: "花与茶的四季叙事", description: "以花材、器物与产品组合发展连续的季节传播系列。" },
    ],
    items: [
      item(local("rendered-photoshop/zhenxin-tea/psd/05-灯箱-门头2展示.jpg"), "mockup", "门店开场", "简洁门头完整呈现品牌在空间中的尺度。", { chapter: 0 }),
      item(local("rendered-photoshop/zhenxin-tea/psd/01-杯子样机-带杯贴.jpg"), "mockup", "核心杯装", "杯贴和杯型共同构成最直接的品牌记忆。", { chapter: 0 }),
      item(local("rendered-photoshop/zhenxin-tea/psd/10-纸袋样机.jpg"), "mockup", "纸袋包装", "纸袋样机补充包装系统的完成态。", { chapter: 0 }),
      item(local("rendered/zhenxin-tea/pdf/01-真心茶事-提案-1.jpg"), "mockup", "品牌与包装总览", "成熟提案页集中展示杯、包装与手提袋。", { chapter: 0 }),
      item(local("rendered/zhenxin-tea/pdf/01-真心茶事-提案-3.jpg"), "mockup", "门店应用总览", "将菜单、立牌和门头纳入同一应用系统。", { chapter: 0 }),
      item(local("rendered-photoshop/zhenxin-tea/psd/03-菜单.jpg"), "mockup", "菜单应用", "菜单样机展示品牌版式在高信息密度触点中的表现。", { chapter: 0 }),
      item(local("rendered-photoshop/zhenxin-tea/psd/06-甲马海报.jpg"), "mockup", "线下海报", "立牌海报连接品牌基础与传播场景。", { chapter: 0 }),
      item(local("rendered-photoshop/zhenxin-tea/psd/04-大众点评.jpg"), "mockup", "线上门店", "平台页面完成品牌触点闭环。", { chapter: 0 }),
      composite([1, 2, 3, 4].map((n) => source(Z, "电视机海报12张", n === 1 ? "231117-真心茶事-电视机海报-_画板 1.jpg" : `231117-真心茶事-电视机海报--0${n}.jpg`)), "初春花茶系列", "四张视觉共用同一摄影与书写体系，组合展示比逐张铺陈更完整。", { chapter: 1, columns: 2, cellWidth: 1000, cellHeight: 1400 }),
      composite([5, 6, 7, 8].map((n) => source(Z, "电视机海报12张", `231117-真心茶事-电视机海报--0${n}.jpg`)), "清雅花材系列", "同一季节语汇下的四个产品变体合并为一个展示单元。", { chapter: 1, columns: 2, cellWidth: 1000, cellHeight: 1400 }),
      composite([9, 10, 11, 12].map((n) => source(Z, "电视机海报12张", `231117-真心茶事-电视机海报--${String(n).padStart(2, "0")}.jpg`)), "暖色花茶系列", "暖色组与手持场景形成传播系列的收束。", { chapter: 1, columns: 2, cellWidth: 1000, cellHeight: 1400 }),
    ],
  },
  {
    key: "chunlai-courtyard", case: "春莱小院 · 品牌视觉", caseAction: "create", existingCaseId: null,
    id: "N023", categories: ["food"], primaryIndustry: "泰式餐饮",
    intro: "以热带植物插画、泰中双语字形与深绿、赭红色系构建泰北餐饮品牌，并延展菜单与平台视觉。",
    coverOrder: 4, heroOrder: 1,
    items: [
      item(source(C, "IMG_3136.JPG"), "artwork", "品牌主视觉", "鸡蛋花与泰文字形形成明确的餐饮识别。", { cropViewerChrome: true }),
      item(source(C, "IMG_3137.JPG"), "mockup", "平台门店", "两个手机界面展示线上门店的真实应用。"),
      item(source(C, "IMG_3138.JPG"), "artwork", "线上视觉系统", "集中说明平台头图、店招与菜品视觉的统一语言。"),
      item(source(C, "IMG_3139.JPG"), "artwork", "图形语言", "植物、字形与徽章系统构成品牌的可扩展素材库。", { cropViewerChrome: true }),
      item(source(C, "IMG_3140.JPG"), "mockup", "招聘海报", "纸张与胶带场景保留自然、手作的品牌气质。", { cropViewerChrome: true }),
      item(source(C, "IMG_3141.JPG"), "mockup", "产品海报", "深绿色产品海报强化门店传播识别。", { cropViewerChrome: true }),
      item(source(C, "IMG_3142.JPG"), "mockup", "菜单内页", "菜单样机展示高信息密度下的排版秩序。", { cropViewerChrome: true }),
      item(source(C, "IMG_3143.JPG"), "mockup", "菜单封面", "深绿与芥末黄的封面延续核心配色。", { cropViewerChrome: true }),
      item(source(C, "IMG_3144.JPG"), "artwork", "鸡蛋花插画", "植物插画是品牌识别的核心叙事素材。", { cropViewerChrome: true }),
      item(source(C, "IMG_3145.JPG"), "artwork", "热带植物插画", "以不同植物补全泰北风味的视觉语汇。", { cropViewerChrome: true }),
    ],
  },
  {
    key: "wenningji", case: "文柠记 · 品牌视觉", siteName: "文柠记", caseAction: "update", existingCaseId: "L012",
    id: "L012", categories: ["drinks"], primaryIndustry: "柠檬茶",
    intro: "以柠檬、植物插画和云南地域意象构建手打柠檬茶品牌，覆盖包装、菜单、平台与门店传播。",
    coverOrder: 2, heroOrder: 1,
    items: [
      item(source(W, "IMG_1609.JPG"), "real-photo", "品牌主视觉", "真实近景完整呈现核心标签、插画与产品名称。"),
      item(source(W, "产品海报1.jpg"), "mockup", "开业产品海报", "人物手持场景兼具产品信息与小尺寸辨识度。"),
      item(source(W, "海报2.jpg"), "mockup", "主打产品海报", "户外灯箱场景强化核心产品的传播尺度。"),
      item(source(W, "5个杯贴.jpg"), "artwork", "杯贴系列", "五款杯贴体现同一品牌系统中的产品变体。"),
      item(source(W, "提案_画板 1.jpg"), "artwork", "视觉元素系统", "插画、徽章与文字组合清楚说明品牌资产。"),
      item(source(W, "提案_画板 1 副本.jpg"), "artwork", "应用版式系统", "集中展示线上横幅、标志和辅助图形。"),
      composite(["菜单展示1.jpg", "菜单展示2.jpg", "菜单展示3.jpg"].map((name) => source(W, name)), "菜单系统", "三页菜单属于一个连续应用，组合后保留阅读节奏并避免重复占页。", { columns: 2, cellWidth: 1200, cellHeight: 900 }),
      composite(["大众点评.jpg", "美团.jpg", "开业邀请函.jpg"].map((name) => source(W, name)), "线上门店与开业触点", "平台与邀请函共享同一识别系统，作为一个线上传播单元呈现。", { columns: 3, cellWidth: 900, cellHeight: 700 }),
      item(source(W, "打包贴纸.jpg"), "mockup", "外带包装", "牛皮纸袋与封贴补全包装触点。"),
      item(source(W, "招聘海报.jpg"), "real-photo", "门店招聘物料", "真实门店环境为案例提供落地收束。"),
    ],
  },
  {
    key: "mustache-cocoa-winter", case: "大胡子可可 · 冬季热饮新品系列", caseAction: "create", existingCaseId: null,
    id: "N024", categories: ["drinks", "ip"], primaryIndustry: "冬季热饮",
    intro: "以大胡子人物肖像和高饱和色彩连续发布冬季热饮，并在茶香、香蕉与棉花糖风味中扩展产品叙事。",
    coverOrder: 10, heroOrder: 1,
    chapters: [
      { title: "热可可启航", description: "以明黄色航海语汇发布首轮六款热饮，并建立统一产品肖像。" },
      { title: "可可航海系列", description: "以复古地图与探险家肖像扩展第二轮热饮风味。" },
      { title: "茶香与香蕉延展", description: "在既有冬季体系中加入茶香可可与香蕉棉花糖新品。" },
    ],
    items: [
      item(source(CW14, "241014-大胡子可可-热饮6款-改1_海报-1.jpg"), "artwork", "首轮产品海报", "六款热可可与品牌肖像形成明确发布开场。", { chapter: 0 }),
      item(source(CW14, "241016-大胡子可可-热饮6款-预告海报.jpg"), "artwork", "新品预告", "航海帽肖像与地图背景建立首轮叙事。", { chapter: 0 }),
      item(local("rendered/mustache-cocoa-winter/ai/01-241014-大胡子可可-热饮6款-改1-13.jpg"), "artwork", "六款产品总览", "纵向画板完整呈现首轮产品阵容。", { chapter: 0 }),
      composite([7, 8, 9, 10, 11, 12].map((n) => local(`rendered/mustache-cocoa-winter/ai/01-241014-大胡子可可-热饮6款-改1-${String(n).padStart(2, "0")}.jpg`)), "首轮产品肖像", "六款产品使用一致肖像结构，合并为完整 SKU 系列。", { chapter: 0, columns: 3, cellWidth: 900, cellHeight: 900 }),
      composite([1, 2, 3, 4, 5].map((n) => source(CW14, `241014-大胡子可可-热饮6款-改1_大众点评头图-${n}.jpg`)), "首轮平台头图", "五张连续平台头图属于同一传播单元。", { chapter: 0, columns: 3, cellWidth: 900, cellHeight: 700 }),
      item(source(CW24, "241024-大胡子可可-热饮2款_预告海报.jpg"), "artwork", "第二轮预告", "复古航海肖像明确区分第二次发布。", { chapter: 1 }),
      item(source(CW24, "241024-大胡子可可-热饮2款_产品海报.jpg"), "artwork", "第二轮产品海报", "两款产品在同一复古地图体系中集中发布。", { chapter: 1 }),
      item(local("rendered/mustache-cocoa-winter/ai/02-241024-大胡子可可-热饮2款-1.jpg"), "artwork", "第二轮产品一", "保留单品肖像以说明杯身与风味变化。", { chapter: 1 }),
      item(local("rendered/mustache-cocoa-winter/ai/02-241024-大胡子可可-热饮2款-2.jpg"), "artwork", "第二轮产品二", "与前一画面组成连续双品展示。", { chapter: 1 }),
      ...[4, 1, 2, 3, 5, 6].map((number, index) => item(local(`cropped/mustache-cocoa-winter/241105/crop-${String(number).padStart(2, "0")}.jpg`), index === 0 ? "artwork" : "artwork", ["阶段主视觉", "棉花糖可可", "桂花乌龙可可", "玫瑰红茶可可", "茶香双品海报", "香蕉棉花糖可可海报"][index], "来自 241105 合并大图中明确画板边界的独立成品。", { chapter: 2 })),
    ],
  },
  {
    key: "mustache-cocoa-tatan", case: "大胡子可可 × TATAN · 联名系列", caseAction: "create", existingCaseId: null,
    id: "N025", categories: ["drinks", "ip"], primaryIndustry: "茶饮联名",
    intro: "以 TATAN 人物肖像转化为节日角色，在圣诞深绿与新年莓红两套视觉中连接产品、活动与平台传播。",
    coverOrder: 1, heroOrder: 3,
    chapters: [
      { title: "小胖当家 · 圣诞来袭", description: "以圣诞帽、深绿菱格与联名杯装建立第一波节日视觉。" },
      { title: "冬日约定 · 莓好圣诞", description: "以草莓角色和暖红色系延展新年阶段的联名传播。" },
    ],
    items: [
      item(local("rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-01.jpg"), "artwork", "圣诞角色主视觉", "人物肖像与圣诞角色化处理形成联名核心记忆。", { chapter: 0 }),
      item(local("rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-02.jpg"), "artwork", "圣诞标题画面", "标题画面清楚建立第一波节日叙事。", { chapter: 0 }),
      item(local("rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-08.jpg"), "artwork", "联名产品横幅", "三款产品与联名角色同框，适合作为详情页 Hero。", { chapter: 0 }),
      composite([4, 5, 6].map((n) => local(`rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-${String(n).padStart(2, "0")}.jpg`)), "圣诞联名产品", "三款杯装在同一视觉模板中，组合为一个产品系统展示。", { chapter: 0, columns: 3, cellWidth: 900, cellHeight: 900 }),
      item(local("rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-13.jpg"), "artwork", "圣诞角色与产品", "角色和单品同框形成更亲近的传播画面。", { chapter: 0 }),
      item(local("rendered/mustache-cocoa-tatan/ai/01-241201-大胡子可可-tatan联名-圣诞-线上-28.jpg"), "artwork", "圣诞竖版海报", "竖版海报整合人物、产品与活动标题。", { chapter: 0 }),
      item(local("rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-01.jpg"), "artwork", "新年角色主视觉", "草莓角色造型开启第二阶段。", { chapter: 1 }),
      item(local("rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-02.jpg"), "artwork", "新年标题画面", "暖红色与标题建立新年阶段的独立语气。", { chapter: 1 }),
      item(local("rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-08.jpg"), "artwork", "新年传播横幅", "角色与标题在横向平台触点中保持一致。", { chapter: 1 }),
      composite([5, 6].map((n) => local(`rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-${String(n).padStart(2, "0")}.jpg`)), "新年联名产品", "两款新品属于同一阶段的产品组合。", { chapter: 1, columns: 2, cellWidth: 1200, cellHeight: 1000 }),
      item(local("rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-13.jpg"), "artwork", "新年角色与产品", "角色、草莓与杯装共同说明新年口味延展。", { chapter: 1 }),
      item(local("rendered/mustache-cocoa-tatan/ai/04-241201-大胡子可可-tatan联名-新年-线上-28.jpg"), "artwork", "新年竖版海报", "完整竖版物料收束第二阶段。", { chapter: 1 }),
    ],
  },
];

const hash = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
const safe = (value) => value.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 62);

async function normalizedBuffer(file, width, height) {
  return sharp(file, { limitInputPixels: false }).rotate().flatten({ background: "#f7f5ef" }).resize(width, height, { fit: "contain", withoutEnlargement: true, background: "#f7f5ef" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
}

async function buildComposite(entry, output) {
  const columns = entry.columns || 2;
  const cellWidth = entry.cellWidth || 1100;
  const cellHeight = entry.cellHeight || 1000;
  const rows = Math.ceil(entry.sources.length / columns);
  const gap = 24;
  const buffers = [];
  for (const file of entry.sources) buffers.push(await normalizedBuffer(file, cellWidth, cellHeight));
  const width = columns * cellWidth + (columns - 1) * gap;
  const height = rows * cellHeight + (rows - 1) * gap;
  await sharp({ create: { width, height, channels: 3, background: "#f7f5ef" } })
    .composite(buffers.map((input, index) => ({ input, left: (index % columns) * (cellWidth + gap), top: Math.floor(index / columns) * (cellHeight + gap) })))
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(output);
}

async function buildDirect(entry, output) {
  let pipeline = sharp(entry.sources[0], { limitInputPixels: false }).rotate();
  if (entry.cropViewerChrome) {
    const meta = await pipeline.metadata();
    const top = Math.min(74, Math.max(0, (meta.height || 0) - 1));
    pipeline = pipeline.extract({ left: 6, top, width: (meta.width || 12) - 12, height: (meta.height || top + 8) - top - 6 });
  }
  await pipeline.flatten({ background: "#fff" }).resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(output);
}

const finalItems = [];
for (const caseInfo of cases) {
  const finalDir = local("final-assets", caseInfo.key);
  const compositeDir = local("composites", caseInfo.key);
  await fs.mkdir(finalDir, { recursive: true });
  await fs.mkdir(compositeDir, { recursive: true });
  for (const [index, entry] of caseInfo.items.entries()) {
    const order = index + 1;
    const filename = `${String(order).padStart(2, "0")}-${safe(entry.editorialRole)}.jpg`;
    const output = path.join(entry.kind === "composite" ? compositeDir : finalDir, filename);
    if (entry.kind === "composite") await buildComposite(entry, output);
    else await buildDirect(entry, output);
    const metadata = await sharp(output).metadata();
    finalItems.push({
      case: caseInfo.case,
      caseKey: caseInfo.key,
      caseAction: caseInfo.caseAction,
      existingCaseId: caseInfo.existingCaseId,
      chapter: Number.isInteger(entry.chapter) ? caseInfo.chapters[entry.chapter].title : null,
      chapterDescription: Number.isInteger(entry.chapter) ? caseInfo.chapters[entry.chapter].description : null,
      order,
      type: entry.type,
      finalAsset: path.relative(root, output),
      sources: entry.sources,
      editorialRole: entry.editorialRole,
      decisionReason: entry.decisionReason,
      width: metadata.width,
      height: metadata.height,
      sha256: await hash(output),
      productionMethod: entry.kind === "composite" ? "deterministic editorial composite; no generated pixels" : entry.cropViewerChrome ? "source-preserving crop of Preview chrome and deterministic JPEG export" : "source-preserving deterministic JPEG export",
    });
  }
}

const skipped = [
  "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-圣诞-印刷.ai",
  "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-圣诞-印刷后加.ai",
  "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-新年-印刷.ai",
  "/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名/241201-大胡子可可-tatan联名-新年-印刷后加.ai",
].map((sourceFile) => ({ source: sourceFile, reason: "含生产尺寸、刀线或印刷版面；线上画板已有等价干净视觉，因此不将生产画板用于作品集。" }));

const summary = cases.map((caseInfo) => ({
  case: caseInfo.case,
  siteName: caseInfo.siteName || caseInfo.case,
  caseKey: caseInfo.key,
  caseAction: caseInfo.caseAction,
  existingCaseId: caseInfo.existingCaseId,
  id: caseInfo.id,
  categories: caseInfo.categories,
  primaryIndustry: caseInfo.primaryIndustry,
  intro: caseInfo.intro,
  coverOrder: caseInfo.coverOrder,
  heroOrder: caseInfo.heroOrder,
  chapterCount: caseInfo.chapters?.length || 0,
  chapters: caseInfo.chapters || [],
  finalImageCount: finalItems.filter((entry) => entry.caseKey === caseInfo.key).length,
}));

const finalManifest = {
  version: "portfolio-additions-sol-v1",
  generatedAt: new Date().toISOString(),
  sourceCandidateCount: 334,
  sourceFileCount: 177,
  psdPsbRenderSuccess: 22,
  aiPdfRenderSuccess: 12,
  skippedForFontsRenderOrProductionMarks: skipped.length,
  cropCount: 6,
  compositeCount: finalItems.filter((entry) => entry.type === "composite").length,
  finalDisplayImageCount: finalItems.length,
  photoshopVerification: {
    application: "Adobe Photoshop",
    version: "27.2.0",
    exported: 22,
    failed: 0,
    sourceFilesOverwritten: 0,
  },
  cases: summary,
  items: finalItems,
  skipped,
};
await fs.writeFile(local("final-manifest.json"), `${JSON.stringify(finalManifest, null, 2)}\n`);
for (const caseInfo of summary) {
  await fs.writeFile(local("cases", `${caseInfo.caseKey}.json`), `${JSON.stringify({ ...caseInfo, items: finalItems.filter((entry) => entry.caseKey === caseInfo.caseKey) }, null, 2)}\n`);
}

let decisions = "# Portfolio Additions · Editorial Decisions\n\n";
decisions += "所有候选均经 contact sheet 视觉复核；未使用生成式图像、内容感知补全或扩图。\n\n";
for (const caseInfo of summary) {
  decisions += `## ${caseInfo.case}\n\n- Action：${caseInfo.caseAction}${caseInfo.existingCaseId ? `（${caseInfo.existingCaseId} 原位更新）` : ""}\n- 最终展示：${caseInfo.finalImageCount}\n- Chapter：${caseInfo.chapterCount ? caseInfo.chapters.map((chapter, index) => `${String(index + 1).padStart(2, "0")} ${chapter.title}`).join("；") : "保持 Flat"}\n- Cover：${caseInfo.coverOrder}\n- Hero：${caseInfo.heroOrder}\n\n`;
}
decisions += "## 排除\n\n" + skipped.map((entry) => `- \`${entry.source}\` — ${entry.reason}`).join("\n") + "\n";
await fs.writeFile(local("editorial-decisions.md"), decisions);

console.log(JSON.stringify({ cases: summary.length, finalImages: finalItems.length, composites: finalManifest.compositeCount, chapters: summary.reduce((sum, item) => sum + item.chapterCount, 0), skipped: skipped.length }, null, 2));
