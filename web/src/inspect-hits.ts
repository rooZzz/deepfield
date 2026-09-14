import type { GraphDocument, GraphEdge, RiskHit } from "../../src/types.ts";
import { byId, clusters, files, pathAt } from "./model.ts";
import { HI, MED } from "./palette.ts";

export type InspectHit = {
  rule: string;
  sev: RiskHit["severity"];
  color: string;
  nodeId: string;
  path: string;
  excerpt: string;
};

export function pathHits(graph: GraphDocument, pathIndex: number): InspectHit[] {
  return scopedHits(graph, membersOf(graph, new Set(pathAt(graph, pathIndex))));
}

export function targetHits(graph: GraphDocument, id: string | null, edge: GraphEdge | undefined): InspectHit[] {
  if (edge) {
    return scopedHits(graph, edgeFiles(graph, edge));
  }
  const node = id ? byId(graph, id) : undefined;
  if (node?.kind === "file") {
    return scopedHits(graph, new Set([node.id]));
  }
  if (node?.kind === "cluster") {
    return scopedHits(graph, new Set(node.memberIds));
  }
  if (node?.kind === "service") {
    return scopedHits(graph, new Set(files(graph).filter((file) => file.repo === node.repo).map((file) => file.id)));
  }
  return [];
}

export function focusHits(
  graph: GraphDocument,
  focusId: string | null,
  pathIndex: number,
  onPath: boolean,
): InspectHit[] {
  const node = focusId ? byId(graph, focusId) : undefined;
  const edge = focusId ? graph.edges.find((item) => item.id === focusId) : undefined;
  if (!node && !edge && onPath) {
    return pathHits(graph, pathIndex);
  }
  return targetHits(graph, focusId, edge);
}

export function chipsForFile(hits: InspectHit[], fileId: string): InspectHit[] {
  const seen = new Set<string>();
  const out: InspectHit[] = [];
  for (const hit of hits) {
    if (hit.nodeId !== fileId || seen.has(hit.rule)) {
      continue;
    }
    seen.add(hit.rule);
    out.push(hit);
  }
  return out;
}

export function scopedHits(graph: GraphDocument, fileIds: Set<string>): InspectHit[] {
  const out: InspectHit[] = [];
  for (const hit of graph.risks) {
    for (const item of hit.evidence) {
      if (!fileIds.has(item.nodeId)) {
        continue;
      }
      out.push({
        rule: hit.ruleId,
        sev: hit.severity,
        color: hit.severity === "high" ? HI : MED,
        nodeId: item.nodeId,
        path: `${item.repo}/${item.path}`,
        excerpt: item.excerpt ?? "",
      });
    }
  }
  return out;
}

function membersOf(graph: GraphDocument, clusterIds: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const cluster of clusters(graph)) {
    if (!clusterIds.has(cluster.id)) {
      continue;
    }
    for (const id of cluster.memberIds) {
      out.add(id);
    }
  }
  return out;
}

function edgeFiles(graph: GraphDocument, edge: GraphEdge): Set<string> {
  const out = new Set<string>();
  for (const end of [edge.fromId, edge.toId]) {
    const node = byId(graph, end);
    if (node?.kind === "file") {
      out.add(node.id);
    } else if (node?.kind === "cluster") {
      for (const id of node.memberIds) {
        out.add(id);
      }
    }
  }
  return out;
}
