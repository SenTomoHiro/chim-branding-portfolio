import type { ContentData } from "../../lib/types";

const officialOrigin = (process.env.NEXT_PUBLIC_CONTENT_ORIGIN || "https://raw.githubusercontent.com/SenTomoHiro/chim-branding-portfolio/main").replace(/\/$/, "");

export async function fetchOfficialContent(): Promise<ContentData> {
  return fetchOfficialJson<ContentData>("data/content.json");
}

export async function fetchOfficialJson<T>(path: string): Promise<T> {
  const response = await fetch(`${officialOrigin}/${path.replace(/^\//, "")}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`无法读取 GitHub 正式内容（HTTP ${response.status}）`);
  return response.json() as Promise<T>;
}
