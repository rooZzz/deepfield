import { expect, test } from "@playwright/test";

test("keyboard walks the path", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  const title = page.locator('#path-pane .path-step[aria-current="true"] .path-step-title');
  const first = (await title.textContent())?.trim() ?? "";
  expect(first).toBeTruthy();
  await page.keyboard.press("k");
  await expect(title).not.toHaveText(first);
  await page.keyboard.press("j");
  await expect(title).toHaveText(first);
  await page.locator("#path-pane").evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.style.maxHeight = "260px";
    }
  });
  const count = await page.locator("#path-pane .path-step").count();
  for (let n = 1; n < count; n++) {
    await page.keyboard.press("k");
  }
  const inView = await page.evaluate(() => {
    const list = document.querySelector("#path-pane .rail-steps");
    const cur = document.querySelector("#path-pane .path-step[aria-current='true']");
    if (!(list instanceof HTMLElement) || !(cur instanceof HTMLElement)) {
      return false;
    }
    const view = list.getBoundingClientRect();
    const row = cur.getBoundingClientRect();
    return row.top >= view.top - 1 && row.bottom <= view.bottom + 1;
  });
  expect(inView).toBe(true);
});
