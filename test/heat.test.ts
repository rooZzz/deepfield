import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import { clusterHeat, clusterTone, fileTone, heatGlow } from "../web/src/heat.ts";
import { clusterSeverity } from "../web/src/model.ts";

function graph(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "c:small", kind: "cluster", repo: "checkout-http", title: "checkout/http", memberIds: ["f:form", "f:client"], summary: "2 files" },
      { id: "c:money", kind: "cluster", repo: "ledger-svc", title: "ledger/balance", memberIds: ["f:ledger"], summary: "1 file" },
      { id: "c:noise", kind: "cluster", repo: "checkout-http", title: "checkout/util", memberIds: ["f:util"], summary: "1 file" },
      { id: "f:form", kind: "file", repo: "checkout-http", path: "src/form.ts", change: "modify", class: "behavioural" },
      { id: "f:client", kind: "file", repo: "checkout-http", path: "src/client.ts", change: "modify", class: "behavioural" },
      { id: "f:ledger", kind: "file", repo: "ledger-svc", path: "src/balance.ts", change: "modify", class: "behavioural" },
      { id: "f:util", kind: "file", repo: "checkout-http", path: "src/util.ts", change: "modify", class: "behavioural" },
    ],
    edges: [],
    risks: [{
      id: "risk:R10",
      ruleId: "R10_PAYMENT_MONEY",
      severity: "high",
      clusterIds: ["c:small", "c:money", "c:noise"],
      serviceIds: ["service:checkout-http", "service:ledger-svc"],
      evidence: [
        { nodeId: "f:form", path: "src/form.ts", repo: "checkout-http", excerpt: "currency" },
        { nodeId: "f:ledger", path: "src/balance.ts", repo: "ledger-svc", excerpt: "writeEntry" },
      ],
    }],
    paths: [["c:small"], ["c:money"], ["c:noise"]],
    positions: {},
    warnings: [],
  };
}

test("map heat follows evidence files, not packed clusterIds", () => {
  const doc = graph();
  assert.equal(clusterSeverity(doc, "c:noise"), "high");
  assert.equal(clusterTone(doc, "c:noise"), "none");
  assert.equal(clusterHeat(doc, "c:noise"), 0);
  assert.equal(clusterTone(doc, "c:small"), "high");
  assert.equal(clusterHeat(doc, "c:small"), 2);
  assert.equal(clusterTone(doc, "c:money"), "high");
  assert.equal(fileTone(doc, "f:form"), "high");
  assert.equal(fileTone(doc, "f:client"), "none");
  assert.equal(fileTone(doc, "f:util"), "none");
});

test("corona glow scales with evidence count", () => {
  const none = heatGlow(0, "none");
  const hot = heatGlow(6, "high");
  assert.ok(hot.glow > none.glow);
  assert.ok(hot.halo > none.halo);
});
