import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";

async function main() {
  const fixtureRoot = path.join(tmpdir(), "chim-portfolio-e2e");
  const uploadRoot = path.join(process.cwd(), "public/media/uploads");
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.rm(uploadRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(fixtureRoot, "uploads"), { recursive: true });
  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.copyFile(path.join(process.cwd(), "data/content.json"), path.join(fixtureRoot, "content.json"));
  const contentServer = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://localhost");
    response.setHeader("Access-Control-Allow-Origin", "*");
    if (url.pathname === "/data/content.json") { response.setHeader("Content-Type", "application/json"); createReadStream(path.join(fixtureRoot, "content.json")).pipe(response); return; }
    if (url.pathname.startsWith("/public/media/")) {
      const file = path.resolve(process.cwd(), url.pathname.slice(1));
      const publicRoot = path.resolve(process.cwd(), "public");
      if (file.startsWith(`${publicRoot}${path.sep}`) && await fs.stat(file).then(() => true).catch(() => false)) { createReadStream(file).pipe(response); return; }
    }
    response.writeHead(404); response.end("Not found");
  });
  contentServer.listen(3101, "127.0.0.1");
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--port", "3100"], {
    cwd: process.cwd(), stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_CONTENT_ORIGIN: "http://127.0.0.1:3101", CONTENT_FILE_PATH: path.join(fixtureRoot, "content.json"), MEDIA_ROOT: uploadRoot, ADMIN_PASSWORD: "e2e-password", SESSION_SECRET: "e2e-session-secret" },
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { child.kill(signal); contentServer.close(); });
  child.on("exit", async (code) => { contentServer.close(); await fs.rm(uploadRoot, { recursive: true, force: true }); process.exit(code ?? 0); });
}
main().catch((error) => { console.error(error); process.exit(1); });
