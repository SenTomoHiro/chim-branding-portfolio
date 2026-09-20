import { expect, test } from "@playwright/test";
import { casePath } from "../../lib/case-route";

const cases = [
  { name: "JUJUS", chapters: 3 },
  { name: "瑞瀚心理", chapters: 4 },
  { name: "阿泰珍奶", chapters: 5 },
  { name: "春莱 · 桃花桂花艺人系列", chapters: 3 },
];

test("new and existing cases share automatic two-digit Chapter numbering", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const item of cases) {
      await page.goto(casePath(item.name), { waitUntil: "networkidle" });
      await expect(page.locator(".mediaSectionHeading p")).toHaveText(
        Array.from({ length: item.chapters }, (_, index) => `CHAPTER ${String(index + 1).padStart(2, "0")}`),
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    }
  }
});
