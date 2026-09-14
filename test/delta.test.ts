import assert from "node:assert/strict";
import { test } from "node:test";
import { generateGraph, requestedBase } from "../src/generate.ts";
import type { GraphDocument } from "../src/types.ts";
import { write } from "./helpers/git.ts";
import { FIXTURE_BASE, buildPaymentRetryFixture } from "./helpers/meta-fixture.ts";

function fileRepos(graph: GraphDocument): Set<string> {
  return new Set(graph.nodes.filter((node) => node.kind === "file").map((node) => node.repo));
}

test("requestedBase prefers per-checkout override, then --base, then HEAD", () => {
  assert.equal(requestedBase("payments-api"), "HEAD");
  assert.equal(requestedBase("payments-api", { base: "develop" }), "develop");
  assert.equal(requestedBase("payments-api", { base: "develop", bases: { "payments-api": "topic" } }), "topic");
  assert.equal(requestedBase("idle-service", { base: "develop", bases: { "payments-api": "topic" } }), "develop");
});

test("default HEAD ignores committed feature-branch files", async () => {
  const fixture = await buildPaymentRetryFixture();
  const graph = await generateGraph(fixture.root);
  const repos = fileRepos(graph);
  assert.equal(repos.has("payments-api"), false);
  assert.equal(repos.has("checkout-web"), false);
  assert.equal(repos.has("checkout-api"), false);
  assert.equal(repos.has("ledger-svc"), false);
});

test("working tree vs HEAD does not need origin/main", async () => {
  const fixture = await buildPaymentRetryFixture();
  await write(fixture.idle, "wip.ts", "export const wip = 1;\n");
  const graph = await generateGraph(fixture.root);
  const repos = fileRepos(graph);
  assert.equal(repos.has("idle-service"), true);
  assert.equal(repos.has("payments-api"), false);
  const wip = graph.nodes.find((node) => node.kind === "file" && node.path === "wip.ts");
  assert.ok(wip);
});

test("--only drops a dirty checkout that was not named", async () => {
  const fixture = await buildPaymentRetryFixture();
  await write(fixture.idle, "wip.ts", "export const wip = 1;\n");
  await write(fixture.payments, "local.ts", "export const local = 1;\n");
  const graph = await generateGraph(fixture.root, { only: ["idle-service"] });
  const repos = fileRepos(graph);
  assert.equal(repos.has("idle-service"), true);
  assert.equal(repos.has("payments-api"), false);
});

test("per-checkout base can opt into origin/main for one service", async () => {
  const fixture = await buildPaymentRetryFixture();
  const graph = await generateGraph(fixture.root, { bases: { "payments-api": FIXTURE_BASE } });
  const repos = fileRepos(graph);
  assert.equal(repos.has("payments-api"), true);
  assert.equal(repos.has("checkout-web"), false);
});

test("unknown --only checkout fails", async () => {
  const fixture = await buildPaymentRetryFixture();
  await assert.rejects(
    () => generateGraph(fixture.root, { only: ["nope"] }),
    /unknown checkout/,
  );
});

test("missing --base ref fails", async () => {
  const fixture = await buildPaymentRetryFixture();
  await assert.rejects(
    () => generateGraph(fixture.root, { base: "origin/does-not-exist" }),
    /not found/,
  );
});
