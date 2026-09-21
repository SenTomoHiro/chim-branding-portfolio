import { describe, expect, it } from "vitest";
import { isCaseListRoute, normalizePortfolioPath, resolveCaseListSource } from "../../lib/return-context";

describe("portfolio return context paths", () => {
  it("normalizes trailing slashes and keeps filter routes", () => {
    expect(normalizePortfolioPath("/drinks/")).toBe("/drinks");
    expect(normalizePortfolioPath("/photo/?ignored=1")).toBe("/photo");
    expect(isCaseListRoute("/ip/")).toBe(true);
    expect(isCaseListRoute("/work/example/")).toBe(false);
    expect(normalizePortfolioPath("/work/?id=N013")).toBe("/work?id=N013");
  });

  it("keeps a compatible filter and chooses a visible list when the next case leaves it", () => {
    expect(resolveCaseListSource("/drinks", "branding", ["drinks", "ip"])).toBe("/drinks");
    expect(resolveCaseListSource("/drinks", "branding", ["food", "ip"])).toBe("/food");
    expect(resolveCaseListSource("/", "branding", ["other"])).toBe("/");
    expect(resolveCaseListSource("/drinks", "photography", [])).toBe("/photo");
  });
});
