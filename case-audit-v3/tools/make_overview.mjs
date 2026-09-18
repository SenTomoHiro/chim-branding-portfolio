import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [sourceDirectory, outputFile, label = path.basename(sourceDirectory ?? "pages")] = process.argv.slice(2);
if (!sourceDirectory || !outputFile) {
  throw new Error("Usage: node make_overview.mjs <image-directory> <output.jpg> [label]");
}

const entries = (await fs.readdir(sourceDirectory))
  .filter((name) => /\.(?:png|jpe?g|webp)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const columns = 4;
const tileWidth = 360;
const tileHeight = 600;
const labelHeight = 30;
const gutter = 10;
const rows = Math.ceil(entries.length / columns);
const composites = [];

for (const [index, entry] of entries.entries()) {
  const thumbnail = await sharp(path.join(sourceDirectory, entry))
    .resize(tileWidth, tileHeight, { fit: "contain", background: "#e7e5df" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const caption = Buffer.from(
    `<svg width="${tileWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="21" fill="white" font-family="Arial" font-size="15">${label} · ${entry}</text></svg>`,
  );
  const left = (index % columns) * (tileWidth + gutter);
  const top = Math.floor(index / columns) * (tileHeight + labelHeight + gutter);
  composites.push({ input: thumbnail, left, top }, { input: caption, left, top: top + tileHeight });
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await sharp({
  create: {
    width: columns * tileWidth + (columns - 1) * gutter,
    height: rows * (tileHeight + labelHeight + gutter) - gutter,
    channels: 3,
    background: "#f4f3ef",
  },
}).composite(composites).jpeg({ quality: 88 }).toFile(outputFile);
console.log(`${entries.length} images -> ${outputFile}`);
