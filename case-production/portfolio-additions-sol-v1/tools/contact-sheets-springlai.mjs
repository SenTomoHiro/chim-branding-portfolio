import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("case-production/illustrator-clean-v1/pdf-artboards");
const outputRoot = path.resolve("case-production/illustrator-clean-v1/contact-sheets");
const groups = ["peach-standee", "osmanthus-standee", "osmanthus-cupsleeve"];
const cellWidth = 360;
const cellHeight = 420;
const columns = 4;

await mkdir(outputRoot, { recursive: true });

for (const group of groups) {
  const directory = path.join(root, group);
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".jpg"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;

  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (const [index, file] of files.entries()) {
    const image = await sharp(path.join(directory, file))
      .resize(cellWidth - 24, cellHeight - 52, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 86 })
      .toBuffer();
    const metadata = await sharp(image).metadata();
    composites.push({
      input: image,
      left: index % columns * cellWidth + Math.floor((cellWidth - (metadata.width ?? 0)) / 2),
      top: Math.floor(index / columns) * cellHeight + 34,
    });
    composites.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="30"><text x="12" y="22" font-family="Arial" font-size="18" fill="#111">${file}</text></svg>`),
      left: index % columns * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
    });
  }

  await sharp({
    create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: "#ececec" },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(outputRoot, `${group}.jpg`));
}
