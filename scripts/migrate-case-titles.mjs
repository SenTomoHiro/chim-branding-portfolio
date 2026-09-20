import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const contentPath = path.join(process.cwd(), "data", "content.json");
const reportPath = path.join(process.cwd(), "data", "case-title-migration-report.md");
const data = JSON.parse(await readFile(contentPath, "utf8"));

function migrateTitle(name) {
  const separator = name.indexOf("·");
  if (separator < 0) return { brandName: name.trim(), projectName: "", review: false };
  const brandName = name.slice(0, separator).trim();
  const projectName = name.slice(separator + 1).trim();
  return { brandName, projectName, review: false };
}

const rows = data.cases.map((item) => {
  if (typeof item.name !== "string") throw new Error(`案例 ${item.id} 缺少待迁移的 name`);
  const title = migrateTitle(item.name);
  const { name, ...rest } = item;
  return { item: { ...rest, brandName: title.brandName, projectName: title.projectName }, oldName: name, review: title.review };
});

data.cases = rows.map(({ item }) => item);
await writeFile(contentPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const projectCount = rows.filter(({ item }) => item.projectName).length;
const reviewRows = rows.filter(({ review }) => review);
const report = [
  "# Case title migration report",
  "",
  `- 总案例数：${rows.length}`,
  `- 有 projectName：${projectCount}`,
  `- 只有 brandName：${rows.length - projectCount}`,
  `- 建议后续人工确认：${reviewRows.length}`,
  "",
  "## Migration inventory",
  "",
  "| ID | 原案例名 | brandName | projectName | 备注 |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map(({ item, oldName, review }) => `| ${item.id} | ${oldName.replaceAll("|", "\\|")} | ${item.brandName.replaceAll("|", "\\|")} | ${item.projectName.replaceAll("|", "\\|") || "—"} | ${review ? "紧凑间隔符，建议人工复核" : "—"} |`),
  "",
].join("\n");
await writeFile(reportPath, report, "utf8");
console.log(`Migrated ${rows.length} cases: ${projectCount} with projectName, ${rows.length - projectCount} brand-only.`);
