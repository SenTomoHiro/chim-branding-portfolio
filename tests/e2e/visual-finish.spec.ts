import { expect, test } from "@playwright/test";

test.setTimeout(120000);


for (const width of [390, 430, 820, 1440]) {
  test(`floating slots and compact category menu at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height:900 });
    await page.goto("/drinks");
    const pill = page.getByRole("button", { name:"选择分类" });
    const topButton = page.getByRole("button", { name:"返回顶部", includeHidden:true });
    await expect(pill).toBeVisible();
    const initial = (await pill.boundingBox())!;
    await expect(topButton).toBeVisible();
    await expect(topButton).toBeEnabled();
    expect(await topButton.evaluate(b => { (b as HTMLElement).focus(); return document.activeElement === b; })).toBe(true);
    await page.evaluate(() => scrollTo({ top:innerHeight * 2, behavior:"instant" }));
    await expect(topButton).toBeVisible();
    const scrolled = (await pill.boundingBox())!, top = (await topButton.boundingBox())!;
    expect(scrolled.x).toBe(initial.x);
    expect(scrolled.height).toBe(44);
    expect(top.height).toBe(44);
    expect(scrolled.y).toBe(top.y);
    expect(scrolled.x + scrolled.width).toBeLessThan(top.x);
    expect(top.x + top.width).toBe(width - 20);
    await pill.click();
    const menu = page.getByRole("dialog", { name:"选择分类" });
    const box = (await menu.boundingBox())!;
    expect(box.width).toBeLessThan(300);
    expect(box.height).toBeLessThan(350);
    expect(box.y + box.height).toBeLessThan(scrolled.y);
    await expect(menu.getByRole("button", { name:"饮品", exact:true })).toHaveAttribute("aria-pressed", "true");
    for (const control of [pill,topButton]) {
      expect(await control.evaluate(e => { const box=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)); })).toBe(true);
    }
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(pill).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await pill.click(); await page.locator(".sheetBackdrop").click({ position:{ x:10, y:10 } });
    await expect(pill).toBeFocused();
    await page.setViewportSize({ width, height:260 });
    await pill.click();
    const short = (await menu.boundingBox())!;
    expect(short.y).toBeGreaterThanOrEqual(20);
    expect(await menu.evaluate(e => e.scrollHeight > e.clientHeight)).toBe(true);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width, height:900 });
    await pill.click();
    await menu.getByRole("button", { name:"全部作品", exact:true }).click();
    await page.waitForURL(/\/photo$/);
    await expect(pill).toContainText("商业摄影");
    await page.locator(".previewCover img").first().click();
    await page.locator(".detailIntro").waitFor(); await pill.click();
    const close=page.getByRole("button",{ name:"返回案例列表" });
    for (const control of [pill,topButton,close]) {
      expect(await control.evaluate(e => { const box=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)); })).toBe(true);
    }
    await close.click(); await page.waitForURL(/\/photo$/);
    await expect(menu).toHaveCount(0);
  });

  test(`cover morph uses real source geometry, single history entry and quick close at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height:900 });
    await page.goto("/drinks");
    const card = page.locator('[data-case-id="N024"]');
    await card.scrollIntoViewIfNeeded();
    await card.locator("img").evaluate((image:HTMLImageElement) => image.decode());
    const anchor = await card.evaluate(e => e.getBoundingClientRect().top);
    const history = await page.evaluate(() => window.history.length);
    const source = await card.locator("img").evaluate((image:HTMLImageElement) => {
      const box=image.getBoundingClientRect(), contain=getComputedStyle(image).objectFit === "contain";
      const scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight);
      const width=contain ? image.naturalWidth*scale : box.width, height=contain ? image.naturalHeight*scale : box.height;
      return { left:box.left+(box.width-width)/2,top:box.top+(box.height-height)/2,width,height };
    });
    await page.mouse.click(source.left+source.width/2,(Math.max(0,source.top)+Math.min(900,source.top+source.height))/2);
    await page.waitForFunction(() => document.querySelector(".coverTransition")?.getAnimations().length);
    const frames = await page.locator(".coverTransition").evaluate(e => (e.getAnimations()[0].effect as KeyframeEffect).getKeyframes());
    const from = frames[0], to = frames[frames.length-1];
    for (const key of ["left","top","width","height"] as const) {
      expect(Math.abs(parseFloat(String(from[key]))-source[key])).toBeLessThan(1);
    }
    expect(parseFloat(String(to.width))).toBe(width);
    expect(parseFloat(String(to.height))).toBe(900);
    expect(parseFloat(String(to.left))).toBe(0);
    expect(parseFloat(String(to.top))).toBe(0);
    const close = page.getByRole("button", { name:"返回案例列表" });
    expect(await close.evaluate(e => { const b=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)); })).toBe(true);
    expect(await page.evaluate(() => window.history.length)).toBe(history + 1);
    await expect(page.locator(".detailHero img")).toHaveCount(1);
    await expect(page.locator(".previewCover")).toHaveCount(0);
    await page.getByRole("button", { name:"返回案例列表" }).click();
    await page.waitForURL(/\/drinks$/);
    await expect.poll(() => card.evaluate((e,t) => Math.abs(e.getBoundingClientRect().top-t), anchor)).toBeLessThan(3);
    await expect(page.locator(".coverTransition")).toHaveCount(0);
  });
}

