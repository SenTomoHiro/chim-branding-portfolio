import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const basePath = "/chim-branding-portfolio";

async function build() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", "build-pages.mjs")], { cwd: root, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath } });
    child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Pages build exited with ${code}`)));
  });
}

await build();
const out = path.join(root, "out");
const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname).replace(new RegExp(`^${basePath}`), "") || "/";
  const candidate = path.join(out, path.extname(pathname) ? pathname : `${pathname.endsWith("/") ? pathname : `${pathname}/`}index.html`);
  const file = path.resolve(candidate);
  if (!file.startsWith(`${out}${path.sep}`) || await fs.stat(file).then(() => false).catch(() => true)) { response.writeHead(404); response.end("Not found"); return; }
  const type = path.extname(file) === ".js" ? "text/javascript" : path.extname(file) === ".css" ? "text/css" : path.extname(file) === ".svg" ? "image/svg+xml" : path.extname(file) === ".json" ? "application/json" : "text/html; charset=utf-8";
  response.setHeader("Content-Type", type); createReadStream(file).pipe(response);
});
server.listen(3200);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => process.exit(0)));
