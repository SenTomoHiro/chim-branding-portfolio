// Production-only, read-only Chrome captures of the formal Close path.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const origin = process.env.VERIFY_URL || "http://localhost:3401/chim-branding-portfolio";
const output = process.env.VERIFY_OUTPUT;
if (!output) throw new Error("Set VERIFY_OUTPUT to a folder outside the repository");
await mkdir(output,{ recursive:true });
const browser = await chromium.launch({ channel:"chrome" }), results=[];
try {
 for (const width of [390,430,820,1440]) {
  const context=await browser.newContext({ viewport:{ width,height:900 },hasTouch:width<768,isMobile:width<768,recordVideo:{ dir:output,size:{ width,height:900 } } });
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  const shot=async name=>page.screenshot({ path:path.join(output,`${name}-${width}.png`) });
  const decode=locator=>locator.evaluate(image=>image.decode());
  const read=async locator=>{
   await locator.scrollIntoViewIfNeeded();
   await page.waitForTimeout(700);
  };
  const measurements=[];
  for (const mode of ["single","chain-deep","chain-top"]) {
   await page.goto(`${origin}/drinks/`);
   const card=page.locator('.casePreview[data-case-id="N024"]');
   await read(card);await decode(card.locator("img"));
   const before=await card.evaluate(element=>element.getBoundingClientRect().top);
   await shot(`${mode}-source`);
   const box=await card.locator("img").boundingBox();
   await page.mouse.click(box.x+box.width/2,(Math.max(0,box.y)+Math.min(900,box.y+box.height))/2);
   await page.waitForURL(/id=N024/);await decode(page.locator(".detailHero img"));
   await page.waitForFunction(()=>!document.querySelector(".coverTransition"));
   if (mode!=="single") {
    await read(page.locator(".nextCase"));await page.locator(".nextCase").click();await page.waitForURL(/id=N025/);
    await read(page.locator(".nextCase"));await page.locator(".nextCase").click();await page.waitForURL(/id=N026/);
    await decode(page.locator(".detailHero img"));
    await read(page.locator(".mediaFlow img").last());await decode(page.locator(".mediaFlow img").last());
    if(mode==="chain-top") {await page.getByRole("button",{ name:"返回顶部" }).click();await page.waitForFunction(()=>scrollY<1);}
   }
   const scroll=await page.evaluate(()=>scrollY);await shot(`${mode}-before-close`);await page.waitForTimeout(700);
   const historyLength=await page.evaluate(()=>history.length);
   await page.getByRole("button",{ name:"返回案例列表" }).click();
   await page.waitForFunction(()=>document.querySelector('.coverTransition[data-direction="exit"]')?.getAnimations().length);
   const frames=await page.locator(".coverTransition").evaluate(e=>e.getAnimations()[0].effect.getKeyframes());
   const targetCase=await page.locator(".coverTransition").getAttribute("data-transition-case-id");assert.equal(targetCase,"N024");
   assert.equal(await card.locator(".previewCover").evaluate(e=>getComputedStyle(e).visibility),"hidden");
   await shot(`${mode}-reverse`);
   await page.waitForFunction(()=>!document.querySelector(".coverTransition,.coverTransitionViewport"));
   await page.waitForURL(/\/drinks\/$/);
   const after=await card.evaluate(e=>e.getBoundingClientRect().top);assert(Math.abs(after-before)<3);
   assert.equal(await card.locator(".previewCover").evaluate(e=>getComputedStyle(e).visibility),"visible");
   assert.equal(await page.evaluate(()=>history.length),historyLength);
   await shot(`${mode}-restored`);await page.waitForTimeout(700);
   measurements.push({ mode,before,after,scroll,targetCase,from:frames[0],to:frames.at(-1) });
  }
  await page.emulateMedia({ reducedMotion:"reduce" });
  await page.goto(`${origin}/drinks/`);
  const card=page.locator('.casePreview[data-case-id="N024"]');await card.scrollIntoViewIfNeeded();
  const top=await card.evaluate(e=>e.getBoundingClientRect().top);
  await card.locator("img").click();await page.getByRole("button",{ name:"返回案例列表" }).click();
  await page.waitForURL(/\/drinks\/$/);await page.waitForFunction(t=>{const card=document.querySelector('.casePreview[data-case-id="N024"]');return card&&Math.abs(card.getBoundingClientRect().top-t)<3;},top);
  assert.equal(await page.locator(".coverTransition,.coverTransitionViewport").count(),0);
  assert.deepEqual(errors,[]);
  results.push({ width,measurements,errors,reducedMotion:true });
  await writeFile(path.join(output,"verification.json"),JSON.stringify(results,null,2));
  const video=page.video();await context.close();await video.saveAs(path.join(output,`reverse-close-${width}.webm`));
  console.log(`Verified ${width}: all three return errors ${measurements.map(m=>m.after-m.before).join(" / ")}px`);
 }
}finally{await browser.close();}
