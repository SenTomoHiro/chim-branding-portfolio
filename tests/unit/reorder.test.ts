import { describe, expect, it } from "vitest";
import { moveIdByOffset, moveIdOver } from "../../lib/reorder";

const ids = (values: string[]) => values.map((id) => ({ id }));

describe("stable id reordering", () => {
  it("updates continuously as the active item moves over successive rows", () => {
    const start = ids(["A", "B", "C", "D"]);
    const overC = moveIdOver(start, "B", "C");
    expect(overC.map((item) => item.id)).toEqual(["A", "C", "B", "D"]);
    const overD = moveIdOver(overC, "B", "D");
    expect(overD.map((item) => item.id)).toEqual(["A", "C", "D", "B"]);
    expect(new Set(overD.map((item) => item.id))).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("uses the same primitive for button moves", () => {
    expect(moveIdByOffset(ids(["A", "B", "C"]), "B", -1).map((item) => item.id)).toEqual(["B", "A", "C"]);
  });
});
