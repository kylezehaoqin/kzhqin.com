import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/projects", "/projects/deuce", "/notes", "/about", "/notes/fixture-finding"];

// Keep tests on our server: answer any external link with a stub page.
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>external</title>" }));
});

async function noConsoleErrors(page: Page, url: string) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  return errors;
}

test.describe("pages", () => {
  for (const url of PAGES) {
    test(`${url} renders with no console errors`, async ({ page }) => {
      expect(await noConsoleErrors(page, url)).toEqual([]);
      await expect(page.locator(".sl")).toBeVisible();
      await expect(page.locator("#picker")).toBeHidden();
    });
  }

  test("home shows hero, projects, notes, and about", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hi, I'm Kyle. I build things");
    await expect(page.locator(".rows .row")).toHaveCount(4);
    await expect(page.locator(".list .nrow")).toHaveCount(2);
    await expect(page.getByText("Read more about me")).toBeVisible();
  });

  test("unknown paths get the 404 page", async ({ page }) => {
    const res = await page.goto("/missing");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Nothing at this address.")).toBeVisible();
  });
});

test.describe("finder and keys", () => {
  test(": opens the finder, typing filters, Enter navigates", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press(":");
    await expect(page.locator("#picker")).toBeVisible();
    await expect(page.locator("#mode")).toHaveText("COMMAND");
    await page.keyboard.type("proj");
    await expect(page.locator("#finder-results li.on .nm")).toHaveText("projects");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("the finder finds notes from search.json", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    await page.keyboard.type("fixture fin");
    await expect(page.locator("#finder-results li.on .nm")).toHaveText("Fixture finding for tests");
    await page.keyboard.press("Escape");
    await expect(page.locator("#picker")).toBeHidden();
    await expect(page.locator("#mode")).toHaveText("NORMAL");
  });

  test("j/k move the selection; Enter opens it", async ({ page }) => {
    await page.goto("/notes");
    await page.keyboard.press("j");
    await expect(page.locator(".nrow").nth(0)).toHaveClass(/sel/);
    await page.keyboard.press("j");
    await expect(page.locator(".nrow").nth(1)).toHaveClass(/sel/);
    await page.keyboard.press("k");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/notes\/fixture-finding$/);
  });

  test("gg and G jump to the top and bottom; g shows as pending", async ({ page }) => {
    await page.goto("/projects");
    await page.keyboard.press("G");
    await expect(page.locator(".row").last()).toHaveClass(/sel/);
    await page.keyboard.press("g");
    await expect(page.locator("#pending")).toHaveText("g");
    await page.keyboard.press("g");
    await expect(page.locator(".row").first()).toHaveClass(/sel/);
  });

  test("space opens the leader menu; p goes to projects", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press(" ");
    await expect(page.locator("#whichkey")).toBeVisible();
    await expect(page.locator("#mode")).toHaveText("LEADER");
    await page.keyboard.press("p");
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("number keys and H/L switch buffers", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("3");
    await expect(page).toHaveURL(/\/notes$/);
    await page.keyboard.press("L");
    await expect(page).toHaveURL(/\/about$/);
    await page.keyboard.press("H");
    await expect(page).toHaveURL(/\/notes$/);
  });

  test("keys are ignored with modifiers and inside the finder input", async ({ page }) => {
    await page.goto("/notes");
    await page.keyboard.press("Meta+j");
    await expect(page.locator(".nrow.sel")).toHaveCount(0);
    await page.keyboard.press(":");
    await page.keyboard.type("jjj");
    await expect(page.locator("#finder-q")).toHaveValue("jjj");
    await expect(page).toHaveURL(/\/notes$/);
  });

  test("? shows the keymap", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("?");
    await expect(page.locator("#wk-title")).toHaveText("keymaps");
  });
});

test.describe("theme, notes, and status bar", () => {
  test("theme switch persists across reloads", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.locator("#theme-btn").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("a note shows reading progress, a copy button, and older/newer links", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/notes/fixture-finding");
    await expect(page.locator(".codeblock .bar")).toContainText("sql");
    await page.locator(".copy").click();
    await expect(page.locator(".copy")).toHaveText("copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("CREATE INDEX");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator("#progress")).toHaveAttribute("style", /width: (9\d|100)/);
    await expect(page.locator("#pos")).toHaveText("Bot");
    await expect(page.locator(".pager")).toContainText("Fixture workflow for tests");
    await expect(page.locator(".buf[aria-current=page]")).toHaveText("5 fixture-finding");
  });
});

test.describe("projects and skills", () => {
  test("/projects lists every project, and each row opens its own page", async ({ page }) => {
    await page.goto("/projects");
    const rows = page.locator(".rows .row");
    await expect(rows).toHaveCount(10);
    const entries = await rows.evaluateAll((els) => els.map((a) => ({ href: a.getAttribute("href"), name: a.querySelector("h3")?.textContent })));
    for (const { href, name } of entries) {
      expect(href).toMatch(/^\/projects\/[a-z0-9-]+$/);
      await page.goto(href!);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name!);
    }
  });

  test("a project page shows period, stack, repo link, and stories", async ({ page }) => {
    await page.goto("/projects/deuce");
    await expect(page.locator(".post .meta")).toContainText("Sep 2026–present");
    await expect(page.locator(".post .meta")).toContainText("dbt");
    await expect(page.getByRole("link", { name: "GitHub ↗" })).toHaveAttribute("href", "https://github.com/kylezehaoqin/deuce");
    await expect(page.locator(".prose h2").first()).toBeVisible();
    await expect(page.locator(".pager a")).not.toHaveCount(0);
  });

  test("h on a project page goes back to /projects", async ({ page }) => {
    await page.goto("/projects/deuce");
    await page.keyboard.press("h");
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("the finder opens a project page", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press(":");
    await page.keyboard.type("deuce");
    await expect(page.locator("#finder-results li.on .nm")).toHaveText("Deuce");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects\/deuce$/);
  });

  for (const url of ["/", "/about"]) {
    test(`${url} shows 3 skill domains, each linked to its projects`, async ({ page }) => {
      await page.goto(url);
      const domains = page.locator(".skills .dom");
      await expect(domains).toHaveCount(3);
      for (const d of await domains.all()) await expect(d.locator('a[href^="/projects/"]')).not.toHaveCount(0);
    });
  }
});

test.describe("phone, motion, no-JS, accessibility", () => {
  for (const url of PAGES) {
    test(`${url} has no horizontal scroll at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("reduced motion: a click on the background starts no ripple", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      (window as unknown as { rafCalls: number }).rafCalls = 0;
      window.requestAnimationFrame = (cb) => { (window as unknown as { rafCalls: number }).rafCalls++; return raf(cb); };
    });
    await page.goto("/about");
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => (window as unknown as { rafCalls: number }).rafCalls);
    await page.mouse.click(30, 400);
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => (window as unknown as { rafCalls: number }).rafCalls);
    expect(after - before).toBeLessThanOrEqual(1);
  });

  test("without JavaScript, every page and link still works", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const url of PAGES) {
      const res = await page.goto(url);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    }
    await page.goto("/");
    await page.locator(".bufs a", { hasText: "projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await ctx.close();
  });

  for (const scheme of ["light", "dark"] as const) for (const url of ["/", "/projects", "/projects/deuce", "/notes", "/about", "/notes/fixture-finding", "/missing"]) {
    test(`${url} (${scheme}) has no serious accessibility problems`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.length} node(s) · ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
});
