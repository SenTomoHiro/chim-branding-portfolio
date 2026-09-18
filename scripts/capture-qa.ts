import { chromium } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";

async function main() {
  const output = path.join(process.cwd(), "test-results/visual-qa");
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const issues: string[] = [];
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "laptop", width: 1024, height: 900 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on("console", (message) => { if (message.type() === "error") issues.push(`${viewport.name}: ${message.text()}`); });
    page.on("pageerror", (error) => issues.push(`${viewport.name}: ${error.message}`));
    for (const [name, route] of [["home", "/"], ["food", "/food"], ["detail", "/work/n013-manual-burger"], ["admin", "/admin"]] as const) {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
      if (name === "detail") { await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 80)); } window.scrollTo(0, 0); }); }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) issues.push(`${viewport.name} ${route}: horizontal overflow`);
      await page.screenshot({ path: path.join(output, `${viewport.name}-${name}.png`), fullPage: name === "home" ? false : true });
    }
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({ output, issues }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
