// Read-only Chrome verification against the actual production Pages export.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const origin = process.env.VERIFY_URL || "http://localhost:3401/chim-branding-portfolio";
const output = process.env.VERIFY_OUTPUT;
if (!output) throw new Error("Set VERIFY_OUTPUT to a folder outside the repository");
await mkdir(output, { recursive:true });
const browser = await chromium.launch({ channel:"chrome" });
const results = [];
try {
  for (const width of [390,430,820,1440]) {
    const context = await browser.newContext({ viewport:{ width,height:900 }, hasTouch:width<768, isMobile:width<768, recordVideo:{ dir:output,size:{ width,height:900 } } });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const errors = [], imageFailures = []; page.on("pageerror", e => errors.push(e.message));
    page.on("requestfailed", request => {
      if (request.resourceType() === "image") imageFailures.push({ url:request.url(),failure:request.failure() });
    });
    const shot = async name => {
      if (name !== "motion") {
        await page.waitForFunction(() => !document.querySelector(".coverTransition"));
        await page.evaluate(() => Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getTiming().iterations)).map(a => a.finished.catch(() => {}))));
        await page.evaluate(() => Promise.all([...document.images].filter(image => {
          const box = image.getBoundingClientRect();
          return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
        }).map(image => image.decode())));
      }
      await page.screenshot({ path:path.join(output,`${name}-${width}.png`) });
    };
    const decode = async locator => {
      try { await locator.evaluate(async image => { if (image instanceof HTMLImageElement) await image.decode(); }); }
      catch (error) {
        console.error("Image decode failed",{ width,image:await locator.evaluate(i => ({ src:i.src,complete:i.complete,naturalWidth:i.naturalWidth })),imageFailures });
        throw error;
      }
    };
    const pause = () => page.waitForTimeout(700);
    const controlsHit = async labels => {
      for (const name of labels) assert.equal(await page.getByRole("button",{ name }).evaluate(e => {
        const box=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
      }),true,`${name} remains above the blur backdrop`);
    };
    const readScroll = async locator => {
      const target=await locator.evaluate(e => Math.max(0,scrollY+e.getBoundingClientRect().top-80));
      await page.evaluate(top => scrollTo({ top,behavior:"smooth" }),target);
      await page.waitForFunction(top => Math.abs(scrollY-Math.min(top,document.documentElement.scrollHeight-innerHeight))<2,target);
    };
    await page.goto(`${origin}/`);
    await page.locator(".casePreview").first().waitFor();
    await decode(page.locator(".previewCover img").first());
    await shot("home"); await pause();
    await page.getByRole("button",{ name:"选择分类" }).click(); await shot("home-menu");
    await controlsHit(["选择分类","返回顶部"]);
    await page.keyboard.press("Escape");
    // The requested recording starts on the home feed and preserves this exact entry.
    const homeCard = page.locator('[data-case-id="N024"]');
    await readScroll(homeCard); await decode(homeCard.locator("img"));
    const homeTop = await homeCard.evaluate(e => e.getBoundingClientRect().top);
    await shot("source-cover"); await pause();
    await homeCard.locator("img").click();
    await page.waitForFunction(() => document.querySelector(".coverTransition")?.getAnimations().length);
    const motion = await page.locator(".coverTransition").evaluate(e => ({ source:e.getAnimations()[0].effect.getKeyframes()[0],destination:e.getAnimations()[0].effect.getKeyframes().at(-1) }));
    const closeHit=await page.getByRole("button",{ name:"返回案例列表" }).evaluate(e => { const b=e.getBoundingClientRect(); return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)); });
    assert.equal(closeHit,true); motion.closeHit=closeHit;
    await shot("motion");
    await page.waitForFunction(() => !document.querySelector(".coverTransition"));
    await shot("opening"); await pause();
    await readScroll(page.locator(".detailIntro")); await shot("intro"); await pause();
    await page.getByRole("button",{ name:"选择分类" }).click(); await shot("detail-menu");
    await controlsHit(["选择分类","返回顶部","返回案例列表"]);
    await page.keyboard.press("Escape");
    const chapter = page.locator(".mediaSectionHeading").first(); await readScroll(chapter);
    await decode(page.locator(".mediaFlow img").first()); await shot("chapter"); await pause();
    await readScroll(page.locator(".nextCase")); await pause();
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N025/); await page.locator(".detailIntro").waitFor();
    await readScroll(page.locator(".detailIntro")); await pause();
    await readScroll(page.locator(".nextCase")); await pause();
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N026/);
    const pair = page.locator(".mediaFlow figure.half.isPaired").first();
    await readScroll(pair);
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll(".mediaFlow img")].filter(i => { const b=i.getBoundingClientRect(); return b.bottom>0 && b.top<innerHeight; }).map(i => i.decode()));
    });
    await shot("layout"); await pause();
    await readScroll(page.locator(".nextCase")); await shot("next-case"); await pause();
    const topButton = page.getByRole("button",{ name:"返回顶部" });
    await topButton.click(); await page.waitForFunction(() => scrollY<=1); await pause();
    await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(url => url.pathname===new URL(`${origin}/`).pathname);
    await page.waitForFunction(t => { const c=document.querySelector('[data-case-id="N024"]'); return c && Math.abs(c.getBoundingClientRect().top-t)<3; },homeTop);
    const homeRestored = await homeCard.evaluate(e => e.getBoundingClientRect().top); await shot("home-restored"); await pause();

    // Frozen classification / entry chain from the engineering baseline, on all widths.
    await page.goto(`${origin}/drinks/`);
    const card = page.locator('[data-case-id="N024"]'); await card.scrollIntoViewIfNeeded(); await decode(card.locator("img"));
    const before = await card.evaluate(e => e.getBoundingClientRect().top);
    const pill = page.getByRole("button",{ name:"选择分类" });
    const buttonBox = await topButton.boundingBox(), pillBox = await pill.boundingBox();
    assert.equal(buttonBox.height,44); assert.equal(pillBox.height,44); assert.equal(pillBox.y,buttonBox.y);
    assert(pillBox.x+pillBox.width<buttonBox.x); assert.equal(buttonBox.x+buttonBox.width,width-20);
    await shot("feed"); await shot("controls");
    await pill.click(); const menuBox=await page.locator(".sheetContent").boundingBox();
    assert(menuBox.width<300 && menuBox.height<350 && menuBox.y+menuBox.height<pillBox.y); await shot("menu");
    await page.keyboard.press("Escape"); assert(await pill.evaluate(b => document.activeElement===b));
    await card.locator("img").click(); await page.waitForURL(/id=N024/);
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N025/);
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N026/);
    await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
    await decode(page.locator(".mediaFlow figure").last().locator("img")); await shot("detail");
    await topButton.click(); await page.waitForFunction(() => scrollY<=1);
    await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(/\/drinks\/$/);
    await page.waitForFunction(t => { const c=document.querySelector('[data-case-id="N024"]'); return c && Math.abs(c.getBoundingClientRect().top-t)<3; },before);
    const after=await card.evaluate(e => e.getBoundingClientRect().top); await shot("restored");
    await page.goForward(); await page.waitForURL(/id=N024/); await page.goForward(); await page.waitForURL(/id=N025/);
    await page.goBack(); await page.waitForURL(/id=N024/); await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(/\/drinks\/$/);
    for (const [label,route] of [["餐饮","food"],["IP","ip"],["其他","other"],["饮品","drinks"]]) {
      await pill.click(); await page.getByRole("button",{ name:label,exact:true }).click(); await page.waitForURL(new RegExp(`/${route}/$`));
      await page.locator(".casePreview").first().waitFor(); await decode(page.locator(".previewCover img").first()); await shot(`category-${route}`);
    }
    await pill.click(); await page.getByRole("button",{ name:"全部作品",exact:true }).click(); await page.waitForURL(/\/photo\/$/);
    await page.locator(".casePreview").first().waitFor(); await decode(page.locator(".previewCover img").first()); await shot("photography");
    await page.locator(".previewCover img").first().click(); await page.locator(".detailIntro").scrollIntoViewIfNeeded(); await shot("photography-detail");
    await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(/\/photo\/$/);
    await page.goto(`${origin}/work/?id=SL001`); await page.locator(".detailIntro").scrollIntoViewIfNeeded(); await shot("long-intro");
    await page.locator(".mediaSectionHeading").first().scrollIntoViewIfNeeded(); await decode(page.locator(".mediaFlow img").first()); await shot("long-chapter");
    await page.goto(`${origin}/drinks/`); await page.locator(".casePreview").first().waitFor();
    await page.setViewportSize({ width,height:280 }); await pill.click(); await shot("short-menu");
    const shortBox=await page.locator(".sheetContent").boundingBox(); assert(shortBox.y>=20 && shortBox.y+shortBox.height<=206);
    await page.keyboard.press("Escape"); await page.setViewportSize({ width,height:900 });
    await page.emulateMedia({ reducedMotion:"reduce" });
    await card.scrollIntoViewIfNeeded(); const reducedTop=await card.evaluate(e => e.getBoundingClientRect().top);
    await card.locator("img").click(); await page.locator(".detailIntro").waitFor();
    await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded(); await topButton.click(); await page.waitForFunction(() => scrollY<=1);
    await page.getByRole("button",{ name:"返回案例列表" }).click(); await page.waitForURL(/\/drinks\/$/);
    await page.waitForFunction(t => { const c=document.querySelector('[data-case-id="N024"]'); return c && Math.abs(c.getBoundingClientRect().top-t)<3; },reducedTop);
    await shot("reduced-motion");
    assert.deepEqual(errors,[]);
    results.push({ width,home:{ before:homeTop,after:homeRestored },category:{ before,after },motion,errors });
    await writeFile(path.join(output,"verification.json"),JSON.stringify(results,null,2));
    const video=page.video(); await context.close(); await video.saveAs(path.join(output,`interaction-${width}.webm`));
    console.log(`Verified ${width}: home ${homeRestored-homeTop}px, category ${after-before}px`);
  }
  await writeFile(path.join(output,"verification.json"),JSON.stringify(results,null,2));
} finally { await browser.close(); }
