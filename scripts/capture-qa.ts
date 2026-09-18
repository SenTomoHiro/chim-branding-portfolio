import { chromium, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";

async function localAdminPassword() {
  const source = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const match = source.match(/^ADMIN_PASSWORD=(.*)$/m);
  if (!match) throw new Error(".env.local 缺少 ADMIN_PASSWORD");
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

async function checkPage(page: Page, label: string, issues: string[]) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) issues.push(`${label}: horizontal overflow`);
}

async function main() {
  const output = path.join(process.cwd(), "test-results/visual-qa");
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const issues: string[] = [];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  desktop.on("console", (message) => { if (message.type() === "error") issues.push(`desktop console ${message.location().url}: ${message.text()}`); });
  desktop.on("pageerror", (error) => issues.push(`desktop pageerror: ${error.message}`));
  await desktop.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await checkPage(desktop, "desktop home", issues);
  await desktop.screenshot({ path: path.join(output, "desktop-home-top.png") });
  await desktop.evaluate(() => scrollTo(0, Math.round(document.body.scrollHeight * .48)));
  await desktop.screenshot({ path: path.join(output, "desktop-home-middle.png") });
  await desktop.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await desktop.screenshot({ path: path.join(output, "desktop-home-lower.png") });
  await desktop.goto("http://localhost:3000/work/%E9%A5%AD%E7%82%B9%E6%97%B6%E5%85%89", { waitUntil: "networkidle" });
  await checkPage(desktop, "desktop unicode detail", issues);
  await desktop.screenshot({ path: path.join(output, "desktop-detail-n009.png") });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("console", (message) => { if (message.type() === "error") issues.push(`mobile console ${message.location().url}: ${message.text()}`); });
  mobile.on("pageerror", (error) => issues.push(`mobile pageerror: ${error.message}`));
  await mobile.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await checkPage(mobile, "mobile home", issues);
  await mobile.screenshot({ path: path.join(output, "mobile-home.png") });
  await mobile.goto("http://localhost:3000/work/%E5%A0%A1%E4%B9%8E%E4%B9%8E%20Manual%20Burger", { waitUntil: "networkidle" });
  await checkPage(mobile, "mobile detail", issues);
  await mobile.screenshot({ path: path.join(output, "mobile-detail-n013.png") });
  await mobile.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  await mobile.getByLabel("管理员密码").fill(await localAdminPassword());
  await mobile.getByRole("button", { name: "登录" }).click();
  await mobile.locator(".adminCaseList article").first().waitFor();
  await mobile.waitForLoadState("networkidle");
  if (await mobile.locator(".adminCaseList article").count() !== 23) issues.push("mobile admin: expected 23 cases");
  await checkPage(mobile, "mobile admin", issues);
  await mobile.screenshot({ path: path.join(output, "mobile-admin.png") });
  await mobile.close();

  await browser.close();
  console.log(JSON.stringify({ output, issues }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
