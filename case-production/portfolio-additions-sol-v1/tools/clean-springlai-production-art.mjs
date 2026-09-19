import path from "node:path";
import sharp from "sharp";

const root = path.resolve(".");
const outputRoot = path.join(root, "public/media/springlai/peach-osmanthus");
const sourceRoot = path.join(root, "case-production/illustrator-clean-v1/highres");
for (const [source, output] of [
  ["peach-poster-clean.jpg", "05.jpg"],
  ["osmanthus-poster-clean.jpg", "11.jpg"],
]) {
  await sharp(path.join(sourceRoot, source))
    .resize({ width: 1800, height: 3200, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(path.join(outputRoot, output));
}

const tiles = await Promise.all(
  ["osmanthus-banner-a.jpg", "osmanthus-banner-b.jpg"].map((source) =>
    sharp(path.join(sourceRoot, source))
      .resize(920, 614, { fit: "cover", position: "centre" })
      .jpeg({ quality: 93, mozjpeg: true })
      .toBuffer(),
  ),
);

await sharp({
  create: { width: 1920, height: 694, channels: 3, background: "#f5f2ec" },
})
  .composite([
    { input: tiles[0], left: 30, top: 40 },
    { input: tiles[1], left: 970, top: 40 },
  ])
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(path.join(outputRoot, "12.jpg"));
