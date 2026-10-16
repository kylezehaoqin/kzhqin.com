import { test, expect, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// These tests use their own static + presence server pair (4401 → 8092), so the
// counts are not changed by the other tests, which run in parallel on 4400.
test.describe.configure({ mode: "serial" });
const BASE = "http://127.0.0.1:4401";

async function visitor(browser: Browser, path: string) {
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto(path);
  return { ctx, page };
}
const count = (page: Page) => page.locator("#presence");
const dots = (page: Page) => page.locator("#dots");

test("two visitors on the same page see each other; a third on another page sees the count only", async ({ browser }) => {
  const a = await visitor(browser, "/projects/deuce");
  const b = await visitor(browser, "/projects/deuce");
  await expect(count(a.page)).toHaveAttribute("data-n", "2", { timeout: 8000 });
  await expect(count(a.page)).toBeVisible();
  await expect(count(a.page)).toContainText("2 here");
  await expect(dots(a.page)).toHaveAttribute("data-presence-dots", "1", { timeout: 8000 });
  const c = await visitor(browser, "/notes");
  await expect(count(c.page)).toHaveAttribute("data-n", "3", { timeout: 8000 });
  await expect(dots(c.page)).toHaveAttribute("data-presence-dots", "0");
  await b.ctx.close();
  await expect(count(a.page)).toHaveAttribute("data-n", "2", { timeout: 5000 });
  await expect(dots(a.page)).toHaveAttribute("data-presence-dots", "0", { timeout: 5000 });
  await a.ctx.close(); await c.ctx.close();
});

test(":presence off hides you; :presence on brings you back", async ({ browser }) => {
  const a = await visitor(browser, "/about");
  const b = await visitor(browser, "/about");
  await expect(count(a.page)).toHaveAttribute("data-n", "2", { timeout: 8000 });
  await b.page.keyboard.press(":");
  await b.page.keyboard.type("presence off");
  await b.page.keyboard.press("Enter");
  await expect(count(b.page)).toBeHidden();
  await expect(count(a.page)).toHaveAttribute("data-n", "1", { timeout: 5000 });
  await b.page.reload();
  await b.page.waitForTimeout(2000);
  await expect(count(a.page)).toHaveAttribute("data-n", "1"); // the choice is saved
  await b.page.keyboard.press(":");
  await b.page.keyboard.type("presence on");
  await b.page.keyboard.press("Enter");
  await expect(count(a.page)).toHaveAttribute("data-n", "2", { timeout: 8000 });
  await a.ctx.close(); await b.ctx.close();
});

test("zen mode keeps the connection but hides the dots", async ({ browser }) => {
  const a = await visitor(browser, "/projects/deuce");
  const b = await visitor(browser, "/projects/deuce");
  await expect(dots(a.page)).toHaveAttribute("data-presence-dots", "1", { timeout: 8000 });
  await a.page.keyboard.press(" "); await a.page.keyboard.press("u"); await a.page.keyboard.press("z");
  await expect(dots(a.page)).toHaveAttribute("data-presence-hidden", "true");
  await expect(dots(a.page)).toHaveAttribute("data-presence-dots", "1");
  await a.ctx.close(); await b.ctx.close();
});

test("the presence segment passes axe in both themes", async ({ browser }) => {
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ baseURL: BASE, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(count(page)).toBeVisible({ timeout: 8000 });
    const r = await new AxeBuilder({ page }).include("#statusbar").analyze();
    expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
    await ctx.close();
  }
});

test("an HTTP error hides a stale count, and the client tries again after 60 s", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  let calls = 0, down = true;
  await page.route("**/presence/stream*", (route) => {
    calls++;
    if (calls === 1) // a short stream that ends at once: the browser reconnects after 200 ms
      return route.fulfill({ status: 200, contentType: "text/event-stream",
        body: `retry: 200\n\nevent: hello\ndata: {"id":"aaaaaaaa","token":"${"0".repeat(32)}"}\n\nevent: snap\ndata: {"n":5,"dots":[]}\n\n` });
    if (down) return route.fulfill({ status: 502, body: "" }); // EventSource closes for good on a non-200
    return route.continue();
  });
  await page.clock.install();
  await page.goto("/about");
  await page.clock.runFor(4000); // the client starts after idle
  await expect(count(page)).toHaveAttribute("data-n", "5", { timeout: 5000 });
  await expect(count(page)).toBeHidden({ timeout: 5000 }); // the 502 must not leave "● 5 here" on screen
  down = false;
  await page.clock.runFor(61_000);
  await expect(count(page)).toHaveAttribute("data-n", "1", { timeout: 8000 });
  await expect(count(page)).toBeVisible();
  await ctx.close();
});

test("with the service down, pages work and show no segment", async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:4402" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/presence|404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto("/projects/deuce");
  await page.waitForTimeout(2500);
  await expect(count(page)).toBeHidden();
  await page.keyboard.press("j");
  expect(errors).toEqual([]);
  await ctx.close();
});
