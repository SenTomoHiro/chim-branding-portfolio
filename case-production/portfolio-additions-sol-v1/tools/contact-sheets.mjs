import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repo = process.cwd();
const productionRoot = path.join(repo, "case-production/portfolio-additions-sol-v1");
const manifest = JSON.parse(await fs.readFile(path.join(productionRoot, "render-manifest.json"), "utf8"));
const contactRoot = path.join(productionRoot, "review/contact-sheets");
await fs.mkdir(contactRoot, { recursive: true });

const xml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const records = [];

async function tile(item) {
  const image = await sharp(item.source, { limitInputPixels: false, page: 0 })
    .rotate()
    .flatten({ background: "#f6f6f6" })
    .resize(340, 250, { fit: "inside", withoutEnlargement: true, background: "#f6f6f6" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const label = xml(`${item.index} · ${item.label}`.slice(0, 52));
  const kind = xml(item.kind);
  const labelSvg = Buffer.from(`<svg width="360" height="62"><rect width="360" height="62" fill="#fff"/><text x="10" y="23" font-family="Arial, PingFang SC, sans-serif" font-size="12" fill="#111">${label}</text><text x="10" y="45" font-family="Arial, PingFang SC, sans-serif" font-size="10" fill="#777">${kind}</text></svg>`);
  return sharp({ create: { width: 360, height: 322, channels: 3, background: "#f6f6f6" } })
    .composite([{ input: image, gravity: "north" }, { input: labelSvg, top: 260, left: 0 }])
    .jpeg({ quality: 86 })
    .toBuffer();
}

for (const caseInfo of manifest.cases) {
  const originals = caseInfo.files
    .filter((item) => ["jpg", "jpeg", "png"].includes(item.extension))
    .map((item) => ({ source: item.source, kind: `original · ${item.classification}`, origin: item.source }));
  const rendered = manifest.renders
    .filter((item) => item.caseKey === caseInfo.key && item.ok)
    .flatMap((item) => item.outputs.map((output, page) => ({
      source: path.join(repo, output),
      kind: `${item.sourceType.toUpperCase()} render · page ${page + 1}`,
      origin: item.source,
    })));
  const items = [...originals, ...rendered].map((item, index) => ({
    ...item,
    index: String(index + 1).padStart(3, "0"),
    label: path.basename(item.source),
  }));
  const perPage = 24;
  for (let page = 0; page < Math.ceil(items.length / perPage); page += 1) {
    const chunk = items.slice(page * perPage, (page + 1) * perPage);
    const tiles = [];
    for (const item of chunk) tiles.push(await tile(item));
    const columns = 4;
    const output = path.join(contactRoot, `${caseInfo.key}-${String(page + 1).padStart(2, "0")}.jpg`);
    await sharp({ create: { width: columns * 360, height: Math.ceil(tiles.length / columns) * 322, channels: 3, background: "#ddd" } })
      .composite(tiles.map((input, index) => ({ input, left: (index % columns) * 360, top: Math.floor(index / columns) * 322 })))
      .jpeg({ quality: 88 })
      .toFile(output);
    records.push({ case: caseInfo.name, caseKey: caseInfo.key, page: page + 1, contactSheet: path.relative(repo, output), items: chunk });
  }
}

await fs.writeFile(path.join(productionRoot, "inventory/contact-sheet-index.json"), `${JSON.stringify(records, null, 2)}\n`);
console.log(JSON.stringify({ sheets: records.length, visualCandidates: records.reduce((sum, item) => sum + item.items.length, 0) }, null, 2));
