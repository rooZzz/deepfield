import assert from "node:assert/strict";
import { test } from "node:test";
import { generateGraph } from "../src/generate.ts";
import { canonicalJson } from "../src/hash.ts";
import { pathHits } from "../web/src/inspect-hits.ts";
import { buildPaymentRetryFixture } from "./helpers/meta-fixture.ts";

test("stale pins: generate is byte-stable and hits retry + cross-service", async () => {
  const fixture = await buildPaymentRetryFixture();
  const a = await generateGraph(fixture.root);
  const b = await generateGraph(fixture.root);
  assert.equal(canonicalJson(a), canonicalJson(b));
  const repos = new Set(a.nodes.filter((node) => node.kind === "file").map((node) => node.repo));
  assert.equal(repos.has("idle-service"), false);
  assert.equal(repos.has("payments-api"), true);
  assert.equal(repos.has("checkout-web"), true);
  assert.equal(repos.has("checkout-api"), true);
  assert.equal(repos.has("ledger-svc"), true);
  const live = a.nodes.filter((node) => node.kind === "service").map((node) => node.repo);
  assert.equal(live.length, 4);
  const rules = new Set(a.risks.map((hit) => hit.ruleId));
  assert.equal(rules.has("R3_RETRY_IDEMPOTENCY"), true);
  assert.equal(rules.has("R2_CROSS_SERVICE"), true);
  const vertical = a.paths.find((ids) => {
    const repos = new Set(ids.map((id) => {
      const node = a.nodes.find((item) => item.id === id);
      return node && node.kind === "cluster" ? node.repo : "";
    }));
    return repos.has("checkout-web") && repos.has("payments-api") && repos.has("ledger-svc") && repos.has("checkout-api");
  });
  assert.ok(vertical, "expected a review path that spans all four live services");
  const first = vertical[0];
  const firstRisk = a.risks.filter((hit) => hit.clusterIds.includes(first));
  assert.ok(firstRisk.some((hit) => hit.severity === "high"));
  assert.ok(firstRisk.some((hit) =>
    hit.ruleId === "R2_CROSS_SERVICE" || hit.ruleId === "R3_RETRY_IDEMPOTENCY",
  ));
});

test("parent pins are not the file list", async () => {
  const fixture = await buildPaymentRetryFixture();
  const graph = await generateGraph(fixture.root);
  const pins = graph.nodes.filter((node) => node.kind === "file" && node.class === "noise.pin");
  assert.equal(pins.length, 0);
});

test("review-path inspector evidence stays on that path's files", async () => {
  const fixture = await buildPaymentRetryFixture();
  const graph = await generateGraph(fixture.root);
  const files = new Map(
    graph.nodes.filter((node) => node.kind === "file").map((file) => [`${file.repo}/${file.path}`, file.id]),
  );
  let leftover = 0;
  for (let i = 0; i < graph.paths.length; i++) {
    const members = new Set<string>();
    for (const id of graph.paths[i] ?? []) {
      const node = graph.nodes.find((item) => item.id === id);
      if (node?.kind === "cluster") {
        for (const fileId of node.memberIds) {
          members.add(fileId);
        }
      }
    }
    if (
      graph.risks.some((hit) =>
        hit.clusterIds.some((id) => graph.paths[i]?.includes(id))
        && hit.evidence.some((item) => !members.has(item.nodeId))
      )
    ) {
      leftover += 1;
    }
    for (const hit of pathHits(graph, i)) {
      const fileId = files.get(hit.path);
      assert.ok(fileId, hit.path);
      assert.equal(members.has(fileId), true, hit.path);
    }
  }
  assert.ok(leftover > 0, "fixture should include a leftover path that shares a packed rule");
});