test("reduced motion and unsupported browsers use the same normal entry and close", async ({ page }) => {
  for (const fallback of ["reduce", "unsupported"]) {
    await page.emulateMedia({ reducedMotion:fallback === "reduce" ? "reduce" : "no-preference" });
    if (fallback === "unsupported") await page.addInitScript(() => { Object.defineProperty(HTMLElement.prototype, "animate", { value:undefined }); });
    await page.goto("/food");
    const card = page.locator(".casePreview").nth(2); await card.scrollIntoViewIfNeeded();
    const anchor = await card.evaluate(e => e.getBoundingClientRect().top);
    await card.locator("img").click(); await page.locator(".detailIntro").waitFor();
    await expect(page.locator(".detailHero img")).toHaveCount(1);
    await page.getByRole("button", { name:"返回案例列表" }).click(); await page.waitForURL(/\/food$/);
    await expect.poll(() => card.evaluate((e,t) => Math.abs(e.getBoundingClientRect().top-t),anchor)).toBeLessThan(3);
  }
});

test("Back during a pending cover entry removes the overlay and cannot push later", async ({ page }) => {
  let reads=0;
  await page.route("**/data/content.json*", async route => {
    if (++reads === 2) await new Promise(resolve => setTimeout(resolve,750));
    await route.continue();
  });
  await page.goto("/drinks");
  const card=page.locator('[data-case-id="N024"]'); await card.scrollIntoViewIfNeeded();
  await card.locator("img").evaluate((i:HTMLImageElement) => i.decode());
  const anchor=await card.evaluate(e => e.getBoundingClientRect().top);
  await card.locator("img").click(); await page.waitForURL(/id=N024/);
  await page.goBack(); await page.waitForURL(/\/drinks$/);
  await expect(page.locator(".coverTransition")).toHaveCount(0);
  await page.waitForTimeout(900);
  await expect(page).toHaveURL(/\/drinks$/);
  await expect.poll(() => card.evaluate((e,t) => Math.abs(e.getBoundingClientRect().top-t),anchor)).toBeLessThan(3);
  expect(await page.evaluate(() => sessionStorage.getItem("chim-case-detail-pending"))).toBeNull();
});

test("slow runtime content skips only the effect and preserves the entry contract", async ({ page }) => {
  let reads=0;
  await page.route("**/data/content.json*", async route => {
    if (++reads === 2) await new Promise(resolve => setTimeout(resolve,2200));
    await route.continue();
  });
  await page.goto("/drinks");
  const card=page.locator('[data-case-id="N024"]'); await card.scrollIntoViewIfNeeded();
  await card.locator("img").evaluate((i:HTMLImageElement) => i.decode());
  const anchor=await card.evaluate(e => e.getBoundingClientRect().top), length=await page.evaluate(() => history.length);
  await card.locator("img").click(); await page.locator(".detailIntro").waitFor();
  expect(await page.evaluate(() => history.length)).toBe(length+1);
  await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(/\/drinks$/);
  await expect.poll(() => card.evaluate((e,t) => Math.abs(e.getBoundingClientRect().top-t),anchor)).toBeLessThan(3);
});
