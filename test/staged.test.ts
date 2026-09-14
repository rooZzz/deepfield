import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import type { StagedRemark } from "../web/src/remarks.ts";
import { stagedTarget } from "../web/src/staged-ctx.ts";

function graph(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "payments-api" },
      { id: "c:1", kind: "cluster", repo: "payments-api", title: "retry", memberIds: ["f:1"], summary: "1 file" },
      { id: "c:2", kind: "cluster", repo: "checkout-api", title: "http", memberIds: ["f:2"], summary: "1 file" },
      {
        id: "f:1",
        kind: "file",
        repo: "payments-api",
        path: "src/retry.ts",
        change: "modify",
        class: "behavioural",
        hunk: "@@\n+retry()\n",
      },
      {
        id: "f:2",
        kind: "file",
        repo: "checkout-api",
        path: "src/http.ts",
        change: "modify",
        class: "behavioural",
        hunk: "@@\n+post()\n",
      },
    ],
    edges: [{ id: "e:1", kind: "contract", fromId: "f:1", toId: "f:2", crossService: true }],
    risks: [],
    paths: [["c:1", "c:2"]],
    positions: {},
    warnings: [],
  };
}

function remark(over: Partial<StagedRemark>): StagedRemark {
  return {
    id: "rm:1",
    kind: "line",
    fileId: "f:1",
    from: 2,
    to: 2,
    scopeKey: "path",
    scopeLabel: "retry",
    label: "retry.ts:2",
    body: "check",
    author: "you",
    createdAt: "2026-01-01T00:00:00.000Z",
    state: "staged",
    ...over,
  };
}

test("stagedTarget inlines hunk, cluster, edge, and path", () => {
  const doc = graph();
  const hunk = stagedTarget(remark({}), doc);
  assert.equal(hunk.kind, "hunk");
  if (hunk.kind === "hunk") {
    assert.equal(hunk.file.path, "src/retry.ts");
    assert.equal(hunk.from, 2);
  }
  const cluster = stagedTarget(remark({ kind: "scope", fileId: undefined, from: undefined, to: undefined, scopeKey: "cluster:c:1" }), doc);
  assert.equal(cluster.kind, "cluster");
  const edge = stagedTarget(remark({ kind: "scope", fileId: undefined, from: undefined, to: undefined, scopeKey: "edge:e:1" }), doc);
  assert.equal(edge.kind, "edge");
  if (edge.kind === "edge") {
    assert.equal(edge.edge.crossService, true);
  }
  const path = stagedTarget(remark({ kind: "scope", fileId: undefined, from: undefined, to: undefined, scopeKey: "path", scopeLabel: "retry" }), doc);
  assert.equal(path.kind, "path");
  if (path.kind === "path") {
    assert.deepEqual(path.ids, ["c:1", "c:2"]);
  }
});
