import type { ContentData, PortfolioCase, ShowcaseVersion } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

export function parseCase(value: unknown, existing?: PortfolioCase): PortfolioCase {
  if (!value || typeof value !== "object") throw new Error("案例数据无效");
  const input = value as Record<string, unknown>;
  const name = String(input.name || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  if (!name) throw new Error("请输入案例名称");
  if (!slugPattern.test(slug)) throw new Error("Slug 仅支持小写字母、数字与连字符");
  const bodyAssets = Array.isArray(input.bodyAssets) ? input.bodyAssets.filter((item) => item && typeof item === "object").map((item, index) => {
    const media = item as Record<string, unknown>;
    return { id: String(media.id || `${Date.now()}-${index}`), type: media.type === "video" ? "video" as const : "image" as const, src: String(media.src || ""), layout: media.layout === "half" ? "half" as const : "full" as const };
  }).filter((item) => item.src) : [];
  return {
    id: existing?.id || String(input.id || `C${Date.now()}`), slug, name,
    intro: String(input.intro || "").trim(), industryPrimary: String(input.industryPrimary || "").trim(),
    industryTags: strings(input.industryTags), designPrimary: String(input.designPrimary || "").trim(),
    designTags: strings(input.designTags), cover: String(input.cover || ""), hero: String(input.hero || ""),
    bodyAssets, published: Boolean(input.published),
  };
}

export function assertUniqueSlug(data: ContentData, item: PortfolioCase) {
  if (data.cases.some((entry) => entry.slug === item.slug && entry.id !== item.id)) throw new Error("Slug 已被其他案例使用");
}

export function parseVersion(value: unknown, existing: ShowcaseVersion): ShowcaseVersion {
  const input = value as Record<string, unknown>;
  const slug = String(input.slug || "").trim().toLowerCase();
  if (!slugPattern.test(slug)) throw new Error("版本 Slug 格式无效");
  return { slug, name: String(input.name || existing.name).trim(), enabled: Boolean(input.enabled), priorityCaseIds: [...new Set(strings(input.priorityCaseIds))] };
}
