import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function saveUploadedMedia(file: File) {
  if (file.size < 1 || file.size > MAX_BYTES) throw new Error("文件大小必须在 25MB 以内");
  const root = process.env.MEDIA_ROOT || path.join(process.cwd(), "public/media/uploads");
  await fs.mkdir(root, { recursive: true });
  const stem = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (IMAGE_TYPES.has(file.type)) {
    const destination = path.join(root, `${stem}.webp`);
    const info = await sharp(buffer, { failOn: "error", animated: false }).rotate().resize({ width: 2200, height: 2600, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 95 }).toFile(destination);
    return { type: "image" as const, src: `/media/uploads/${path.basename(destination)}`, width: info.width, height: info.height };
  }
  if (VIDEO_TYPES.has(file.type)) {
    const ext = file.type === "video/webm" ? "webm" : "mp4";
    const destination = path.join(root, `${stem}.${ext}`);
    await fs.writeFile(destination, buffer);
    return { type: "video" as const, src: `/media/uploads/${path.basename(destination)}` };
  }
  throw new Error("仅支持 JPG、PNG、WebP、GIF、MP4 或 WebM");
}
