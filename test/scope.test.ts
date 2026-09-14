import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import { pathCard, pathFiles, scopeFiles, scopeHeadline } from "../web/src/scope.ts";

function doc(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "a" },
      { id: "s:b", kind: "service", repo: "b" },
      { id: "c:1", kind: "cluster", repo: "a", title: "src/one", memberIds: ["f:1"], summary: "1 file" },
      { id: "c:2", kind: "cluster", repo: "b", title: "src/two", memberIds: ["f:2", "f:3"], summary: "2 files" },
      { id: "f:1", kind: "file", repo: "a", path: "src/one.ts", change: "modify", class: "behavioural", hunk: "+a" },
      { id: "f:2", kind: "file", repo: "b", path: "src/two.ts", change: "modify", class: "behavioural", hunk: "+b" },
      { id: "f:3", kind: "file", repo: "b", path: "src/two.dto.ts", change: "modify", class: "mechanical.dto", hunk: "+c" },
    ],
    edges: [{ id: "e:1", kind: "import", fromId: "f:1", toId: "f:2", crossService: true }],
    risks: [],
    paths: [["c:1", "c:2"]],
    positions: {},
    warnings: [],
  };
}

test("a review path card is name, summary, and chips — not a service walk", () => {
  const graph = doc();
  graph.risks = [{
    id: "r",
    ruleId: "R3_RETRY_IDEMPOTENCY",
    severity: "high",
    evidence: [],
    clusterIds: ["c:2"],
    serviceIds: ["s:b"],
  }];
  const card = pathCard(graph, graph.paths[0] ?? []);
  assert.equal(card.name, "src/two");
  assert.equal(card.summary, "2 clusters · 3 files");
  assert.deepEqual(card.chips.map((item) => item.chip), ["Retry"]);
  assert.equal(scopeHeadline(graph, { kind: "path" }, 0).headline, "src/two");
});

test("reel files follow path, service, cluster, or edge", () => {
  const graph = doc();
  assert.deepEqual(scopeFiles(graph, { kind: "path" }, [], 0).map((row) => row.file.id), ["f:1", "f:2", "f:3"]);
  assert.deepEqual(scopeFiles(graph, { kind: "service", repo: "b" }, []).map((row) => row.file.id), ["f:2", "f:3"]);
  assert.deepEqual(scopeFiles(graph, { kind: "cluster", id: "c:1" }, []).map((row) => row.file.id), ["f:1"]);
  assert.deepEqual(scopeFiles(graph, { kind: "edge", id: "e:1" }, []).map((row) => row.file.id), ["f:1", "f:2"]);
  assert.equal(pathFiles(graph, []).length, 3);
  assert.equal(scopeHeadline(graph, { kind: "path" }, 0).summary, "2 clusters · 3 files");
});
