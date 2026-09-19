import { describe, expect, it } from "vitest";
import { addChapter, groupBodyAssets, moveAssetToGroup, moveAssetWithinGroup, moveChapter, removeChapter, UNSECTIONED_GROUP, updateChapter } from "../../lib/chapters";
import type { BodyAsset } from "../../lib/types";

const asset = (id: string, section?: BodyAsset["section"]): BodyAsset => ({ id, type: "image", src: `/media/${id}.jpg`, layout: "full", section });
const section = (eyebrow: string, title: string): NonNullable<BodyAsset["section"]> => ({ eyebrow, title, description: `${title}说明` });

describe("chapter editing", () => {
  it("groups the existing first-media section shape and keeps unsectioned media explicit", () => {
    const groups = groupBodyAssets([asset("u"), asset("a", section("CHAPTER 01", "A")), asset("b"), asset("c", section("CHAPTER 02", "B"))]);
    expect(groups.map((group) => [group.id, group.assets.map((item) => item.id)])).toEqual([
      [UNSECTIONED_GROUP, ["u"]], ["a", ["a", "b"]], ["c", ["c"]],
    ]);
  });

  it("adds and edits a chapter while numbering it from its order", () => {
    let assets = addChapter([asset("a"), asset("b"), asset("c")], "b", "第二阶段", "说明");
    assets = addChapter(assets, "a", "第一阶段");
    expect(assets.filter((item) => item.section).map((item) => item.section)).toEqual([
      { eyebrow: "CHAPTER 01", title: "第一阶段", description: undefined },
      { eyebrow: "CHAPTER 02", title: "第二阶段", description: "说明" },
    ]);
    assets = updateChapter(assets, "a", { title: "品牌建立", description: "新的说明" });
    expect(assets[0].section?.title).toBe("品牌建立");
    expect(assets[0].section?.description).toBe("新的说明");
  });

  it("moves whole chapters, keeps their media together, and preserves VI numbering", () => {
    const assets = [asset("a", section("VI 01", "A")), asset("b"), asset("c", section("VI 02", "B")), asset("d")];
    const moved = moveChapter(assets, "c", -1);
    expect(moved.map((item) => item.id)).toEqual(["c", "d", "a", "b"]);
    expect(moved.filter((item) => item.section).map((item) => item.section?.eyebrow)).toEqual(["VI 01", "VI 02"]);
  });

  it("moves media across chapters and promotes a new first media without losing the source chapter", () => {
    const assets = [asset("a", section("CHAPTER 01", "A")), asset("b"), asset("c", section("CHAPTER 02", "B")), asset("d")];
    const moved = moveAssetToGroup(assets, "a", "c");
    expect(moved.map((item) => item.id)).toEqual(["b", "c", "d", "a"]);
    expect(moved[0].section?.title).toBe("A");
    expect(moved[1].section?.title).toBe("B");
    expect(moved[3].section).toBeUndefined();
  });

  it("moves a media item to a newly created unsectioned area", () => {
    const assets = [asset("a", section("CHAPTER 01", "A")), asset("b"), asset("c", section("CHAPTER 02", "B"))];
    const moved = moveAssetToGroup(assets, "b", UNSECTIONED_GROUP);
    expect(moved.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moved[0].section).toBeUndefined();
  });

  it("keeps section metadata on the first media when reordering inside a chapter", () => {
    const moved = moveAssetWithinGroup([asset("a", section("CHAPTER 01", "A")), asset("b"), asset("c")], "a", 1);
    expect(moved.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moved[0].section?.title).toBe("A");
    expect(moved[1].section).toBeUndefined();
  });

  it("removes only the chapter header and never removes its media", () => {
    const assets = [asset("a", section("CHAPTER 01", "A")), asset("b"), asset("c", section("CHAPTER 02", "B")), asset("d")];
    const moved = removeChapter(assets, "c");
    expect(moved.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
    expect(moved.filter((item) => item.section).map((item) => item.section?.title)).toEqual(["A"]);
  });
});
