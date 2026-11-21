import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { firstColumn } from "./helpers";

// REQ-6: with 500 organizations, 2,000 contacts, 1,000 deals and 10,000 activities.
test.describe("at the full data size", () => {
  test.beforeEach(async ({ reset }) => {
    await reset("large");
  });

  async function loadTime(page: Page, path: string, ready: () => ReturnType<Page["locator"]>) {
    await page.goto(path); // warm the dev server's module cache
    await ready().first().waitFor();
    const start = Date.now();
    await page.goto(path);
    await ready().first().waitFor();
    return Date.now() - start;
  }

  test("each page loads in under a second", async ({ page }) => {
    const results: Record<string, number> = {};
    results.deals = await loadTime(page, "/deals", () => firstColumn(page));
    results.contacts = await loadTime(page, "/contacts", () => firstColumn(page));
    results.organizations = await loadTime(page, "/organizations", () => firstColumn(page));
    results.pipeline = await loadTime(page, "/pipeline", () => page.locator('[data-testid^="card-"]'));
    results.dashboard = await loadTime(page, "/", () => page.getByTestId("headline"));
    console.log("page load ms", JSON.stringify(results));
    for (const [name, ms] of Object.entries(results)) expect(ms, `${name} loaded in ${ms} ms`).toBeLessThan(1000);
  });

  test("table search and sort respond in under 200 ms", async ({ page }) => {
    for (const [path, noun, header] of [["/contacts", "contacts", "Email"], ["/deals", "deals", "Value"], ["/organizations", "organizations", "Industry"]] as const) {
      await page.goto(path);
      await firstColumn(page).first().waitFor();
      const timings = await page.evaluate(
        async ({ noun, header }) => {
          const frames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          const rows = () => document.querySelectorAll("tbody tr").length;
          const input = document.querySelector<HTMLInputElement>(`input[aria-label="Search ${noun}"]`)!;
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
          const total = rows();
          let t0 = performance.now();
          setter.call(input, "an");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          while (rows() === total && performance.now() - t0 < 3000) await frames();
          await frames();
          const search = performance.now() - t0;
          setter.call(input, "");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          while (rows() !== total && performance.now() - t0 < 6000) await frames();
          const button = [...document.querySelectorAll("thead button")].find((b) => b.textContent?.includes(header)) as HTMLButtonElement;
          const first = document.querySelector("tbody tr td")?.textContent;
          t0 = performance.now();
          button.click();
          await frames();
          const sort = performance.now() - t0;
          return { search, sort, changed: first !== document.querySelector("tbody tr td")?.textContent };
        },
        { noun, header },
      );
      console.log(noun, JSON.stringify(timings));
      expect(timings.search, `${noun} search ${timings.search} ms`).toBeLessThan(200);
      expect(timings.sort, `${noun} sort ${timings.sort} ms`).toBeLessThan(200);
    }
  });
});
