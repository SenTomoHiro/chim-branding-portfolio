import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pdfFilename, pdfSourceHash, type PdfCacheManifest, type PdfTarget } from "../lib/pdf-cache";
import type { ContentData } from "../lib/types";

function argument(name: string, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const target = argument("target") as PdfTarget;
if (!/^(?:design|photography|category:(?:food|drinks|ip|other)|case:[A-Za-z0-9_-]+)$/.test(target)) throw new Error(`PDF target 无效：${target}`);
const contentFile = path.resolve(argument("content", "data/content.json"));
const cacheFile = path.resolve(argument("cache", "data/pdf-cache.json"));
const content = JSON.parse(await readFile(contentFile, "utf8")) as ContentData;
const manifest = JSON.parse(await readFile(cacheFile, "utf8")) as PdfCacheManifest;
manifest.version = 1;
manifest.targets[target] = { sourceHash: pdfSourceHash(content, target), filename: pdfFilename(target), generatedAt: new Date().toISOString() };
await writeFile(cacheFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${target} ${manifest.targets[target].sourceHash}\n`);
