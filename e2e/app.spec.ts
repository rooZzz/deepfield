import { expect, test } from "@playwright/test";

test("shell shows path, graph, inspector, and reel", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#mark")).toHaveText("Eagle Eye");
  await expect(page.locator("#status")).toContainText("watching inbox");
  await expect(page.locator("#path-pane .path-step").first()).toBeVisible();
  await expect(page.locator("#path-pane .rail-title")).toHaveCount(0);
  await expect(page.locator("#path-pane .path-step").first()).not.toContainText("from ");
  await page.locator("#path-pane .path-step").first().click();
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __eagleEye?: { filesVisible: () => boolean } }).__eagleEye;
      return api?.filesVisible() ?? true;
    }),
  ).toBe(false);
  const zoom = await page.evaluate(() => {
    const api = (globalThis as { __eagleEye?: { zoom: () => number } }).__eagleEye;
    return api?.zoom() ?? 9;
  });
  expect(zoom).toBeLessThan(1.35);
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#reel-scroll")).toBeVisible();
  await page.locator("#path-pane .path-step").first().click();
  const body = await page.locator("#inspector").innerText();
  expect(body.includes("Retry") || body.includes("Boundary") || body.includes("risk") || body.includes("no risks")).toBeTruthy();
  const diff = await page.locator("#reel-scroll").innerText();
  expect(diff.length).toBeGreaterThan(0);
});

test("request changes writes inbox remarks and verdict", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  await page.locator("#remark-scope").click();
  await page.locator("#reel-scroll textarea").fill("Retry must be idempotent.");
  await page.locator('#reel-scroll button[type="submit"]').click();
  await page.locator("#request-changes").click();
  await expect(page.locator("#status")).toContainText("inbox sent");
  const res = await page.request.get("http://127.0.0.1:4173/.eagle-eye/inbox.json");
  const inbox = await res.json();
  expect(inbox.items[0].body).toContain("idempotent");
  expect(inbox.items[0].status).toBe("pending");
  expect(inbox.items[0].author).toBe("you");
  expect(inbox.items[0].scopeKey).toBeTruthy();
  expect(inbox.verdict.kind).toBe("request-changes");
});

test("keyboard walks the path", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  const current = page.locator('#path-pane .path-step[aria-current="true"]');
  await page.keyboard.press("j");
  await expect(current).toBeVisible();
  await expect(page.locator("#inspector")).not.toContainText("Select a cluster");
});

test("zoom reveals file nodes", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator('#field canvas[data-id="layer2-node"]')).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => Boolean((globalThis as { __eagleEye?: unknown }).__eagleEye)),
  ).toBe(true);
  const before = await page.evaluate(() => {
    const api = (globalThis as { __eagleEye?: { zoom: () => number; filesVisible: () => boolean } }).__eagleEye;
    return { zoom: api?.zoom() ?? 0, files: api?.filesVisible() ?? false };
  });
  expect(before.files).toBe(false);
  await page.locator("#cy").evaluate((el) => {
    const box = el.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const ticks = [-7, -11, -9, -13, ...Array.from({ length: 24 }, () => -40)];
    for (const deltaY of ticks) {
      el.dispatchEvent(
        new WheelEvent("wheel", { deltaY, deltaMode: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }),
      );
    }
  });
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __eagleEye?: { filesVisible: () => boolean } }).__eagleEye;
      return api?.filesVisible() ?? false;
    }),
  ).toBe(true);
});

test("leftover review path does not unroll sibling risk evidence", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  const res = await page.request.get("http://127.0.0.1:4173/.eagle-eye/graph.json");
  const graph = await res.json() as {
    nodes: Array<{ id: string; kind: string; memberIds?: string[]; repo?: string; path?: string }>;
    paths: string[][];
    risks: Array<{ clusterIds: string[]; evidence: Array<{ nodeId: string; repo: string; path: string }> }>;
  };
  const index = graph.paths.findIndex((ids) => {
    const members = new Set<string>();
    for (const id of ids) {
      const node = graph.nodes.find((item) => item.id === id);
      if (node?.kind === "cluster") {
        for (const fileId of node.memberIds ?? []) {
          members.add(fileId);
        }
      }
    }
    return graph.risks.some((hit) =>
      hit.clusterIds.some((id) => ids.includes(id))
      && hit.evidence.some((item) => !members.has(item.nodeId))
    );
  });
  expect(index).toBeGreaterThan(-1);
  await page.locator("#path-pane .path-step").nth(index).click();
  const members = new Set<string>();
  for (const id of graph.paths[index] ?? []) {
    const node = graph.nodes.find((item) => item.id === id);
    if (node?.kind === "cluster") {
      for (const fileId of node.memberIds ?? []) {
        members.add(fileId);
      }
    }
  }
  const allowed = new Set(
    graph.nodes
      .filter((node) => node.kind === "file" && members.has(node.id))
      .map((node) => `${node.repo}/${node.path}`),
  );
  const hitPaths = await page.locator("#inspector .hit .mono.dim").allTextContents();
  expect(hitPaths.length).toBeGreaterThan(0);
  for (const hitPath of hitPaths) {
    expect(allowed.has(hitPath.trim())).toBeTruthy();
  }
});

test("hunks tokenize and staged review is a full-viewport row with inline context", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  await expect.poll(async () => page.locator(".hunk-code span[style*='color']").count()).toBeGreaterThan(0);
  await page.locator(".hunk-line.add").first().click();
  await page.locator("#reel-scroll textarea").fill("Retry must be idempotent.");
  await page.locator('#reel-scroll button[type="submit"]').click();
  await page.locator("#staged-chip").click();
  const panel = page.locator("#staged-panel");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  const vp = page.viewportSize();
  expect(box?.width).toBeGreaterThan((vp?.width ?? 0) * 0.95);
  expect(box?.height).toBeGreaterThan((vp?.height ?? 0) * 0.95);
  await expect(page.locator(".staged-row")).toHaveCount(1);
  await expect(page.locator(".staged-note")).toContainText("Retry must be idempotent.");
  await expect(page.locator(".staged-ctx")).toContainText("file");
  await expect(page.locator(".staged-ctx .hunk-line.pick")).toHaveCount(1);
});
