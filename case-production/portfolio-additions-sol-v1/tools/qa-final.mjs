import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repo = process.cwd();
const root = path.join(repo, "case-production/portfolio-additions-sol-v1");
const manifest = JSON.parse(await fs.readFile(path.join(root, "final-manifest.json"), "utf8"));
const qaDir = path.join(root, "review/final-contact-sheets");
await fs.mkdir(qaDir, { recursive: true });

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const errors = [];
const perPage = 20;
for (let page = 0; page < Math.ceil(manifest.items.length / perPage); page += 1) {
  const chunk = manifest.items.slice(page * perPage, (page + 1) * perPage);
  const tiles = [];
  for (const item of chunk) {
    const file = path.join(root, item.finalAsset);
    const stat = await fs.stat(file).catch(() => null);
    if (!stat?.size) { errors.push(`missing: ${item.finalAsset}`); continue; }
    const metadata = await sharp(file).metadata();
    if (!metadata.width || !metadata.height) errors.push(`invalid dimensions: ${item.finalAsset}`);
    if (metadata.width !== item.width || metadata.height !== item.height) errors.push(`manifest dimensions differ: ${item.finalAsset}`);
    const image = await sharp(file).flatten({ background: "#f7f5ef" }).resize(360, 270, { fit: "contain", background: "#f7f5ef" }).jpeg({ quality: 82 }).toBuffer();
    const label = escape(`${item.caseKey} · ${String(item.order).padStart(2, "0")} · ${item.editorialRole}`.slice(0, 52));
    const chapter = escape(item.chapter || "FLAT");
    const svg = Buffer.from(`<svg width="360" height="62"><rect width="360" height="62" fill="#fff"/><text x="9" y="23" font-family="Arial, PingFang SC, sans-serif" font-size="12" fill="#111">${label}</text><text x="9" y="45" font-family="Arial, PingFang SC, sans-serif" font-size="10" fill="#777">${chapter} · ${item.type}</text></svg>`);
    tiles.push(await sharp({ create: { width: 360, height: 332, channels: 3, background: "#f7f5ef" } }).composite([{ input: image, top: 0, left: 0 }, { input: svg, top: 270, left: 0 }]).jpeg({ quality: 86 }).toBuffer());
  }
  const columns = 4;
  await sharp({ create: { width: columns * 360, height: Math.ceil(tiles.length / columns) * 332, channels: 3, background: "#ddd" } })
    .composite(tiles.map((input, index) => ({ input, left: (index % columns) * 360, top: Math.floor(index / columns) * 332 })))
    .jpeg({ quality: 88 })
    .toFile(path.join(qaDir, `final-${String(page + 1).padStart(2, "0")}.jpg`));
}

const expected = ["inventory/summary.md", "render-manifest.json", "final-manifest.json", "editorial-decisions.md", "review/index.html"];
for (const relative of expected) if (!await fs.stat(path.join(root, relative)).catch(() => null)) errors.push(`missing artifact: ${relative}`);
console.log(JSON.stringify({ cases: manifest.cases.length, images: manifest.items.length, contactSheets: Math.ceil(manifest.items.length / perPage), errors }, null, 2));
if (errors.length) process.exitCode = 1;
