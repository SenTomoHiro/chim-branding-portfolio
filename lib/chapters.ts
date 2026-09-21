import type { CaseMedia } from "./types";
import { moveIdByOffset, moveIdOver } from "./reorder";

export type ChapterGroup = {
  id: string;
  section?: NonNullable<CaseMedia["section"]>;
  assets: CaseMedia[];
};

export const UNSECTIONED_GROUP = "unsectioned";

export function groupBodyAssets(assets: CaseMedia[]): ChapterGroup[] {
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

export function renumberChapters(assets: CaseMedia[]): CaseMedia[] {
  let number = 0;
  return assets.map((asset) => {
    if (!asset.section) return asset;
    number += 1;
    return { ...asset, section: { ...asset.section, eyebrow: `CHAPTER ${String(number).padStart(2, "0")}` } };
  });
}

export function addChapter(assets: CaseMedia[], assetId: string, title: string, description?: string) {
  const next = assets.map((asset) => asset.id === assetId
    ? { ...asset, section: { eyebrow: "CHAPTER 00", title: title.trim(), description: description?.trim() || undefined } }
    : asset);
  return renumberChapters(next);
}

export function updateChapter(assets: CaseMedia[], chapterId: string, patch: { title?: string; description?: string }) {
  return assets.map((asset) => asset.id === chapterId && asset.section ? {
    ...asset,
    section: {
      ...asset.section,
      title: patch.title === undefined ? asset.section.title : patch.title,
      description: patch.description === undefined ? asset.section.description : patch.description || undefined,
    },
  } : asset);
}

export function removeChapter(assets: CaseMedia[], chapterId: string) {
  return renumberChapters(assets.map((asset) => asset.id === chapterId ? { ...asset, section: undefined } : asset));
}

export function moveChapter(assets: CaseMedia[], chapterId: string, direction: -1 | 1) {
  const groups = groupBodyAssets(assets);
  const chapters = groups.filter((group) => group.section);
  const from = chapters.findIndex((group) => group.id === chapterId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= chapters.length) return assets;
  [chapters[from], chapters[to]] = [chapters[to], chapters[from]];
  const unsectioned = groups.find((group) => !group.section)?.assets || [];
  return renumberChapters([...unsectioned, ...chapters.flatMap((group) => group.assets)]);
}

function flattenGroups(groups: ChapterGroup[]) {
  return renumberChapters(groups.flatMap((group) => {
    if (!group.section || !group.assets.length) return group.assets.map((asset) => ({ ...asset, section: undefined }));
    return group.assets.map((asset, index) => ({ ...asset, section: index === 0 ? group.section : undefined }));
  }));
}

export function moveAssetWithinGroup(assets: CaseMedia[], assetId: string, direction: -1 | 1) {
  const groups = groupBodyAssets(assets);
  const group = groups.find((entry) => entry.assets.some((asset) => asset.id === assetId));
  if (!group) return assets;
  const current = group.assets.findIndex((asset) => asset.id === assetId);
  if (current < 0 || current + direction < 0 || current + direction >= group.assets.length) return assets;
  group.assets = moveIdByOffset(group.assets, assetId, direction);
  return flattenGroups(groups);
}

export function moveAssetWithinGroupTo(assets: CaseMedia[], assetId: string, targetAssetId: string) {
  const groups = groupBodyAssets(assets);
  const group = groups.find((entry) => entry.assets.some((asset) => asset.id === assetId));
  if (!group || !group.assets.some((asset) => asset.id === targetAssetId)) return assets;
  group.assets = moveIdOver(group.assets, assetId, targetAssetId);
  return flattenGroups(groups);
}

export function moveAssetToGroup(assets: CaseMedia[], assetId: string, targetGroupId: string) {
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

export function insertAssetInGroup(assets: CaseMedia[], asset: CaseMedia, groupId: string) {
  const groups = groupBodyAssets(assets);
  const target = groups.find((group) => group.id === groupId);
  if (!target) return groupId === UNSECTIONED_GROUP ? [asset, ...assets] : [...assets, asset];
  target.assets.push(asset);
  return flattenGroups(groups);
}
