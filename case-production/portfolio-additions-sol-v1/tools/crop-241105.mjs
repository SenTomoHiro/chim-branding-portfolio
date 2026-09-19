import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const repo = process.cwd();
const source = "/Users/chim/Downloads/大胡子可可/241105-大胡子可可-新品3个-改1.jpg";
const outputDir = path.join(repo, "case-production/portfolio-additions-sol-v1/cropped/mustache-cocoa-winter/241105");
await fs.mkdir(outputDir, { recursive: true });

// Boundaries are the six colored artboards separated by fully white gutters in the 5042×4384 source.
const crops = [
  { file: "crop-01.jpg", label: "棉花糖可可产品图", left: 193, top: 245, width: 1201, height: 901 },
  { file: "crop-02.jpg", label: "桂花乌龙可可产品图", left: 1413, top: 245, width: 1201, height: 901 },
  { file: "crop-03.jpg", label: "玫瑰红茶可可产品图", left: 2633, top: 245, width: 1201, height: 901 },
  { file: "crop-04.jpg", label: "茶香热可可系列主视觉", left: 3853, top: 146, width: 1001, height: 1000 },
  { file: "crop-05.jpg", label: "桂花乌龙与玫瑰红茶系列海报", left: 193, top: 1165, width: 2000, height: 3001 },
  { file: "crop-06.jpg", label: "香蕉棉花糖可可海报", left: 2213, top: 1165, width: 2000, height: 3001 },
];

const hash = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
const manifest = [];
for (const crop of crops) {
  const output = path.join(outputDir, crop.file);
  await sharp(source, { limitInputPixels: false })
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toFile(output);
  manifest.push({
    source,
    sourceDimensions: { width: 5042, height: 4384 },
    crop: { left: crop.left, top: crop.top, width: crop.width, height: crop.height },
    output: path.relative(repo, output),
    outputDimensions: { width: crop.width, height: crop.height },
    label: crop.label,
    method: "deterministic crop at fully white artboard gutters; no generative fill or content-aware editing",
    sha256: await hash(output),
  });
}

await fs.writeFile(path.join(outputDir, "crop-manifest.json"), `${JSON.stringify({ source, cropCount: manifest.length, crops: manifest }, null, 2)}\n`);
console.log(JSON.stringify({ cropCount: manifest.length, outputDir }, null, 2));
