import type { CollectionReturnValue, Core } from "cytoscape";
import type { GraphDocument } from "../../src/types.ts";
import { pathAt, pathClusters } from "./model.ts";
import { edgeClusterIds, scopeClusterIds, type Scope } from "./scope.ts";

const EASE = 400;
const PATH_CAP = 1.05;

export function litClusterIds(
  graph: GraphDocument,
  scope: Scope,
  pathIndex: number,
  overview: boolean,
): string[] {
  if (overview && scope.kind === "path") {
    return pathClusters(graph);
  }
  return scopeClusterIds(graph, scope, pathIndex);
}

export function recedeOutside(cy: Core, clusterIds: string[], edgeId: string | null): void {
  const ids = new Set(clusterIds);
  const repos = new Set<string>();
  cy.nodes('[kind = "cluster"]').forEach((node) => {
    if (ids.has(node.id())) {
      repos.add(String(node.data("repo") ?? ""));
    }
  });
  cy.batch(() => {
    cy.elements().removeClass("recede");
    cy.nodes('[kind = "cluster"]').forEach((node) => {
      if (!ids.has(node.id())) {
        node.addClass("recede");
      }
    });
    cy.nodes('[kind = "service"]').forEach((node) => {
      if (!repos.has(String(node.data("repo") ?? ""))) {
        node.addClass("recede");
      }
    });
    cy.nodes('[kind = "file"]').forEach((node) => {
      if (!ids.has(String(node.data("clusterId") ?? ""))) {
        node.addClass("recede");
      }
    });
    cy.edges().forEach((edge) => {
      if (edge.id() === edgeId || (edge.data("kind") === "path" && ids.has(edge.source().id()) && ids.has(edge.target().id()))) {
        return;
      }
      const src = edge.source();
      const tgt = edge.target();
      const srcOk = ids.has(src.id()) || ids.has(String(src.data("clusterId") ?? ""));
      const tgtOk = ids.has(tgt.id()) || ids.has(String(tgt.data("clusterId") ?? ""));
      if (!srcOk || !tgtOk) {
        edge.addClass("recede");
      }
    });
  });
}

export function frameScope(
  cy: Core,
  graph: GraphDocument,
  scope: Scope,
  pathIndex: number,
  overview: boolean,
): void {
  if (overview) {
    fitPad(cy, cy.nodes('[kind = "service"], [kind = "cluster"]'), 36, 4);
    return;
  }
  if (scope.kind === "path") {
    cy.elements().unselect();
    fitPad(cy, pathHull(cy, pathAt(graph, pathIndex)), 48, PATH_CAP);
    return;
  }
  if (scope.kind === "service") {
    const hull = cy.nodes('[kind = "service"]').filter((node) => node.id() === `service:${scope.repo}`);
    const members = cy.nodes('[kind = "cluster"]').filter((node) => String(node.data("repo") ?? "") === scope.repo);
    fitPad(cy, hull.union(members), 40, 1.35);
    return;
  }
  if (scope.kind === "edge") {
    fitPad(cy, edgeHull(cy, graph, scope.id), 48, PATH_CAP);
    return;
  }
  let col = cy.collection();
  for (const id of scopeClusterIds(graph, scope, pathIndex)) {
    col = col.union(cy.getElementById(id));
    cy.nodes('[kind = "file"]').forEach((node) => {
      if (node.data("clusterId") === id) {
        col = col.union(node);
      }
    });
  }
  fitPad(cy, col, 56, 1.55);
}

function pathHull(cy: Core, clusterIds: string[]): CollectionReturnValue {
  const ids = new Set(clusterIds);
  let col = cy.collection();
  const repos = new Set<string>();
  for (const id of clusterIds) {
    const node = cy.getElementById(id);
    col = col.union(node);
    repos.add(String(node.data("repo") ?? ""));
  }
  cy.nodes('[kind = "service"]').forEach((node) => {
    if (repos.has(String(node.data("repo") ?? ""))) {
      col = col.union(node);
    }
  });
  cy.edges().forEach((edge) => {
    if (ids.has(edge.source().id()) && ids.has(edge.target().id())) {
      col = col.union(edge);
    }
  });
  return col;
}

function edgeHull(cy: Core, graph: GraphDocument, edgeId: string): CollectionReturnValue {
  const ids = new Set(edgeClusterIds(graph, edgeId));
  let col = cy.collection();
  for (const id of ids) {
    col = col.union(cy.getElementById(id));
  }
  cy.edges().forEach((edge) => {
    if (ids.has(edge.source().id()) && ids.has(edge.target().id())) {
      col = col.union(edge);
    }
  });
  return col;
}

function fitPad(cy: Core, eles: CollectionReturnValue, padding: number, cap: number): void {
  const vis = eles.filter(":visible");
  const use = vis.empty() ? eles.nodes('[kind = "cluster"], [kind = "service"]') : vis;
  if (use.empty()) {
    return;
  }
  const bb = use.boundingBox({ includeLabels: false });
  if (bb.w < 1 && bb.h < 1) {
    return;
  }
  const zoom = Math.max(
    0.25,
    Math.min(
      cap,
      Math.min(
        (cy.width() - padding * 2) / Math.max(bb.w, 8),
        (cy.height() - padding * 2) / Math.max(bb.h, 8),
      ),
    ),
  );
  cy.stop();
  cy.animate({ zoom, center: { eles: use }, duration: EASE, easing: "ease-in-out" });
}
