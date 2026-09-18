import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ContentData } from "./types";

const defaultContentFile = path.join(process.cwd(), "data", "content.json");
const contentFile = () => process.env.CONTENT_FILE_PATH || defaultContentFile;

export async function readContent(): Promise<ContentData> {
  const raw = process.env.CONTENT_FILE_PATH
    ? await fs.readFile(/* turbopackIgnore: true */ process.env.CONTENT_FILE_PATH, "utf8")
    : await fs.readFile(defaultContentFile, "utf8");
  const data = JSON.parse(raw) as ContentData;
  return { ...data, photographyCaseOrder: data.photographyCaseOrder ?? [] };
}

export async function writeContent(data: ContentData) {
  const destination = contentFile();
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(temporary, destination);
}
