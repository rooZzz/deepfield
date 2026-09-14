import { expect, test, type Page } from "@playwright/test";

type Cam = { zoom: number; pan: { x: number; y: number } };

test("follow files is on by default and can leave the camera still", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  const follow = page.locator("#cam-follow");
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await page.locator("#path-pane .path-step").first().click();
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __deepfield?: { filesVisible: () => boolean } }).__deepfield;
      return api?.filesVisible() ?? true;
    }),
  ).toBe(false);
  await follow.click();
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  const before = await settled(page);
  const n = await page.locator("#reel-scroll .file-row").count();
  const steps = Math.min(5, Math.max(0, n - 1));
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(page.locator("#review-nav .nav-count")).toHaveText(new RegExp(`${steps + 1} / `));
  const after = await camera(page);
  expect(after.zoom).toBeCloseTo(before.zoom, 3);
  expect(Math.abs(after.pan.x - before.pan.x)).toBeLessThan(1);
  expect(Math.abs(after.pan.y - before.pan.y)).toBeLessThan(1);
  await expect(page.locator('#path-pane .path-step[aria-current="true"]')).toBeVisible();
});

test("echoes stay off until shown, without moving the camera", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#map-nav #cam-in")).toBeVisible();
  await expect(page.locator("#map-nav #cam-follow")).toHaveCount(0);
  await expect(page.locator("#map-opts #cam-follow")).toBeVisible();
  const echoes = page.locator("#map-echoes");
  await expect(echoes).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __deepfield?: { echoDrawn: () => number } }).__deepfield;
      return api?.echoDrawn() ?? -1;
    }),
  ).toBe(0);
  await page.locator("#path-pane .path-step").first().click();
  const before = await settled(page);
  await echoes.click();
  await expect(echoes).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __deepfield?: { echoDrawn: () => number } }).__deepfield;
      return api?.echoDrawn() ?? 0;
    }),
  ).toBeGreaterThan(0);
  const after = await camera(page);
  expect(after.zoom).toBeCloseTo(before.zoom, 3);
  expect(Math.abs(after.pan.x - before.pan.x)).toBeLessThan(1);
  expect(Math.abs(after.pan.y - before.pan.y)).toBeLessThan(1);
});

function camera(page: Page): Promise<Cam> {
  return page.evaluate(() => {
    const api = (globalThis as { __deepfield?: { zoom: () => number; pan: () => { x: number; y: number } } }).__deepfield;
    return { zoom: api?.zoom() ?? 0, pan: api?.pan() ?? { x: 0, y: 0 } };
  });
}

async function settled(page: Page): Promise<Cam> {
  let last: Cam | null = null;
  await expect.poll(async () => {
    const now = await camera(page);
    const ok = last !== null
      && Math.abs(now.zoom - last.zoom) < 0.002
      && Math.abs(now.pan.x - last.pan.x) < 0.5
      && Math.abs(now.pan.y - last.pan.y) < 0.5;
    last = now;
    return ok;
  }).toBe(true);
  return last as Cam;
}
