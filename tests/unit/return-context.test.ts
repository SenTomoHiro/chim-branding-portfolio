import { describe, expect, it } from "vitest";
import { isCaseListRoute, normalizePortfolioPath } from "../../lib/return-context";

describe("portfolio return context paths", () => {
  it("normalizes trailing slashes and keeps filter routes", () => {
    expect(normalizePortfolioPath("/drinks/")).toBe("/drinks");
    expect(normalizePortfolioPath("/photo/?ignored=1")).toBe("/photo");
    expect(isCaseListRoute("/ip/")).toBe(true);
    expect(isCaseListRoute("/work/example/")).toBe(false);
  });
});
