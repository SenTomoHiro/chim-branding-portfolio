import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const staging = await mkdtemp(path.join(tmpdir(), "chim-pages-"));
const output = path.join(staging, "out");

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  await Promise.all([
    cp(path.join(root, "app"), path.join(staging, "app"), { recursive: true, filter: (source) => !source.includes(`${path.sep}admin${path.sep}`) && !source.includes(`${path.sep}api${path.sep}`) }),
    cp(path.join(root, "components"), path.join(staging, "components"), { recursive: true, filter: (source) => !source.includes(`${path.sep}admin${path.sep}`) }),
    cp(path.join(root, "data"), path.join(staging, "data"), { recursive: true }),
    cp(path.join(root, "lib"), path.join(staging, "lib"), { recursive: true }),
    cp(path.join(root, "public"), path.join(staging, "public"), { recursive: true }),
    cp(path.join(root, "next.config.ts"), path.join(staging, "next.config.ts")),
    cp(path.join(root, "tsconfig.json"), path.join(staging, "tsconfig.json")),
    symlink(path.join(root, "node_modules"), path.join(staging, "node_modules")),
  ]);
  await run(path.join(root, "node_modules", ".bin", "next"), ["build", "--webpack"], { cwd: staging, env: { ...process.env, BUILD_TARGET: "pages" } });
  await rm(path.join(root, "out"), { recursive: true, force: true });
  await mkdir(path.join(root, "out"), { recursive: true });
  await cp(output, path.join(root, "out"), { recursive: true });
} finally {
  await rm(staging, { recursive: true, force: true });
}
