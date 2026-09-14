import assert from "node:assert/strict";
import { test } from "node:test";
import type { FileNode, GraphDocument } from "../src/types.ts";
import { anchorTextOf, relocate } from "../web/src/hunk.ts";
import { inScope, type StagedRemark } from "../web/src/remarks.ts";
import { bindReview, pathProgress } from "../web/src/review.ts";
import { graphId } from "../web/src/model.ts";
import { scopeFiles } from "../web/src/scope.ts";

function file(hunk: string): FileNode {
  return {
    id: "f:1",
    kind: "file",
    repo: "a",
    path: "src/a.ts",
    change: "modify",
    class: "behavioural",
    hunk,
  };
}

function graph(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "a" },
      { id: "c:1", kind: "cluster", repo: "a", title: "src", memberIds: ["f:1", "f:2"], summary: "2 files" },
      { id: "f:1", kind: "file", repo: "a", path: "src/a.ts", change: "modify", class: "behavioural", hunk: "@@\n+one\n" },
      { id: "f:2", kind: "file", repo: "a", path: "src/a.test.ts", change: "modify", class: "mechanical.test", hunk: "@@\n+t\n" },
    ],
    edges: [],
    risks: [],
    paths: [["c:1"]],
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
    anchorText: "+one",
    scopeKey: "path",
    scopeLabel: "src",
    label: "a.ts:2",
    body: "check this",
    author: "you",
    createdAt: "2026-01-01T00:00:00.000Z",
    state: "staged",
    ...over,
  };
}

test("relocate keeps a live anchor, then moved, then stale", () => {
  const live = file("@@\n+one\n+two\n");
  assert.equal(anchorTextOf(live, 2, 2), "+one");
  assert.deepEqual(relocate(live, { from: 2, to: 2, anchorText: "+one" }), { from: 2, to: 2, drift: "none" });
  const moved = file("@@\n+two\n+one\n");
  assert.deepEqual(relocate(moved, { from: 2, to: 2, anchorText: "+one" }), { from: 3, to: 3, drift: "moved" });
  const gone = file("@@\n+two\n");
  assert.deepEqual(relocate(gone, { from: 2, to: 2, anchorText: "+one" }), { from: 2, to: 2, drift: "stale" });
});

test("remarks stay in the scope they were written against", () => {
  const items = [remark({ scopeKey: "path" }), remark({ id: "rm:2", scopeKey: "cluster:c:1" })];
  assert.equal(inScope(items, "path").length, 1);
  assert.equal(inScope(items, "cluster:c:1")[0]?.id, "rm:2");
});

test("progress counts the whole path, not the filtered view", () => {
  const doc = graph();
  const filtered = scopeFiles(doc, { kind: "path" }, ["tests"]);
  const whole = pathProgress(doc, ["f:1"]);
  assert.equal(filtered.length, 1);
  assert.equal(whole.total, 2);
  assert.equal(whole.done, 1);
});

test("a new graph fingerprint clears reviewed ticks", () => {
  const doc = graph();
  const id = graphId(doc);
  const kept = bindReview({ version: 1, graphId: id, reviewed: ["f:1"] }, doc);
  assert.deepEqual(kept.reviewed, ["f:1"]);
  const next = { ...doc, paths: [["c:1", "missing"]] };
  const cleared = bindReview({ version: 1, graphId: id, reviewed: ["f:1"] }, next);
  assert.deepEqual(cleared.reviewed, []);
  assert.notEqual(cleared.graphId, id);
});
