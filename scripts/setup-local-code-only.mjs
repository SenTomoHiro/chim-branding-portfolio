import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const expectedRepository = /(?:github\.com[/:])SenTomoHiro\/chim-branding-portfolio(?:\.git)?$/;
const patterns = [
  "/*", "!/*/", "/.github/", "/app/", "/components/", "/lib/", "/pages-static/", "/public/", "!/public/media/cases/", "/scripts/", "/tests/",
];

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: [options.input ? "pipe" : "ignore", "pipe", "pipe"], ...options });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

if (process.argv.includes("--help")) {
  console.log("Usage: npm run setup:local-code-only -- [destination]\nCreates a fresh blobless sparse clone next to the current clean official repository.");
  process.exit(0);
}

const source = git(["rev-parse", "--show-toplevel"], { cwd: process.cwd() });
const origin = git(["remote", "get-url", "origin"], { cwd: source });
if (!expectedRepository.test(origin)) throw new Error(`origin 不是 SenTomoHiro/chim-branding-portfolio：${origin}`);
if (git(["status", "--porcelain", "--untracked-files=all"], { cwd: source })) throw new Error("当前仓库有未提交修改；请先提交或安全处理后再创建 code-only clone。");
const version = git(["--version"], { cwd: source });
const match = version.match(/(\d+)\.(\d+)/);
if (!match || Number(match[1]) < 2 || (Number(match[1]) === 2 && Number(match[2]) < 25)) throw new Error(`Git 版本不支持所需 partial clone/sparse checkout：${version}`);

const requested = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const destination = path.resolve(requested || path.join(path.dirname(source), `${path.basename(source)}-code-only`));
if (destination === source || destination === path.dirname(source)) throw new Error("拒绝使用当前仓库或父目录作为目标。");
if (existsSync(destination)) throw new Error(`目标已存在：${destination}`);

git(["clone", "--filter=blob:none", "--no-checkout", origin, destination], { cwd: path.dirname(source) });
git(["sparse-checkout", "init", "--no-cone"], { cwd: destination });
git(["sparse-checkout", "set", "--no-cone", "--stdin"], { cwd: destination, input: `${patterns.join("\n")}\n` });
git(["checkout", "main"], { cwd: destination });

for (const relative of ["data", "public/media/cases", "output"]) {
  if (existsSync(path.join(destination, relative))) throw new Error(`code-only clone 仍包含禁止路径：${relative}`);
}
if (git(["config", "--get", "remote.origin.promisor"], { cwd: destination }) !== "true") throw new Error("partial clone promisor 配置缺失。");

console.log(`Code-only partial/sparse clone ready: ${destination}`);
