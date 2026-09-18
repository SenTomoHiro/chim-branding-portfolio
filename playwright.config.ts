import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",fullyParallel:false,workers:1,retries:0,reporter:"list",
  use:{baseURL:"http://localhost:3100",trace:"retain-on-failure"},
  webServer:{command:"npx tsx scripts/start-e2e.ts",url:"http://localhost:3100",reuseExistingServer:false,timeout:120000},
  projects:[{name:"chrome",use:{...devices["Desktop Chrome"],channel:"chrome"}}],
});
