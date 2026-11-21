import { test as base, expect } from "@playwright/test";

export const API = "http://127.0.0.1:8100";

interface Fixtures {
  reset: (size?: "sample" | "large" | "empty") => Promise<void>;
  /** Console messages matching these are not failures (for tests that cause an error on purpose). */
  allowConsole: RegExp[];
}

/**
 * Every test starts from fresh sample data and fails on any console error or warning (REQ-8)
 * or any request that leaves localhost (REQ-2).
 */
export const test = base.extend<Fixtures>({
  allowConsole: async ({}, use) => {
    await use([]);
  },
  reset: async ({ request }, use) => {
    await use(async (size = "sample") => {
      const r = await request.post(`${API}/api/test/reset?size=${size}`);
      expect(r.ok()).toBeTruthy();
    });
  },
  page: async ({ page, reset, allowConsole }, use) => {
    await reset("sample");
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      if (allowConsole.some((re) => re.test(m.text()))) return;
      problems.push(`console ${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`page error: ${e.stack}`));
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (u.protocol.startsWith("http") && !["127.0.0.1", "localhost"].includes(u.hostname)) problems.push(`external request: ${req.url()}`);
    });
    await use(page);
    expect(problems, problems.join("\n")).toEqual([]);
  },
});
export { expect };
