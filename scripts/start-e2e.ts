import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

async function main() {
  const fixtureRoot = path.join(tmpdir(), "chim-portfolio-e2e");
  const uploadRoot = path.join(process.cwd(), "public/media/uploads");
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.rm(uploadRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(fixtureRoot, "uploads"), { recursive: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.copyFile(path.join(process.cwd(), "data/content.json"), path.join(fixtureRoot, "content.json"));
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--port", "3100"], {
    cwd: process.cwd(), stdio: "inherit", env: { ...process.env, CONTENT_FILE_PATH: path.join(fixtureRoot, "content.json"), MEDIA_ROOT: uploadRoot, ADMIN_PASSWORD: "e2e-password", SESSION_SECRET: "e2e-session-secret" },
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
  child.on("exit", async (code) => { await fs.rm(uploadRoot, { recursive: true, force: true }); process.exit(code ?? 0); });
}
main().catch((error) => { console.error(error); process.exit(1); });
