import type { BodyAsset } from "./types";

export type ChapterGroup = {
  id: string;
  section?: NonNullable<BodyAsset["section"]>;
  assets: BodyAsset[];
};

export const UNSECTIONED_GROUP = "unsectioned";

export function groupBodyAssets(assets: BodyAsset[]): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  let current: ChapterGroup = { id: UNSECTIONED_GROUP, assets: [] };
  for (const asset of assets) {
    if (asset.section) {
      if (current.assets.length) groups.push(current);
      current = { id: asset.id, section: asset.section, assets: [asset] };
    } else {
      current.assets.push(asset);
    }
  }
  if (current.assets.length) groups.push(current);
  return groups;
}

function sectionPrefix(assets: BodyAsset[]) {
  return assets.find((asset) => asset.section)?.section?.eyebrow.trim().toUpperCase().startsWith("VI") ? "VI" : "CHAPTER";
}

export function renumberChapters(assets: BodyAsset[]): BodyAsset[] {
  const prefix = sectionPrefix(assets);
  let number = 0;
  return assets.map((asset) => {
    if (!asset.section) return asset;
    number += 1;
    return { ...asset, section: { ...asset.section, eyebrow: `${prefix} ${String(number).padStart(2, "0")}` } };
  });
}

export function addChapter(assets: BodyAsset[], assetId: string, title: string, description?: string) {
  const next = assets.map((asset) => asset.id === assetId
    ? { ...asset, section: { eyebrow: "CHAPTER 00", title: title.trim(), description: description?.trim() || undefined } }
    : asset);
  return renumberChapters(next);
}

export function updateChapter(assets: BodyAsset[], chapterId: string, patch: { title?: string; description?: string }) {
  return assets.map((asset) => asset.id === chapterId && asset.section ? {
    ...asset,
    section: {
      ...asset.section,
      title: patch.title === undefined ? asset.section.title : patch.title,
      description: patch.description === undefined ? asset.section.description : patch.description || undefined,
    },
  } : asset);
}

export function removeChapter(assets: BodyAsset[], chapterId: string) {
  return renumberChapters(assets.map((asset) => asset.id === chapterId ? { ...asset, section: undefined } : asset));
}

export function moveChapter(assets: BodyAsset[], chapterId: string, direction: -1 | 1) {
  const groups = groupBodyAssets(assets);
  const chapters = groups.filter((group) => group.section);
  const from = chapters.findIndex((group) => group.id === chapterId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= chapters.length) return assets;
  [chapters[from], chapters[to]] = [chapters[to], chapters[from]];
  const unsectioned = groups.find((group) => !group.section)?.assets || [];
  return renumberChapters([...unsectioned, ...chapters.flatMap((group) => group.assets)]);
}

function moveWithin<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function flattenGroups(groups: ChapterGroup[]) {
  return renumberChapters(groups.flatMap((group) => {
    if (!group.section || !group.assets.length) return group.assets.map((asset) => ({ ...asset, section: undefined }));
    return group.assets.map((asset, index) => ({ ...asset, section: index === 0 ? group.section : undefined }));
  }));
}

export function moveAssetWithinGroup(assets: BodyAsset[], assetId: string, direction: -1 | 1) {
  const groups = groupBodyAssets(assets);
  const group = groups.find((entry) => entry.assets.some((asset) => asset.id === assetId));
  if (!group) return assets;
  const from = group.assets.findIndex((asset) => asset.id === assetId);
  const to = from + direction;
  if (to < 0 || to >= group.assets.length) return assets;
  group.assets = moveWithin(group.assets, from, to);
  return flattenGroups(groups);
}

export function moveAssetWithinGroupTo(assets: BodyAsset[], assetId: string, targetAssetId: string) {
  const groups = groupBodyAssets(assets);
  const group = groups.find((entry) => entry.assets.some((asset) => asset.id === assetId));
  if (!group || !group.assets.some((asset) => asset.id === targetAssetId)) return assets;
  const from = group.assets.findIndex((asset) => asset.id === assetId);
  const to = group.assets.findIndex((asset) => asset.id === targetAssetId);
  if (from === to) return assets;
  group.assets = moveWithin(group.assets, from, to);
  return flattenGroups(groups);
}

export function moveAssetToGroup(assets: BodyAsset[], assetId: string, targetGroupId: string) {
  const groups = groupBodyAssets(assets);
  const source = groups.find((group) => group.assets.some((asset) => asset.id === assetId));
  let target = groups.find((group) => group.id === targetGroupId);
  if (!target && targetGroupId === UNSECTIONED_GROUP) {
    target = { id: UNSECTIONED_GROUP, assets: [] };
    groups.unshift(target);
  }
  if (!source || !target || source === target) return assets;
  const index = source.assets.findIndex((asset) => asset.id === assetId);
  const [moved] = source.assets.splice(index, 1);
  target.assets.push({ ...moved, section: undefined });
  return flattenGroups(groups.filter((group) => group.assets.length));
}

export function insertAssetInGroup(assets: BodyAsset[], asset: BodyAsset, groupId: string) {
  const groups = groupBodyAssets(assets);
  const target = groups.find((group) => group.id === groupId);
  if (!target) return groupId === UNSECTIONED_GROUP ? [asset, ...assets] : [...assets, asset];
  target.assets.push(asset);
  return flattenGroups(groups);
}
