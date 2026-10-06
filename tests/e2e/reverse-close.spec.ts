import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120000);
async function openA(page: Page) {
  await page.goto("/drinks");
  const card = page.locator('[data-case-id="N024"]');
  await card.scrollIntoViewIfNeeded();
  await card.locator("img").evaluate((image: HTMLImageElement) => image.decode());
  const top = await card.evaluate(element => element.getBoundingClientRect().top);
  const box = (await card.locator("img").boundingBox())!;
  const height = await page.evaluate(() => innerHeight);
  await page.mouse.click(box.x + box.width / 2, (Math.max(0, box.y) + Math.min(height, box.y + box.height)) / 2);
  await page.waitForURL(/id=N024/);
  await page.locator(".detailHero img").evaluate((image: HTMLImageElement) => image.decode());
  await expect(page.locator(".coverTransition")).toHaveCount(0);
  return { card, top };
}
async function nextTwice(page: Page) {
  await page.locator(".nextCase").click(); await page.waitForURL(/id=N025/);
  await page.locator(".nextCase").click(); await page.waitForURL(/id=N026/);
  await page.locator(".detailHero img").evaluate((image: HTMLImageElement) => image.decode());
}
async function restored(page: Page, top: number) {
  await page.waitForURL(/\/drinks$/);
  await expect.poll(() => page.locator('[data-case-id="N024"]').evaluate((element, expected) => Math.abs(element.getBoundingClientRect().top - expected), top)).toBeLessThan(3);
  await expect(page.locator(".coverTransition,.coverTransitionViewport,.coverTransitionCopy")).toHaveCount(0);
  await expect(page.locator('[data-case-id="N024"] .previewCover')).toBeVisible();
  await expect(page.locator(".categoryPill")).toContainText("饮品");
}

for (const width of [390, 430, 820, 1440]) {
  for (const mode of ["single", "chain-deep", "chain-top"]) {
    test(`reverse Close lands at original A: ${mode} / ${width}`, async ({ page }) => {
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      const { card, top } = await openA(page);
      const original = await page.evaluate(() => JSON.parse(sessionStorage.getItem("chim-case-list-entry")!));
      if (mode !== "single") await nextTwice(page);
      if (mode === "chain-deep") {
        await page.locator(".mediaFlow img").last().scrollIntoViewIfNeeded();
        await page.locator(".mediaFlow img").last().evaluate((image: HTMLImageElement) => image.decode());
        expect(await page.evaluate(() => scrollY)).toBeGreaterThan(900);
      }
      if (mode === "chain-top") {
        await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
        await page.getByRole("button", { name: "返回顶部" }).click();
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      }
      const historyLength = await page.evaluate(() => history.length);
      await page.getByRole("button", { name: "返回案例列表" }).click();
      const overlay = page.locator('.coverTransition[data-direction="exit"]');
      await page.waitForFunction(() => document.querySelector('.coverTransition[data-direction="exit"]')?.getAnimations().length);
      expect(await overlay.getAttribute("data-transition-case-id")).toBe("N024");
      const geometry = await overlay.evaluate(element => {
        const frames = (element.getAnimations()[0].effect as KeyframeEffect).getKeyframes();
        return frames[frames.length - 1];
      });
      const target = await card.locator("img").evaluate((image: HTMLImageElement) => {
        const box = image.getBoundingClientRect(), contain = getComputedStyle(image).objectFit === "contain";
        const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
        const width = contain ? image.naturalWidth * scale : box.width, height = contain ? image.naturalHeight * scale : box.height;
        return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
      });
      for (const key of ["left", "top", "width", "height"] as const) expect(Math.abs(parseFloat(String(geometry[key])) - target[key])).toBeLessThan(1);
      expect(await card.locator(".previewCover").evaluate(element => getComputedStyle(element).visibility)).toBe("hidden");
      expect(await overlay.evaluate(element => getComputedStyle(element).pointerEvents)).toBe("none");
      expect(await page.evaluate(() => history.length)).toBe(historyLength);
      expect(original.caseId).toBe("N024"); expect(original.source).toBe("/drinks");
      await restored(page, top);
      expect(errors).toEqual([]);
      await page.goForward(); await page.waitForURL(/id=N024/);
      await page.getByRole("button", { name: "返回案例列表" }).click(); await restored(page, top);
    });
  }
}

test("repeated Close during entry or return performs one formal return", async ({ page }) => {
  await page.goto("/drinks");
  const card = page.locator('[data-case-id="N024"]'); await card.scrollIntoViewIfNeeded();
  await card.locator("img").evaluate((image: HTMLImageElement) => image.decode());
  const top = await card.evaluate(element => element.getBoundingClientRect().top);
  await card.locator("img").click();
  await page.waitForFunction(() => document.querySelector('.coverTransition[data-direction="enter"]')?.getAnimations().length);
  await page.getByRole("button", { name: "返回案例列表" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); button.click(); });
  await restored(page, top);
  await expect(page).toHaveURL(/\/drinks$/);
});

test("Back during reverse morph cancels presentation without stale navigation", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await openA(page); await nextTwice(page);
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await page.waitForFunction(() => document.querySelector('.coverTransition[data-direction="exit"]')?.getAnimations().length);
  await page.goBack();
  await expect(page.locator(".coverTransition,.coverTransitionViewport")).toHaveCount(0);
  const url = page.url(); await page.waitForTimeout(500);
  expect(page.url()).toBe(url); expect(errors).toEqual([]);
});

test("undecoded source skips the effect; undecodable landing cleans up safely", async ({ page }) => {
  let entry = await openA(page);
  await page.locator(".detailHero img").evaluate(image => { Object.defineProperty(image, "naturalWidth", { value: 0 }); });
  await page.getByRole("button", { name: "返回案例列表" }).click(); await restored(page, entry.top);
  entry = await openA(page);
  await page.evaluate(() => { HTMLImageElement.prototype.decode = () => Promise.reject(new Error("isolated decode failure")); });
  await page.getByRole("button", { name: "返回案例列表" }).click(); await restored(page, entry.top);
});

test("reduced motion and external direct detail keep their existing safe Close", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { top } = await openA(page); await nextTwice(page);
  await page.getByRole("button", { name: "返回案例列表" }).click(); await restored(page, top);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/work?id=N026");
  await page.getByRole("button", { name: "返回案例列表" }).click(); await page.waitForURL(/\/$/);
  await expect(page.locator(".coverTransition,.coverTransitionViewport")).toHaveCount(0);
});

test("slow returning list cleans its temporary layers without a delayed morph", async ({ page }) => {
  const { top } = await openA(page);
  await page.route("**/data/content.json*", async route => { await new Promise(resolve => setTimeout(resolve,2200)); await route.continue(); });
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await restored(page, top);
  await expect(page.locator(".coverTransition")).toHaveCount(0);
});
