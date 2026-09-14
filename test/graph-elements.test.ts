import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphDocument } from "../src/types.ts";
import { toElements } from "../web/src/graph-elements.ts";

test("the map does not draw a second path stroke on a cluster pair", () => {
  const doc: GraphDocument = {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "a" },
      { id: "c:1", kind: "cluster", repo: "a", title: "one", memberIds: ["f:1"], summary: "1 file" },
      { id: "c:2", kind: "cluster", repo: "a", title: "two", memberIds: ["f:2"], summary: "1 file" },
      { id: "f:1", kind: "file", repo: "a", path: "a.ts", change: "modify", class: "behavioural" },
      { id: "f:2", kind: "file", repo: "a", path: "b.ts", change: "modify", class: "behavioural" },
    ],
    edges: [{ id: "e:1", kind: "contract", fromId: "f:1", toId: "f:2", crossService: false }],
    risks: [],
    paths: [["c:1", "c:2"]],
    positions: { "s:a": { x: 0.2, y: 0.2 }, "c:1": { x: 0.3, y: 0.3 }, "c:2": { x: 0.6, y: 0.4 } },
    warnings: [],
  };
  const kinds = toElements(doc, []).map((item) => item.data.kind);
  assert.equal(kinds.includes("path"), false);
  assert.ok(kinds.includes("contract"));
});

test("hidden echoes drop off the map and yield the next stroke", () => {
  const doc: GraphDocument = {
    version: 1,
    root: ".",
    nodes: [
      { id: "s:a", kind: "service", repo: "a" },
      { id: "s:b", kind: "service", repo: "b" },
      { id: "c:1", kind: "cluster", repo: "a", title: "one", memberIds: ["f:1"], summary: "1 file" },
      { id: "c:2", kind: "cluster", repo: "b", title: "two", memberIds: ["f:2"], summary: "1 file" },
      { id: "f:1", kind: "file", repo: "a", path: "a.ts", change: "modify", class: "behavioural" },
      { id: "f:2", kind: "file", repo: "b", path: "b.ts", change: "modify", class: "behavioural" },
    ],
    edges: [
      { id: "e:import", kind: "import", fromId: "f:1", toId: "f:2", crossService: true },
      { id: "e:echo", kind: "echo", fromId: "f:1", toId: "f:2", crossService: true, token: "correlationId" },
    ],
    risks: [],
    paths: [["c:1", "c:2"]],
    positions: { "s:a": { x: 0.2, y: 0.2 }, "s:b": { x: 0.8, y: 0.2 }, "c:1": { x: 0.3, y: 0.3 }, "c:2": { x: 0.7, y: 0.3 } },
    warnings: [],
  };
  const hidden = toElements(doc, [], false);
  assert.equal(hidden.some((item) => item.data.kind === "echo"), false);
  assert.ok(hidden.some((item) => item.data.kind === "import"));
  const shown = toElements(doc, [], true);
  assert.ok(shown.some((item) => item.data.kind === "echo"));
});
