import { defineConfig } from "@playwright/test";
import path from "node:path";

const API = 8100;
const WEB = 5180;
const root = path.resolve(__dirname, "..");
const db = path.join(root, "e2e", ".data", "test.db");

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: [["list"]],
  outputDir: "../test-results",
  use: {
    baseURL: `http://127.0.0.1:${WEB}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: `uv run uvicorn accountable.main:app --host 127.0.0.1 --port ${API}`,
      cwd: root,
      url: `http://127.0.0.1:${API}/api/health`,
      reuseExistingServer: false,
      env: { ACCOUNTABLE_DB: db, ACCOUNTABLE_TEST_MODE: "1" },
      timeout: 60_000,
    },
    {
      command: `npm run dev --workspace frontend -- --port ${WEB} --strictPort --host 127.0.0.1`,
      cwd: root,
      url: `http://127.0.0.1:${WEB}`,
      reuseExistingServer: false,
      env: { ACCOUNTABLE_API_PORT: String(API) },
      timeout: 60_000,
    },
  ],
});
