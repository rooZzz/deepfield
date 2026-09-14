import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import { edgeBetweenClusters, tapEdgeId } from "../web/src/edge-select.ts";
import { edgeClusterIds } from "../web/src/scope.ts";

function graph(): GraphDocument {
  return {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "a" },
      { id: "s:b", kind: "service", repo: "b" },
      { id: "c:1", kind: "cluster", repo: "a", title: "one", memberIds: ["f:1"], summary: "1 file" },
      { id: "c:2", kind: "cluster", repo: "b", title: "two", memberIds: ["f:2"], summary: "1 file" },
      { id: "c:3", kind: "cluster", repo: "b", title: "three", memberIds: ["f:3"], summary: "1 file" },
      { id: "f:1", kind: "file", repo: "a", path: "a.ts", change: "modify", class: "behavioural" },
      { id: "f:2", kind: "file", repo: "b", path: "b.ts", change: "modify", class: "behavioural" },
      { id: "f:3", kind: "file", repo: "b", path: "c.ts", change: "modify", class: "behavioural" },
    ],
    edges: [
      { id: "e:import", kind: "import", fromId: "f:1", toId: "f:2", crossService: true },
      { id: "e:contract", kind: "contract", fromId: "f:1", toId: "f:2", crossService: true },
      { id: "e:local", kind: "import", fromId: "f:2", toId: "f:3", crossService: false },
    ],
    risks: [],
    paths: [["c:1", "c:2"]],
    positions: {},
    warnings: [],
  };
}

test("a wide or path hop resolves to a graph edge, not a cluster", () => {
  const doc = graph();
  assert.equal(tapEdgeId(doc, { id: "e:import", kind: "import", source: "f:1", target: "f:2" }), "e:import");
  assert.equal(tapEdgeId(doc, { id: "wide:import:c:1:c:2", kind: "import", source: "c:1", target: "c:2" }), "e:import");
  assert.equal(tapEdgeId(doc, { id: "wide:contract:c:1:c:2", kind: "contract", source: "c:1", target: "c:2" }), "e:contract");
  assert.equal(tapEdgeId(doc, { id: "path:c:1:c:2", kind: "path", source: "c:1", target: "c:2" }), "e:contract");
});

test("a path hop prefers contract, then a cross-service import", () => {
  const doc = graph();
  assert.equal(edgeBetweenClusters(doc, "c:1", "c:2")?.id, "e:contract");
  doc.edges = doc.edges.filter((edge) => edge.kind !== "contract");
  assert.equal(edgeBetweenClusters(doc, "c:1", "c:2")?.id, "e:import");
  assert.equal(edgeBetweenClusters(doc, "c:2", "c:3")?.id, "e:local");
  assert.equal(edgeBetweenClusters(doc, "c:1", "c:1"), undefined);
});

test("edge scope is both endpoint clusters", () => {
  const doc = graph();
  assert.deepEqual(edgeClusterIds(doc, "e:import").sort(), ["c:1", "c:2"]);
  assert.deepEqual(edgeClusterIds(doc, "e:local").sort(), ["c:2", "c:3"]);
});
