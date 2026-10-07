import { describe, expect, it } from "vitest";
import { planPdfEditorial, planPdfEditorialGroups, pdfEditorialHeight, type EditorialImage } from "../../lib/pdf-editorial";

const image = (id: string, ratio: number, layout: "full" | "half" = "half"): EditorialImage => ({ id, ratio, layout });

describe("adaptive editorial composition", () => {
  it("keeps long homogeneous full groups dense and breaks out only the landscape ending", () => {
    const images = Array.from({ length: 15 }, (_, i) => image(String(i), i === 14 ? 1.62 : 0.8, "full"));
    const plan = planPdfEditorial(images);
    expect(plan.map(block => block.kind)).toEqual(["masonry", "full"]);
    expect(plan.flatMap(block => block.images)).toEqual(images);
    expect(plan).toEqual(planPdfEditorial(images));
  });
  it("uses full intent and a justified pair to close a landscape/portrait short tail without cropping", () => {
    const images = [image("a", 1.5, "full"), image("b", 1.5), image("c", 2 / 3)];
    const plan = planPdfEditorial(images);
    expect(plan.map(block => block.kind)).toEqual(["full", "pair"]);
    const [left, right] = plan[1].placements;
    expect(left.height).toBe(right.height);
    expect(right.left + right.width).toBeCloseTo(182);
    expect(left.width / left.height).toBeCloseTo(1.5);
    expect(right.width / right.height).toBeCloseTo(2 / 3);
    expect(plan.flatMap(block => block.images.map(i => i.id))).toEqual(["a", "b", "c"]);
  });
  it("only promotes a suitable chapter lead; portrait firsts remain paired", () => {
    expect(planPdfEditorial([image("a", 1.5, "full"), image("b", 1), image("c", 1)], { chapter: true })[0].reason).toBe("chapter-lead");
    expect(planPdfEditorial([image("a", 2 / 3), image("b", 2 / 3)], { chapter: true })[0].kind).toBe("pair");
  });
  it("handles one selected image, portraits, and mixed full/half without losing images", () => {
    for (const images of [[image("a", 1.6)], [image("a", 0.66), image("b", 0.66)], [image("a", 1.6, "full"), image("b", 0.66)]]) {
      const plan = planPdfEditorial(images, { portfolio: true });
      expect(plan.flatMap(block => block.images)).toEqual(images);
      expect(plan.flatMap(block => block.placements).every(p => p.width > 0 && p.height > 0 && p.left + p.width <= 182.01)).toBe(true);
    }
  });
  it("never manufactures dimensions", () => {
    for (const ratio of [0, -1, NaN, Infinity]) expect(() => planPdfEditorial([image("broken", ratio)])).toThrow("PDF 图片尺寸无效：broken");
  });
  it("uses the whole content width for an isolated portrait rather than a small centered row", () => {
    const block = planPdfEditorial([image("a", 2 / 3)], { portfolio: true })[0];
    expect(block.height).toBe(273);
    expect(block.placements[0].width).toBe(182);
    expect(block.placements[0].left).toBe(0);
  });
  it("keeps 1/2/3/4/5+ mixed-ratio groups deterministic and inside the print width in both modes", () => {
    for (const count of [1, 2, 3, 4, 5, 7]) {
      const images = Array.from({ length: count }, (_, i) => image(String(i), [0.66, 1, 1.5, 3, 0.2][i % 5], i % 3 === 0 ? "full" : "half"));
      for (const portfolio of [false, true]) {
        const plan = planPdfEditorial(images, { portfolio });
        expect(plan).toEqual(planPdfEditorial(images, { portfolio }));
        expect(plan.flatMap(c => c.images)).toEqual(images);
        for (const composition of plan) for (const p of composition.placements) {
          expect(p.width).toBeGreaterThan(0);
          expect(p.height).toBeGreaterThan(0);
          expect(p.left).toBeGreaterThanOrEqual(0);
          expect(p.left + p.width).toBeLessThanOrEqual(182.01);
          expect(p.top + p.height).toBeLessThanOrEqual(composition.height + 0.01);
          if (composition.kind === "full") {
            expect(p.width).toBe(182);
            expect(p.left).toBe(0);
          }
        }
      }
    }
  });
  it("locally absorbs an expensive automatic chapter lead but protects explicit Full", () => {
    const images = [image("a", 1), image("b", 0.75), image("c", 0.75, "full")];
    const guarded = planPdfEditorial(images, { chapter: true });
    expect(guarded.map(p => p.kind)).toEqual(["masonry"]);
    expect(guarded[0].reason).toBe("height-guard-local-run");
    expect(guarded.flatMap(p => p.images)).toEqual(images);
    const protectedPlan = planPdfEditorial([{ ...images[0], layout: "full" }, ...images.slice(1)], { chapter: true });
    expect(protectedPlan[0].reason).toBe("chapter-lead");
    expect(pdfEditorialHeight(guarded)).toBeLessThan(pdfEditorialHeight(protectedPlan));
  });
  it("tightens fragmented spacing without shrinking singletons or crossing chapter boundaries", () => {
    const groups = [{ images: [image("a", 3, "full")] }, { images: [image("b", 4 / 3)] }, { images: [image("c", 1)] }];
    const result = planPdfEditorialGroups(groups, { portfolio: true });
    expect(result.gapMm).toBe(5);
    expect(result.assessment.guarded).toBe(true);
    expect(result.plans[0][0].reason).toBe("chapter-single");
    expect(result.plans[0][0].placements[0].width).toBe(182);
    expect(result.plans[1][0].reason).toBe("chapter-single");
    expect(result.plans.map(p => p.flatMap(b => b.images.map(i => i.id)))).toEqual([["a"], ["b"], ["c"]]);
    expect(result).toEqual(planPdfEditorialGroups(groups, { portfolio: true }));
    expect(result.plans.every(p => p[0].placements[0].width === 182 && p[0].placements[0].left === 0)).toBe(true);
  });
  it("does not shrink explicit Full images even when a fragmented case stays long", () => {
    const groups = [0.7, 5.2, 2 / 3, 1.8].map((ratio, i) => ({ images: [image(String(i), ratio, "full")] }));
    const result = planPdfEditorialGroups(groups, { portfolio: true });
    expect(result.plans).toEqual(groups.map(g => planPdfEditorial(g.images, { portfolio: true })));
    expect(result.gapMm).toBe(5);
  });
  it("pairs adjacent automatic isolated images without absorbing a manual Full panorama", () => {
    const images = [image("a", 1), image("b", 4 / 3), image("c", 3, "full"), image("d", 4 / 3), image("e", 0.75)];
    const plan = planPdfEditorial(images, { chapter: true });
    expect(plan[0].kind).toBe("pair");
    expect(plan[0].images.map(i => i.id)).toEqual(["a", "b"]);
    expect(plan[1].kind).toBe("full");
    expect(plan[1].images[0].id).toBe("c");
    expect(plan.flatMap(p => p.images)).toEqual(images);
  });
  it("pairs consecutive tall portraits within a chapter but keeps a lone extreme image full width", () => {
    const portraits = [image("a", 0.3), image("b", 0.4)];
    const paired = planPdfEditorial(portraits, { portfolio: true, chapter: true });
    expect(paired.map(p => p.kind)).toEqual(["pair"]);
    expect(paired[0].height).toBeLessThan(182 / portraits[0].ratio);
    expect(paired.flatMap(p => p.images)).toEqual(portraits);
    for (const portfolio of [true, false]) {
      const lone = planPdfEditorial([portraits[0]], { portfolio, chapter: true })[0];
      expect(lone.kind).toBe("full");
      expect(lone.placements[0]).toEqual({ id: "a", left: 0, top: 0, width: 182, height: 182 / 0.3 });
    }
  });
});
