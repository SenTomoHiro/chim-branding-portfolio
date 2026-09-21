import path from "node:path";
import { spawn } from "node:child_process";

const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--port", "3100"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_CONTENT_ORIGIN: process.env.NEXT_PUBLIC_CONTENT_ORIGIN || "https://raw.githubusercontent.com/SenTomoHiro/chim-branding-portfolio/main",
  },
});

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
