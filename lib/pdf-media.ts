import "server-only";
import path from "node:path";
import sharp from "sharp";

export type PdfMediaInfo = {
  id: string;
  src: string;
  width: number;
  height: number;
  ratio: number;
};

const metadataCache = new Map<string, Promise<{ width: number; height: number }>>();

async function dimensions(source: string) {
  if (!source.startsWith("/") || source.startsWith("//")) throw new Error(`PDF 只支持项目内正式图片：${source}`);
  const relative = decodeURIComponent(source.split("?")[0]).replace(/^\/+/, "");
  const publicRoot = path.join(process.cwd(), "public");
  const filename = path.resolve(publicRoot, relative);
  if (!filename.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`PDF 图片路径越界：${source}`);
  if (!metadataCache.has(filename)) metadataCache.set(filename, sharp(filename).metadata().then((info) => {
    if (!info.width || !info.height) throw new Error(`无法读取 PDF 图片尺寸：${source}`);
    return { width: info.width, height: info.height };
  }));
  return metadataCache.get(filename)!;
}

export async function getPdfMediaInfo(id: string, src: string): Promise<PdfMediaInfo> {
  const { width, height } = await dimensions(src);
  return { id, src, width, height, ratio: width / height };
}
