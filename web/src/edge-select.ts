import type { GraphDocument, GraphEdge } from "../../src/types.ts";
import { byId, clusterOfFile, hopKey } from "./model.ts";

export type WideEdge = {
  id: string;
  source: string;
  target: string;
  kind: GraphEdge["kind"];
  cross: 0 | 1;
};

const KIND_RANK: Record<GraphEdge["kind"], number> = { contract: 2, echo: 1, import: 0 };

export function wideClusterEdges(graph: GraphDocument, showEchoes = true): WideEdge[] {
  const best = new Map<string, { source: string; target: string; kind: GraphEdge["kind"]; cross: boolean }>();
  for (const edge of graph.edges) {
    if (edge.kind === "echo" && !showEchoes) {
      continue;
    }
    const from = clusterOfFile(graph, edge.fromId);
    const to = clusterOfFile(graph, edge.toId);
    if (!from || !to || from.id === to.id) {
      continue;
    }
    const source = from.id < to.id ? from.id : to.id;
    const target = from.id < to.id ? to.id : from.id;
    const ends = hopKey(from.id, to.id);
    const prev = best.get(ends);
    const kind = !prev || KIND_RANK[edge.kind] > KIND_RANK[prev.kind] ? edge.kind : prev.kind;
    best.set(ends, {
      source,
      target,
      kind,
      cross: Boolean(prev?.cross || edge.crossService),
    });
  }
  return [...best.values()].map((item) => ({
    id: `wide:${item.kind}:${hopKey(item.source, item.target)}`,
    source: item.source,
    target: item.target,
    kind: item.kind,
    cross: item.cross ? 1 : 0,
  }));
}

export type DrawnTap = {
  id: string;
  kind: string;
  source: string;
  target: string;
};

export function tapEdgeId(graph: GraphDocument, drawn: DrawnTap): string | undefined {
  if (graph.edges.some((edge) => edge.id === drawn.id)) {
    return drawn.id;
  }
  const kind = drawn.kind === "import" || drawn.kind === "contract" || drawn.kind === "echo"
    ? drawn.kind
    : undefined;
  return edgeBetweenClusters(graph, drawn.source, drawn.target, kind)?.id;
}

export function edgeBetweenClusters(
  graph: GraphDocument,
  a: string,
  b: string,
  kind?: GraphEdge["kind"],
): GraphEdge | undefined {
  const from = clusterId(graph, a);
  const to = clusterId(graph, b);
  if (!from || !to || from === to) {
    return undefined;
  }
  const hits = graph.edges.filter((edge) => {
    if (kind && edge.kind !== kind) {
      return false;
    }
    const src = clusterId(graph, edge.fromId);
    const tgt = clusterId(graph, edge.toId);
    return Boolean(src && tgt && ((src === from && tgt === to) || (src === to && tgt === from)));
  });
  return hits.find((edge) => edge.kind === "contract")
    ?? hits.find((edge) => edge.kind === "echo")
    ?? hits.find((edge) => edge.crossService)
    ?? hits[0];
}

function clusterId(graph: GraphDocument, id: string): string | undefined {
  const node = byId(graph, id);
  if (node?.kind === "cluster") {
    return node.id;
  }
  if (node?.kind === "file") {
    return clusterOfFile(graph, node.id)?.id;
  }
  return undefined;
}
