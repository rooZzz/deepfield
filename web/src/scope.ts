import type { ClusterNode, FileNode, GraphDocument } from "../../src/types.ts";
import { bucketOf, type BucketId } from "./buckets.ts";
import { byId, clusterOfFile, clusterSeverity, clusters, files, pathAt, pathClusters } from "./model.ts";
import { ruleChip, ruleHint } from "./rules.ts";

export type Scope =
  | { kind: "path" }
  | { kind: "cluster"; id: string }
  | { kind: "service"; repo: string }
  | { kind: "edge"; id: string };

export type ScopeRow = {
  file: FileNode;
  step: number;
  cluster: ClusterNode;
  crossesInto: boolean;
};

export type PathCard = {
  name: string;
  summary: string;
  chips: Array<{ chip: string; hint: string; sev: "high" | "medium" | "low" | "none" }>;
};

export function scopeKeyOf(scope: Scope): string {
  if (scope.kind === "path") {
    return "path";
  }
  if (scope.kind === "service") {
    return `service:${scope.repo}`;
  }
  return `${scope.kind}:${scope.id}`;
}

export function scopeClusterIds(graph: GraphDocument, scope: Scope, pathIndex = 0): string[] {
  if (scope.kind === "cluster") {
    return [scope.id];
  }
  if (scope.kind === "service") {
    return clusters(graph).filter((cluster) => cluster.repo === scope.repo).map((cluster) => cluster.id);
  }
  if (scope.kind === "edge") {
    return edgeClusterIds(graph, scope.id);
  }
  return pathAt(graph, pathIndex);
}

export function pathFiles(graph: GraphDocument, hidden: BucketId[]): ScopeRow[] {
  return clusterRows(graph, pathClusters(graph), hidden);
}

export function scopeFiles(graph: GraphDocument, scope: Scope, hidden: BucketId[], pathIndex = 0): ScopeRow[] {
  if (scope.kind === "edge") {
    return edgeRows(graph, scope.id, hidden);
  }
  return clusterRows(graph, scopeClusterIds(graph, scope, pathIndex), hidden);
}

export function pathCard(graph: GraphDocument, clusterIds: string[]): PathCard {
  const fileCount = clusterIds.reduce((n, id) => {
    const node = byId(graph, id);
    return n + (node && node.kind === "cluster" ? node.memberIds.length : 0);
  }, 0);
  const seen = new Set<string>();
  const chips: PathCard["chips"] = [];
  for (const id of clusterIds) {
    for (const hit of graph.risks.filter((item) => item.clusterIds.includes(id))) {
      if (seen.has(hit.ruleId)) {
        continue;
      }
      seen.add(hit.ruleId);
      chips.push({ chip: ruleChip(hit.ruleId), hint: ruleHint(hit.ruleId), sev: hit.severity });
    }
  }
  const units = clusterIds.length === 1 ? "cluster" : "clusters";
  const filesWord = fileCount === 1 ? "file" : "files";
  return {
    name: pathHotspot(graph, clusterIds) || "review path",
    summary: `${clusterIds.length} ${units} · ${fileCount} ${filesWord}`,
    chips,
  };
}

export function scopeHeadline(graph: GraphDocument, scope: Scope, pathIndex: number): { headline: string; summary: string } {
  if (scope.kind === "path") {
    const card = pathCard(graph, pathAt(graph, pathIndex));
    return { headline: card.name, summary: card.summary };
  }
  if (scope.kind === "service") {
    return { headline: scope.repo, summary: `${scopeFiles(graph, scope, []).length} files in this service` };
  }
  if (scope.kind === "cluster") {
    const node = byId(graph, scope.id);
    if (node?.kind === "cluster") {
      return { headline: node.title, summary: `${node.repo} · ${node.summary}` };
    }
  }
  const edge = graph.edges.find((item) => item.id === scope.id);
  if (edge) {
    return { headline: `${edge.kind} edge`, summary: edge.crossService ? "crosses a service boundary" : "within one service" };
  }
  return { headline: "this scope", summary: "" };
}

function pathHotspot(graph: GraphDocument, clusterIds: string[]): string {
  for (const want of ["high", "medium"] as const) {
    for (const id of clusterIds) {
      if (clusterSeverity(graph, id) !== want) {
        continue;
      }
      const node = byId(graph, id);
      if (node?.kind === "cluster") {
        return node.title.split("/").slice(-2).join("/");
      }
    }
  }
  const first = byId(graph, clusterIds[0] ?? "");
  return first && first.kind === "cluster" ? first.title.split("/").slice(-2).join("/") : "";
}

function clusterRows(graph: GraphDocument, ids: string[], hidden: BucketId[]): ScopeRow[] {
  const out: ScopeRow[] = [];
  ids.forEach((cid, index) => {
    const cluster = byId(graph, cid);
    if (!cluster || cluster.kind !== "cluster") {
      return;
    }
    const members = files(graph).filter((file) => cluster.memberIds.includes(file.id));
    const ordered = [
      ...members.filter((file) => file.class === "behavioural"),
      ...members.filter((file) => file.class !== "behavioural"),
    ];
    const prev = index ? byId(graph, ids[index - 1] ?? "") : null;
    const route = graph.paths.findIndex((path) => path.includes(cid));
    for (const file of ordered) {
      if (hidden.includes(bucketOf(file))) {
        continue;
      }
      out.push({
        file,
        step: route >= 0 ? route : index,
        cluster,
        crossesInto: Boolean(prev && prev.kind === "cluster" && prev.repo !== cluster.repo),
      });
    }
  });
  return out;
}

export function edgeClusterIds(graph: GraphDocument, edgeId: string): string[] {
  const edge = graph.edges.find((item) => item.id === edgeId);
  if (!edge) {
    return [];
  }
  const ids: string[] = [];
  for (const end of [edge.fromId, edge.toId]) {
    const node = byId(graph, end);
    if (node?.kind === "cluster") {
      ids.push(node.id);
    } else if (node?.kind === "file") {
      const cluster = clusterOfFile(graph, node.id);
      if (cluster) {
        ids.push(cluster.id);
      }
    }
  }
  return [...new Set(ids)];
}

function edgeRows(graph: GraphDocument, edgeId: string, hidden: BucketId[]): ScopeRow[] {
  const edge = graph.edges.find((item) => item.id === edgeId);
  if (!edge) {
    return [];
  }
  const out: ScopeRow[] = [];
  for (const end of [edge.fromId, edge.toId]) {
    const node = byId(graph, end);
    if (node?.kind === "cluster") {
      out.push(...clusterRows(graph, [node.id], hidden));
      continue;
    }
    if (!node || node.kind !== "file" || hidden.includes(bucketOf(node))) {
      continue;
    }
    const cluster = clusterOfFile(graph, node.id);
    if (!cluster) {
      continue;
    }
    out.push({
      file: node,
      step: Math.max(0, graph.paths.findIndex((path) => path.includes(cluster.id))),
      cluster,
      crossesInto: edge.crossService,
    });
  }
  return out;
}
