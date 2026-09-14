import { expect, test } from "@playwright/test";

test("shell shows path, graph, and a full-height review pane", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#mark")).toHaveText("Deepfield");
  await expect(page.locator("#status")).toContainText("watching inbox");
  await expect(page.locator("#path-pane .path-step").first()).toBeVisible();
  await expect(page.locator("#path-pane .rail-title")).toHaveCount(0);
  await expect(page.locator("#path-pane .path-step").first()).not.toContainText("from ");
  await page.locator("#path-pane .path-step").first().click();
  await expect.poll(async () =>
    page.evaluate(() => {
      const api = (globalThis as { __deepfield?: { filesVisible: () => boolean } }).__deepfield;
      return api?.filesVisible() ?? true;
    }),
  ).toBe(false);
  const zoom = await page.evaluate(() => {
    const api = (globalThis as { __deepfield?: { zoom: () => number } }).__deepfield;
    return api?.zoom() ?? 9;
  });
  expect(zoom).toBeLessThan(1.35);
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#reel-scroll")).toBeVisible();
  await expect(page.locator("#reel")).toHaveCount(0);
  const stageBox = await page.locator("#stage").boundingBox();
  const insBox = await page.locator("#inspector").boundingBox();
  expect(stageBox?.height ?? 0).toBeGreaterThan(400);
  expect(insBox?.y ?? 99).toBeLessThan(120);
  expect(Math.abs((stageBox?.height ?? 0) - (insBox?.height ?? 0))).toBeLessThan(12);
  await page.locator("#path-pane .path-step").first().click();
  const fileChips = await page.locator("#reel-scroll .file-row .path-chip").count();
  const railChips = await page.locator("#path-pane .path-chip").count();
  expect(fileChips + railChips).toBeGreaterThan(0);
  await expect(page.locator("#review-nav")).toBeVisible();
  await expect(page.locator("#review-nav .mark-btn")).toHaveText("done");
  await expect(page.locator("#note-scope")).toHaveText("note");
  await expect(page.locator("#topbar #approve")).toBeVisible();
  await expect(page.locator("#inspector #approve")).toHaveCount(0);
  await expect(page.locator("#request-changes")).toHaveCount(0);
  await expect(page.locator("#ins-brief .ins-title")).toBeVisible();
  await expect(page.locator("#inspector .hit")).toHaveCount(0);
  const diff = await page.locator("#reel-scroll").innerText();
  expect(diff.length).toBeGreaterThan(0);
  await expect(page.locator("#stars canvas")).toHaveCount(1);
  await expect(page.locator(".hud-chip")).toHaveCount(0);
});

test("request changes writes inbox notes and verdict from the staged sheet", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  await page.locator("#note-scope").click();
  await page.locator("#reel-scroll textarea").fill("Retry must be idempotent.");
  await page.locator('#reel-scroll button[type="submit"]').click();
  await expect(page.locator("#staged-chip")).toHaveText("1 note");
  await page.locator("#staged-chip").click();
  await page.locator("#staged-submit").click();
  await expect(page.locator("#status")).toContainText("inbox sent");
  const res = await page.request.get("http://127.0.0.1:4173/.deepfield/inbox.json");
  const inbox = await res.json();
  expect(inbox.items[0].body).toContain("idempotent");
  expect(inbox.items[0].status).toBe("pending");
  expect(inbox.items[0].author).toBe("you");
  expect(inbox.items[0].scopeKey).toBeTruthy();
  expect(inbox.verdict.kind).toBe("request-changes");
});

test("approve from the top bar writes a verdict", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#inspector #approve")).toHaveCount(0);
  await page.locator("#topbar #approve").click();
  await expect(page.locator("#status")).toContainText("approved");
  const res = await page.request.get("http://127.0.0.1:4173/.deepfield/inbox.json");
  const inbox = await res.json();
  expect(inbox.verdict.kind).toBe("approve");
});

test("zoom reveals file nodes", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator('#field canvas[data-id="layer2-node"]')).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => Boolean((globalThis as { __deepfield?: unknown }).__deepfield)),
  ).toBe(true);
  const before = await page.evaluate(() => {
    const api = (globalThis as { __deepfield?: { zoom: () => number; filesVisible: () => boolean } }).__deepfield;
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
      const api = (globalThis as { __deepfield?: { filesVisible: () => boolean } }).__deepfield;
      return api?.filesVisible() ?? false;
    }),
  ).toBe(true);
});

