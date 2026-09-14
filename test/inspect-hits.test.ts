import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import { pathHits, targetHits } from "../web/src/inspect-hits.ts";

function graph(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "checkout-http" },
      { id: "s:b", kind: "service", repo: "ledger-svc" },
      { id: "c:small", kind: "cluster", repo: "checkout-http", title: "checkout/http", memberIds: ["f:form", "f:client"], summary: "2 files" },
      { id: "c:money", kind: "cluster", repo: "ledger-svc", title: "ledger/balance", memberIds: ["f:ledger"], summary: "1 file" },
      { id: "f:form", kind: "file", repo: "checkout-http", path: "src/form.ts", change: "modify", class: "behavioural" },
      { id: "f:client", kind: "file", repo: "checkout-http", path: "src/client.ts", change: "modify", class: "behavioural" },
      { id: "f:ledger", kind: "file", repo: "ledger-svc", path: "src/balance.ts", change: "modify", class: "behavioural" },
    ],
    edges: [],
    risks: [{
      id: "risk:R10",
      ruleId: "R10_PAYMENT_MONEY",
      severity: "high",
      clusterIds: ["c:small", "c:money"],
      serviceIds: ["service:checkout-http", "service:ledger-svc"],
      evidence: [
        { nodeId: "f:form", path: "src/form.ts", repo: "checkout-http", excerpt: "currency" },
        { nodeId: "f:ledger", path: "src/balance.ts", repo: "ledger-svc", excerpt: "writeEntry" },
      ],
    }],
    paths: [["c:small"], ["c:money"]],
    positions: {},
    warnings: [],
  };
}

test("a review path only lists risk evidence on that path", () => {
  const doc = graph();
  const hits = pathHits(doc, 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.path, "checkout-http/src/form.ts");
  const money = pathHits(doc, 1);
  assert.equal(money.length, 1);
  assert.equal(money[0]?.path, "ledger-svc/src/balance.ts");
});

test("cluster and file inspectors do not import sibling evidence", () => {
  const doc = graph();
  const cluster = targetHits(doc, "c:small", undefined);
  assert.deepEqual(cluster.map((hit) => hit.path), ["checkout-http/src/form.ts"]);
  const file = targetHits(doc, "f:form", undefined);
  assert.equal(file.length, 1);
  assert.equal(file[0]?.path, "checkout-http/src/form.ts");
});
