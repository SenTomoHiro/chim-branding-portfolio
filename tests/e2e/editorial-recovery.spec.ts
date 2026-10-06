import { expect, test } from "@playwright/test";
import { fetchOfficialContent } from "../helpers/official-content";
import { getCaseBodyMedia } from "../../lib/case-media";
import { pairedHalfIds } from "../../lib/media-layout";
import { contentMediaUrl } from "../../lib/runtime-content";
const content = await fetchOfficialContent();
test.setTimeout(120000);

for (const width of [390, 430, 820, 1440]) {
  test(`first entry survives Next x2, detail top, close and Forward at ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.goto("/drinks");
    const card = page.locator('[data-case-id="N024"]');
    await card.scrollIntoViewIfNeeded();
    const top = await card.evaluate(e=>e.getBoundingClientRect().top);
    await card.locator(".previewCover img").click();
    await page.waitForURL(/id=N024/);
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N025/);
    await page.locator(".nextCase").click(); await page.waitForURL(/id=N026/);
    await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
    const entry = await page.evaluate(()=>sessionStorage.getItem("chim-case-list-entry"));
    await page.getByRole("button",{name:"返回顶部"}).click();
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
    expect(await page.evaluate(()=>sessionStorage.getItem("chim-case-list-entry"))).toBe(entry);
    await page.getByRole("button",{name:"返回案例列表"}).click();
    await page.waitForURL(/\/drinks$/);
    await expect.poll(()=>card.evaluate((e,t)=>Math.abs(e.getBoundingClientRect().top-t),top)).toBeLessThan(3);
    await expect(page.locator(".categoryPill")).toContainText("饮品");
    await page.goForward(); await page.waitForURL(/id=N024/);
    await page.goForward(); await page.waitForURL(/id=N025/);
    await page.getByRole("button",{name:"返回案例列表"}).click(); await page.waitForURL(/\/drinks$/);
    await expect.poll(()=>card.evaluate((e,t)=>Math.abs(e.getBoundingClientRect().top-t),top)).toBeLessThan(3);
    // A full document navigation must not reuse a previous visit's entry.
    await page.goto("/work?id=N024");
    await page.getByRole("button",{name:"返回案例列表"}).click(); await page.waitForURL(/\/$/);
  });
}

test("real mixed media preserves sequence, chapter boundaries and Half pairs", async ({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  const candidates = content.cases.filter(c=>c.published && c.media.some(m=>m.layout==="half") && c.media.some(m=>m.section));

  for(const width of [390,430,820,1440]) {
    await page.setViewportSize({width,height:900});
    for(const item of candidates.slice(0,3)) {
      await page.goto(`/work?id=${item.id}`);
      const body = getCaseBodyMedia(item), paired = pairedHalfIds(body);
      const figures = page.locator(".mediaFlow figure"); await expect(figures).toHaveCount(body.length);
      expect(await figures.locator("img,video").evaluateAll(es=>es.map(e=>e.getAttribute("src")))).toEqual(body.map(m=>contentMediaUrl(m.src)));
      const boxes=await figures.evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,width:b.width};}));
      for(let i=0;i<body.length;i++) {
        if(width>=768 && paired.has(body[i].id)) {
          const j=i+1; if(j<body.length && paired.has(body[j].id) && !body[j].section) {
            expect(Math.abs(boxes[i].top-boxes[j].top)).toBeLessThan(1);
            expect(boxes[j].left - boxes[i].left - boxes[i].width).toBeGreaterThanOrEqual(16); i++;
          }
        } else expect(boxes[i].width).toBeGreaterThan(width*0.7);
      }
      await expect(page.locator(".mediaSectionHeading h2")).toHaveText(body.filter(m=>m.section).map(m=>m.section!.title));
      for(const video of await page.locator(".mediaFlow video").all()) {
        await video.scrollIntoViewIfNeeded();
        await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(1);
        await video.evaluate((v:HTMLVideoElement)=>{v.muted=true;return v.play();});
        await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
      }
    }
  }
});


test("isolated video media remains playable without modifying official content", async ({page})=>{
  await page.goto("/");
  const source = await page.evaluate(async()=>{
    const canvas=document.createElement("canvas");canvas.width=160;canvas.height=90;
    const ctx=canvas.getContext("2d")!;ctx.fillStyle="orange";ctx.fillRect(0,0,160,90);
    const stream=canvas.captureStream(20), recorder=new MediaRecorder(stream,{mimeType:"video/webm"});
    const parts:BlobPart[]=[];recorder.ondataavailable=e=>parts.push(e.data);
    const stopped=new Promise<void>(resolve=>recorder.onstop=()=>resolve());
    recorder.start();await new Promise(resolve=>setTimeout(resolve,600));recorder.stop();await stopped;
    stream.getTracks().forEach(track=>track.stop());
    return await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(new Blob(parts,{type:"video/webm"}));});
  });
  const fixture=structuredClone(content), item=fixture.cases.find(c=>c.id==="N024")!;
  item.media.push({id:"isolated-video",type:"video",src:source,layout:"full",portfolioPdfSelected:false});
  await page.route("**/data/content.json*",r=>r.fulfill({json:fixture}));
  await page.goto("/work?id=N024");
  const video=page.locator(".mediaFlow video");await video.scrollIntoViewIfNeeded();
  await video.evaluate((v:HTMLVideoElement)=>{v.muted=true;return v.play();});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
  await expect(video).toHaveAttribute("controls","");await expect(video).toHaveAttribute("playsinline","");
});

test("a new list entry replaces the old one, including photography and middle-list anchors", async ({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const route of ["/", "/food", "/photo"]) {
    await page.goto(route);
    const cards=page.locator(".casePreview");await cards.first().waitFor();
    const card=cards.nth(Math.floor(await cards.count()/2));
    await card.scrollIntoViewIfNeeded();const top=await card.evaluate(e=>e.getBoundingClientRect().top);
    const id=await card.getAttribute("data-case-id");await card.locator(".previewCover img").click();
    await page.locator(".detailIntro").waitFor();
    const entry=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("chim-case-list-entry")!));
    expect(entry.source).toBe(route);expect(entry.caseId).toBe(id);
    await page.getByRole("button",{name:"返回案例列表"}).click();
    await page.waitForURL(url=>url.pathname===route);
    await expect.poll(()=>card.evaluate((e,t)=>Math.abs(e.getBoundingClientRect().top-t),top)).toBeLessThan(3);
    await page.getByRole("button",{name:"返回顶部"}).click();
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
    const topButton=page.locator(".backToTop");await expect(topButton).toBeVisible();
    await expect(topButton).toBeEnabled();
    expect(await topButton.evaluate(b=>{(b as HTMLElement).focus();return document.activeElement===b;})).toBe(true);
  }
});