test("leftover review path does not unroll sibling risk evidence", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  const res = await page.request.get("http://127.0.0.1:4173/.deepfield/graph.json");
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
  const rows = page.locator("#reel-scroll .file-row").filter({ has: page.locator(".path-chip") });
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const path = await rows.nth(i).locator(".file-path").getAttribute("title");
    expect(allowed.has(path ?? "")).toBeTruthy();
  }
  const files = await page.locator("#reel-scroll .file-row .file-path").evaluateAll((els) =>
    els.map((el) => el.getAttribute("title") ?? "")
  );
  expect(files.length).toBeGreaterThan(0);
  for (const filePath of files) {
    expect(allowed.has(filePath)).toBeTruthy();
  }
});

test("reading tools stay one row while walking files", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  await expect(page.locator("#review-nav .file-path")).toHaveCount(0);
  const tools = page.locator("#review-tools");
  const first = await tools.boundingBox();
  expect(first?.height ?? 99).toBeLessThan(48);
  const nav = await page.locator("#review-nav").boundingBox();
  const actions = await page.locator("#review-actions").boundingBox();
  expect(Math.abs((nav?.y ?? 0) - (actions?.y ?? 0))).toBeLessThan(6);
  const heights = [Math.round(first?.height ?? 0)];
  const n = await page.locator("#reel-scroll .file-row").count();
  const steps = Math.min(6, Math.max(0, n - 1));
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("ArrowDown");
    const box = await tools.boundingBox();
    heights.push(Math.round(box?.height ?? 0));
  }
  expect(new Set(heights).size).toBe(1);
});

test("file cursor and hunk list stay in sync", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  const reel = page.locator("#reel-scroll");
  const second = page.locator("#reel-scroll .file-row").nth(1);
  await page.keyboard.press("ArrowDown");
  await expect(second).toHaveClass(/cur/);
  const reelBox = await reel.boundingBox();
  const secondBox = await second.boundingBox();
  expect((secondBox?.y ?? 99) - (reelBox?.y ?? 0)).toBeLessThan(56);
  await expect(page.locator("#review-nav .nav-count")).toHaveText(/2 \/ /);
  const last = page.locator("#reel-scroll .file-row").last();
  const lastPath = await last.locator(".file-path").getAttribute("title");
  await page.locator("#reel-scroll .file-block").last().evaluate((el) => {
    el.scrollIntoView({ block: "start" });
  });
  await expect.poll(async () => page.locator("#reel-scroll .file-row.cur .file-path").getAttribute("title")).toBe(lastPath);
});


test("long hunk lines scroll inside the hunk, not the pane", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.locator("#path-pane .path-step").first().click();
  const metrics = await page.evaluate(() => {
    const reel = document.querySelector("#reel-scroll");
    const row = document.querySelector("#reel-scroll .file-row");
    const wrap = [...document.querySelectorAll("#reel-scroll .hunk-wrap")].find((el) => el.scrollWidth > el.clientWidth + 24);
    if (!(reel instanceof HTMLElement) || !(row instanceof HTMLElement) || !(wrap instanceof HTMLElement)) {
      return null;
    }
    const gutter = wrap.querySelector(".hunk-gutter");
    const lineWidths = [...wrap.querySelectorAll(".hunk-line")]
      .filter((node) => node instanceof HTMLElement && node.offsetWidth > 0)
      .map((node) => node.offsetWidth);
    const before = {
      reel: reel.scrollWidth - reel.clientWidth,
      rowX: row.getBoundingClientRect().x,
      gutterX: gutter?.getBoundingClientRect().x ?? 0,
      body: wrap.scrollWidth - wrap.clientWidth,
      lineWidths,
      wrapScroll: wrap.scrollWidth,
    };
    wrap.scrollLeft = Math.min(180, wrap.scrollWidth - wrap.clientWidth);
    return {
      before,
      after: {
        reel: reel.scrollWidth - reel.clientWidth,
        rowX: row.getBoundingClientRect().x,
        gutterX: gutter?.getBoundingClientRect().x ?? 0,
        left: wrap.scrollLeft,
      },
    };
  });
  expect(metrics).toBeTruthy();
  expect(metrics?.before.reel ?? 99).toBeLessThan(2);
  expect(metrics?.before.body ?? 0).toBeGreaterThan(24);
  expect(new Set(metrics?.before.lineWidths ?? []).size).toBe(1);
  expect(metrics?.before.lineWidths?.[0] ?? 0).toBe(metrics?.before.wrapScroll ?? -1);
  expect(metrics?.after.left ?? 0).toBeGreaterThan(20);
  expect(metrics?.after.reel ?? 99).toBeLessThan(2);
  expect(Math.abs((metrics?.after.rowX ?? 0) - (metrics?.before.rowX ?? 1))).toBeLessThan(1);
  expect(Math.abs((metrics?.after.gutterX ?? 0) - (metrics?.before.gutterX ?? 1))).toBeLessThan(1);
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
