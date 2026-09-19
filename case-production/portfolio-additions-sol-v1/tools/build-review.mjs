import fs from "node:fs/promises";
import path from "node:path";

const repo = process.cwd();
const root = path.join(repo, "case-production/portfolio-additions-sol-v1");
const reviewDir = path.join(root, "review");
const manifest = JSON.parse(await fs.readFile(path.join(root, "final-manifest.json"), "utf8"));

const reviewManifest = manifest.items.map((item, index) => ({
  id: `${item.caseKey}-${String(item.order).padStart(2, "0")}`,
  index: index + 1,
  title: `${item.case} · ${String(item.order).padStart(2, "0")} · ${item.editorialRole}`,
  label: item.chapter ? `${item.chapter} · ${item.editorialRole}` : item.editorialRole,
  src: `../${item.finalAsset}`,
  href: `../${item.finalAsset}`,
  routeName: item.caseKey,
}));
await fs.writeFile(path.join(reviewDir, "manifest.json"), `${JSON.stringify(reviewManifest, null, 2)}\n`);
await fs.writeFile(path.join(reviewDir, "review-options.json"), `${JSON.stringify({ preset: "detail-review", title: "CHIM Portfolio Additions · Final Review", showCaptions: true, minTileWidth: 340, output: "review-board.html" }, null, 2)}\n`);

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sections = manifest.cases.map((caseInfo) => {
  const items = manifest.items.filter((item) => item.caseKey === caseInfo.caseKey);
  let lastChapter = null;
  const figures = items.map((item) => {
    const chapter = item.chapter && item.chapter !== lastChapter ? `<header class="chapter"><p>CHAPTER ${String(caseInfo.chapters.findIndex((entry) => entry.title === item.chapter) + 1).padStart(2, "0")}</p><h3>${escape(item.chapter)}</h3><span>${escape(item.chapterDescription || "")}</span></header>` : "";
    lastChapter = item.chapter;
    return `${chapter}<figure class="${item.type === "composite" ? "composite" : ""}"><img src="../${escape(item.finalAsset)}" alt="${escape(item.editorialRole)}"><figcaption><span>${String(item.order).padStart(2, "0")} · ${escape(item.editorialRole)}</span><em>${escape(item.type)}</em></figcaption></figure>`;
  }).join("");
  return `<section class="case" id="${caseInfo.caseKey}"><header class="case-head"><div><p>${escape(caseInfo.caseAction.toUpperCase())}</p><h2>${escape(caseInfo.case)}</h2></div><span>${escape(caseInfo.intro)}</span></header><div class="sequence">${figures}</div></section>`;
}).join("");

const nav = manifest.cases.map((item) => `<a href="#${item.caseKey}">${escape(item.case)}</a>`).join("");
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CHIM Portfolio Additions · Final Review</title><style>
:root{--paper:#f2f0ea;--ink:#151918;--muted:#66706c;--line:#d5d2c9;--accent:#174b34}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}nav{position:sticky;top:0;z-index:5;display:flex;gap:20px;overflow:auto;padding:16px 4vw;background:rgba(242,240,234,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}nav a{white-space:nowrap;color:inherit;text-decoration:none;font-size:12px}.intro{padding:10vh 5vw 8vh;border-bottom:1px solid var(--line)}.intro p,.case-head p,.chapter p{margin:0;color:var(--accent);font-size:11px;letter-spacing:.15em}.intro h1{max-width:1050px;margin:14px 0 0;font-family:Georgia,"Songti SC",serif;font-size:clamp(48px,8vw,112px);font-weight:500;line-height:.94}.case{padding:10vh 5vw;border-bottom:1px solid var(--line)}.case-head{display:grid;grid-template-columns:1fr 1.2fr;gap:7vw;align-items:end;margin-bottom:8vh}.case h2{margin:10px 0 0;font-family:Georgia,"Songti SC",serif;font-size:clamp(38px,5vw,78px);font-weight:500;line-height:1}.case-head>span{max-width:700px;color:var(--muted);line-height:1.8}.sequence{display:grid;gap:8vh}.sequence figure{margin:0}.sequence img{display:block;width:100%;max-height:92vh;object-fit:contain;background:#fff}.sequence figure.composite img{max-height:none}.sequence figcaption{display:flex;justify-content:space-between;gap:20px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.sequence em{font-style:normal;text-transform:uppercase;letter-spacing:.1em}.chapter{margin:7vh 0 -4vh;padding-top:6vh;border-top:1px solid var(--line)}.chapter h3{margin:10px 0 8px;font-family:Georgia,"Songti SC",serif;font-size:clamp(32px,4vw,62px);font-weight:500}.chapter span{color:var(--muted)}@media(max-width:720px){.case-head{grid-template-columns:1fr;gap:18px}.case,.intro{padding-left:5vw;padding-right:5vw}.sequence{gap:5vh}.chapter{margin-bottom:-2vh}}
</style></head><body><nav>${nav}</nav><header class="intro"><p>FINAL EDITORIAL REVIEW · 6 CASES · ${manifest.finalDisplayImageCount} IMAGES</p><h1>CHIM Portfolio<br>正式案例补全</h1></header>${sections}</body></html>`;
await fs.writeFile(path.join(reviewDir, "index.html"), html);
console.log(JSON.stringify({ cases: manifest.cases.length, items: reviewManifest.length, review: path.join(reviewDir, "index.html") }, null, 2));
